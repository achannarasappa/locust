const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const queue = require('./queue');
const {
  QueueError,
  QueueEndError,
  GeneralJobError,
} = require('./error');
const job = require('./job');

const execute = async (jobDefinition) => {

  let browser;
  let redis;
  let jobUrl;

  await job.validate(jobDefinition);

  try {

    redis = await new Redis(jobDefinition.connection.redis);
    browser = await puppeteer.launch(jobDefinition.connection.chrome);

    const {
      snapshot: beforeSnapshot,
      config,
      jobData,
    } = await queue.register(redis, jobDefinition);
    jobUrl = jobData.url;

    await job.delay(jobDefinition);

    const jobResult = await job.runJob(browser, jobDefinition, jobData, beforeSnapshot);

    await queue.deregister(redis, config.name, jobData);

    const afterSnapshot = await queue.add(redis, config.name, jobData, jobResult);

    await job.afterJob(jobDefinition, jobResult, afterSnapshot, queue.stop(redis, config.name));

    await job.startJobs(jobDefinition, afterSnapshot);

    return jobResult;

  } catch (e) {

    if (e instanceof QueueError || e instanceof QueueEndError)
      return e;

    if (e.name === 'Error')
      throw new GeneralJobError(e.message, jobUrl);

    throw e;

  } finally {

    if (browser)
      await browser.close();

    if (redis)
      await redis.quit();

  }

};

module.exports = execute;
