const run = () => {

  const jobDefinition = {
    // global before all
      // login and set global state
      // initial url
    beforeAll: (browser, state) => {},
    // before individual scrape
      // append headers
      // set cookies
    before: (page, state) => {},
    // extract data from html
    extract: ($, browser) => ({
      title: $('title')
    }),
    // url to crawl
    url: 'amazon.com',
    config: {
      name: 'test-queue',
      concurrencyLimit: '10',
      depth: '1',
      // false or function to spawn new job
      spawnJob: false,
      allowList: [],
      blockList: []
    }
  };

};