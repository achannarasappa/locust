const R = require('ramda');
const queue = require('../../lib/queue');
const { execute } = require('../../lib/fn');
const { QueueEndError, QueueError } = require('../../lib/error');
const { refreshQueue: startRefreshingQueueInTerminal } = require('../term/queue');
const { render: renderTerminal } = require('../term/summary');
const { start: startTerminal } = require('../term');

const _instrumentJobDefinition = (redisDbResult, redisDbQueue, jobDefinition, renderer) => {
  
  const instrumentedJobDefinition = R.mergeAll([
    {},
    jobDefinition,
    {
      start: () => {
        _executeWithProgressReporting(redisDbResult, redisDbQueue, instrumentedJobDefinition, renderer)
      },
      beforeStart: (jobData) => {

        renderer.job.add({
          indicator: 'in_progress',
          status: 'Starting',
          url: jobData.url,
        })

      },
      beforeAll: (browser, snapshot, jobData) => {

        if (!jobDefinition.beforeAll)
          return;

        renderer.job.update({
          indicator: 'in_progress',
          status: 'Running',
          url: jobData.url,
          description: 'beforeAll hook',
        })

        return jobDefinition.beforeAll(browser, snapshot, jobData);
      },
      before: (page, snapshot, jobData) => {

        if (!jobDefinition.before)
          return;

        renderer.job.update({
          indicator: 'in_progress',
          status: 'Running',
          url: jobData.url,
          description: 'before hook',
        })
        return jobDefinition.before(page, snapshot, jobData);
      },
      extract: ($, browser, jobData) => {
        
        if (!jobDefinition.extract)
          return;

        renderer.job.update({
          indicator: 'in_progress',
          status: 'Running',
          url: jobData.url,
          description: 'extract hook',
        })
        return jobDefinition.extract($, browser, jobData);
      },
      after: (jobResult, snapshot, stopQueue) => {

        if (!jobDefinition.after)
          return

        renderer.job.update({
          indicator: 'in_progress',
          status: 'Running',
          url: jobResult.response.url,
          description: 'after hook',
        })
        return jobDefinition.after(jobResult, snapshot, stopQueue);
      },
    }
  ]);

  return instrumentedJobDefinition;
}

const _executeWithProgressReporting = async (redisDbResult, redisDbQueue, jobDefinition, renderer) => {
  
  return execute(_instrumentJobDefinition(redisDbResult, redisDbQueue, jobDefinition, renderer))
  .then(_handleJobResult(renderer, redisDbResult, redisDbQueue, jobDefinition))
  .catch(_handleJobError(renderer));

};

const _handleJobError = (renderer) => (e) => {

  if (e.name === 'BrowserError') {
    renderer.job.update({
      indicator: 'warn',
      status: 'Done',
      url: e.url,
      description: e.message,
    })
    return;
  }
  
  renderer.job.update({
    indicator: 'fail',
    status: 'Done',
    url: e.url,
    description: e.message,
  })

  require('fs').appendFileSync('log.txt', [
    '\n',
    e.name,
    e.url,
    e.message,
    e.stack,
  ].join('\n'));

  return;

};

const _handleJobResult = (renderer, redisDbResult, redisDbQueue, jobDefinition) => async (result) => {
  
  if (result instanceof QueueError) {
    // TODO: Add some logging here
    return;
  }

  const queueSnapshot = await queue.getSnapshot(redisDbQueue, jobDefinition.config.name);

  // TODO: case where QueueEndError is not returned at 0 in processing
  if (result instanceof QueueEndError 
    && redisDbQueue.status === 'ready' 
    && queueSnapshot.queue.processing.length === 0) {

    await (queue.stop(redisDbQueue, jobDefinition.config.name))();
    renderer.summary.updateMessage(result.message);
    return;

  }

  if (result instanceof QueueEndError)
    return;
    
  renderer.job.update({
    indicator: 'success',
    status: 'Done',
    url: result.response.url,
    description: '',
  })

  await redisDbResult.rpush('results', JSON.stringify(result))

  return result;

};

const _pollQueueWhileActive = async (redisDbQueue, jobDefinition) => {

  return await (new Promise((resolve, reject) => {

    const statusRefreshInterval = setInterval(async () => {

      const status = await redisDbQueue.hget(`sc:${jobDefinition.config.name}:state`, 'status')
      .catch(reject);

      if (status !== 'INACTIVE')
        return;

      clearInterval(statusRefreshInterval);
      resolve();

    }, 500)

  }))

};

const start = async (redisDbQueue, redisDbResult, jobDefinition, onTerminalExit) => {

  let queueRefreshInterval;
  const term = startTerminal(async () => {
    clearInterval(queueRefreshInterval);
    await onTerminalExit(redisDbQueue, redisDbResult, jobDefinition);
  });
  const renderer = renderTerminal(term);

  queueRefreshInterval = startRefreshingQueueInTerminal(redisDbQueue, jobDefinition, renderer);

  renderer.summary.updateMessage('Starting');

  _executeWithProgressReporting(redisDbResult, redisDbQueue, jobDefinition, renderer);

  await _pollQueueWhileActive(redisDbQueue, jobDefinition)
  .finally(async () => {
    clearInterval(queueRefreshInterval);
  })

};

module.exports = {
  start
};