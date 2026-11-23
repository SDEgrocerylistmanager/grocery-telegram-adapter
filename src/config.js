function loadConfig(env = process.env) {
    return {
        port: Number(env.PORT || 8005),
        botToken: env.TELEGRAM_BOT_TOKEN || '',
        polling: (env.TELEGRAM_POLLING || 'true').toLowerCase() !== 'false',
        timeoutMs: Number(env.REQUEST_TIMEOUT_MS || 10000),
        apiBaseUrl: (env.TELEGRAM_API_URL || 'https://api.telegram.org').replace(/\/+$/, ''),
    };
}

module.exports = { loadConfig };
