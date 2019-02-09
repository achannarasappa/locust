const { assert } = require('chai');
const { _filterJobResult } = require('./index');

describe('cli', () => {

  describe('_filterJobResult', () => {
  
    it('filters response fields for the cli', () => {
    
      const inputJobResult = {
        response: {
          url: 'http://test.com/1',
          body: 'test_body'
        },
        data: {
          test_key: 'text_value'
        },
        cookies: {
          'x-test': 'cookie'
        },
        links: [
          'http://test.com/1'
        ]
      };
      const output = _filterJobResult(inputJobResult, false, false, false, false);
      const expected = {
        url: 'http://test.com/1',
        data: {
          test_key: 'text_value'
        },
      };

      assert.deepEqual(output, expected)
    
    });

    context('when an invalid result is returned', () => {
    
      it('passes the result through', () => {
      
        const input = new Error('test');
        const output = _filterJobResult(input, false, false, false, false);
      
        assert.deepEqual(output, input)
      
      });
    
    });

    context('when include response flag is set', () => {
    
      it('includes resonse', () => {
      
        const inputJobResult = {
          response: {
            url: 'http://test.com/1',
            body: 'test_body'
          },
          data: {
            test_key: 'text_value'
          },
          cookies: {
            'x-test': 'cookie'
          },
          links: [
            'http://test.com/1'
          ]
        };
        const output = _filterJobResult(inputJobResult, false, false, false, true);
        const expected = {
          url: 'http://test.com/1',
        };

        assert.deepEqual(output.response, expected)
      
      });
    
    });

    context('when include links flag is set', () => {
    
      it('includes links', () => {
      
      
        const inputJobResult = {
          response: {
            url: 'http://test.com/1',
            body: 'test_body'
          },
          data: {
            test_key: 'text_value'
          },
          cookies: {
            'x-test': 'cookie'
          },
          links: [
            'http://test.com/1'
          ]
        };
        const output = _filterJobResult(inputJobResult, false, true, false, false);
        const expected = [
          'http://test.com/1'
        ];

        assert.deepEqual(output.links, expected)
      
      });
    
    });

    context('when include cookies flag is set', () => {
    
      it('includes cookies', () => {
      
        const inputJobResult = {
          response: {
            url: 'http://test.com/1',
            body: 'test_body'
          },
          data: {
            test_key: 'text_value'
          },
          cookies: {
            'x-test': 'cookie'
          },
          links: [
            'http://test.com/1'
          ]
        };
        const output = _filterJobResult(inputJobResult, false, false, true, false);
        const expected = {
          'x-test': 'cookie'
        };

        assert.deepEqual(output.cookies, expected)
      
      });
    
    });

    context('when only html flag is set', () => {
    
      it('returns only the html from the result', () => {
    
        const inputJobResult = {
          response: {
            url: 'http://test.com/1',
            body: 'test_body'
          },
          data: {
            test_key: 'text_value'
          },
          cookies: {
            'x-test': 'cookie'
          },
          links: [
            'http://test.com/1'
          ]
        };
        const output = _filterJobResult(inputJobResult, true, true, false, false);
        const expected = 'test_body';
  
        assert.deepEqual(output, expected)
      
      });
    
    });
  
  });

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