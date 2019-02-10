const inquirer = require('inquirer');
const R = require('ramda');

const promptExtractField = async (firstRun = true, extractFields = []) => {

  const { extract } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'extract',
        message: `Extract ${firstRun ? '': 'more '}data from the page?`,
        choices: [
          {
            name: 'no',
            value: 'no',
          },
          {
            name: 'yes',
            value: 'yes',
          },
        ],
        default: 'no'
      }
    ])

  if (extract === 'no')
    return {
      extractFields
    }

  const { cssPath, label } = await inquirer
    .prompt([
      {
        type: 'input',
        name: 'cssPath',
        message: 'CSS path to data on the page',
      },
      {
        type: 'input',
        name: 'label',
        message: 'Label for data',
      },
    ])

    return promptExtractField(
      false,
      extractFields.concat({
        cssPath,
        label,
      })
    );
    
};

const promptJobDetails = async () => {

  let answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Job name'
    },
    {
      type: 'input',
      name: 'url',
      message: 'Starting url'
    },
    {
      type: 'checkbox',
      name: 'optionalHooks',
      message: 'Select optional lifecycle hooks',
      choices: ['beforeAll', 'before', 'extract', 'after'],
    }
  ])

  if (answers.optionalHooks.includes('extract'))
    answers = R.mergeRight(
      answers,
      await promptExtractField()
    )
  
  return R.mergeRight(
    answers,
    await inquirer.prompt([
      {
        type: 'input',
        name: 'concurrencyLimit',
        message: 'Concurrency limit',
        default: 10
      },
      {
        type: 'input',
        name: 'depth',
        message: 'Depth limit',
        default: 1
      },
      {
        type: 'list',
        name: 'filter',
        message: 'Filter links?',
        choices: [
          {
            name: 'no',
            value: 'no',
          },
          {
            name: 'yes',
            value: 'yes',
          },
          {
            name: 'yes, only from the initial domain',
            value: 'yes_only_domain',
          },
          {
            name: 'yes, using a function',
            value: 'yes_function',
          },
        ],
        default: 'no'
      },
      {
        type: 'list',
        name: 'redisConnection',
        message: 'Redis connection details',
        choices: [
          {
            name: 'none (only for single job mode)',
            value: 'none',
          },
          {
            name: 'local connection (port=6379, host=localhost)',
            value: 'local',
          },
        ],
        default: 'local'
      },
      {
        type: 'list',
        name: 'browserConnection',
        message: 'Browser connection details',
        choices: [
          {
            name: 'none (only for single job mode)',
            value: 'none',
          },
          {
            name: 'local connection (port=3000, host=localhost)',
            value: 'local',
          },
        ],
        default: 'none'
      }
    ])
  )

}

module.exports = {
  promptJobDetails,
};