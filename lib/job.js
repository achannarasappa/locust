const R = require('ramda');
const Joi = require('joi');
const { BrowserError } = require('./error');

const JOB_DEFINITION_SCHEMA = Joi.object().keys({
  beforeAll: Joi.func().maxArity(3),
  beforeStart: Joi.func().maxArity(1),
  before: Joi.func().maxArity(3),
  after: Joi.func().maxArity(3),
  start: Joi.func().maxArity(0).required(),
  extract: Joi.func().maxArity(3),
  url: Joi.string().uri({
    scheme: [
      /https?/,
    ]
  }).required(),
  config: Joi.object().keys({
    name: Joi.string().required(),
    concurrencyLimit: Joi.number().integer().positive().required(),
    depthLimit: Joi.number().integer().positive().required(),
    delay: Joi.number().integer().positive(),
  }).required(),
  filter: Joi.alternatives().try(
    Joi.func().arity(1),
    Joi.object().keys({
      allowList: Joi.array().items(Joi.string()),
      blockList: Joi.array().items(Joi.string()),
    }),
  ),
  connection: Joi.object().keys({
    redis: Joi.object().keys({
      host: Joi.string().required(),
      port: Joi.number().integer().positive().required(),
    }).unknown().required(),
    chrome: Joi.object().keys({
      browserWSEndpoint: Joi.string(),
    }).unknown().required(),
  }).required(),
})

const validate = async (jobDefinition) => {

  return await Joi.validate(jobDefinition, JOB_DEFINITION_SCHEMA, {
    abortEarly: false,
  });
  
};

const runJob = async (browser, jobDefinition, jobData, snapshot) => {

  if (jobDefinition.beforeStart)
    jobDefinition.beforeStart(jobData);

  if (jobDefinition.beforeAll && snapshot.state.firstRun === 1)
    await jobDefinition.beforeAll(browser, snapshot, jobData);

  const page = await browser.newPage();

  if (jobDefinition.before)
    await jobDefinition.before(page, snapshot, jobData);

  const browserResponse = await page.goto(jobData.url, jobDefinition.navigationOptions);
  const response = {
    ok: await browserResponse.ok(),
    status: await browserResponse.status(),
    statusText: await browserResponse.statusText(),
    headers: await browserResponse.headers(),
    url: await browserResponse.url(),
    body: await browserResponse.text(),
  };

  if (!response.ok)
    throw new BrowserError(response);

  const links = await page.$$eval('a', links => links.map(link => link.href));
  const $ = async (selector) => await page.$eval(selector, el => el.text).catch((e) => null);
  
  const data = jobDefinition.extract && await jobDefinition.extract($, browser, jobData);

  return {
    cookies: await page.cookies(),
    data,
    links: _filterLinks(links, jobDefinition.filter),
    response,
  };

};

const startJobs = async (jobDefinition, snapshot) => {

  const concurrencyLimit = jobDefinition.config.concurrencyLimit;
  const countQueuedJobs = snapshot.queue.queued.length;
  const countProcessingJobs = snapshot.queue.processing.length;

  if (countQueuedJobs === 0)
    return;

  if (countProcessingJobs >= concurrencyLimit)
    return;

  const countNewJobs = R.min(concurrencyLimit - countProcessingJobs, countQueuedJobs);

  return Promise.all(
    Array(countNewJobs)
      .fill(0)
      .map(async () => await jobDefinition.start()
    )
  );
};

const delay = async (jobDefinition) => new Promise((resolve) => {

  if (!R.hasPath([ 'config', 'delay' ], jobDefinition))
    return resolve();

  return setTimeout(() => resolve(), jobDefinition.config.delay);

});

const afterJob = async (jobDefinition, jobResult, snapshot, stopQueue) => {

  if (R.has('after', jobDefinition))
    return jobDefinition.after(jobResult, snapshot, stopQueue);

};

const _filterLinks = (links, filter) => {
  
  if (!filter)
    return links;

  if (typeof filter === 'function')
    return filter(links);

  const { allowList = [], blockList = [] } = filter;

  return R.pipe(
    R.reduce((acc, url) => {

      if (/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(url))
        return acc.concat(new URL(url))

      return acc;

    }, []),
    R.reject((url) => R.includes(url.hostname, blockList)),
    R.reject((url) => allowList.length > 0 && !R.includes(url.hostname, allowList)),
    R.pluck('href'),
  )(links)
};

module.exports = {
  _filterLinks,
  runJob,
  startJobs,
  delay,
  afterJob,
  validate,
}