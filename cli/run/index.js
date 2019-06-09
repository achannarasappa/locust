const prettyjson = require('prettyjson');
const puppeteer = require('puppeteer');
const { filterJobResult } = require('../util');

const _executeSingleJob = async (jobDefinition, firstRun = true) => {

  const browser = await puppeteer.launch();
  const state = {
    firstRun: firstRun ? 1 : 0
  };
  const jobData = {
    url: jobDefinition.url
  };

  const jobResult = await runJob(browser, jobDefinition, jobData, state);

  await browser.close();

  return jobResult;

};

const run = async (filePath, includeHtml, includeLinks, includeCookies) => {
  
  console.log('Running in single job mode. Queue related hooks and configuration will be ignored. Check docs for more information.');
  
  const jobDefinition = require(`${process.cwd()}/${filePath}`);
  const jobResult = await _executeSingleJob(jobDefinition);
  const jobResultFiltered = filterJobResult(jobResult, includeHtml, includeLinks, includeCookies, true)

  return console.log(prettyjson.render(jobResultFiltered));

};

module.exports = run;