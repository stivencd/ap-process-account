const winston = require('winston');
const { SeqTransport } = require('@datalust/winston-seq');
const { APP_NAME } = require('../common/constants')
 
const logger = winston.createLogger({
    transports: [
      new SeqTransport({
        serverUrl: process.env.SEQ_URL,
        apiKey: process.env.SEQ_TOKEN,
        onError: (e => { console.error(e) }),
      })
    ]
  });
 
const logProvider = {
    info: (message) => {
        logger.info(message, {aplication: APP_NAME});
    }
}
 
module.exports = logProvider;