const app = require('./app');
const env = require('./core/config/env');

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`\n🚀 Varuna Ops API running on http://localhost:${PORT}`);
  console.log(`📍 Environment: ${env.nodeEnv}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health\n`);
});
