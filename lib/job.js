const R = require('ramda');
const Joi = require('joi');
const { BrowserError } = require('./error');

const JOB_DEFINITION_SCHEMA = Joi.object().keys({
  beforeAll: Joi.func().maxArity(3),
  beforeStart: Joi.func().maxArity(1),
  before: Joi.func().maxArity(3),
  after: Joi.func().maxArity(3),
  start: Joi.func().maxArity(0).required(),
  extract: Joi.func().maxArity(4),
  url: Joi.string().uri({ scheme: [/https?/] }).required(),
  config: Joi.object().keys({
    name: Joi.string().required(),
    concurrencyLimit: Joi.number().integer().positive().required(),
    depthLimit: Joi.number().integer().positive().required(),
    logLevel: Joi.string(),
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
    chrome: Joi.object().keys({ browserWSEndpoint: Joi.string() }).unknown().required(),
  }).required(),
});

const _filterLinks = (links, filter) => {

  if (!filter)
    return links;

  if (typeof filter === 'function')
    return filter(links);

  const {
    allowList = [],
    blockList = [],
  } = filter;

  return R.pipe(
    R.reduce((acc, url) => {

      // eslint-disable-next-line no-useless-escape
      if (/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(url))
        return acc.concat(new URL(url));

      return acc;

    }, []),
    R.reject((url) => R.includes(url.hostname, blockList)),
    R.reject((url) => allowList.length > 0 && !R.includes(url.hostname, allowList)),
    R.pluck('href'),
  )(links);

};

const validate = async (jobDefinition) => Joi.validate(
  jobDefinition,
  JOB_DEFINITION_SCHEMA,
  { abortEarly: false },
);

/* istanbul ignore next */
const runJob = async (browser, jobDefinition, jobData, snapshot, logger) => {

  logger.debug('Started processing job');

  if (jobDefinition.beforeStart)
    jobDefinition.beforeStart(jobData);

  if (jobDefinition.beforeAll && snapshot.state.firstRun === 1) {

    logger.debug('Running beforeAll hook');
    await jobDefinition.beforeAll(browser, snapshot, jobData);

  }

  const page = await browser.newPage();

  if (jobDefinition.before) {

    logger.debug('Running before hook');
    await jobDefinition.before(page, snapshot, jobData);

  }

  logger.debug('Starting HTTP request');

  const browserResponse = await page.goto(jobData.url, jobDefinition.navigationOptions);
  const response = {
    ok: await browserResponse.ok(),
    status: await browserResponse.status(),
    statusText: await browserResponse.statusText(),
    headers: await browserResponse.headers(),
    url: await browserResponse.url(),
    body: await browserResponse.text(),
  };

  if (!response.ok) {

    logger.debug('HTTP request returned a non-200 response');
    throw new BrowserError(response);

  }

  logger.debug('HTTP request returned a successful response');

  const links = await page.$$eval('a', (v) => v.map((a) => a.href));
  const $ = async (selector) => page.$eval(selector, (el) => el.textContent).catch(() => null);
  let data;

  if (jobDefinition.extract) {

    logger.debug('Running extract hook');
    data = await jobDefinition.extract($, page, browser, jobData);

  }

  logger.debug('Finished processing job');

  return {
    cookies: await page.cookies(),
    data,
    links: _filterLinks(links, jobDefinition.filter),
    response,
  };

};

const startJobs = async (jobDefinition, snapshot) => {

  const { concurrencyLimit } = jobDefinition.config;
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
      .map(async () => jobDefinition.start()),
  );

};

const delay = async (jobDefinition, logger) => new Promise((resolve) => {

  if (!R.hasPath(['config', 'delay'], jobDefinition))
    return resolve();

  logger.debug(`Delaying job execution by ${jobDefinition.config.delay}ms`);
  return setTimeout(() => resolve(), jobDefinition.config.delay);

});

const afterJob = async (jobDefinition, jobResult, snapshot, stopQueue) => {

  /* istanbul ignore else */
  if (R.has('after', jobDefinition))
    await jobDefinition.after(jobResult, snapshot, stopQueue);

};

module.exports = {
  _filterLinks,
  runJob,
  startJobs,
  delay,
  afterJob,
  validate,
};
