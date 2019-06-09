const prettyjson = require('prettyjson');
const { validate } = require('../../lib/job');

const validateJobFile = async (filePath) => {

  const jobDefinition = require(`${__dirname}/../${filePath}`);

  try {

    await validate(jobDefinition);

    console.log('Job file is valid');

  } catch (e) {

    console.log(prettyjson.render(e.details));

  }

};

module.exports = validateJobFile;