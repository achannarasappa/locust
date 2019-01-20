const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const { register, deregister } = require('./queue');
const { runJob } = require('./job');

const execute = async (jobDefinition) => {

  try {

    const redis = await new Redis(jobDefinition.connection.redis);

    const { state, jobData } = await register(redis, jobDefinition);

    const store = await getStore(redis);

    const browser = await puppeteer.launch(jobDefinition.connection.chrome);

    const jobResult = await runJob(browser, jobDefinition, state, store)

    await deregister(redis, jobData);

    return jobResult;

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