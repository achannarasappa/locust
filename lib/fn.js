const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const queue = require('./queue');
const { runJob, startJobs } = require('./job');

const execute = async (jobDefinition) => {


  const redis = await new Redis(jobDefinition.connection.redis);
  const browser = await puppeteer.launch(jobDefinition.connection.chrome);

  try {

    // TODO: check browser and redis connectivity

    const { state, config, jobData } = await queue.register(redis, jobDefinition);

    // const store = await getStore(redis);

    const jobResult = await runJob(browser, jobDefinition, jobData, state)

    await queue.deregister(redis, config.name, jobData);

    await queue.add(redis, config.name, jobData, jobResult);

    const countProcessingJobs = await queue.countProcessing(redis, config.name);
    const countQueuedJobs = await queue.countQueued(redis, config.name);

    await startJobs(jobDefinition, countProcessingJobs, countQueuedJobs);

    return jobResult;

  } catch (e) {
    
    return e;

  } finally {

    await browser.close();
    
    await redis.quit();

  }

}

const executeSingleJob = async (jobDefinition, firstRun = true) => {

  const browser = await puppeteer.launch();
  const state = {
    firstRun: firstRun ? '1' : '0'
  };

  const jobResult = await runJob(browser, jobDefinition, state);

  await browser.close();

  return jobResult;

};

module.exports = {
  execute,
  executeSingleJob,
}