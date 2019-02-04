describe('job-template', () => {

  describe('templates', () => {
  
    it('generates a template job file with default options');

    context('when the beforeAll option is set', () => {
    
      it('includes a before all function with help text');
    
    });

    context('when the before option is set', () => {
    
      it('includes a before function with help text');
    
    });

    context('when the extract option is set', () => {
    
      context('when there are no fields are selected for extraction', () => {
      
        it('includes a extract function with help text');
      
      });

      context('when there are fields selected for extraction', () => {
      
        it('adds DOM selectors for those fields in the rendered templates');
      
      });
    
    });

    context('when the start option is set', () => {
    
      context('when the user declines adding a provider specific hook', () => {
      
        it('includes a start function with help text');
      
      });

      context('when the user accepts adding provider specific hooks', () => {
      
        context('when the local provider option is set', () => {
        
          it('includes a start function with a shell command to start the job');
        
        });

        context('when the AWS Lambda option is set', () => {
        
          it('includes a start function with boilerplate to start an AWS Lambda function');  
        
        });
      
      });
    
    });

    context('when the filter option is set', () => {
    
      context('when the yes option is selected', () => {
      
        it('includes boilerplate for a blocklist and allowlist array');
      
      });

      context('when the yes with domain option is selected', () => {
      
        it('includes boilerplate for an allowlist with the hostname for the provided url set');
      
      });
    
    });

    context('when the redis connection option is set', () => {
    
      it('includes connection details for a local redis');
    
    });
  
    context('when the browser connection option is set', () => {
    
      it('includes connection details for a local browserless instance');
    
    });

  });

});