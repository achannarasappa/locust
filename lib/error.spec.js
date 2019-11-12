const { assert } = require('chai'); const {
  GeneralJobError,
  QueueError,
  QueueEndError,
  BrowserError,
} = require('./error');

describe('error', () => {

  describe('GeneralJobError', () => {

    it('returns an error', () => {

      const input = new GeneralJobError('message', 'http://localhost');

      assert.deepEqual(input.name, 'GeneralJobError');
      assert.deepEqual(input.url, 'http://localhost');

    });

  });

  describe('QueueError', () => {

    it('returns an error', () => {

      const input = new QueueError('message', 'http://localhost');

      assert.deepEqual(input.name, 'QueueError');
      assert.deepEqual(input.url, 'http://localhost');

    });

  });

  describe('QueueEndError', () => {

    it('returns an error', () => {

      const input = new QueueEndError('message', 'http://localhost');

      assert.deepEqual(input.name, 'QueueEndError');
      assert.deepEqual(input.url, 'http://localhost');

    });

  });

  describe('BrowserError', () => {

    it('returns an error', () => {

      const response = { statusText: 'ok', url: 'http://localhost' };
      const input = new BrowserError(response);

      assert.deepEqual(input.name, 'BrowserError');
      assert.deepEqual(input.url, 'http://localhost');
      assert.deepEqual(input.response, response);

    });

  });

});

