const sinon = require('sinon');
const { assert } = require('chai');
const { executeSingleJob } = require('./job');
  
describe('fn', () => {

  describe.skip('executeSingleJob', () => {
  
    it('runs a single job definition', async () => {
    
      const jobDefinition = {
        url: 'https://news.ycombinator.com/'
      };

      const output = await executeSingleJob(jobDefinition);
    
    });
  
  });

});