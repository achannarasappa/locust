const prettyjson = require('prettyjson');
const shell = require('shelljs');
const R = require('ramda');
const Redis = require('ioredis');
const { writeFileSync } = require('fs');
const moment = require('moment');
const { execute } = require('../../lib/fn');
const { filterJobResult } = require('../util');
const queue = require('../../lib/queue');
const { QueueError } = require('../../lib/error');
const { refreshQueue } = require('../term/queue');
const { start: startTerminal } = require('../term');
const { render: renderTerminal } = require('../term/summary');

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

const _executeWithProgressReporting = async (redisDbResult, jobDefinition, renderer) => {
          
  const jobSummaryLine = renderer.createJobSummary();
  jobSummaryLine.start();
  const jobDefinitionOverride = R.mergeRight(
    jobDefinition, 
    {
      start: () => _executeWithProgressReporting(redisDbResult, jobDefinitionOverride, renderer),
      beforeAll: (browser, snapshot, jobData) => {

        if (!jobDefinition.beforeAll)
          return;

        jobSummaryLine.update({
          status: `Running`,
          url: jobData.url,
          text: `beforeAll hook`,
        })
        return jobDefinition.beforeAll(browser, snapshot, jobData);
      },
      before: (page, snapshot, jobData) => {

        jobSummaryLine.update({
          status: `Running`,
        })

        if (!jobDefinition.before)
          return;

        jobSummaryLine.update({
          status: `Running`,
          url: jobData.url,
          text: `beforeAll hook`,
        })
        return jobDefinition.before(page, snapshot, jobData);
      },
      extract: ($, browser, jobData) => {
        
        if (!jobDefinition.extract)
          return;

        jobSummaryLine.update({
          status: `Running`,
          url: jobData.url,
          text: `extract hook`,
        })
        return jobDefinition.extract($, browser, jobData);
      },
      after: (jobResult, snapshot, stopQueue) => {

        if (!jobDefinition.after)
          return

        jobSummaryLine.update({
          status: `Running`,
          url: jobResult.response.url,
          text: `after hook`,
        })
        return jobDefinition.after(jobResult, snapshot, stopQueue);
      },
    }
  );
  
  execute(jobDefinitionOverride)
  .then(async (result) => {

    if (result instanceof QueueError)
      return jobSummaryLine.info('Job aborted due to stop condition', 'Aborted');

    if (redisDbResult.status === 'ready') {

      jobSummaryLine.succeed({
        text: '',
        url: result.response.url,
      })
      await redisDbResult.rpush('results', JSON.stringify(result))

    } else {

      jobSummaryLine.warn({
        text: `Finished after stop condition`,
        url: result.response.url,
      })

    }

    return result;

  })
  .catch((e) => {

    
      console.log(e.message);
      console.log(e.stack);
      process.exit(1);
    
    if (e.name === 'BrowserError')
      return jobSummaryLine.warn({
        text: `Request error:\n\t${e.message}`
      });
    
      jobSummaryLine.fail({
      text: `Internal error: ${e.message}`
    })
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
    let queueRefreshInterval;
    
    const term = startTerminal(async () => {
      await redisDbQueue.quit();
      await redisDbResult.quit();
      await _reset(jobDefinition);
      clearInterval(queueRefreshInterval);
    });
    const renderer = renderTerminal(term);
  
    renderer.summary.updateMessage('Starting');

    queueRefreshInterval = refreshQueue(redisDbQueue, jobDefinition, renderer)

    _executeWithProgressReporting(redisDbResult, jobDefinition, renderer);

    await new Promise((resolve, reject) => {

      const statusRefreshInterval = setInterval(async () => {

        const status = await redisDbQueue.hget(`sc:${jobDefinition.config.name}:state`, 'status')
        .catch(reject);

        if (status !== 'INACTIVE')
          return;

        clearInterval(statusRefreshInterval);
        clearInterval(queueRefreshInterval);
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