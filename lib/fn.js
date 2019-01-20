const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const queue = require('./queue');
const { runJob, startJobs } = require('./job');

const execute = async (jobDefinition) => {

  try {

    const redis = await new Redis(jobDefinition.connection.redis);

    const { state, config, jobData } = await queue.register(redis, jobDefinition);

    const store = await getStore(redis);

    const browser = await puppeteer.launch(jobDefinition.connection.chrome);

    const jobResult = await runJob(browser, jobDefinition, state, store)

    await queue.deregister(redis, config.name, jobData);

    await queue.add(redis, config.name, jobData, jobResult);

    await startJobs(jobDefinition, config.concurrencyLimit);

    return jobResult;

  } catch (e) {

    console.log(e);
    console.log(e.message);

  }

}

const executeSingleJob = async (jobDefinition, firstRun = true) => {

  const browser = await puppeteer.launch(jobDefinition.connection.chrome);
  const state = {
    firstRun: firstRun ? '1' : '0'
  };

  return await runJob(browser, jobDefinition, state);

};

module.exports = {
  execute,
}