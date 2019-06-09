const chalk = require('chalk');
const DraftLog = require('draftlog');

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

const STATUS_LENGTH = 10;
const TEXT_LENGTH = 35;

class Spinner {

	constructor(initialText) {

		DraftLog(console).addLineListener(process.stdin);
		this.frameIndex = 0;
		this._text = initialText;
		this._status = 'Starting';
		this._url = '';

	}
	get url() {
		return chalk.grey(this._url);
	}
	set url(v) {
		this._url = v;
	}
	get text() {
		return chalk.grey(this._text.padEnd(TEXT_LENGTH, ' '));
	}
	set text(v) {
		this._text = v;
	}
	get status() {
		return this._status.padEnd(STATUS_LENGTH, ' ');
	}
	set status(v) {
		this._status = v;
	}
	start() {
	
		this.update = console.draft(`${chalk.blue(FRAMES[0])} ${this.status} ${this.text} ${this.url}`);
		this.interval = setInterval(() => {

			this.frameIndex = (this.frameIndex >= FRAMES.length - 1)
			? 0
			: this.frameIndex + 1;
	
			this.update(`${chalk.blue(FRAMES[this.frameIndex])} ${this.status} ${this.text} ${this.url}`);
	
		}, 80)

		return this;
	
	}
	succeed(text, status) {

		this.status = status || 'Done';
		this.text = text;
		this.update(`${chalk.green('✔')} ${this.status} ${this.text} ${this.url}`);
		clearInterval(this.interval);
		process.stdin.pause();

		return this;
		
	}
	fail(text, status) {

		this.status = status || 'Done';
		this.text = text;
		this.update(`${chalk.red('✖')} ${this.status} ${this.text} ${this.url}`);
		process.stdin.pause();
		clearInterval(this.interval);

		return this;
		
	}
	info(text, status) {

		this.status = status || 'Done';
		this.text = text;
		this.update(`${chalk.blue('ℹ')} ${this.status} ${this.text} ${this.url}`);
		process.stdin.pause();
		clearInterval(this.interval);

		return this;
		
	}
	warn(text, status) {

		this.status = status || 'Done';
		this.text = text;
		this.update(`${chalk.yellow('⚠')} ${this.status} ${this.text} ${this.url}`);
		process.stdin.pause();
		clearInterval(this.interval);

		return this;
		
	}
};

module.exports = Spinner;