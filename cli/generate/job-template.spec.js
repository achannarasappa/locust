const template = require('./job-template');
const { assert } = require('chai');
const R = require('ramda');

describe('job-template', () => {

  const baseInput = {
    name: 'test-job',
    url: 'http://example.com',
    optionalHooks: [],
    extractFields: [],
    concurrencyLimit: 9,
    depth: 3,
    filter: 'no',
    browserConnection: 'none',
    redisConnection: 'none',
  };

  describe('templates', () => {
  
    it('generates a template job file with default options', () => {
    
      const output = template(baseInput);
      const expected = [
        'module.exports = {',
        '  start: async () => {',
        '  /**',
        '  * Callback to initiate this job on the serverless provider',
        '  * https://locust.dev/docs/job#start',
        '  * ',
        '  * @example',
        '  * const lambda = new AWS.Lambda();',
        '  * await lambda.invoke({ FunctionName: \'myScrapeJob\' }).promise();',
        '  */',
        '',
        '',
        '',
        '  },',
        '  url: \'http://example.com\',',
        '  config: {',
        '    name: \'test-job\',',
        '    concurrencyLimit: 9,',
        '    depthLimit: 3,',
        '    delay: 1000,',
        '  },',
        '  connection: {',
        '    chrome: {},',
        '  }',
        '};',
      ].join('\n');
      
      assert.deepEqual(output, expected)
    
    });

    context('when the beforeAll option is set', () => {
    
      it('includes a before all function with help text', () => {
      
        const input = R.mergeRight(
          baseInput,
          {
            optionalHooks: [
              'beforeAll'
            ],
          }
        );
        const output = template(input);
        const expected = `beforeAll: (`
        
        assert.include(output, expected)
      
      });
    
    });

    context('when the before option is set', () => {
    
      it('includes a before function with help text', () => {
      
        const input = R.mergeRight(
          baseInput,
          {
            optionalHooks: [
              'before'
            ],
          }
        );
        const output = template(input);
        const expected = `before: (`
        
        assert.include(output, expected)
      
      });
    
    });

    context('when the after option is set', () => {
    
      it('includes a after function with help text', () => {
      
        const input = R.mergeRight(
          baseInput,
          {
            optionalHooks: [
              'after'
            ],
          }
        );
        const output = template(input);
        const expected = `after: (`;
        
        assert.include(output, expected)
      
      });
    
    });

    context('when the extract option is set', () => {
    
      context('when there are no fields are selected for extraction', () => {
      
        it('includes a extract function with help text', () => {
        
          const input = R.mergeRight(
            baseInput,
            {
              optionalHooks: [
                'extract'
              ],
            }
          );
          const output = template(input);
          const expected = `extract: async (`;
          
          assert.include(output, expected)
        
        });
      
      });

      context('when there are fields selected for extraction', () => {
      
        it('adds DOM selectors for those fields in the rendered templates', () => {
        
          const input = R.mergeRight(
            baseInput,
            {
              optionalHooks: [
                'extract'
              ],
              extractFields: [
                {
                  cssPath: '.body .page-title',
                  label: 'page-title'
                }
              ],
            }
          );
          const output = template(input);
          const expected = `page-title\': await $('.body .page-title')`;
          
          assert.include(output, expected)
        
        });
      
      });
    
    });

    context('when the start option is set', () => {

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
      
        it('includes boilerplate for a blocklist and allowlist array', () => {
        
          const input = R.mergeRight(
            baseInput,
            {
              filter: 'yes'
            }
          );
          const output = template(input);
          const expected = `filter: {`;
          
          assert.include(output, expected)
        
        });
      
      });

      context('when the yes with domain option is selected', () => {
      
        it('includes boilerplate for an allowlist with the hostname for the provided url set', () => {
        
          const input = R.mergeRight(
            baseInput,
            {
              url: 'http://only-this-domain.com',
              filter: 'yes_only_domain'
            }
          );
          const output = template(input);
          const expected = `'only-this-domain.com',`;
          
          assert.include(output, expected)
        
        });
      
      });

      context('when the yes with domain option is selected', () => {
      
        it('includes boilerplate for an allowlist with the hostname for the provided url set', () => {
        
          const input = R.mergeRight(
            baseInput,
            {
              filter: 'yes_function'
            }
          );
          const output = template(input);
          const expected = `filter: (links) =>`;
          
          assert.include(output, expected)
        
        });
      
      });
    
    });

    context('when the redis connection option is set', () => {
    
      it('includes connection details for a local redis', () => {
      
        const input = R.mergeRight(
          baseInput,
          {
            redisConnection: 'local',
          }
        );
        const output = template(input);
        const expected = `redis: {`;
        
        assert.include(output, expected)
      
      });
    
    });
  
    context('when the browser connection option is set', () => {
    
      it('includes connection details for a local browserless instance', () => {
      
        const input = R.mergeRight(
          baseInput,
          {
            redisConnection: 'local',
          }
        );
        const output = template(input);
        const expected = `chrome: {`;
        
        assert.include(output, expected)
      
      });
    
    });

  });

});