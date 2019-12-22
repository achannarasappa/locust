/* eslint-disable no-script-url */
const sinon = require('sinon');
const { assert } = require('chai');
const { rejects, doesNotReject } = require('assert');
const puppeteer = require('puppeteer');
const { Page } = require('puppeteer/lib/Page');
const { Browser } = require('puppeteer/lib/Browser');
const R = require('ramda');
const {
  runJob,
  startJobs,
  _filterLinks,
  delay,
  afterJob,
  validate,
} = require('./job');
const { BrowserError } = require('./error');

describe('job', () => {

  let browser;

  before(async () => {

    browser = await puppeteer.launch();

  });

  after(async () => {

    await browser.close();

  });

  describe('runJob @server', () => {

    it('responds with the result of the scrape', async () => {

      const jobData = { url: 'http://localhost:3001/page-fixture' };
      const snapshot = { state: { firstRun: 1 } };
      const output = await runJob(browser, {}, jobData, snapshot);

      assert.deepEqual(output.response.ok, true);
      assert.deepEqual(output.response.status, 200);
      assert.deepEqual(output.response.statusText, 'OK');
      assert.deepEqual(output.response.headers['x-custom-header'], 'locust');
      assert.deepEqual(output.response.url, 'http://localhost:3001/page-fixture');
      assert.ok(output.response.body.length > 250);
      assert.deepEqual(output.links, [
        'http://localhost:3001/a',
        'http://localhost:3001/b',
        'http://localhost:3001/c',
      ]);

    });

    describe('user defined lifecycle hooks', () => {

      context('when the "beforeStart" hook is defined', () => {

        it('runs the hook', async () => {

          const beforeStartHook = sinon.fake();
          const jobDefinition = { beforeStart: beforeStartHook };
          const jobData = { url: 'http://localhost:3001/page-fixture' };
          const snapshot = { state: { firstRun: 0 } };

          await runJob(browser, jobDefinition, jobData, snapshot);

          assert.ok(beforeStartHook.calledOnceWithExactly(jobData));

        });

      });

      context('when the "before" hook is defined', () => {

        it('runs the hook', async () => {

          const beforeHook = sinon.fake();
          const jobDefinition = { before: beforeHook };
          const jobData = { url: 'http://localhost:3001/page-fixture' };
          const snapshot = { state: { firstRun: 1 } };

          await runJob(browser, jobDefinition, jobData, snapshot);

          assert.ok(beforeHook.calledOnce);
          assert.ok(beforeHook.calledWithMatch(sinon.match.instanceOf(Page), snapshot, jobData));

        });

      });

      context('when "beforeAll" hook is defined', () => {

        context('and has not yet been run globally', () => {

          it('runs the hook', async () => {

            const jobData = { url: 'http://localhost:3001/page-fixture' };
            const snapshot = { state: { firstRun: 1 } };
            const beforeAllHook = sinon.fake();
            const jobDefinition = { beforeAll: beforeAllHook };

            await runJob(browser, jobDefinition, jobData, snapshot);

            assert.ok(beforeAllHook.calledOnce);
            assert.ok(
              beforeAllHook.calledWithMatch(
                sinon.match.instanceOf(Browser),
                snapshot,
                jobData,
              ),
            );

          });

        });

        it('calls the hook a browser object, snapshot object, and jobData object');

        context('and has been run globally', () => {

          it('skips the hook', async () => {

            const jobData = { url: 'http://localhost:3001/page-fixture' };
            const snapshot = { state: { firstRun: 0 } };
            const beforeAllHook = sinon.fake();
            const jobDefinition = { beforeAll: beforeAllHook };

            await runJob(browser, jobDefinition, jobData, snapshot);

            assert.ok(beforeAllHook.notCalled);

          });

        });

      });

      context('when the "extract" hook is defined', () => {

        it('runs the hook', async () => {

          const snapshot = { state: { firstRun: 1 } };
          const jobData = { url: 'http://localhost:3001/page-fixture' };
          const jobDefinition = { extract: async ($) => ({ title: await $('title') }) };

          const { data: output } = await runJob(browser, jobDefinition, jobData, snapshot);
          const expected = { title: 'page-fixture' };

          assert.deepEqual(output, expected);

        });

        it('calls the hook with a selection function, page object, browser object, and jobData');

        context('when there is an error selecting an element on the page', () => {

          it('returns null', async () => {

            const snapshot = { state: { firstRun: 1 } };
            const jobData = { url: 'http://localhost:3001/page-fixture' };
            const jobDefinition = { extract: async ($) => ({ nonexistantElemenet: await $('div > a > span') }) };

            const { data: output } = await runJob(browser, jobDefinition, jobData, snapshot);
            const expected = { nonexistantElemenet: null };

            assert.deepEqual(output, expected);

          });

        });

      });

      context('when the browser encounters an error', () => {

        it('it throws an error', async () => {

          const snapshot = { state: { firstRun: 1 } };
          const jobData = { url: 'http://localhost:3001/page-fixture-error' };

          await rejects(() => runJob(browser, {}, jobData, snapshot), BrowserError);

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
        allowList: ['google.com'],
      };

      const output = _filterLinks(links, filter);
      const expected = ['https://google.com/', 'https://google.com/results'];

      assert.deepEqual(output, expected);

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
        blockList: ['google.com'],
      };

      const output = _filterLinks(links, filter);
      const expected = ['https://subdomain.google.com/', 'https://subdomain.yahoo.com/'];

      assert.deepEqual(output, expected);

    });

    context('when the filter is a function', () => {

      it('calls the function', () => {

        const input = [
          'https://google.com/',
          'https://google.com/results',
          'https://subdomain.google.com/',
          'https://subdomain.yahoo.com/',
          'javascript:void(0)',
        ];
        const filter = (links) => links.filter((link) => link.length > 20);
        const output = _filterLinks(input, filter);
        const expected = [
          'https://google.com/results',
          'https://subdomain.google.com/',
          'https://subdomain.yahoo.com/',
        ];

        assert.deepEqual(output, expected);

      });

    });

    context('when there is no filter', () => {

      it('returns the links', () => {

        const input = [
          'https://google.com/',
          'https://google.com/results',
          'https://subdomain.google.com/',
          'https://subdomain.yahoo.com/',
          'javascript:void(0)',
        ];
        const output = _filterLinks(input);

        assert.deepEqual(output, input);

      });

    });

  });

  describe('startJobs', () => {

    const baseInput = { config: { concurrencyLimit: 5 } };
    let start;

    beforeEach(async () => {

      start = sinon.spy();

    });

    it('starts jobs up the concurrency limit', async () => {

      const input = R.mergeRight(
        baseInput,
        { start },
      );
      const snapshot = {
        queue: {
          processing: Array(1).fill(0),
          queued: Array(10).fill(0),
        },
      };
      await startJobs(input, snapshot);
      const expected = 4;

      assert.deepEqual(start.callCount, expected);

    });

    it('starts jobs up the queued count', async () => {

      const input = R.mergeRight(
        baseInput,
        { start },
      );
      const snapshot = {
        queue: {
          processing: Array(1).fill(0),
          queued: Array(3).fill(0),
        },
      };
      await startJobs(input, snapshot);
      const expected = 3;

      assert.deepEqual(start.callCount, expected);

    });

    context('when there are no queued jobs', () => {

      it('does not start jobs', async () => {

        const input = R.mergeRight(
          baseInput,
          { start },
        );
        const snapshot = {
          queue: {
            processing: Array(1).fill(0),
            queued: Array(0).fill(0),
          },
        };
        await startJobs(input, snapshot);
        const expected = 0;

        assert.deepEqual(start.callCount, expected);

      });

    });

    context('when there the concurrency limit is met', () => {

      it('does not start jobs', async () => {

        const input = R.mergeRight(
          baseInput,
          { start },
        );
        const snapshot = {
          queue: {
            processing: Array(5).fill(0),
            queued: Array(1).fill(0),
          },
        };
        await startJobs(input, snapshot);
        const expected = 0;

        assert.deepEqual(start.callCount, expected);

      });

    });

  });

  describe('delay', () => {

    it('waits', async () => {

      const input = { config: { delay: 25 } };
      const startTime = process.hrtime();
      await delay(input);
      const endTime = process.hrtime();
      const output = (endTime[1] - startTime[1]) / 1000000;

      assert.isAbove(output, 23);
      assert.isBelow(output, 27);

    });

    context('when a delay is not set', () => {

      it('does not wait', async () => {

        const startTime = process.hrtime();
        await delay({});
        const endTime = process.hrtime();
        const output = (endTime[1] - startTime[1]) / 1000000;

        assert.isBelow(output, 2);

      });

    });

  });

  describe('afterJob', () => {

    context('when the "after" hook is defined', () => {

      it('runs the hook', async () => {

        const afterHook = sinon.fake();
        const jobDefinition = { after: afterHook };
        const jobResult = sinon.fake();
        const stopQueue = sinon.fake();
        const snapshot = sinon.fake();

        await afterJob(jobDefinition, jobResult, snapshot, stopQueue);

        assert.ok(afterHook.calledOnceWithExactly(jobResult, snapshot, stopQueue));

      });

    });

  });

  describe('validate', () => {

    describe('when the job definition is invalid', () => {

      it('throws an error', async () => {

        const input = {
          url: 'http://example.com',
          config: {
            concurrencyLimit: 8,
            depthLimit: 5,
          },
        };

        await rejects(async () => validate(input), /child "config" fails because \[child "name" fails/);

      });

    });

    describe('when the job definition is valid', () => {

      it('does not throw an error', async () => {

        const input = {
          url: 'http://example.com',
          start: () => null,
          config: {
            name: 'test',
            concurrencyLimit: 8,
            depthLimit: 5,

          },
          connection: {
            redis: {
              host: 'localhost',
              port: 3000,
            },
            chrome: {},
          },
        };

        await doesNotReject(() => validate(input), Error);

      });

    });

  });

});
