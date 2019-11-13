const R = require('ramda');
const Redis = require('ioredis');
const { assert } = require('chai');
const { clearRedis } = require('../test/util');
const execute = require('./fn');

describe('fn', () => {

  let redis;

  before(async () => {

    redis = await new Redis({
      port: 6379,
      host: 'localhost',
      db: 0,
    });

  });

  beforeEach(async () => {

    await clearRedis(redis, '*');

  });

  describe('execute @server @queue', () => {

    it('crawls a website', async () => {

      let output = [];
      const jobDefinition = {
        extract: async ($) => ({ title: await $('title') }),
        start: async () => execute(jobDefinition),
        after: async (jobResult, snapshot, stop) => {

          output = output.concat(jobResult);

          if (snapshot.queue.done.length >= 3)
            return stop();

        },
        url: 'http://localhost:3001/',
        config: {
          name: 'e2e-test',
          concurrencyLimit: 1,
          depthLimit: 1,
        },
        connection: {
          redis: {
            port: 6379,
            host: 'localhost',
          },
          chrome: { browserWSEndpoint: 'ws://localhost:3000' },
        },
      };

      await execute(jobDefinition);

      const outputState = await redis.hgetall('sc:e2e-test:state');
      const outputExtractTitle = R.pipe(
        R.head,
        R.path(['data', 'title']),
        R.contains('home'),
      )(output);
      const outputResponseOk = R.all(
        R.identity,
        R.map(R.path(['response', 'ok']), output),
      );

      assert.deepEqual(output.length, 3);
      assert.deepEqual(outputState.status, 'INACTIVE');
      assert.ok(outputExtractTitle);
      assert.ok(outputResponseOk);

    });

    it('registers a job from the queue');

    it('runs the job');

    it('deregisters a job from the queue');

    it('adds new jobs to the queue');

    it('runs the after hook');

    it('runs the start hook');

    it('returns the jobs result');

    context('when a delay is defined', () => {

      it('delays the job from being run');

    });

    context('when the job definition is invalid', () => {

      it('throws an error');

    });

    context('when the queue encounters a built in stop condition', () => {

      it('stop processing the job and returns an error object');

    });

    context('when the queue has reached a condition that prohibits another jobs to be started', () => {

      it('stop processing the job and returns an error object');

    });

    context('when an Error is thrown', () => {

      it('throws a GeneralJobError');

    });

    context('when a non-Error error is thrown', () => {

      it('throws an error of that type');

    });

    context('when the job is finished', () => {

      it('closes connections to redis and chrome');

    });

  });

});
