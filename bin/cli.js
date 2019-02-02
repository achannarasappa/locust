#!/usr/bin/env node
const yargs = require('yargs');
const { run, start, generateJobFile } = require('../cli');

yargs
  .scriptName('cli')
  .command('run', 'run in single job mode', (yargs) => {

    return yargs
    .command('*', false, (yargs) => {

      return yargs
        .option('includeHtml', {
          describe: 'include html in the response',
          default: false,
        })
        .option('includeLinks', {
          describe: 'include links in the response',
          default: false,
        })
        .option('includeCookies', {
          describe: 'include cookies in the response',
          default: false,
        })
        .alias('t', 'includeHtml')
        .alias('l', 'includeLinks')
        .alias('c', 'includeCookies')
        .demandCommand(1, 'A file path to a job file is required')
        .usage('cli run <path_to_file>')
        .example('cli run job.js', 'Runs a single job and returns the results')
        .example('cli run job.js -l -t -c', 'Include all response fields')
        .help()

    }, async ({ _: [ cmd, filePath ], includeHtml, includeLinks, includeCookies }) => {
      
      return await run(filePath, includeHtml, includeLinks, includeCookies);
  
    })
    
  })
  .command('start', 'starts a job and crawls until a stop condition is met', (yargs) => {

    return yargs
    .command('*', false, (yargs) => {

      return yargs
        .option('bootstrap', {
          describe: 'Start redis and browserless Docker containers if not already available',
          default: false,
        })
        .alias('b', 'bootstrap')
        .demandCommand(1, 'A file path to a job file is required')
        .usage('cli start <path_to_file>')
        .example('cli start job.js', 'Runs a single job and stops after the first page')
        .example('cli start -b job.js', 'Starts redis and browserless containers if they are not already running')
        .help()

    }, async ({ _: [ cmd, filePath ], bootstrap }) => {
      
      return await start(filePath, bootstrap);
  
    })
  
  })
  .command('generate', 'generate a job definition through a series of prompts', (yargs) => yargs, async () => {

      return await generateJobFile();

  })
  .command('validate', 'validate a job definition', (yargs) => {
  
    console.log('run validator');
  
  })
  .alias('v', 'version')
  .alias('h', 'help')
  .demandCommand(1, 'A command is required')
  .usage('cli <command>')
  .help()
  .argv;