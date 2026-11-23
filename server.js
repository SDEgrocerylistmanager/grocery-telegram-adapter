require('dotenv').config();

const { createApp } = require('./src/app');
const { loadConfig } = require('./src/config');
const { createPoller } = require('./src/poller');
const { createTelegramApi } = require('./src/telegramApi');

const config = loadConfig();
const telegram = createTelegramApi({
    token: config.botToken, apiBaseUrl: config.apiBaseUrl, timeoutMs: config.timeoutMs,
});
const app = createApp({ telegram, botConfigured: Boolean(config.botToken) });
const poller = createPoller({ telegram });

const server = app.listen(config.port, () => {
    console.log(`Telegram adapter listening on port ${config.port}`);
    if (!config.botToken) console.warn('TELEGRAM_BOT_TOKEN is not set: messages cannot be sent.');
    else if (config.polling) poller.start();
});

const shutdown = () => {
    poller.stop();
    server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
