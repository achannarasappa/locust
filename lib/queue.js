const R = require('ramda');
const { QueueError } = require('./error');

const DEFAULT_CONFIG = {
  name: 'default',
  concurrencyLimit: '10',
  depthLimit: '1',
};

const DEFAULT_STATE = {
  firstRun: '1',
  status: 'ACTIVE'
};

const DEFAULT_JOB_META = {
  depth: 0
};

const register = async (redis, job) => {

  const config = await _sync(redis, 'config', job.config.name, DEFAULT_CONFIG, job.config);
  const state = await _sync(redis, 'state', job.config.name, DEFAULT_STATE, job.state);

  if (state.status !== 'ACTIVE')
    throw new QueueError(`Queue '${config.name}' is not active`);

  const countActiveJobs = (await redis.hlen(`sc:${config.name}:jobs:processing`)) || 0;
  
  if (Number(countActiveJobs) >= Number(config.concurrencyLimit))
    throw new QueueError(`Queue '${config.name}' has reached concurrency limit`);

  const jobData = { depth, url } = (state.firstRun === '1')
    ? await _popFirstJob(redis, config.name, job.url)
    : await _popJob(redis, config.name)

  const doesJobExist = await _checkJobExists(redis, config.name, url);

  if (doesJobExist)
    throw new QueueError(`Queue '${config.name}' has already processed ${url}`);
    
  if (depth > Number(config.depthLimit))
    throw new QueueError(`Queue '${config.name}' has reached depth limit`);

  await redis.hset(`sc:${config.name}:jobs:processing`, url, JSON.stringify(jobData))

  return {
    config,
    state,
    jobData,
  }

};

const _checkJobExists = async (redis, queueName, url) => {

  const exsitsInProcessing = 1 === await redis.hexists(`sc:${queueName}:jobs:processing`, url);
  const existsInDone = 1 === await redis.hexists(`sc:${queueName}:jobs:done`, url);
  
  return exsitsInProcessing || existsInDone;

}; 

const _popJob = async (redis, queueName) => {
  
  const jobData = await redis.lpop(`sc:${queueName}:jobs:queued`);

  return JSON.parse(jobData);

};

const _popFirstJob = async (redis, queueName, url) => {

  await redis.hset(`sc:${queueName}:state`, 'firstRun', '0')

  return R.merge(DEFAULT_JOB_META, {
    url
  });

};

const _sync = async (redis, key, queueName, defaultValue, overrideValue = {}) => {

  const redisValue = (await redis.hgetall(`sc:${queueName}:${key}`)) || {};

  const value = R.mergeAll([
    defaultValue,
    redisValue,
    overrideValue,
  ]);

  if (!R.equals(redisValue, value))
    await redis.hmset(`sc:${queueName}:${key}`, value)

  return value;

};

const _clear = async (redis, queueName) => {

  const pipeline = redis.pipeline();
  const keys = await redis.keys(`sc:${queueName}:*`)
  
  keys.map((key) => pipeline.del(key));

  return await pipeline.exec();

};

const deregister = (redis) => {

  // TODO: add queue remove
  // queue new links
  // start new jobs

};

module.exports = {
  register,
  deregister,
}