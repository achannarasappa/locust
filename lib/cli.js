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

const start = async (filePath, bootstrap) => {

  // if bootstrap,
    // if does is not installed on the system, warn and exit
    // if redis does not exist, start redis
    // if redis does exist, exit
    // if browserless does not exist, start browserless
    // if browserless does exist, exit
  // overwrite job components
    // 'start' hook with command line start
    // 'connection' hook with local connection details


};

module.exports = {
  run,
  start,
}