const winston = require('winston');

const logger = ({ config: { logLevel: level, logId: id } }) => winston.createLogger({
  level,
  silent: !level,
  defaultMeta: { source: `locust${id ? `-${id}` : ''}` },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
