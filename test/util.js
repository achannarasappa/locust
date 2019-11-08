const clearRedis = async (redis, filter) => {

  const pipeline = redis.pipeline();
  const keys = await redis.keys(filter);

  keys.map((key) => pipeline.del(key));

  return pipeline.exec();

};

module.exports = {
  clearRedis,
};
