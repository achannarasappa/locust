const { writeFileSync } = require('fs');
const template = require('./job-template');
const { promptJobDetails } = require('./prompt');

const generateJobFile = async () => {

  const answers = await promptJobDetails();
  const jobFileContents = template(answers);

  writeFileSync(`./${answers.name}.js`, jobFileContents)

};

module.exports = generateJobFile;