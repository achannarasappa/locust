const prettyjson = require('prettyjson');
const shell = require('shelljs');
const R = require('ramda');
const { writeFileSync } = require('fs');
const { executeSingleJob, execute } = require('../lib/fn');
const template = require('./generate/job-template');
const { promptJobDetails } = require('./generate/prompt');

const _filterJobResult = (jobResult, includeHtml, includeLinks, includeCookies, includeResponse) => {
  
  if (includeHtml)
    return R.path([ 'response', 'body' ], jobResult);
  
  return R.pipe(
    R.pick([
      includeResponse ? 'response' : undefined,
      'data',
      includeCookies ? 'cookies' : undefined,
      includeLinks ? 'links' : undefined,
    ]),
    R.dissocPath([ 'response', 'body' ])
  )(jobResult);
  
}

const run = async (filePath, includeHtml, includeLinks, includeCookies) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);
  const jobResult = await executeSingleJob(jobDefinition);
  const jobResultFiltered = _filterJobResult(jobResult, includeHtml, includeLinks, includeCookies, true)

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

const generateJobFile = async () => {

  const answers = await promptJobDetails();
  const jobFileContents = template(answers);

  writeFileSync(`./${answers.name}.js`, jobFileContents)

};

module.exports = {
  run,
  start,
  generateJobFile,
  _filterJobResult,
}