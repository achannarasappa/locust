#!/usr/bin/env node
const yargs = require('yargs');
const { run } = require('../lib/cli');

yargs
  .scriptName('cli')
  .command('run', 'run a single job', (yargs) => {

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

    }, async ({ _: [ cmd, filePath ], includeHtml, includeLinks }) => {
      
      return await run(filePath, includeHtml, includeLinks);
  
    })
    
  })
  .command('start', 'starts a job and crawls until a stop condition is met', (yargs) => {
  
    return yargs
      .option('follow-links', {
        describe: 'Start a full local crawl and follow links until a stop condition is met using redis and chrome',
        default: false,
      })
      .option('bootstrap', {
        describe: 'Start redis and browserless Docker containers if not already available',
        default: false,
      })
      .alias('f', 'follow-links')
      .alias('b', 'bootstrap')
      .demandCommand(1, 'A file path to a job file is required')
      .usage('cli run <path_to_file>')
      .example('cli run job.js', 'Runs a single job and stops after the first page')
      .example('cli run -f job.js', 'Runs a job and crawls until a stop condition is met')
      .example('cli run -f -b job.js', 'Starts redis and browserless containers if they are not already running')
      .help()
  
  })
  .command('generate', 'generate a job definition through a series of prompts', (yargs) => {
  
    console.log('run generator');
  
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