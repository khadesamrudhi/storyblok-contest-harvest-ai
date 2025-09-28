const { createLogger, format, transports } = require('winston');

const isProd = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'contentharvest-backend' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize({ all: !isProd }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return stack
            ? `[${timestamp}] ${level}: ${message} ${metaStr}\n${stack}`
            : `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    })
  ]
});

module.exports = logger;

