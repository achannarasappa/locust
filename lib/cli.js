const prettyjson = require('prettyjson');
const { executeSingleJob } = require('./fn');
const R = require('ramda');

const run = async (filePath, includeHtml, includeLinks, includeCookies) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);
  const jobResult = await executeSingleJob(jobDefinition);
  const jobResultFiltered = R.pick([
    'response',
    'data',
    includeCookies ? 'cookies' : undefined,
    includeLinks ? 'links' : undefined,
    includeHtml ? 'body' : undefined,
  ], jobResult);

  return console.log(prettyjson.render(jobResultFiltered));

};

module.exports = {
  run,
}