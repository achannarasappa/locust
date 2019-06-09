const R = require('ramda');
const Redis = require('ioredis');
const DraftLog = require('draftlog');
const { grey, green, red, white } = require('chalk');
const queue = require('../../lib/queue');

const MAX_LIST_COUNT = 5;
const UI = [
  `╭───────────┬──────────╮`,
  `│ Status    │          │`, // 1
  `├───────────┼──────────┤`,
  `│ First run │          │`, // 3
  `╰───────────┴──────────╯`,
  ``,
  `╭──────────────────────╮`,
  `│ Processing           │`, // 7
  `╰──────────────────────╯`,
  ...Array(MAX_LIST_COUNT).fill(' '), // 9..13
  ``,
  `╭──────────────────────╮`,
  `│ Queued               │`, // 16
  `╰──────────────────────╯`,
  ...Array(MAX_LIST_COUNT).fill(' '), // 18..22
  ``,
  `╭──────────────────────╮`,
  `│ Done                 │`, //25
  `╰──────────────────────╯`,
  ...Array(MAX_LIST_COUNT).fill(' '), // 27..31
  ``,
];
const _rangeIndexToName = (start, end, name) => R.pipe(
  R.reduce((acc, i) => {
    return {
      relativeIndex: acc.relativeIndex + 1,
      indexNameTuples: acc.indexNameTuples.concat([[ i, name + acc.relativeIndex ]])
    }
  }, { relativeIndex: 0, indexNameTuples: [] }),
  R.path(['indexNameTuples']),
  R.fromPairs,
)(R.range(start, end + 1));

const UI_INDEXES = {
  1: 'status',
  3: 'firstRun',
  7: 'processingCount',
  ..._rangeIndexToName(9, 13, 'processingLine'),
  16: 'queuedCount',
  ..._rangeIndexToName(18, 22, 'queuedLine'),
  25: 'doneCount',
  ..._rangeIndexToName(27, 31, 'doneLine'),

};


// TODO: update to indexed line update functions
const _createSnapshotRender = () => {

  return R.fromPairs(UI.reduce((acc, v, i) => {

    if (UI_INDEXES[i])
      return acc.concat([[
        UI_INDEXES[i] + 'Update',
        console.draft(grey(v))
      ]])

    console.log(grey(v));
    return acc;

  }, []))

};

const _renderJobList = (renderer, list, name) => R.pipe(
  R.take(MAX_LIST_COUNT),
  R.addIndex(R.map)((v, i) => renderer[`${name}Line${i}Update`](v))
)(list);

const _renderSnapshot = (snapshot, renderer) => {

  const status = snapshot.state.status === 'ACTIVE' 
  ? green(snapshot.state.status.padEnd(8, ' '))
  : red(snapshot.state.status.padEnd(8, ' '));
  const firstRun = white((snapshot.state.firstRun ? 'yes' : 'no').padEnd(8, ' '));
  const processingCount = white(`(${snapshot.queue.processing.length})`.padEnd(9, ' '));
  const queuedCount = white(`(${snapshot.queue.queued.length})`.padEnd(13, ' '));
  const doneCount = white(`(${snapshot.queue.done.length})`.padEnd(15, ' '));

  renderer.statusUpdate(grey(`│ Status    │ ${status} │`));
  renderer.firstRunUpdate(grey(`│ First run │ ${firstRun} │`));
  renderer.processingCountUpdate(grey(`│ Processing ${processingCount} │`));
  renderer.queuedCountUpdate(grey(`│ Queued ${queuedCount} │`));
  renderer.doneCountUpdate(grey(`│ Done ${doneCount} │`));

  _renderJobList(renderer, snapshot.queue.processing, 'processing');
  _renderJobList(renderer, snapshot.queue.queued, 'queued');
  _renderJobList(renderer, snapshot.queue.done, 'done');
  

};

const _refreshSnapshot = async (redis, jobDefinition) => {

  DraftLog(console).addLineListener(process.stdin);

  await new Promise(
    () => setInterval(async () => {
      const renderer = _createSnapshotRender();
      _renderSnapshot(await queue.getSnapshot(redis, jobDefinition.config.name), renderer);

    }, 1000)
  ).catch(console.log)

  process.stdin.pause();

};

const info = async (filePath) => {

  const jobDefinition = require(`${process.cwd()}/${filePath}`);

  const redis = await new Redis(jobDefinition.connection.redis);

  await _refreshSnapshot(redis, jobDefinition);

  await redis.quit();

};

module.exports = info;