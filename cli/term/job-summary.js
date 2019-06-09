const { ScreenBuffer, TextBuffer } = require('terminal-kit');

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

const INDICATOR_LENGTH = 2;
const STATUS_LENGTH = 10;
const TEXT_LENGTH = 35;

class JobSummary {

	constructor(term, initialText, y = 1) {

		this.screenBuffer = new ScreenBuffer({
			dst: term,
			y,
			height: 1,
		});
		this.indicatorTextBuffer = new TextBuffer({
			dst: this.screenBuffer,
			width: INDICATOR_LENGTH,
		});
		this.statusTextBuffer = new TextBuffer({
			dst: this.screenBuffer,
			width: STATUS_LENGTH,
			x: INDICATOR_LENGTH,
		});
		this.descriptionTextBuffer = new TextBuffer({
			dst: this.screenBuffer,
			width: TEXT_LENGTH,
			x: INDICATOR_LENGTH + STATUS_LENGTH,
		});
		this.urlTextBuffer = new TextBuffer({
			dst: this.screenBuffer,
			x: INDICATOR_LENGTH + STATUS_LENGTH + TEXT_LENGTH,
		});
		
		this.frameIndex = 0;
		this._text = initialText;
		this._status = 'Starting';
		this._url = '';

		this.redraw = ({ indicatorChar, indicatorColor = 'blue', statusText, descriptionText, urlText }) => {
		
			if (indicatorChar) {
				this.indicatorTextBuffer.setText(indicatorChar);
				this.indicatorTextBuffer.setAttrRegion({ color: indicatorColor })
				this.indicatorTextBuffer.draw();
			}

			if (statusText) {
				this.statusTextBuffer.setText(statusText);
				this.statusTextBuffer.draw();
			}

			if (descriptionText) {
				this.descriptionTextBuffer.setText(descriptionText);
				this.descriptionTextBuffer.setAttrRegion({ color: 'gray' })
				this.descriptionTextBuffer.draw();
			}
			
			if (urlText) {
				this.urlTextBuffer.setText(urlText);
				this.urlTextBuffer.setAttrRegion({ color: 'gray' })
				this.urlTextBuffer.draw();
			}

			this.screenBuffer.draw();
		
		}

	}
	get url() {
		return this._url;
	}
	set url(v) {
		this._url = v;
		this.redraw({
			urlText: this.url
		});
	}
	get text() {
		return this._text.padEnd(TEXT_LENGTH, ' ');
	}
	set text(v) {
		this._text = v || '';
		this.redraw({
			descriptionText: this.text,
		});
	}
	get status() {
		return this._status.padEnd(STATUS_LENGTH, ' ');
	}
	set status(v) {
		this._status = v;
		this.redraw({
			statusText: this.status
		});
	}
	start() {

		this.redraw({
			indicatorChar: FRAMES[0],
			statusText: this.status,
			descriptionText: this.text,
			urlText: this.url
		});
		this.interval = setInterval(() => {

			this.frameIndex = (this.frameIndex >= FRAMES.length - 1)
				? 0
				: this.frameIndex + 1;

			this.redraw({ indicatorChar: FRAMES[this.frameIndex] });

		}, 80)

		return this;

	}
	update({ text, status, url }) {
		this.status = status || this.status;
		this.text = text || this.text;
		this.url = url || this.url;
		this.redraw({
			statusText: this.status,
			descriptionText: this.text,
			urlText: this.url,
		});
	}
	succeed({ text, status, url }) {

		this.status = status || 'Done';
		this.text = text;
		this.url = url || this.url;
		this.redraw({
			indicatorChar: '✔',
			indicatorColor: 'green',
			statusText: this.status,
			descriptionText: this.text,
			urlText: this.url,
		});
		clearInterval(this.interval);

		return this;

	}
	fail({ text, status, url }) {

		this.status = status || 'Done';
		this.text = text;
		this.url = url || this.url;
		this.redraw({
			indicatorChar: '✖',
			indicatorColor: 'red',
			statusText: this.status,
			descriptionText: this.text,
			urlText: this.url,
		});
		clearInterval(this.interval);

		return this;

	}
	info({ text, status, url }) {

		this.status = status || 'Done';
		this.text = text;
		this.url = url || this.url;
		this.redraw({
			indicatorChar: 'ℹ',
			indicatorColor: 'blue',
			statusText: this.status,
			descriptionText: this.text,
			urlText: this.url,
		});
		clearInterval(this.interval);

		return this;

	}
	warn({ text, status, url }) {

		this.status = status || 'Done';
		this.text = text;
		this.url = url || this.url;
		this.redraw({
			indicatorChar: '⚠',
			indicatorColor: 'yellow',
			statusText: this.status,
			descriptionText: this.text,
			urlText: this.url,
		});
		clearInterval(this.interval);

		return this;

	}
};

module.exports = JobSummary;