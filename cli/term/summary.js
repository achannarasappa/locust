const { ScreenBuffer, TextBuffer, terminal } = require('terminal-kit');
const { render: renderJobs } = require('./jobs');

const MENU_HEIGHT = 1;
const HEADER_HEIGHT = 16;
const SUMMARY_SECTION_Y_POSITION = MENU_HEIGHT + 1;
const QUEUE_SECTION_Y_POSITION = MENU_HEIGHT + 5;
const JOBS_SECTION_Y_POSITION = HEADER_HEIGHT + MENU_HEIGHT - 2;
const FIELD_TEXT_WIDTH = 12;
const FIELD_GAP_WIDTH = 1;
const FIELD_OFFSET_X = 3;

const _renderSubSection = (term, title, y, x, width) => {

  const screenBuffer = new ScreenBuffer({
    dst: term,
    y,
    x,
    height: 1,
    width,
  });
  const textBuffer = new TextBuffer({
    dst: screenBuffer,
    x: 0,
    width: title.length + 2,
  });

  screenBuffer.fill({ char: '─', attr: { color: 'gray' }});
  textBuffer.setText(` ${title} `);
  textBuffer.setAttrRegion({ color: 'gray' })
  textBuffer.draw();
  screenBuffer.draw();

};

const _renderSection = (term, title, y) => {

  const screenBuffer = new ScreenBuffer({
    dst: term,
    y,
    height: 1,
  });
  const textBuffer = new TextBuffer({
    dst: screenBuffer,
    x: 1,
    width: title.length + 2,
  });

  screenBuffer.fill({ char: '━', attr: { color: 'gray' }});
  textBuffer.setText(` ${title} `);
  textBuffer.setAttrRegion({ color: 'gray' })
  textBuffer.draw();
  screenBuffer.draw();

};

const _renderField = (term, y, x, valueWidth) => {

  const screenBuffer = new ScreenBuffer({
    dst: term,
    y,
    x,
    height: 1,
    width: (FIELD_TEXT_WIDTH + valueWidth) + (FIELD_GAP_WIDTH * 2),
  });
  const keyTextBuffer = new TextBuffer({
    dst: screenBuffer,
    width: FIELD_TEXT_WIDTH,
    x: FIELD_GAP_WIDTH,
  });
  const valueTextBuffer = new TextBuffer({
    dst: screenBuffer,
    width: valueWidth,
    x: FIELD_TEXT_WIDTH + (FIELD_GAP_WIDTH * 2),
  });

  return (key) => (value, valueColor = 'white') => {

    keyTextBuffer.setText(key);
    keyTextBuffer.setAttrRegion({ color: 'gray' })
    keyTextBuffer.draw();
    valueTextBuffer.setText(value);
    valueTextBuffer.setAttrRegion({ color: valueColor })
    valueTextBuffer.draw();
    screenBuffer.draw();
  
  };

}

const _createRenderApi = (term) => {

  const renderUI = () => {
    _renderSection(term, 'Summary', SUMMARY_SECTION_Y_POSITION);
    _renderSection(term, 'Queue', QUEUE_SECTION_Y_POSITION);
    _renderSection(term, 'Jobs', JOBS_SECTION_Y_POSITION);
    _renderSubSection(term, 'Jobs by Status', QUEUE_SECTION_Y_POSITION + 2, FIELD_OFFSET_X - 1, FIELD_OFFSET_X - 1 + (6 * FIELD_TEXT_WIDTH) + (FIELD_GAP_WIDTH * 6))
    _renderSubSection(term, 'State', QUEUE_SECTION_Y_POSITION + 5, FIELD_OFFSET_X - 1, FIELD_OFFSET_X - 1 + (6 * FIELD_TEXT_WIDTH) + (FIELD_GAP_WIDTH * 6))
  };
  const queue = {
    updateQueued: _renderField(term, QUEUE_SECTION_Y_POSITION + 3, FIELD_OFFSET_X)('Queued'),
    updateProcessing: _renderField(term, QUEUE_SECTION_Y_POSITION + 3, FIELD_OFFSET_X + (2 * FIELD_TEXT_WIDTH) + (FIELD_GAP_WIDTH * 2))('Processing'),
    updateDone: _renderField(term, QUEUE_SECTION_Y_POSITION + 3, FIELD_OFFSET_X + (4 * FIELD_TEXT_WIDTH) + (FIELD_GAP_WIDTH * 4))('Done'),
    updateStatus: _renderField(term, QUEUE_SECTION_Y_POSITION + 6, FIELD_OFFSET_X, 100)('Status'),
    updateFirstRun: _renderField(term, QUEUE_SECTION_Y_POSITION + 6, FIELD_OFFSET_X + (2 * FIELD_TEXT_WIDTH) + (FIELD_GAP_WIDTH * 2))('First Run'),
  }

  const summary = {
    updateMessage: _renderField(term, SUMMARY_SECTION_Y_POSITION + 2, FIELD_OFFSET_X)('Status'),
  };

  const job = renderJobs(term, HEADER_HEIGHT);

  return {
    renderUI,
    renderInitialUI: () => {
    
      renderUI();
      queue.updateStatus('');
      queue.updateFirstRun('');
      queue.updateQueued('');
      queue.updateProcessing('');
      queue.updateDone('');
      summary.updateMessage('Inactive');
    
    },
    queue,
    summary,
    job,
  }

};

const render = (term) => {

  term.windowTitle('locust - summary');

  const renderApi = _createRenderApi(term);

  // TODO: Implement removal of listener
  term.on('resize', () => {
    renderApi.renderUI();
  })

  renderApi.renderInitialUI();

  return renderApi;

};

module.exports = { render };
