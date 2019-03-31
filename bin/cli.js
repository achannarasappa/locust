#!/usr/bin/env node
const yargs = require('yargs');
const { run, start, stop, info, generateJobFile, validateJobFile } = require('../cli');

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
        .option('reset', {
          describe: 'Reset queue state before starting',
          default: false,
        })
        .alias('b', 'bootstrap')
        .alias('r', 'reset')
        .demandCommand(1, 'A file path to a job file is required')
        .usage('cli start <path_to_file>')
        .example('cli start job.js', 'Starts a job')
        .example('cli start -b job.js', 'Starts redis and browserless containers if they are not already running')
        .help()

    }, async ({ _: [ cmd, filePath ], bootstrap, reset }) => {
      
      return await start(filePath, bootstrap, reset);
  
    })
  
  })
  .command('stop', 'Stop running jobs and stop redis and browserless containers', (yargs) => {

    return yargs
    .command('*', false, (yargs) => {

      return yargs
        .usage('cli stop')
        .help()

    }, async ({ _: [ cmd, filePath ], bootstrap }) => {
      
      return await stop(filePath, bootstrap);
  
    })
  
  })
  .command('generate', 'generate a job definition through a series of prompts', (yargs) => yargs, async () => {

    return await generateJobFile();

  })
  .command('validate', 'validate a job definition', (yargs) => {

    return yargs
    .command('*', false, (yargs) => {

      return yargs
        .demandCommand(1, 'A file path to a job file is required')
        .usage('cli validate <path_to_file>')
        .example('cli validate job.js', 'Validates a job and outputs any issues')
        .help()

    }, async ({ _: [ cmd, filePath ] }) => {
      
      return await validateJobFile(filePath);
  
    })
  
  })
  .command('info', 'information on queue state and jobs in each status', (yargs) => {

    return yargs
    .command('*', false, (yargs) => {

      return yargs
        .demandCommand(1, 'A file path to a job file is required')
        .usage('cli info')
        .example('cli info', 'snapshot of current queue state')
        .help()

    }, async ({ _: [ cmd, filePath ] }) => {
      
      console.log(cmd);
      
      return await info(filePath);
  
    })
  
  })
  .alias('v', 'version')
  .alias('h', 'help')
  .demandCommand(1, 'A command is required')
  .usage('cli <command>')
  .help()
  .argv;