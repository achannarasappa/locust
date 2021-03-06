const R = require('ramda');
const {
  QueueError,
  QueueEndError,
} = require('./error');

const DEFAULT_CONFIG = {
  name: 'default',
  concurrencyLimit: 10,
  depthLimit: 1,
};

const DEFAULT_STATE = {
  firstRun: 1,
  status: 'ACTIVE',
};

const DEFAULT_JOB_META = { depth: 0 };

const _convertNumericKeys = R.pipe(
  R.toPairs,
  R.map(([k, v]) => {

    if (R.includes(k, [
      'concurrencyLimit',
      'depthLimit',
      'firstRun',
    ]))
      return [k, Number(v)];

    return [k, v];

  }),
  R.fromPairs,
);

const _parseAndPluckUrl = R.pipe(
  R.map(JSON.parse),
  R.pluck('url'),
);

const _sync = async (redis, key, queueName, defaultValue, overrideValue = {}) => {

  /* istanbul ignore next */
  const redisValue = (await redis.hgetall(`sc:${queueName}:${key}`)) || {};

  const value = _convertNumericKeys(R.mergeAll([
    defaultValue,
    redisValue,
    overrideValue,
  ]));

  /* istanbul ignore else */
  if (!R.equals(redisValue, value))
    await redis.hmset(`sc:${queueName}:${key}`, value);

  return value;

};

const _popJob = async (redis, queueName) => {

  const jobData = await redis.lpop(`sc:${queueName}:jobs:queued`);

  return JSON.parse(jobData);

};

const _popFirstJob = async (redis, queueName, url) => {

  await redis.hset(`sc:${queueName}:state`, 'firstRun', 0);

  return R.merge(DEFAULT_JOB_META, { url });

};

const _checkJobExists = async (redis, queueName, url) => {

  const exsitsInProcessing = await redis.hexists(`sc:${queueName}:jobs:processing`, url) === 1;
  const existsInDone = await redis.hexists(`sc:${queueName}:jobs:done`, url) === 1;

  return exsitsInProcessing || existsInDone;

};

const getSnapshot = async (redis, queueName) => ({
  state: _convertNumericKeys(await redis.hgetall(`sc:${queueName}:state`)),
  queue: {
    processing: await redis.hkeys(`sc:${queueName}:jobs:processing`),
    done: await redis.hkeys(`sc:${queueName}:jobs:done`),
    queued: _parseAndPluckUrl(await redis.lrange(`sc:${queueName}:jobs:queued`, '0', '-1')),
  },
});

const register = async (redis, jobDefinition, logger) => {

  logger.debug('Starting queue registration');

  const config = await _sync(redis, 'config', jobDefinition.config.name, DEFAULT_CONFIG, jobDefinition.config);
  const state = await _sync(redis, 'state', jobDefinition.config.name, DEFAULT_STATE, jobDefinition.state);
  const queueName = config.name;

  if (state.status !== 'ACTIVE') {

    logger.debug('Queue is not in active state');
    throw new QueueEndError(`Queue '${queueName}' is not active`);

  }

  const snapshot = await getSnapshot(redis, queueName);

  if (snapshot.queue.processing.length >= config.concurrencyLimit) {

    logger.debug('Concurrency limit was temporarily reached');
    throw new QueueError(`Queue '${queueName}' has reached concurrency limit`);

  }

  if (snapshot.queue.queued.length === 0 && state.firstRun === 0) {

    logger.debug('There are no more jobs in the queue');
    throw new QueueEndError(`Queue '${queueName}' has no more queued jobs`);

  }

  const jobData = (state.firstRun === 1)
    ? await _popFirstJob(redis, queueName, (new URL(jobDefinition.url)).href)
    : await _popJob(redis, queueName);

  const doesJobExist = await _checkJobExists(redis, queueName, jobData.url);

  logger.debug('Popped job from queue');

  if (doesJobExist) {

    logger.debug('A job with this url has already be processed');
    throw new QueueError(`Queue '${queueName}' has already processed ${jobData.url}`, jobData.url);

  }

  if (jobData.depth > config.depthLimit) {

    logger.debug('Depth limit had been reached');
    throw new QueueEndError(`Queue '${queueName}' has reached depth limit`, jobData.url);

  }

  await redis.hset(`sc:${queueName}:jobs:processing`, jobData.url, JSON.stringify(jobData));

  logger.debug(`Registered job '${jobData.url}' with queue`);

  return {
    config,
    snapshot,
    jobData,
  };

};

const remove = async (redis, queueName) => {

  const pipeline = redis.pipeline();
  const keys = await redis.keys(`sc:${queueName}:*`);

  keys.map((key) => pipeline.del(key));

  return pipeline.exec();

};

const deregister = async (redis, queueName, jobData, logger) => {

  const exsitsInProcessing = await redis.hexists(`sc:${queueName}:jobs:processing`, jobData.url) === 1;

  if (!exsitsInProcessing) {

    logger.debug('Job being processed by this function was unecpectedly missing from queue');
    throw new Error(`Expected job '${jobData.url}' is missing from processing queue!`);

  }

  logger.debug('Deregistered job from the queue');

  return redis.pipeline()
    .hmset(`sc:${queueName}:jobs:done`, jobData.url, JSON.stringify(jobData))
    .hdel(`sc:${queueName}:jobs:processing`, jobData.url)
    .exec();

};

const add = async (redis, queueName, jobData, jobResult, logger) => {

  logger.debug('Adding new links to queue');

  const pipeline = redis.pipeline();
  const depth = jobData.depth + 1;

  const snapshot = await getSnapshot(redis, queueName);

  R.uniq(jobResult.links)
    .filter((link) => !snapshot.queue.queued.includes(link)
      && !snapshot.queue.processing.includes(link)
      && !snapshot.queue.done.includes(link))
    .map((url) => pipeline.rpush(`sc:${queueName}:jobs:queued`, JSON.stringify({
      url,
      depth,
    })));

  await pipeline.exec();
  return getSnapshot(redis, queueName);

};

const stop = (jobData, logger) => () => {

  logger.debug('Sending user-defined stop signal');
  throw new QueueEndError('Queue has met user defined stop condition', jobData.url);

};

const inactivate = (redis, queueName) => redis.hset(`sc:${queueName}:state`, 'status', 'INACTIVE');

module.exports = {
  register,
  deregister,
  add,
  remove,
  getSnapshot,
  stop,
  inactivate,
};
