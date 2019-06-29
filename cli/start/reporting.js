const R = require('ramda');
const { execute } = require('../../lib/fn');
const { QueueError } = require('../../lib/error');
const { refreshQueue: startRefreshingQueueInTerminal } = require('../term/queue');
const { render: renderTerminal } = require('../term/summary');
const { start: startTerminal } = require('../term');

const _instrumentJobDefinition = (redisDbResult, jobDefinition, renderer) => {
  
  const instrumentedJobDefinition = R.mergeAll([
    {},
    jobDefinition,
    {
      start: () => {
        _executeWithProgressReporting(redisDbResult, instrumentedJobDefinition, renderer);
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

const _executeWithProgressReporting = async (redisDbResult, jobDefinition, renderer) => {
  
  return execute(_instrumentJobDefinition(redisDbResult, jobDefinition, renderer))
  .then(_handleJobResult(renderer, redisDbResult))
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

  require('fs').writeFileSync('./message.json', JSON.stringify({ message: e.message, stack: e.stack }), 'utf8')
  renderer.summary.updateMessage('Error in one or more jobs');
  return;

};

const _handleJobResult = (renderer, redisDbResult) => async (result) => {

  if (result instanceof QueueError) {
    renderer.job.update({
      indicator: 'info',
      status: 'Aborted',
      url: result.url,
      description: 'Job aborted due to stop condition',
    })
    return;
  }

  if (redisDbResult.status === 'ready') {

    renderer.job.update({
      indicator: 'success',
      status: 'Done',
      url: result.response.url,
      description: '',
    })
    await redisDbResult.rpush('results', JSON.stringify(result))

  } else {

    renderer.job.update({
      indicator: 'warn',
      status: 'Done',
      url: result.response.url,
      description: 'Finished after stop condition',
    })

  }

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

  _executeWithProgressReporting(redisDbResult, jobDefinition, renderer);

  await _pollQueueWhileActive(redisDbQueue, jobDefinition)
  .finally(() => {
    clearInterval(queueRefreshInterval)
  })

};

module.exports = {
  start
};