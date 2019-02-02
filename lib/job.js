const R = require('ramda');

const runJob = async (browser, jobDefinition, state) => {

  if (jobDefinition.beforeAll && state.firstRun === '1')
    await jobDefinition.beforeAll(browser, state);

  const page = await browser.newPage();

  if (jobDefinition.before)
    await jobDefinition.before(page, state);

  const response = await page.goto(jobDefinition.url, jobDefinition.navigationOptions);

  const links = await page.$$eval('a', links => links.map(link => link.href));
  const $ = async (selector) => await page.$eval(selector, el => el.text);
  
  const data = jobDefinition.extract && await jobDefinition.extract($, browser);

  return {
    cookies: await page.cookies(),
    data,
    links: _filterLinks(links, jobDefinition.allowList, jobDefinition.blockList),
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

const startJobs = async (jobDefinition, concurrencyLimit) => {

  

};

const _filterLinks = (links, allowList = [], blockList = []) => R.pipe(
  R.reduce((acc, url) => {
    try {
      return acc.concat(new URL(url));
    } catch (e) {
      return acc;
    }
  }, []),
  R.reject((url) => R.includes(url.hostname, blockList)),
  R.reject((url) => allowList.length > 0 && !R.includes(url.hostname, allowList)),
  R.pluck('href')
)(links);

module.exports = {
  _filterLinks,
  runJob,
  startJobs,
}