const R = require('ramda');

const runJob = async (browser, jobDefinition, JobData, snapshot) => {

  if (jobDefinition.beforeAll && snapshot.state.firstRun === 1)
    await jobDefinition.beforeAll(browser, snapshot);

  const page = await browser.newPage();

  if (jobDefinition.before)
    await jobDefinition.before(page, snapshot);

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
}