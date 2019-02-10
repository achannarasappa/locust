const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const queue = require('./queue');
const { QueueError } = require('./error');
const { runJob, startJobs, delay, afterJob } = require('./job');

const execute = async (jobDefinition) => {

  const redis = await new Redis(jobDefinition.connection.redis);
  const browser = await puppeteer.launch(jobDefinition.connection.chrome);

  try {

    // TODO: check browser and redis connectivity

    const { snapshot: beforeSnapshot, config, jobData } = await queue.register(redis, jobDefinition);

    await delay(jobDefinition);

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