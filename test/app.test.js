const assert = require('node:assert/strict');
const { test } = require('node:test');
const request = require('supertest');
const { createApp, MAX_TEXT } = require('../src/app');
const { HttpError } = require('../src/httpError');

function setup(sendMessage) {
    const sent = [];
    const telegram = {
        sendMessage: sendMessage || (async (chatId, text) => {
            sent.push({ chatId, text });
            return { message_id: sent.length };
        }),
    };
    return { app: createApp({ telegram, botConfigured: true }), sent };
}

test('health', async () => {
    const res = await request(setup().app).get('/health');
    assert.deepEqual(res.body, { status: 'ok', bot_configured: true });
});

test('POST /messages sends the text', async () => {
    const { app, sent } = setup();
    const res = await request(app).post('/messages').send({ chat_id: 123456789, text: 'Your grocery list' });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.data, { chat_id: '123456789', message_ids: [1] });
    assert.deepEqual(sent, [{ chatId: '123456789', text: 'Your grocery list' }]);
});

test('long texts are sent as several messages, in order', async () => {
    const { app, sent } = setup();
    const text = Array.from({ length: 400 }, (_, i) => `- item ${i}`).join('\n');
    const res = await request(app).post('/messages').send({ chat_id: '1', text });
    assert.equal(res.status, 201);
    assert.ok(sent.length > 1);
    assert.equal(sent.map((s) => s.text).join('\n'), text);
    assert.deepEqual(res.body.data.message_ids, sent.map((_, i) => i + 1));
});

test('invalid bodies are 400 and nothing is sent', async () => {
    const { app, sent } = setup();
    const bodies = [
        {}, { chat_id: 'abc', text: 'x' }, { chat_id: 1.5, text: 'x' }, { chat_id: '1' },
        { chat_id: '1', text: '   ' }, { chat_id: '1', text: 'x'.repeat(MAX_TEXT + 1) }, [],
    ];
    for (const body of bodies) {
        const res = await request(app).post('/messages').send(body);
        assert.equal(res.status, 400, JSON.stringify(body).slice(0, 40));
    }
    assert.equal(sent.length, 0);
});

test('Telegram errors are passed with their status', async () => {
    const { app } = setup(async () => { throw new HttpError(422, 'Chat not reachable: the user must open the bot and press Start.'); });
    const res = await request(app).post('/messages').send({ chat_id: '1', text: 'x' });
    assert.equal(res.status, 422);
    assert.match(res.body.error, /press Start/);
});
