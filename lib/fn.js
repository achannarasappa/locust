const Redis = require('ioredis');
const puppeteer = require('puppeteer-core');
const queue = require('./queue');
const createLogger = require('./logger');
const {
  QueueError,
  QueueEndError,
  GeneralJobError,
} = require('./error');
const job = require('./job');

const execute = async (jobDefinition) => {

  const logger = createLogger(jobDefinition);

  logger.info('Started executing job');

  let browser;
  let redis;
  let jobUrl;

  await job.validate(jobDefinition);

  try {

    logger.debug('Connecting to Redis and Chrome');

    redis = await new Redis(jobDefinition.connection.redis);
    browser = await puppeteer.connect(jobDefinition.connection.chrome);

    const {
      snapshot: beforeSnapshot,
      config,
      jobData,
    } = await queue.register(redis, jobDefinition, logger);
    jobUrl = jobData.url;

    await job.delay(jobDefinition, logger);

    const jobResult = await job.runJob(browser, jobDefinition, jobData, beforeSnapshot, logger);

    await queue.deregister(redis, config.name, jobData, logger);

    const afterSnapshot = await queue.add(redis, config.name, jobData, jobResult, logger);

    logger.debug('Running after hook');

    await job.afterJob(jobDefinition, jobResult, afterSnapshot, queue.stop(jobData, logger));

    logger.debug('Running start hook');

    await job.startJobs(jobDefinition, afterSnapshot);

    logger.info('Finished executing job');

    return jobResult;

  } catch (e) {

    if (e instanceof QueueEndError) {

      logger.info('Aborting job and signalling other jobs to stop since end signal was sent');
      await queue.inactivate(redis, jobDefinition.config.name);
      return e;

    }

    if (e instanceof QueueError) {

      logger.info('Aborting job since temporary limit was met');
      return e;

    }

    if (e.name === 'Error') {

      logger.error(e.message, e);
      throw new GeneralJobError(e.message, jobUrl);

    }

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
