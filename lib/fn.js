const Redis = require('ioredis');
const puppeteer = require('puppeteer-core');
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
    browser = await puppeteer.connect(jobDefinition.connection.chrome);

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

    await job.afterJob(jobDefinition, jobResult, afterSnapshot, queue.stop(jobData));

    await job.startJobs(jobDefinition, afterSnapshot);

    return jobResult;

  } catch (e) {

    if (e instanceof QueueEndError) {

      await queue.inactivate(redis, jobDefinition.config.name);
      return e;

    }

    if (e instanceof QueueError)
      return e;

    if (e.name === 'Error')
      throw new GeneralJobError(e.message, jobUrl);

    throw e;

  } finally {

    /* istanbul ignore else */
    if (browser)
      await browser.close();

    /* istanbul ignore else */
    if (redis)
      await redis.quit();

  }

};

module.exports = execute;
