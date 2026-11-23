const { HttpError } = require('./httpError');

// Thin client of the Telegram Bot API (https://core.telegram.org/bots/api).
// Every answer is { ok, result } or { ok: false, error_code, description }.
// The token is part of the URL: it must never be logged.
function createTelegramApi({ token, apiBaseUrl, timeoutMs, fetchImpl = fetch }) {
    async function call(method, params, { timeout = timeoutMs } = {}) {
        if (!token) throw new HttpError(503, 'Telegram bot not configured.');

        let response;
        try {
            response = await fetchImpl(`${apiBaseUrl}/bot${token}/${method}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
                signal: AbortSignal.timeout(timeout),
            });
        } catch {
            throw new HttpError(503, 'Telegram unavailable.');
        }

        let body = null;
        try {
            body = await response.json();
        } catch {
            body = null;
        }
        if (body?.ok) return body.result;
        throw toHttpError(response.status, body?.description || '');
    }

    return {
        sendMessage: (chatId, text) => call('sendMessage', { chat_id: chatId, text }),
        // Long polling: Telegram keeps the request open up to `wait` seconds
        getUpdates: (offset, wait) => call(
            'getUpdates',
            { offset, timeout: wait, allowed_updates: ['message'] },
            { timeout: (wait + 10) * 1000 },
        ),
    };
}

// Telegram errors mapped to what the caller can act on.
function toHttpError(status, description) {
    // Wrong chat id, user never pressed Start, or bot blocked by the user
    if (status === 403 || (status === 400 && /chat not found|user not found|chat_id is empty/i.test(description))) {
        return new HttpError(422, 'Chat not reachable: the user must open the bot and press Start.');
    }
    if (status === 401 || status === 404) return new HttpError(503, 'Telegram bot not configured.');
    if (status === 429 || status >= 500) return new HttpError(503, 'Telegram unavailable.');
    return new HttpError(502, 'Telegram refused the message.');
}

module.exports = { createTelegramApi, toHttpError };
