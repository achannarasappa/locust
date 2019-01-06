const R = require('ramda');

const runJob = async (browser, job, state) => {

  if (job.beforeAll && !state.firstRun)
    await job.beforeAll(browser, state);

  const page = await browser.newPage();

  if (job.before)
    await job.before(page, state);

  const response = await page.goto(job.url, job.navigationOptions);

  const links = await page.$$eval('a', links => links.map(link => link.href));
  
  const body = job.extract
  ? await job.extract(page, browser)
  : await response.text();

  return {
    cookies: await page.cookies(),
    body,
    links: _filterLinks(links, job.allowList, job.blockList),
    response: {
      ok: await response.ok(),
      status: await response.status(),
      statusText: await response.statusText(),
      headers: await response.headers(),
      url: await response.url(),
    }
  };

};

const _filterLinks = (links, allowList = [], blockList = []) => R.pipe(
  R.map((url) => new URL(url)),
  R.reject((url) => R.includes(url.hostname, blockList)),
  R.reject((url) => allowList.length > 0 && !R.includes(url.hostname, allowList)),
  R.pluck('href')
)(links);

module.exports = {
  _filterLinks,
  runJob
}