const Redis = require('ioredis');
const { assert } = require('chai');
const { rejects } = require('assert');
const { clearRedis } = require('../test/util');
const { register, deregister, add } = require('./queue');

describe('queue', () => {

  let redis;
  const job = {
    url: 'https://amazon.com/product99',
    config: {
      name: 'automated-test-queue',
    }
  };

  before(async () => {
  
    redis = await new Redis({
      port: 6379,
      host: 'localhost',
      db: 0
    });
  
  });

  beforeEach(async () => {

    await clearRedis(redis, '*');

  })

  describe('register', () => {

    context('when it is the first run', () => {

      it('creates a new job in redis', async () => {

        const createJob = {
          url: 'https://amazon.com/product_new',
          config: {
            name: 'automated-test-queue',
            concurrencyLimit: 20,
            depthLimit: 5,
          }
        };
      
        const { state, config } = await register(redis, createJob)
  
        const outputConfig = await redis.hgetall('sc:automated-test-queue:config');
        const outputState = await redis.hgetall('sc:automated-test-queue:state');
        const outputJob = await redis.hget('sc:automated-test-queue:jobs:processing', 'https://amazon.com/product_new');
        
        assert.deepStrictEqual(outputConfig, {
          name: 'automated-test-queue',
          concurrencyLimit: '20',
          depthLimit: '5',
        })
  
        assert.deepStrictEqual(config, {
          name: 'automated-test-queue',
          concurrencyLimit: 20,
          depthLimit: 5,
        })
  
        assert.deepStrictEqual(outputState, {
          firstRun: '0',
          status: 'ACTIVE'
        })
  
        assert.deepStrictEqual(state, {
          firstRun: 1,
          status: 'ACTIVE'
        })

        assert.deepStrictEqual(JSON.parse(outputJob).depth, 0)
      
      });
    
    });

    context('when it is not the first run', () => {
    
      it('pops a job from redis', async () => {
      
        const jobData1 = JSON.stringify({
          url: 'https://amazon.com/product_pop1',
          depth: 1
        });
        const jobData2 = JSON.stringify({
          url: 'https://amazon.com/product_pop2',
          depth: 1
        });

        await redis.rpush('sc:automated-test-queue:jobs:queued', jobData1);
        await redis.rpush('sc:automated-test-queue:jobs:queued', jobData2);
        await redis.hmset('sc:automated-test-queue:state', {
          firstRun: 0,
          status: 'ACTIVE'
        });

        const { state } = await register(redis, job)
  
        const outputState = await redis.hgetall('sc:automated-test-queue:state');
        const outputProcessingJobs = await redis.hgetall('sc:automated-test-queue:jobs:processing');
        const outputQueuedJobs = await redis.lrange('sc:automated-test-queue:jobs:queued', '0', '-1' )

        assert.deepStrictEqual(outputState, {
          firstRun: '0',
          status: 'ACTIVE'
        })
  
        assert.deepStrictEqual(state, {
          firstRun: 0,
          status: 'ACTIVE'
        })

        assert.deepStrictEqual(outputProcessingJobs, {
          'https://amazon.com/product_pop1': jobData1
        })

        assert.deepStrictEqual(outputQueuedJobs, [
          jobData2
        ])
      
      });
    
    });

    context('when the depth exceeds the limit', () => {
    
      it('throws an error', async () => {
      
        const jobData = JSON.stringify({
          url: 'https://amazon.com/product_depth',
          depth: 2
        });

        await redis.rpush('sc:automated-test-queue:jobs:queued', jobData);
        await redis.hmset('sc:automated-test-queue:state', {
          firstRun: 0,
          status: 'ACTIVE'
        });
  
        await rejects(async () => await register(redis, job), /has reached depth limit/);
        
        const outputProcessingJobs = await redis.hgetall('sc:automated-test-queue:jobs:processing');
        const outputQueuedJobs = await redis.lrange('sc:automated-test-queue:jobs:queued', '0', '-1' )

        assert.deepStrictEqual(outputProcessingJobs, {})

        assert.deepStrictEqual(outputQueuedJobs, [])

      });
      
    
    });

    context('when queue status is not active', () => {
    
      it('throws an error', async () => {
      
        await redis.hset('sc:automated-test-queue:state', 'status', 'INACTIVE');

        await rejects(async () => await register(redis, job), /is not active/);
      
      });
    
    });

    context('when the number of active jobs is at the limit', () => {
    
      it('throws an error', async () => {
      
        const pipeline = redis.pipeline();

        [...Array(12).keys()].map((i) => pipeline.hset('sc:automated-test-queue:jobs:processing', `https://amazon.com/product${i}`, JSON.stringify({ depth: 0 })))
        await pipeline.exec();

        await rejects(async () => await register(redis, job), /has reached concurrency limit/);
      
      });
    
    });

    context('when the number of active jobs is under the limit', () => {
    
      it('adds the current job to the \'processing\' set', async () => {
      
        const pipeline = redis.pipeline();

        [...Array(5).keys()].map((i) => pipeline.hset('sc:automated-test-queue:jobs:processing', `https://amazon.com/product${i}`, JSON.stringify({ depth: 0 })))
        await pipeline.exec();

        await register(redis, job);

        const output = await redis.hexists('sc:automated-test-queue:jobs:processing', 'https://amazon.com/product99');

        assert.deepStrictEqual(output, 1);
      
      });     
    
    });

    context('when the job exists in the \'processing\' set', () => {

      it('throws an error', async () => {
      
        const jobExisting = {
          url: 'https://amazon.com/product_exists_processing',
          config: {
            name: 'automated-test-queue',
          }
        };

        await redis.hset('sc:automated-test-queue:jobs:processing', `https://amazon.com/product_exists_processing`, JSON.stringify({ depth: 1 }))
  
        await rejects(async () => await register(redis, jobExisting), /has already processed/);
      
      });
    
    });

    context('when the job exists in the \'done\' set', () => {

      it('throws an error', async () => {
      
        const jobExisting = {
          url: 'https://amazon.com/product_exists_done',
          config: {
            name: 'automated-test-queue',
          }
        };

        await redis.hset('sc:automated-test-queue:jobs:done', `https://amazon.com/product_exists_done`, JSON.stringify({ depth: 1 }))
  
        await rejects(async () => await register(redis, jobExisting), /has already processed/);
      
      });
    
    });

    context('when there are no more jobs in the queue', () => {
    
      it('throws an error', async () => {
      
        await redis.hmset('sc:automated-test-queue:state', {
          firstRun: 0,
          status: 'ACTIVE'
        });
  
        await rejects(async () => await register(redis, job), /has no more queued jobs/);

      });
    
    });

    context('when config.state is set', () => {
    
      it('redis state, jobs, and config are reset');
    
    });   
  
  });

  describe('deregister', () => {
  
    it('removes the job from the \'processing\' set and adds the job to the \'done\' set', async () => {
    
      const jobData = {
        url: 'https://amazon.com/deregister_move_job',
        depth: 0,
      };

      await redis.hset('sc:automated-test-queue:jobs:processing', `https://amazon.com/deregister_move_job`, JSON.stringify(jobData))

      await deregister(redis, 'automated-test-queue', jobData)

      const outputProcessingJobs = await redis.hgetall('sc:automated-test-queue:jobs:processing');
      const outputDoneJobs = await redis.hgetall('sc:automated-test-queue:jobs:done');
    
      assert.deepStrictEqual(outputProcessingJobs, {})
      assert.deepStrictEqual(outputDoneJobs, {
        'https://amazon.com/deregister_move_job': JSON.stringify(jobData)
      })

    });
  
  });

  describe('add', () => {

    context('when the job already exists in processing, done, or queued', () => {
    
      it('does not add the job to the queue', async () => {
      
        const jobData = {
          depth: 1,
          url: 'http://amazon.com/'
        };
        const jobResult = {
          links: [
            'http://amazon.com/link1',
            'http://amazon.com/link2',
            'http://amazon.com/link3',
            'http://amazon.com/link4',
          ]
        };
        const expected = [
          {
            url: 'http://amazon.com/link3',
            depth: 1
          },
          {
            url: 'http://amazon.com/link4',
            depth: 2
          },
        ].map(JSON.stringify);
        
        await clearRedis(redis, '*');
        await redis.hmset(`sc:automated-test-queue:jobs:done`, 'http://amazon.com/link1', '');
        await redis.hmset(`sc:automated-test-queue:jobs:processing`, 'http://amazon.com/link2', '');
        await redis.rpush(`sc:automated-test-queue:jobs:queued`, JSON.stringify({
          url: 'http://amazon.com/link3',
          depth: 1
        }));
        await add(redis, 'automated-test-queue', jobData, jobResult);
        
        const outputQueuedJobs = await redis.lrange('sc:automated-test-queue:jobs:queued', '0', '-1' );
      
        assert.deepStrictEqual(outputQueuedJobs, expected);

      });
    
    });

    context('when result links is not empty', () => {
    
      it('adds the links to the \'queued\'', async () => {
      
        const jobData = {
          depth: 0,
          url: 'http://amazon.com/'
        };
        const jobResult = {
          links: [
            'http://amazon.com/link1',
            'http://amazon.com/link2',
          ]
        };
        const expected = [
          {
            url: 'http://amazon.com/link1',
            depth: 1
          },
          {
            url: 'http://amazon.com/link2',
            depth: 1
          }
        ].map(JSON.stringify);
        
        await add(redis, 'automated-test-queue', jobData, jobResult);
        
        const outputQueuedJobs = await redis.lrange('sc:automated-test-queue:jobs:queued', '0', '-1' );
      
        assert.deepStrictEqual(outputQueuedJobs, expected);

      });
    
    });
  
  });

});