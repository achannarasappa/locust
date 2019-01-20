const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const { register, deregister } = require('./queue');
const { runJob } = require('./job');

const execute = async (job) => {

  try {

    const redis = await new Redis(job.connection.redis);

    const { state, depth } = await register(redis, job);

    const store = await getStore(redis);

    const browser = await puppeteer.launch(job.connection.chrome);

    const result = await runJob(browser, job, state, store)

    await deregister(redis, depth);

    return result;

  } catch (e) {

    console.log(e);
    console.log(e.message);

  }

};

// start new jobs up to the limit
const scale = () => {

};

const validate = () => {

};

module.exports = {
  execute,
  validate
}