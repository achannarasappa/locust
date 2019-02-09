const prettyjson = require('prettyjson');
const shell = require('shelljs');
const R = require('ramda');
const Redis = require('ioredis');
const { writeFileSync } = require('fs');
const { executeSingleJob, execute } = require('../lib/fn');
const queue = require('../lib/queue');
const template = require('./generate/job-template');
const { promptJobDetails } = require('./generate/prompt');

const _isValidResult = R.allPass([
  R.has('response'),
  R.has('cookies'),
  R.has('links'),
  R.has('data'),
  R.hasPath([ 'response', 'body' ]),
  R.hasPath([ 'response', 'url' ]),
])

const _filterJobResult = (jobResult, includeHtml, includeLinks, includeCookies, includeResponse) => {

  if (!jobResult)
    return {};

  if (!_isValidResult(jobResult))
    return jobResult;

  if (includeHtml)
    return R.path([ 'response', 'body' ], jobResult);
  
  return R.pipe(
    R.pick([
      includeResponse ? 'response' : undefined,
      'data',
      includeCookies ? 'cookies' : undefined,
      includeLinks ? 'links' : undefined,
    ]),
    R.dissocPath([ 'response', 'body' ]),
    R.assoc('url', R.path([ 'response', 'url' ], jobResult)),
  )(jobResult);
  
}

const run = async (filePath, includeHtml, includeLinks, includeCookies) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);
  const jobResult = await executeSingleJob(jobDefinition);
  const jobResultFiltered = _filterJobResult(jobResult, includeHtml, includeLinks, includeCookies, true)

  return console.log(prettyjson.render(jobResultFiltered));

};

const start = async (filePath, bootstrap, reset) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);
  
  if (bootstrap) {

    console.log('Starting redis and chrome...');

    if (!shell.which('docker')) {
      console.log('docker is missing from the system!');
      return;
    }

    if (!shell.which('docker-compose')) {
      console.log('docker-compose is missing from the system!');
      return;
    }
    
    const { code } = shell.exec('docker-compose -f ./cli/start/docker-compose.yml up -d')

    if (code === 0)
      return console.log([
        'Successfully started redis and chrome',
        'To stop run: docker-compose -f ./cli/start/docker-compose.yml down',
      ].join('\n'))

  }

  if (reset) {

    const redis = await new Redis(jobDefinition.connection.redis);

    await queue.remove(redis, jobDefinition.config.name)

    await redis.quit();

    console.log(`Successfully reset queue '${jobDefinition.config.name}'`);

  }

  const jobResult = await execute(jobDefinition);
  
  const jobResultFiltered = _filterJobResult(jobResult, false, true, false, false);

  return console.log(prettyjson.render(jobResultFiltered));

};

const stop = async () => {

  shell.exec('docker-compose -f ./cli/start/docker-compose.yml down')

}

const generateJobFile = async () => {

  const answers = await promptJobDetails();
  const jobFileContents = template(answers);

  writeFileSync(`./${answers.name}.js`, jobFileContents)

};

module.exports = {
  run,
  start,
  stop,
  generateJobFile,
  _filterJobResult,
}