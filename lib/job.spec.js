const sinon = require('sinon');
const { assert } = require('chai');
const puppeteer = require('puppeteer');
const R = require('ramda');
const { runJob, startJobs, _filterLinks } = require('./job');
  
describe('job', () => {

  let browser;

  before(async () => {
  
    browser = await puppeteer.launch();
  
  })

  after(async () => {
  
    await browser.close();
  
  })

  describe('runJob @remote', () => {
    
    it('responds with the result of the scrape', async () => {
    
      const jobData = {
        url: 'https://news.ycombinator.com/'
      };
      const state = { firstRun: 1 };
      const output = await runJob(browser, {}, jobData, state);
    
      assert.deepEqual(output.response.ok, true)
      assert.deepEqual(output.response.status, 200)
      assert.deepEqual(output.response.statusText, 'OK')
      assert.deepEqual(output.response.headers.server, 'nginx')
      assert.deepEqual(output.response.url, 'https://news.ycombinator.com/')
      assert.ok(output.response.body.length > 10000)
      assert.ok(output.links.includes('http://www.ycombinator.com/apply/'))
    
    });

    describe('user defined lifecycle hooks', () => {
    
      context('when the "before" hook is defined', () => {
      
        it('runs the hook', async () => {
        
          const jobDefinition = {
            before: beforeHook = sinon.fake()
          };
          const jobData = {
            url: 'https://news.ycombinator.com/'
          };
          const state = { firstRun: 1 };

          await runJob(browser, jobDefinition, jobData, state);

          assert.ok(beforeHook.calledOnce);
        
        });
      
      });
  
      context('when "beforeAll" hook is defined', () => {
      
        context('and has not yet been run globally', () => {
      
          it('runs the hook', async () => {
          
            const jobData = {
              url: 'https://news.ycombinator.com/',
            };
            const state = { firstRun: 1 };
            const jobDefinition = {
              before: beforeAllHook = sinon.fake()
            };

            await runJob(browser, jobDefinition, jobData, state);
  
            assert.ok(beforeAllHook.calledOnce);
          
          });
        
        });
    
        context('and has been run globally', () => {
        
          it('skips the hook', async () => {
          
            const jobData = {
              url: 'https://news.ycombinator.com/',
            };
            const state = { firstRun: 0 };
            const jobDefinition = {
              beforeAll: beforeAllHook = sinon.fake()
            };

            await runJob(browser, jobDefinition, jobData, state);
  
            assert.ok(beforeAllHook.notCalled);
          
          });
        
        });
      
      });
      
      context('when the "extract" hook is defined', () => {
      
        it('runs the hook', async () => {
        
          const state = { firstRun: 1 };
          const jobData = {
            url: 'https://news.ycombinator.com/',
          };
          const jobDefinition = {
            extract: async ($) => ({
              title: await $('title')
            })
          };

          const { data: output } = await runJob(browser, jobDefinition, jobData, state);
          const expected = {
            title: 'Hacker News'
          };

          assert.deepEqual(output, expected);
        
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
        'javascript:void(0)',
      ];
      const filter = {
        allowList: [
          'google.com',
        ],
        blockList: []
      };

      const output = _filterLinks(links, filter);
      const expected = [
        'https://google.com/',
        'https://google.com/results',
      ];

      assert.deepEqual(output, expected)
    
    });

    it('rejects by domains in the blocked list', () => {
    
      const links = [
        'https://google.com/',
        'https://google.com/results',
        'https://subdomain.google.com/',
        'https://subdomain.yahoo.com/',
        'javascript:void(0)',
      ];
      const filter = {
        allowList: [],
        blockList: [
          'google.com',
        ]
      };


      const output = _filterLinks(links, filter);
      const expected = [
        'https://subdomain.google.com/',
        'https://subdomain.yahoo.com/',
      ];

      assert.deepEqual(output, expected)
    
    });
    
  
  });

  describe('startJobs', () => {
  
    const baseInput = {
      config: {
        concurrencyLimit: 5
      }
    };
    let start;

    beforeEach(async () => {

      start = sinon.spy();

    });

    it('starts jobs up the concurrency limit', async () => {
    
      const input = R.mergeRight(
        baseInput,
        {
          start
        }
      );
      await startJobs(input, 1, 10);
      const expected = 4;

      assert.deepEqual(start.callCount, expected)
    
    });

    it('starts jobs up the queued count', async () => {
    
      const input = R.mergeRight(
        baseInput,
        {
          start
        }
      );
      await startJobs(input, 1, 3);
      const expected = 3;

      assert.deepEqual(start.callCount, expected)
    
    });

    context('when there are no queued jobs', () => {
    
      it('does not start jobs', async () => {
    
        const input = R.mergeRight(
          baseInput,
          {
            start
          }
        );
        await startJobs(input, 1, 0);
        const expected = 0;
  
        assert.deepEqual(start.callCount, expected)
      
      });
    
    });

    context('when there the concurrency limit is met', () => {
    
      it('does not start jobs', async () => {
    
        const input = R.mergeRight(
          baseInput,
          {
            start
          }
        );
        await startJobs(input, 5, 1);
        const expected = 0;
  
        assert.deepEqual(start.callCount, expected)
      
      });
    
    });

  });

  describe('validate', () => {
  
    it('validates the job definition');
  
  });

});