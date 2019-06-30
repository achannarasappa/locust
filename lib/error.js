class GeneralJobError extends Error {

  constructor(message, url) {

    super(message);
    this.name = 'GeneralJobError';
    this.url = url;

  }

}
class QueueError extends GeneralJobError {

  constructor(message, url) {

    super(message);
    this.name = 'QueueError';
    this.url = url;

  }

}
class QueueEndError extends GeneralJobError {

  constructor(message, url, queueName) {

    super(message);
    this.name = 'QueueEndError';
    this.url = url;
    this.queueName = queueName;

  }

}
class BrowserError extends GeneralJobError {

  constructor(response) {

    super(response.statusText, response.url);
    this.name = 'BrowserError';
    this.response = response;

  }

}

module.exports = {
  GeneralJobError,
  QueueError,
  QueueEndError,
  BrowserError,
};
