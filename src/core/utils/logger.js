/**
 * Simple colour-coded logger for dev/production
 */

const logger = {
  info:  (msg, ...args) => console.log(`ℹ️  [INFO]  ${msg}`, ...args),
  warn:  (msg, ...args) => console.warn(`⚠️  [WARN]  ${msg}`, ...args),
  error: (msg, ...args) => console.error(`❌ [ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🐛 [DEBUG] ${msg}`, ...args);
    }
  },
};

module.exports = logger;
