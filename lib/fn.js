const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const queue = require('./queue');
const { QueueError } = require('./error');
const job = { runJob, startJobs, afterJob, } = require('./job');

const execute = async (jobDefinition) => {

  let browser;
  let redis;

  try {
    
    redis = await new Redis(jobDefinition.connection.redis);
    browser = await puppeteer.launch(jobDefinition.connection.chrome);

    await job.validate(jobDefinition);

    const { snapshot: beforeSnapshot, config, jobData } = await queue.register(redis, jobDefinition);

    await job.delay(jobDefinition);

    const jobResult = await runJob(browser, jobDefinition, jobData, beforeSnapshot)

    await queue.deregister(redis, config.name, jobData);

    const afterSnapshot = await queue.add(redis, config.name, jobData, jobResult);

    await afterJob(jobDefinition, jobResult, afterSnapshot, queue.stop(redis, config.name));

    await startJobs(jobDefinition, afterSnapshot);
    
    return jobResult;

  } catch (e) {

    if (e instanceof QueueError)
      return e;

    throw e;

  } finally {

    await browser.close();
    
    await redis.quit();

  }

}

module.exports = {
  execute,
}