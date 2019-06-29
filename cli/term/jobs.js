const { ScreenBuffer, TextBuffer } = require('terminal-kit');
const R = require('ramda');

const FRAMES = [
	'⠋',
	'⠙',
	'⠹',
	'⠸',
	'⠼',
	'⠴',
	'⠦',
	'⠧',
	'⠇',
	'⠏'
];

const INDICATORS = {
  IN_PROGRESS: 'in_progress',
  SUCCESS: 'success',
  INFO: 'info',
  FAIL: 'fail',
  WARN: 'warn',
};
const TIME_TO_REMOVE_SUCCESSFUL_JOB = 2000;

const INDICATOR_LENGTH = 2;
const STATUS_LENGTH = 10;
const TEXT_LENGTH = 35;

const _redrawText = (textBuffer, text, color = 'blue') => {

  textBuffer.setText(text);
  textBuffer.setAttrRegion({ color })
  textBuffer.draw();

};

const _startInverval = (screenBuffer, indicatorTextBuffer) => {

  let frameIndex = 0;

  return setInterval(() => {

    frameIndex = (frameIndex >= FRAMES.length - 1)
      ? 0
      : frameIndex + 1;

    _redrawText(indicatorTextBuffer, FRAMES[frameIndex]);
    screenBuffer.draw({ delta: true });

  }, 80);

};

class Line {
  constructor(screenBuffer, y, { url, indicator, status, description = '' } = {}) {

    this._y = y;
    this.screenBuffer = screenBuffer;
    this.indicatorTextBuffer = new TextBuffer({
      dst: this.screenBuffer,
      y: this._y,
      height: 1,
      width: INDICATOR_LENGTH,
    });
    this.statusTextBuffer = new TextBuffer({
      dst: this.screenBuffer,
      y: this._y,
      height: 1,
      width: STATUS_LENGTH,
      x: INDICATOR_LENGTH,
    });
    this.descriptionTextBuffer = new TextBuffer({
      dst: this.screenBuffer,
      y: this._y,
      height: 1,
      width: TEXT_LENGTH,
      x: INDICATOR_LENGTH + STATUS_LENGTH,
    });
    this.urlTextBuffer = new TextBuffer({
      dst: this.screenBuffer,
      y: this._y,
      height: 1,
      x: INDICATOR_LENGTH + STATUS_LENGTH + TEXT_LENGTH,
    });
    this.redrawIndicator = (v) => {
  
      if (this._indicator === 'in_progress') {
        clearInterval(this.interval);
      }

      if (v === 'in_progress') {
        this.interval = _startInverval(this.screenBuffer, this.indicatorTextBuffer);
        return;
      }

      if (v === 'success') {
        _redrawText(this.indicatorTextBuffer, '✔', 'green');
        return;
      }
  
      if (v === 'info') {
        _redrawText(this.indicatorTextBuffer, 'ℹ', 'blue');
        return;
      }
  
      if (v === 'fail') {
        _redrawText(this.indicatorTextBuffer, '✖', 'red');
        return;
      }
  
      if (v === 'warn') {
        _redrawText(this.indicatorTextBuffer, '⚠', 'yellow');
        return;
      }

      _redrawText(this.indicatorTextBuffer, '');
      return;
    
    }
    this.redrawStatus = (v) => _redrawText(this.statusTextBuffer, v, 'white');
    this.redrawDescription = (v) => _redrawText(this.descriptionTextBuffer, v, 'gray');
    this.redrawUrl = (v) => _redrawText(this.urlTextBuffer, v, 'gray');

    this.indicator = indicator;
    this.status = status;
    this.description = description;
    this.url = url;
    this.screenBuffer.draw({ delta: true });
  }
  set indicator(v) {

    this.redrawIndicator(v);
    this._indicator = v;
    this.screenBuffer.draw({ delta: true });

  }
  get indicator() { return this._indicator; }
  set status(v) {
    this._status = v;
    this.redrawStatus(v);
    this.screenBuffer.draw({ delta: true });
  }
  get status () { return this._status; }
  set description(v) {
    this._description = v;
    this.redrawDescription(v);
    this.screenBuffer.draw({ delta: true });
  }
  get description () { return this._description; }
  set url(v) {
    this._url = v;
    this.redrawUrl(v);
    this.screenBuffer.draw({ delta: true });
  }
  get url () { return this._url; }
  set y(v) {
    this._y = v;
    this.clear();
    this.indicatorTextBuffer.y = v;
    this.statusTextBuffer.y = v;
    this.descriptionTextBuffer.y = v;
    this.urlTextBuffer.y = v;
    this.redraw(this.indicator, this.status, this.description, this.url);
  }
  get y() { return this._y; }
  redraw(indicator, status, description, url) {
    this.redrawIndicator(indicator);
    this.redrawStatus(status);
    this.redrawDescription(description);
    this.redrawUrl(url);
    this.indicatorTextBuffer.draw();
    this.statusTextBuffer.draw();
    this.descriptionTextBuffer.draw();
    this.urlTextBuffer.draw();
  }
  clear() {
    this.redraw('', '', '', '');
  }
}

const render = (term, y) => {

  const screenBuffer = new ScreenBuffer({
    dst: term,
    y,
  });

  let lines = [];

  const renderer = {
    add: (job) => {
      lines.push(new Line(screenBuffer, lines.length, job));
    },
    update: ({ url, indicator, status, description }) => lines.map((line) => {
  
      if (line.url !== url)
        return;
  
      if (line.indicator !== indicator)
        line.indicator = indicator;
  
      if (line.status !== status)
        line.status = status;
  
      if (line.description !== description)
        line.description = description;

      if (indicator === 'success')
        setTimeout(() => {
          renderer.remove(url);
        
        }, TIME_TO_REMOVE_SUCCESSFUL_JOB);
  
    }),
    remove: (url) => {
      [ linesToRemove, linesToUpdate ] = R.partition((line) => line.url === url, lines)
      linesToRemove.map((line) => line.clear());
      lines = linesToUpdate.map((line, i) => {
        line.y = i;
        return line;
      });
      screenBuffer.draw({ delta: true });
    },
  };

  return renderer;
  
};

module.exports = {
  render,
}