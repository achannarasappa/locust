const generateBeforeAll = (optionalHooks) => {

  if (!optionalHooks.includes('beforeAll'))
    return false;

  return [
    `  beforeAll: (browser, store) => {`,
    `  /**`,
    `  * Add actions to be run once before the crawl starts`,
    `  * https://luxa.io/docs/job#beforeAll`,
    `  * `,
    `  * @example log into site and save cookies or JWT`,
    `  */\n\n\n`,
    `  },`,
  ].join('\n');

};

const generateBefore = (optionalHooks) => {

  if (!optionalHooks.includes('before'))
    return false;

  return [
    `  before: (page, store, terminate) => {`,
    `  /**`,
    `  * Add actions to be run before each job starts`,
    `  * https://luxa.io/docs/job#before`,
    `  * `,
    `  * @example append session headers/cookies, conditionally skip job`,
    `  */\n\n\n`,
    `  },`,
  ].join('\n');

};

const generateExtractFeilds = (extractFields) => {

  if (!extractFields.length)
    return `\n\n`;

  return extractFields.map(({ cssPath, label }) => `    '${label}': await $('${cssPath}'),`).join('\n') + '\n'

};

const generateExtract = (optionalHooks, extractFields) => {

  if (!optionalHooks.includes('extract'))
    return false;

  return [
    `  extract: async ($, browser) => ({`,
    `  /**`,
    `  * Function to extract data from the page while crawling`,
    `  * https://luxa.io/docs/job#extract`,
    `  * `,
    `  * @example`,
    `  * title: await $('title')`,
    `  */\n`,
    generateExtractFeilds(extractFields),
    `  }),`,
  ].join('\n');

};

const generateStart = () => ([
  `  start: async (job) => ({`,
  `  /**`,
  `  * Callback to initiate this job on the serverless provider`,
  `  * https://luxa.io/docs/job#start`,
  `  * `,
  `  * @example`,
  `  * const lambda = new AWS.Lambda();`,
  `  * await lambda.invoke({ FunctionName: 'myScrapeJob' }).promise();`,
  `  */\n\n\n`,
  `  }),`,
].join('\n'))

const generateFilter = (filter, url) => {

  if (filter === 'no')
    return false;

  if (filter === 'yes')
    return [
    `  filter: {`,
    `    allowList: [],`,
    `    blockList: [],`,
    `  },`,
    ].join('\n');
  

  if (filter === 'yes_only_domain')
    return [
    `  filter: {`,
    `    allowList: [`,
    `      '${new URL(url).hostname}',`,
    `    ],`,
    `    blockList: [],`,
    `  },`,
    ].join('\n');

};

const generateRedisConnection = (redisConnection) => {

  if (redisConnection === 'none')
    return false;

  return [
    `    redis: {`,
    `      port: 6379,`,
    `      host: 'localhost'`,
    `    },`,
  ].join('\n')

};

const generateBrowserConnection = (browserConnection) => {

  if (browserConnection === 'none')
    return `    chrome: {},`;

  return [
    `    chrome: {`,
    `      browserWSEndpoint: 'ws://localhost:3000',`,
    `    },`,
  ].join('\n')

};

const template = ({
  name,
  url,
  optionalHooks,
  extractFields,
  concurrencyLimit,
  depth,
  filter,
  browserConnection,
  redisConnection,
}) => {

  return [
    `module.exports = {`,
    generateBeforeAll(optionalHooks),
    generateBefore(optionalHooks),
    generateExtract(optionalHooks, extractFields),
    generateStart(),
    `  url: '${url}',`,
    `  config: {`,
    `    name: '${name}',`,
    `    concurrencyLimit: '${concurrencyLimit}',`,
    `    depth: '${depth}',`,
    `  },`,
    generateFilter(filter, url),
    `  connection: {`,
    generateRedisConnection(redisConnection),
    generateBrowserConnection(browserConnection),
    `  }`,
    `};`
  ].filter((v) => v).join('\n')

}

module.exports = template;