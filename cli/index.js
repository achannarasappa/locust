const prettyjson = require('prettyjson');
const shell = require('shelljs');
const R = require('ramda');
const Redis = require('ioredis');
const { writeFileSync } = require('fs');
const { execute } = require('../lib/fn');
const { validate } = require('../lib/job');
const queue = require('../lib/queue');
const template = require('./generate/job-template');
const { promptJobDetails } = require('./generate/prompt');
const { QueueError } = require('./../lib/error');
const puppeteer = require('puppeteer');
const moment = require('moment');
const Spinner = require('./start/spinner');

const _isValidResult = R.allPass([
  R.has('response'),
  R.has('cookies'),
  R.has('links'),
  R.has('data'),
  R.hasPath([ 'response', 'body' ]),
  R.hasPath([ 'response', 'url' ]),
])

const _filterJobResult = (jobResult, includeHtml, includeLinks, includeCookies, includeResponse) => {

  if (!jobResult)
    return {};

  if (!_isValidResult(jobResult))
    return jobResult;

  if (includeHtml)
    return R.path([ 'response', 'body' ], jobResult);
  
  return R.pipe(
    R.pick([
      includeResponse ? 'response' : undefined,
      'data',
      includeCookies ? 'cookies' : undefined,
      includeLinks ? 'links' : undefined,
    ]),
    R.dissocPath([ 'response', 'body' ]),
    R.assoc('url', R.path([ 'response', 'url' ], jobResult)),
  )(jobResult);
  
}

const _executeSingleJob = async (jobDefinition, firstRun = true) => {

  const browser = await puppeteer.launch();
  const state = {
    firstRun: firstRun ? 1 : 0
  };
  const jobData = {
    url: jobDefinition.url
  };

  const jobResult = await runJob(browser, jobDefinition, jobData, state);

  await browser.close();

  return jobResult;

};

const run = async (filePath, includeHtml, includeLinks, includeCookies) => {
  
  console.log('Running in single job mode. Queue related hooks and configuration will be ignored. Check docs for more information.');
  
  const jobDefinition = require(`${__dirname}/../${filePath}`);
  const jobResult = await _executeSingleJob(jobDefinition);
  const jobResultFiltered = _filterJobResult(jobResult, includeHtml, includeLinks, includeCookies, true)

  return console.log(prettyjson.render(jobResultFiltered));

};

const start = async (filePath, bootstrap, reset) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);
  
  if (bootstrap) {

    console.log('Starting redis and chrome...');

    if (!shell.which('docker')) {
      console.log('docker is missing from the system!');
      return;
    }

    if (!shell.which('docker-compose')) {
      console.log('docker-compose is missing from the system!');
      return;
    }
    
    const { code } = shell.exec('docker-compose -f ./cli/start/docker-compose.yml up -d')

    if (code === 0)
      return console.log([
        'Successfully started redis and chrome',
        'To stop run: docker-compose -f ./cli/start/docker-compose.yml down',
      ].join('\n'))

  }

  if (reset) {

    const redis = await new Redis(jobDefinition.connection.redis);

    await queue.remove(redis, jobDefinition.config.name)

    await redis.quit();

    console.log(`Successfully reset queue '${jobDefinition.config.name}'`);

  }

  try {

    const redisDbQueue = await new Redis(jobDefinition.connection.redis);
    const redisDbResult = await new Redis(R.mergeRight(jobDefinition.connection.redis, {
      db: 1
    }));

    await redisDbResult.del('results');

    _executeWithProgressReporting(redisDbResult, jobDefinition);

    await new Promise((resolve, reject) => {

      const interval = setInterval(async () => {

        const status = await redisDbQueue.hget(`sc:${jobDefinition.config.name}:state`, 'status')
        .catch(reject);

        if (status !== 'INACTIVE')
          return;

        clearInterval(interval);
        await redisDbQueue.quit();
        resolve();

      }, 500)

    });

    const jobResults = await _getResults(redisDbResult)

    await redisDbResult.quit();

    writeFileSync(`./results-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`, JSON.stringify(jobResults))

    return console.log(`Completed with ${jobResults.length} results written to disk.`);
  
  } catch (e) {

    return console.log(prettyjson.render(e));

  }


};

const _getResults = async (redisDbResult) =>
  redisDbResult.lrange('results', 0, -1)
  .then(R.map(JSON.parse))
  .then(R.map((jobResult) => _filterJobResult(jobResult, false, true, false, false)))

const _executeWithProgressReporting = async (redisDbResult, jobDefinition) => {
          
  const spinner = (new Spinner('Starting job')).start();
  const jobDefinitionOverride = R.mergeRight(
    jobDefinition, 
    {
      start: () => _executeWithProgressReporting(redisDbResult, jobDefinitionOverride),
      beforeAll: (browser, snapshot, jobData) => {

        if (!jobDefinition.beforeAll)
          return;

        spinner.text = `Running beforeAll hook: ${jobData.url}`;
        return jobDefinition.beforeAll(browser, snapshot, jobData);
      },
      before: (page, snapshot, jobData) => {

        spinner.text = `Starting: ${jobData.url}`;

        if (!jobDefinition.before)
          return;

        spinner.text = `Running before hook: ${jobData.url}`;
        return jobDefinition.before(page, snapshot, jobData);
      },
      extract: ($, browser, jobData) => {
        
        if (!jobDefinition.extract)
          return;

        spinner.text = `Running extract hook: ${jobData.url}`;
        return jobDefinition.extract($, browser, jobData);
      },
      after: (jobResult, snapshot, stopQueue) => {

        if (!jobDefinition.after)
          return

        spinner.text = `Running after hook: ${jobResult.response.url}`;
        return jobDefinition.after(jobResult, snapshot, stopQueue);
      },
    }
  );
  
  execute(jobDefinitionOverride)
  .then(async (result) => {

    if (result instanceof QueueError)
      return spinner.info('Job aborted due to stop condition');

    if (redisDbResult.status === 'ready') {

      spinner.succeed(`Finished: ${result.response.url}`)
      await redisDbResult.rpush('results', JSON.stringify(result))

    } else {

      spinner.warn(`Finished after stop condition: ${result.response.url}`)

    }

    return result;

  })
  .catch((e) => {

    if (e.name === 'BrowserError')
      return spinner.warn(`Request error:\n\t${e.message}`)
    
    spinner.fail(`Internal error:\n\t'${e.message}'`)
    return console.log(e.stack);

  })

};

const stop = async () => {

 shell.exec('docker-compose -f ./cli/start/docker-compose.yml down')

}

const info = async (filePath) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);

  const redis = await new Redis(jobDefinition.connection.redis);

  const snapshot = await queue.getSnapshot(redis, jobDefinition.name);

  await redis.quit();
  
  return console.log(prettyjson.render(snapshot));

};

const generateJobFile = async () => {

  const answers = await promptJobDetails();
  const jobFileContents = template(answers);

  writeFileSync(`./${answers.name}.js`, jobFileContents)

};

const validateJobFile = async (filePath) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);

  try {

    await validate(jobDefinition);

    console.log('Job file is valid');

  } catch (e) {

    console.log(prettyjson.render(e.details));

  }

};

module.exports = {
  run,
  start,
  stop,
  info,
  generateJobFile,
  validateJobFile,
  _filterJobResult,
}