const R = require('ramda');

const runJob = async (browser, jobDefinition, JobData, state) => {

  if (jobDefinition.beforeAll && state.firstRun === 1)
    await jobDefinition.beforeAll(browser, state);

  const page = await browser.newPage();

  if (jobDefinition.before)
    await jobDefinition.before(page, state);

  const response = await page.goto(JobData.url, jobDefinition.navigationOptions);

  const links = await page.$$eval('a', links => links.map(link => link.href));
  const $ = async (selector) => await page.$eval(selector, el => el.text).catch((e) => null);
  
  const data = jobDefinition.extract && await jobDefinition.extract($, browser);

  return {
    cookies: await page.cookies(),
    data,
    links: _filterLinks(links, jobDefinition.filter || {}),
    response: {
      ok: await response.ok(),
      status: await response.status(),
      statusText: await response.statusText(),
      headers: await response.headers(),
      url: await response.url(),
      body: await response.text(),
    }
  };

};

const startJobs = async (jobDefinition, countProcessingJobs, countQueuedJobs) => {

  const concurrencyLimit = jobDefinition.config.concurrencyLimit;

  if (countQueuedJobs === 0)
    return;

  if (countProcessingJobs >= concurrencyLimit)
    return;

  const countNewJobs = R.min(concurrencyLimit - countProcessingJobs, countQueuedJobs);

  return Array(countNewJobs)
  .fill(0)
  .map(() => {

    jobDefinition.start()
    return;

  });

};

const delay = async (jobDefinition) => new Promise((resolve) => {

  if (!R.hasPath([ 'config', 'delay' ], jobDefinition))
    return resolve();

  return setTimeout(() => resolve(), jobDefinition.config.delay);

});

const _filterLinks = (links, { allowList = [], blockList = [] }) => R.pipe(
  R.reduce((acc, url) => {

    if (/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(url))
      return acc.concat(new URL(url))

    return acc;

  }, []),
  R.reject((url) => R.includes(url.hostname, blockList)),
  R.reject((url) => allowList.length > 0 && !R.includes(url.hostname, allowList)),
  R.pluck('href'),
  R.takeLast(3),
)(links);

module.exports = {
  _filterLinks,
  runJob,
  startJobs,
  delay,
}