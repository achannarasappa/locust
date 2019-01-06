const Redis = require('ioredis');
const assert = require('assert');
const { clearRedis } = require('../test/util');
const { register, deregister } = require('./queue');

describe.only('queue', () => {

  let redis;

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
  
    it('registers a new job in redis', async () => {

      const job = {
        url: 'https://amazon.com',
        config: {
          name: 'automated-test-queue',
          concurrencyLimit: '20',
          depth: '5',
        }
      };
    
      const { state, config } = await register(redis, job)

      const outputConfig = await redis.hgetall('sc:automated-test-queue:config');
      const outputState = await redis.hgetall('sc:automated-test-queue:state');

      assert.deepStrictEqual(outputConfig, {
        name: 'automated-test-queue',
        concurrencyLimit: '20',
        depth: '5',
      })

      assert.deepStrictEqual(config, {
        name: 'automated-test-queue',
        concurrencyLimit: '20',
        depth: '5',
      })

      assert.deepStrictEqual(outputState, {
        firstRun: '0',
        status: 'ACTIVE'
      })

      assert.deepStrictEqual(state, {
        firstRun: '0',
        status: 'ACTIVE'
      })
    
    });

    context.only('when it is the first run', () => {
    
      it('the depth is set to 0', async () => {
      
        
      
      });
    
    });

    context('when the depth exceeds the limit', () => {
    
      it('throws an error');
      
    
    });

    context('when queue status is not active', () => {
    
      it('throws an error');
    
    });

    context('when the number of active jobs is at the limit', () => {
    
      it('throws an error');
    
    });

    context('when the number of active jobs is under the limit', () => {
    
      it('adds the current job to the \'processing\' set');     
    
    });

    context('when the job exists in the \'done\' set', () => {
    
      it('throws an error');
    
    });

    context('when config.state is set', () => {
    
      it('redis state, jobs, and config are reset');
    
    });   
  
  });

  describe('deregister', () => {
  
    it('removes the job from the \'processing\' set');
    
    it('adds the job to the \'done\' set');

    context('when the spawn function is defined', () => {
    
      it('starts jobs up to the concurrency limit');
    
    });

    context('when result links is not empty', () => {
    
      it('adds the links to the \'queued\'');

      it('sets a depth of n + 1 from the current job'); 
    
    });
  
  });

});