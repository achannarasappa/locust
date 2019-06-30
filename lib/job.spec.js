/* eslint-disable no-script-url */
const sinon = require('sinon');
const { assert } = require('chai');
const { rejects } = require('assert');
const puppeteer = require('puppeteer');
const R = require('ramda');
const {
  runJob,
  startJobs,
  _filterLinks,
  delay,
  afterJob,
  validate,
} = require('./job');

describe('job', () => {

  let browser;

  before(async () => {

    browser = await puppeteer.launch();

  });

  after(async () => {

    await browser.close();

  });

  describe('runJob @remote', () => {

    it('responds with the result of the scrape', async () => {

      const jobData = { url: 'https://news.ycombinator.com/' };
      const state = { firstRun: 1 };
      const output = await runJob(browser, {}, jobData, state);

      assert.deepEqual(output.response.ok, true);
      assert.deepEqual(output.response.status, 200);
      assert.deepEqual(output.response.statusText, 'OK');
      assert.deepEqual(output.response.headers.server, 'nginx');
      assert.deepEqual(output.response.url, 'https://news.ycombinator.com/');
      assert.ok(output.response.body.length > 10000);
      assert.ok(output.links.includes('http://www.ycombinator.com/apply/'));

    });

    describe('user defined lifecycle hooks', () => {

      context('when the "before" hook is defined', () => {

        it('runs the hook', async () => {

          const beforeHook = sinon.fake();
          const jobDefinition = { before: beforeHook };
          const jobData = { url: 'https://news.ycombinator.com/' };
          const state = { firstRun: 1 };

          await runJob(browser, jobDefinition, jobData, state);

          assert.ok(beforeHook.calledOnce);

        });

      });

      context('when "beforeAll" hook is defined', () => {

        context('and has not yet been run globally', () => {

          it('runs the hook', async () => {

            const jobData = { url: 'https://news.ycombinator.com/' };
            const state = { firstRun: 1 };
            const beforeAllHook = sinon.fake();
            const jobDefinition = { before: beforeAllHook };

            await runJob(browser, jobDefinition, jobData, state);

            assert.ok(beforeAllHook.calledOnce);

          });

        });

        context('and has been run globally', () => {

          it('skips the hook', async () => {

            const jobData = { url: 'https://news.ycombinator.com/' };
            const state = { firstRun: 0 };
            const beforeAllHook = sinon.fake();
            const jobDefinition = { before: beforeAllHook };

            await runJob(browser, jobDefinition, jobData, state);

            assert.ok(beforeAllHook.notCalled);

          });

        });

      });

      context('when the "extract" hook is defined', () => {

        it('runs the hook', async () => {

          const state = { firstRun: 1 };
          const jobData = { url: 'https://news.ycombinator.com/' };
          const jobDefinition = { extract: async ($) => ({ title: await $('title') }) };

          const { data: output } = await runJob(browser, jobDefinition, jobData, state);
          const expected = { title: 'Hacker News' };

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
        allowList: ['google.com'],
        blockList: [],
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
        allowList: [],
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
      const snapshot = { queue: {
        processing: Array(1).fill(0),
        queued: Array(10).fill(0),
      } };
      await startJobs(input, snapshot);
      const expected = 4;

      assert.deepEqual(start.callCount, expected);

    });

    it('starts jobs up the queued count', async () => {

      const input = R.mergeRight(
        baseInput,
        { start },
      );
      const snapshot = { queue: {
        processing: Array(1).fill(0),
        queued: Array(3).fill(0),
      } };
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
        const snapshot = { queue: {
          processing: Array(1).fill(0),
          queued: Array(0).fill(0),
        } };
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
        const snapshot = { queue: {
          processing: Array(5).fill(0),
          queued: Array(1).fill(0),
        } };
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

        assert.ok(afterHook.calledOnce);
        assert.ok(afterHook.calledWith(jobResult, snapshot, stopQueue));

      });

    });

  });

  describe('validate', () => {

    it('validates the job definition', async () => {

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

});
