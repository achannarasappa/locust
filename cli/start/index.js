const prettyjson = require('prettyjson');
const shell = require('shelljs');
const R = require('ramda');
const Redis = require('ioredis');
const { writeFileSync } = require('fs');
const moment = require('moment');
const Spinner = require('./spinner');
const { execute } = require('../../lib/fn');
const { filterJobResult } = require('../util');
const queue = require('../../lib/queue');
const { QueueError } = require('../../lib/error');

const _bootstrap = () => {

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
      'Ready to start a job',
    ].join('\n'))

};

const _reset = async (jobDefinition) => {

  const redis = await new Redis(jobDefinition.connection.redis);

  await queue.remove(redis, jobDefinition.config.name)

  await redis.quit();

  console.log(`Successfully reset queue '${jobDefinition.config.name}'`);

}

const _getResults = async (redisDbResult) =>
  redisDbResult.lrange('results', 0, -1)
  .then(R.map(JSON.parse))
  .then(R.map((jobResult) => filterJobResult(jobResult, false, true, false, false)))

const _executeWithProgressReporting = async (redisDbResult, jobDefinition) => {
          
  const spinner = (new Spinner('Starting job')).start();
  const jobDefinitionOverride = R.mergeRight(
    jobDefinition, 
    {
      start: () => _executeWithProgressReporting(redisDbResult, jobDefinitionOverride),
      beforeAll: (browser, snapshot, jobData) => {

        if (!jobDefinition.beforeAll)
          return;

        spinner.status = `Running`;
        spinner.url = jobData.url;
        spinner.text = `beforeAll hook`;
        return jobDefinition.beforeAll(browser, snapshot, jobData);
      },
      before: (page, snapshot, jobData) => {

        spinner.status = `Running`;

        if (!jobDefinition.before)
          return;

        spinner.status = `Running`;
        spinner.url = jobData.url;
        spinner.text = `before hook`;
        return jobDefinition.before(page, snapshot, jobData);
      },
      extract: ($, browser, jobData) => {
        
        if (!jobDefinition.extract)
          return;

        spinner.status = `Running`;
        spinner.url = jobData.url;
        spinner.text = `extract hook`;
        return jobDefinition.extract($, browser, jobData);
      },
      after: (jobResult, snapshot, stopQueue) => {

        if (!jobDefinition.after)
          return

        spinner.status = `Running`;
        spinner.url = jobResult.response.url;
        spinner.text = `after hook`;
        return jobDefinition.after(jobResult, snapshot, stopQueue);
      },
    }
  );
  
  execute(jobDefinitionOverride)
  .then(async (result) => {

    if (result instanceof QueueError)
      return spinner.info('Job aborted due to stop condition', 'Aborted');

    if (redisDbResult.status === 'ready') {

      spinner.succeed('')
      spinner.url = result.response.url;
      await redisDbResult.rpush('results', JSON.stringify(result))

    } else {

      spinner.warn(`Finished after stop condition`)
      spinner.url = result.response.url;

    }

    return result;

  })
  .catch((e) => {

    if (e.name === 'BrowserError')
      return spinner.warn(`Request error:\n\t${e.message}`)
    
    spinner.fail(`Internal error: ${e.message}`)
    return;

  })

};

const start = async (filePath, bootstrap, reset) => {

  const jobDefinition = require(`${process.cwd()}/${filePath}`);
  
  if (bootstrap)
    return _bootstrap();

  if (reset)
    await _reset(jobDefinition);

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

module.exports = start;