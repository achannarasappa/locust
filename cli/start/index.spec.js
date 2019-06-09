const { assert } = require('chai');
const { filterJobResult } = require('../util');

describe('cli', () => {

  describe('start', () => {
  
    it('starts a job');
    
    context('when the boostrap option is set', () => {
    
      it('overwrites the start hook with a shell command');

      it('overwrites the connection details with the bootstraped redis and browserless');
      
      context('when docker is not installed', () => {
      
        it('throws an error');  
      
      });
      
      context('when docker-compose is not installed', () => {
      
        it('throws an error');  
      
      });

      context('when docker-compose has trouble starting services', () => {
      
        it('throws an error');
      
      });
    
    });
    
    context('when the reset option is set', () => {
    
      it('resets the queue state');
    
    });
  
  });

});