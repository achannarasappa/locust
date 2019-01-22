const assert = require('assert');
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
      const output = _filterJobResult(inputJobResult, false, false, false);
      const expected = {
        response: {
          url: 'http://test.com/1'
        },
        data: {
          test_key: 'text_value'
        },
      };

      assert.deepStrictEqual(output, expected)
    
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
        const output = _filterJobResult(inputJobResult, false, true, false);
        const expected = {
          response: {
            url: 'http://test.com/1'
          },
          data: {
            test_key: 'text_value'
          },
          links: [
            'http://test.com/1'
          ]
        };

        assert.deepStrictEqual(output, expected)
      
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
        const output = _filterJobResult(inputJobResult, false, false, true);
        const expected = {
          response: {
            url: 'http://test.com/1'
          },
          data: {
            test_key: 'text_value'
          },
          cookies: {
            'x-test': 'cookie'
          },
        };

        assert.deepStrictEqual(output, expected)
      
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
        const output = _filterJobResult(inputJobResult, true, true, false);
        const expected = 'test_body';
  
        assert.deepStrictEqual(output, expected)
      
      });
    
    });
  
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