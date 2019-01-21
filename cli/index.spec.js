describe('cli', () => {

  describe('run', () => {
  
    it('filters response fields for the cli');
  
  });

  describe('start', () => {
  
    it('starts a job definition');
    
    context('when the boostrap option is set', () => {
    
      it('overwrites the start hook with a shell command');

      it('overwrites the connection details with the bootstraped redis and brwoserless');
      
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
    
  
  });

});