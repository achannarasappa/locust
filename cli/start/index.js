const prettyjson = require('prettyjson');
const shell = require('shelljs');
const R = require('ramda');
const Redis = require('ioredis');
const { writeFileSync } = require('fs');
const moment = require('moment');
const { start: executeWithTerminalReporting } = require('./reporting');
const { filterJobResult } = require('../util');
const queue = require('../../lib/queue');

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

const _onExit = async (redisDbQueue, redisDbResult, jobDefinition) => {

  await redisDbQueue.quit();
  await redisDbResult.quit();
  await _reset(jobDefinition);

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

    await executeWithTerminalReporting(redisDbQueue, redisDbResult, jobDefinition, _onExit);

    const jobResults = await _getResults(redisDbResult)

    await _onExit(redisDbQueue, redisDbResult, jobDefinition);

    writeFileSync(`./results-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`, JSON.stringify(jobResults))

    return console.log(`Completed with ${jobResults.length} results written to disk.`);
  
  } catch (e) {

    return console.log(prettyjson.render(e));

  }

};

module.exports = start;