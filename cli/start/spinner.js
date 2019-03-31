const chalk = require('chalk');
require('draftlog').into(console).addLineListener(process.stdin);

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

class Spinner {

	constructor(initialText) {

		this.frameIndex = 0;
		this.text = initialText;

	}
	start() {
	
		this.update = console.draft(`${chalk.blue(FRAMES[0])} ${this.text}`);
		this.interval = setInterval(() => {

			this.frameIndex = (this.frameIndex >= FRAMES.length - 1)
			? 0
			: this.frameIndex + 1;
	
			this.update(`${chalk.blue(FRAMES[this.frameIndex])} ${this.text}`);
	
		}, 80)

		return this;
	
	}
	succeed(text) {

		this.update(`${chalk.green('✔')} ${text}`);
		clearInterval(this.interval);
		process.stdin.pause();

		return this;
		
	}
	fail(text) {

		this.update(`${chalk.red('✖')} ${text}`);
		process.stdin.pause();
		clearInterval(this.interval);

		return this;
		
	}
	info(text) {

		this.update(`${chalk.blue('ℹ')} ${text}`);
		process.stdin.pause();
		clearInterval(this.interval);

		return this;
		
	}
	warn(text) {

		this.update(`${chalk.yellow('⚠')} ${text}`);
		process.stdin.pause();
		clearInterval(this.interval);

		return this;
		
	}
};

module.exports = Spinner;