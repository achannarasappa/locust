const R = require('ramda');
const Redis = require('ioredis');
const { assert } = require('chai');
const { clearRedis } = require('../test/util');
const { execute } = require('./fn');

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

  describe('execute @remote', () => {

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
        url: 'https://news.ycombinator.com/item?id=19064069',
        config: {
          name: 'e2e-test',
          concurrencyLimit: 1,
          depthLimit: 1,
        },
        filter: {
          allowList: ['news.ycombinator.com'],
          blockList: [],
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
      const outputExtractTitle = R.all(
        R.contains('Hacker News'),
        R.map(R.path(['data', 'title']), output),
      );
      const outputResponseOk = R.all(
        R.identity,
        R.map(R.path(['response', 'ok']), output),
      );

      assert.deepEqual(output.length, 3);
      assert.deepEqual(outputState.status, 'INACTIVE');
      assert.ok(outputExtractTitle);
      assert.ok(outputResponseOk);

    });

  });

});
