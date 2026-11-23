const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createTelegramApi } = require('../src/telegramApi');

function api(fetchImpl, token = 'TOKEN') {
    return createTelegramApi({ token, apiBaseUrl: 'http://tg', timeoutMs: 100, fetchImpl });
}

const answer = (status, body) => async () => new Response(JSON.stringify(body), { status });

test('sendMessage calls the Bot API with chat_id and text', async () => {
    let call;
    const fetchImpl = async (url, options) => {
        call = { url, body: JSON.parse(options.body) };
        return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 });
    };
    const result = await api(fetchImpl).sendMessage('123', 'hi');
    assert.equal(call.url, 'http://tg/botTOKEN/sendMessage');
    assert.deepEqual(call.body, { chat_id: '123', text: 'hi' });
    assert.equal(result.message_id, 42);
});

test('unreachable chats become 422', async () => {
    const cases = [
        [400, 'Bad Request: chat not found'],
        [403, 'Forbidden: bot was blocked by the user'],
        [403, "Forbidden: bot can't initiate conversation with a user"],
    ];
    for (const [status, description] of cases) {
        await assert.rejects(api(answer(status, { ok: false, error_code: status, description })).sendMessage('1', 'x'),
            { status: 422 }, description);
    }
});

test('other Telegram errors', async () => {
    const cases = [[401, 503], [404, 503], [429, 503], [500, 503], [400, 502]];
    for (const [given, expected] of cases) {
        await assert.rejects(api(answer(given, { ok: false, description: 'Bad Request: message is too long' })).sendMessage('1', 'x'),
            { status: expected }, String(given));
    }
});

test('network failure is 503 and a missing token is 503 without calling Telegram', async () => {
    await assert.rejects(api(async () => { throw new Error('down'); }).sendMessage('1', 'x'), { status: 503 });
    let called = false;
    await assert.rejects(api(async () => { called = true; }, '').sendMessage('1', 'x'),
        { status: 503, message: 'Telegram bot not configured.' });
    assert.equal(called, false);
});
