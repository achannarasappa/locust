const sinon = require('sinon');
const assert = require('assert');
const puppeteer = require('puppeteer');
const { runJob, _filterLinks } = require('./job');
  
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
          
            const state = { firstRun: '1' };
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
          
            const state = { firstRun: '0' };
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
        
          const state = { firstRun: '0' };
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

  describe('startJobs', () => {
  
    context('when the \'start\' function is defined', () => {
    
      it('starts jobs up to the concurrency limit');
    
    });

  });

  describe('validate', () => {
  
    it('validates the job definition');
  
  });

});