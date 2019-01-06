const sinon = require('sinon');
const assert = require('assert');
const { run } = require('./job');
  
describe('fn', () => {

  describe('validate', () => {
  
    it('validates a job spec');
  
  });

  describe('run', () => {

    describe.skip('system lifecycle hooks', () => {
    
      context('when a redis connection is set', () => {

        it('runs the queue start and end hooks', async () => {
  
          const queue = {
            startHook: startHook = sinon.fake(),
            endHook: endHook = sinon.fake(),
          };

          await run({}, queue)

          assert(startHook.calledOnce);
          assert(startHook.calledBefore(endHook));

          assert(endHook.calledOnce);
          assert(endHook.calledAfter(startHook));
  
        });

      });
    
    });
    
    describe.skip('user defined lifecycle hooks', () => {
    
      context('when the "before" hook is defined', () => {
      
        it('runs the hook', async () => {
        
          const job = {
            before: beforeHook = sinon.fake()
          };

          await run(job)

          assert(beforeHook.calledOnce);
        
        });
      
      });
  
      context('when "beforeAll" hook is defined', () => {
      
        context('and has not yet been run globally', () => {
      
          it('runs the hook', async () => {
          
            const queueState = { firstRun: false };
            const queue = {
              startHook: sinon.fake.returns(queueState),
              endHook: sinon.fake(),
            };
            const job = {
              beforeAll: beforeAllHook = sinon.fake()
            };
  
            await run(job, queue)
  
            assert(beforeAllHook.calledOnce);
            assert(beforeAllHook.calledWith(queueState));
          
          });
        
        });
    
        context('and has been run globally', () => {
        
          it('skips the hook', async () => {
          
            const queueState = { firstRun: true };
            const queue = {
              startHook: sinon.fake.returns(queueState),
              endHook: sinon.fake(),
            };
            const job = {
              beforeAll: beforeAllHook = sinon.fake()
            };
  
            await run(job, queue)
  
            assert(beforeAllHook.notCalled);
          
          });
        
        });

        context('and there is no queue', () => {
        
          it('runs the hook', async () => {
          
            const job = {
              beforeAll: beforeAllHook = sinon.fake()
            };
  
            await run(job)
  
            assert(beforeAllHook.calledOnce);
            assert(beforeAllHook.calledWith());
          
          });
        
        });
      
      });
      
      context('when the "extract" hook is defined', () => {
      
        it('runs the hook');
      
      });
    
    });
  
  });

});