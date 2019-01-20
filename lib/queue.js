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

const register = async (redis, jobDefinition) => {

  const config = await _sync(redis, 'config', jobDefinition.config.name, DEFAULT_CONFIG, jobDefinition.config);
  const state = await _sync(redis, 'state', jobDefinition.config.name, DEFAULT_STATE, jobDefinition.state);
  const queueName = config.name;

  if (state.status !== 'ACTIVE')
    throw new QueueError(`Queue '${queueName}' is not active`);

  const countActiveJobs = (await redis.hlen(`sc:${queueName}:jobs:processing`)) || 0;
  const countQueuedJobs = (await redis.llen(`sc:${queueName}:jobs:queued`)) || 0;
  
  if (Number(countActiveJobs) >= Number(config.concurrencyLimit))
    throw new QueueError(`Queue '${queueName}' has reached concurrency limit`);

  if (Number(countQueuedJobs) === 0 && state.firstRun === '0')
    throw new QueueError(`Queue '${queueName}' has no more queued jobs`);

  const jobData = { depth, url } = (state.firstRun === '1')
    ? await _popFirstJob(redis, queueName, jobDefinition.url)
    : await _popJob(redis, queueName)

  const doesJobExist = await _checkJobExists(redis, queueName, url);

  if (doesJobExist)
    throw new QueueError(`Queue '${queueName}' has already processed ${url}`);
    
  if (depth > Number(config.depthLimit))
    throw new QueueError(`Queue '${queueName}' has reached depth limit`);

  await redis.hset(`sc:${queueName}:jobs:processing`, url, JSON.stringify(jobData))

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

const deregister = async (redis, queueName, jobData) => {

  const exsitsInProcessing = 1 === await redis.hexists(`sc:${queueName}:jobs:processing`, jobData.url);
  const pipeline = redis.pipeline();

  if (!exsitsInProcessing)
    throw new Error(`Expected job '${jobData.url}' is missing from processing queue!`);

  return await pipeline.hmset(`sc:${queueName}:jobs:done`, jobData.url, JSON.stringify(jobData))
    .hdel(`sc:${queueName}:jobs:processing`, jobData.url)
    .exec();

};

const add = async (redis, queueName, jobData, jobResult) => {

  const pipeline = redis.pipeline();
  const depth = jobData.depth + 1;
  
  jobResult.links.map((url) => pipeline.rpush(`sc:${queueName}:jobs:queued`, JSON.stringify({
    url,
    depth 
  })));


  return await pipeline.exec();

};

module.exports = {
  register,
  deregister,
  add,
}