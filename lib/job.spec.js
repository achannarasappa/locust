const sinon = require('sinon');
const assert = require('assert');
const puppeteer = require('puppeteer');
const { run, _filterLinks } = require('./job');

const jobDefinition = {
  // global before all
    // login and set global state
    // initial url
  beforeAll: (browser, store) => {},
  // before individual scrape
    // append headers
    // set cookies
  before: (page, store, terminate) => {},
  // extract data from html
  extract: ($, browser) => ({
    title: $('title')
  }),
  // call to start a crawl job
  spawn: (job) => {
    
      console.log('done!');
    
  },
  // url to crawl
  url: 'amazon.com',
  config: {
    name: 'test-queue',
    concurrencyLimit: '10',
    depth: '1',
  },
  // filter: () => {},
  filter: {
    allowList: [],
    blockList: [],
  },
  state: {
    firstRun: 0,
    status: 'ACTIVE'
  },
  connection: {
    redis: {
      port: 6379,
      host: 'localhost'
    },
    chrome: {}
  }
};
  
describe('job', () => {

  let browser;

  before(async () => {
  
    browser = await puppeteer.launch();
  
  })

  after(async () => {
  
    await browser.close();
  
  })

  describe('runJob @io', () => {
    
    it('responds with the result of the scrape', async () => {
    
      const job = {
        url: 'https://news.ycombinator.com/'
      };
      const output = await runJob(browser, job);
    
      assert.deepStrictEqual(output.response.ok, true)
      assert.deepStrictEqual(output.response.status, 200)
      assert.deepStrictEqual(output.response.statusText, 'OK')
      assert.deepStrictEqual(output.response.headers.server, 'nginx')
      assert.deepStrictEqual(output.response.url, 'https://news.ycombinator.com/')
      assert(output.links.includes('http://www.ycombinator.com/apply/'))
    
    });

    describe('user defined lifecycle hooks', () => {
    
      context('when the "before" hook is defined', () => {
      
        it('runs the hook', async () => {
        
          const job = {
            url: 'https://news.ycombinator.com/',
            before: beforeHook = sinon.fake()
          };

          await runJob(browser, job)

          assert(beforeHook.calledOnce);
        
        });
      
      });
  
      context('when "beforeAll" hook is defined', () => {
      
        context('and has not yet been run globally', () => {
      
          it('runs the hook', async () => {
          
            const state = { firstRun: false };
            const job = {
              url: 'https://news.ycombinator.com/',
              beforeAll: beforeAllHook = sinon.fake()
            };
  
            await runJob(browser, job, state)
  
            assert(beforeAllHook.calledOnce);
            assert(beforeAllHook.calledWith(browser, state));
          
          });
        
        });
    
        context('and has been run globally', () => {
        
          it('skips the hook', async () => {
          
            const state = { firstRun: true };
            const job = {
              url: 'https://news.ycombinator.com/',
              beforeAll: beforeAllHook = sinon.fake()
            };
  
            await runJob(browser, job, state)
  
            assert(beforeAllHook.notCalled);
          
          });
        
        });
      
      });
      
      context('when the "extract" hook is defined', () => {
      
        it('runs the hook', async () => {
        
          const state = { firstRun: false };
          const job = {
            url: 'https://news.ycombinator.com/',
            extract: async (page) => ({
              title: await page.$eval('title', e => e.text)
            })
          };

          const { body: output } = await runJob(browser, job, state);
          const expected = {
            title: 'Hacker News'
          };

          assert.deepStrictEqual(output, expected);
        
        });
      
      });
    
    });
  
  });

  describe('filterLinks', () => {
  
    it('filters by domains in the allowed list', () => {
    
      const links = [
        'https://google.com/',
        'https://google.com/results',
        'https://subdomain.google.com/',
        'https://subdomain.yahoo.com/',
      ];
      const allowList = [
        'google.com',
      ];
      const blockList = [];

      const output = _filterLinks(links, allowList, blockList);
      const expected = [
        'https://google.com/',
        'https://google.com/results',
      ];

      assert.deepStrictEqual(output, expected)
    
    });

    it('rejects by domains in the blocked list', () => {
    
      const links = [
        'https://google.com/',
        'https://google.com/results',
        'https://subdomain.google.com/',
        'https://subdomain.yahoo.com/',
      ];
      const allowList = [];
      const blockList = [
        'google.com'
      ];

      const output = _filterLinks(links, allowList, blockList);
      const expected = [
        'https://subdomain.google.com/',
        'https://subdomain.yahoo.com/',
      ];

      assert.deepStrictEqual(output, expected)
    
    });
    
  
  });

});