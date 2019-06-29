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

const INDICATOR_LENGTH = 2;
const STATUS_LENGTH = 10;
const TEXT_LENGTH = 35;

const _redrawText = (screenBuffer, textBuffer, text, color = 'blue') => {

  textBuffer.setText(text);
  textBuffer.setAttrRegion({ color })
  textBuffer.draw();
  screenBuffer.draw({ delta: true });

};

const _startInverval = (screenBuffer, indicatorTextBuffer) => {

  let frameIndex = 0;

  return setInterval(() => {

    frameIndex = (frameIndex >= FRAMES.length - 1)
      ? 0
      : frameIndex + 1;

    _redrawText(screenBuffer, indicatorTextBuffer, FRAMES[frameIndex]);

  }, 80);

};

class Line {
  constructor(screenBuffer, y, { url, indicator, status, description } = {}) {

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
        _redrawText(this.screenBuffer, this.indicatorTextBuffer, '✔', 'green');
        return;
      }
  
      if (v === 'info') {
        _redrawText(this.screenBuffer, this.indicatorTextBuffer, 'ℹ', 'green');
        return;
      }
  
      if (v === 'fail') {
        _redrawText(this.screenBuffer, this.indicatorTextBuffer, '✖', 'red');
        return;
      }
  
      if (v === 'warn') {
        _redrawText(this.screenBuffer, this.indicatorTextBuffer, '⚠', 'yellow');
        return;
      }
    
    }
    this.redrawStatus = (v) => _redrawText(this.screenBuffer, this.statusTextBuffer, v, 'white', y);
    this.redrawDescription = (v) => _redrawText(this.screenBuffer, this.descriptionTextBuffer, v, 'gray');
    this.redrawUrl = (v) => _redrawText(this.screenBuffer, this.urlTextBuffer, v, 'gray');

    this.update({ url, indicator, status, description });
  }
  set indicator(v) {

    this._indicator = v;

    this.redrawIndicator(v);

  }
  get indicator() { return this._indicator; }
  set status(v) {
    this._status = v;
    this.redrawStatus(v);
  }
  get status () { return this._status; }
  set description(v) {
    this._description = v;
    this.redrawDescription(v);
  }
  get description () { return this._description; }
  set url(v) {
    this._url = v;
    this.redrawUrl(v);
  }
  get url () { return this._url; }
  set y(v) {
    this._y = v;
    this.indicatorTextBuffer.y = v;
    this.statusTextBuffer.y = v;
    this.descriptionTextBuffer.y = v;
    this.urlTextBuffer.y = v;
    this.redraw();
  }
  get y() { return this._y; }
  update({ url, indicator, status, description }) {
    this._indicator = indicator;
    this._status = status;
    this._description = description;
    this._url = url;
    this.redraw();
  }
  redraw() {
    this.redrawIndicator(this._indicator);
    this.redrawStatus(this._status);
    this.redrawDescription(this._description);
    this.redrawUrl(this._url);
    debugger;
  }
}

const _createLines = (screenBuffer) => Array(10).fill(0).map((v, i) => new Line(screenBuffer, i));

const render = (term, y) => {

  const screenBuffer = new ScreenBuffer({
    dst: term,
    y,
  });

  let lines = [];

  return {
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
  
    }),
    remove: (url) => {
      lines = R.reject((line) => line.url === url, lines)
      lines = lines.map((line, i) => {
        line.y = i;
        return line;
      });
      lines.map((line) => line.redraw());
    },
  };
  
};

module.exports = {
  render,
}