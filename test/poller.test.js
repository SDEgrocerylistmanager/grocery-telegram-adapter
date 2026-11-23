const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createPoller, replyFor } = require('../src/poller');

const message = (text, chatId = 555) => ({ text, chat: { id: chatId } });

test('/start and /id are answered with the chat id', () => {
    for (const text of ['/start', '/id', '/start@GroceryBot', '/start abc']) {
        assert.match(replyFor(message(text)), /Your chat id is 555/, text);
    }
});

test('other messages are ignored', () => {
    for (const text of ['hello', '/started', '', undefined]) {
        assert.equal(replyFor(message(text)), null, String(text));
    }
    assert.equal(replyFor(undefined), null);
});

test('the poller replies, moves the offset and survives a failed reply', async () => {
    const offsets = [];
    const sent = [];
    let round = 0;
    const telegram = {
        async getUpdates(offset) {
            offsets.push(offset);
            round += 1;
            if (round === 1) {
                return [
                    { update_id: 10, message: message('/start', 1) },
                    { update_id: 11, message: message('/start', 2) },
                    { update_id: 12, message: message('hello', 3) },
                ];
            }
            poller.stop();
            return [];
        },
        async sendMessage(chatId, text) {
            if (chatId === 1) throw new Error('blocked');
            sent.push({ chatId, text });
        },
    };
    const errors = [];
    const poller = createPoller({ telegram, log: { error: (m) => errors.push(m) }, retryMs: 1 });
    poller.start();
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.deepEqual(offsets, [0, 13]);
    assert.deepEqual(sent.map((s) => s.chatId), [2]);
    assert.equal(errors.length, 1);
});
