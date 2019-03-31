class QueueError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueueError';
  }
}
class BrowserError extends Error {
  constructor(response) {
    super(response.statusText);
    this.name = 'BrowserError';
    this.response = response;
  }
}

module.exports = {
  QueueError,
  BrowserError,
}