const express = require('express');
const { HttpError } = require('./httpError');
const { splitText } = require('./splitText');

const MAX_TEXT = 20000; // a grocery list never needs more than a few messages
const CHAT_ID = /^-?\d{1,20}$/;

function validate(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new HttpError(400, 'Request body must be a JSON object.');
    }
    const chatId = typeof body.chat_id === 'number' ? String(body.chat_id) : body.chat_id;
    if (typeof chatId !== 'string' || !CHAT_ID.test(chatId)) {
        throw new HttpError(400, 'chat_id must be an integer or a string of digits.');
    }
    if (typeof body.text !== 'string' || body.text.trim() === '') {
        throw new HttpError(400, 'text must be a non-empty string.');
    }
    if (body.text.length > MAX_TEXT) {
        throw new HttpError(400, `text must be at most ${MAX_TEXT} characters.`);
    }
    return { chatId, text: body.text };
}

// Internal service: no authentication, it must never be published outside the Docker network.
function createApp({ telegram, botConfigured }) {
    const app = express();
    app.use(express.json({ limit: '100kb' }));

    app.get('/health', (req, res) => res.json({ status: 'ok', bot_configured: botConfigured }));

    // Sends a text to a chat, split in several messages if longer than Telegram allows.
    app.post('/messages', async (req, res) => {
        const { chatId, text } = validate(req.body);
        const messageIds = [];
        for (const part of splitText(text)) {
            const sent = await telegram.sendMessage(chatId, part);
            messageIds.push(sent.message_id);
        }
        res.status(201).json({ data: { chat_id: chatId, message_ids: messageIds } });
    });

    app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
    // eslint-disable-next-line no-unused-vars
    app.use((error, req, res, next) => {
        if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
        if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
        if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Body too large.' });
        console.error(error.message);
        return res.status(500).json({ error: 'Internal server error.' });
    });

    return app;
}

module.exports = { createApp, MAX_TEXT };
