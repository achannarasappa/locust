const R = require('ramda');
const Redis = require('ioredis');
const { assert } = require('chai');
const { rejects } = require('assert');
const { clearRedis } = require('../test/util');
const execute = require('./fn');
const { QueueError, QueueEndError } = require('./error');

describe('fn', () => {

  let redis;
  const jobDefinition = {
    extract: async ($) => ({ title: await $('title') }),
    start: async () => execute(jobDefinition),
    after: async (jobResult, snapshot, stop) => {

      if (snapshot.queue.done.length >= 3)
        return stop();

    },
    url: 'http://localhost:3001/',
    config: {
      name: 'e2e-test',
      concurrencyLimit: 1,
      depthLimit: 2,
    },
    connection: {
      redis: {
        port: 6379,
        host: 'localhost',
      },
      chrome: { browserWSEndpoint: 'ws://localhost:3000' },
    },
  };

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

  describe('execute @queue', () => {

    it('crawls a website', async () => {

      let output = [];
      const input = R.mergeRight(jobDefinition, {
        after: async (jobResult, snapshot, stop) => {

          output = output.concat(jobResult);

          if (snapshot.queue.done.length >= 3)
            return stop();

        },
        start: async () => execute(input),
      });

      await execute(input);

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

    context('before running a job', () => {

      context('when the job definition is invalid', () => {

        it('throws an error', async () => {

          const input = R.dissoc('start', jobDefinition);

          await rejects(() => execute(input));

        });

      });

    });

    context('when the job encounters an transient end condition', () => {

      it('returns an object that describes the end condition', async () => {

        const expectedMessage = 'test error message';
        const inputError = new QueueError(expectedMessage, 'http://locust.dev');
        const inputJobDefinition = R.assoc('start', () => {

          throw inputError;

        }, jobDefinition);
        const output = await execute(inputJobDefinition);
        const outputState = await redis.hgetall('sc:e2e-test:state');

        assert.deepEqual(output, inputError);
        assert.propertyVal(outputState, 'status', 'ACTIVE');

      });

    });

    context('when the job encounters an permanent end condition', () => {

      it('returns an object that describes the end condition and stop the queue', async () => {

        const expectedMessage = 'test error message';
        const inputError = new QueueEndError(expectedMessage, 'http://locust.dev', 'e2e-test');
        const inputJobDefinition = R.assoc('start', () => {

          throw inputError;

        }, jobDefinition);
        const output = await execute(inputJobDefinition);
        const outputState = await redis.hgetall('sc:e2e-test:state');

        assert.deepEqual(output, inputError);
        assert.propertyVal(outputState, 'status', 'INACTIVE');

      });

    });

    context('when an Error is thrown', () => {

      it('throws a GeneralJobError', async () => {

        const expectedMessage = 'test error message';
        const input = R.assoc('start', () => {

          throw new Error(expectedMessage);

        }, jobDefinition);

        await rejects(() => execute(input), {
          name: 'GeneralJobError',
          message: expectedMessage,
        });

      });

    });

    context('when a unrecognized Error is thrown', () => {

      it('rethrows the the error', async () => {

        const expectedMessage = 'syntax error message';
        const input = R.assoc('start', () => {

          throw new SyntaxError(expectedMessage);

        }, jobDefinition);

        await rejects(() => execute(input), {
          name: 'SyntaxError',
          message: expectedMessage,
        });

      });

    });

  });

});
