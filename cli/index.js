const prettyjson = require('prettyjson');
const { executeSingleJob } = require('../lib/fn');
const R = require('ramda');
const shell = require('shelljs');

const run = async (filePath, includeHtml, includeLinks, includeCookies) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);
  const jobResult = await executeSingleJob(jobDefinition);
  const jobResultFiltered = R.pipe(
    R.pick([
      'response',
      'data',
      includeCookies ? 'cookies' : undefined,
      includeLinks ? 'links' : undefined,
    ]),
    (result) => !includeHtml ? R.dissocPath([ 'response', 'body' ], result) : result
  )(jobResult);

  return console.log(prettyjson.render(jobResultFiltered));

};

const start = async (filePath, bootstrap) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);
  
  if (!bootstrap)
    return await execute(jobDefinition);

  console.log('bootstrapping redis and browserless...');

  if (!shell.which('docker')) {
    console.log('docker missing from the system!');
    return;
  }

  if (!shell.which('docker-compose')) {
    console.log('docker-compose missing from the system!');
    return;
  }
  
  console.log('done');

};

module.exports = {
  run,
  start,
}