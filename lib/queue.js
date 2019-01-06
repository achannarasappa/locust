const R = require('ramda');

const DEFAULT_CONFIG = {
  name: 'default',
  concurrencyLimit: '10',
  depth: '1',
};

const DEFAULT_STATE = {
  firstRun: 0,
  status: 'ACTIVE'
};

const register = async (redis, job) => {

  const config = await _sync(redis, 'config', job.config.name, DEFAULT_CONFIG, job.config);

  const state = await _sync(redis, 'state', job.config.name, DEFAULT_STATE, job.state);

  if (state.status !== 'ACTIVE')
    throw new Error(`Queue '${job.config.name}' is not active`);

  const countActiveJobs = redis.zcount(`sc:${job.config.name}:jobs:processing`, '-inf', '+inf');

  if (parseInt(countActiveJobs, 10) + 1 > parseInt(config.concurrencyLimit, 10))
    throw new Error(`Queue '${job.config.name}' has reached concurrency limit`);

  return {
    config,
    state,
  }

};

const _sync = async (redis, key, queueName, defaultValue, overrideValue = {}) => {

  const redisValue = await redis.hgetall(`sc:${queueName}:${key}`);

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

};

module.exports = {
  register,
  deregister,
}