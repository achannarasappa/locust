const shell = require('shelljs');

const stop = async () => {

 shell.exec('docker-compose -f ./cli/start/docker-compose.yml down')

}

module.exports = stop;