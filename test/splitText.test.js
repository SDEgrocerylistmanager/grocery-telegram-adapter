const assert = require('node:assert/strict');
const { test } = require('node:test');
const { splitText } = require('../src/splitText');

test('a short text is one message', () => {
    assert.deepEqual(splitText('a\nb', 10), ['a\nb']);
});

test('splits on line boundaries and never exceeds the limit', () => {
    const parts = splitText('aaaa\nbbbb\ncccc', 9);
    assert.deepEqual(parts, ['aaaa\nbbbb', 'cccc']);
    assert.ok(parts.every((p) => p.length <= 9));
});

test('a line longer than the limit is cut', () => {
    const parts = splitText('x'.repeat(25), 10);
    assert.deepEqual(parts.map((p) => p.length), [10, 10, 5]);
    assert.equal(parts.join(''), 'x'.repeat(25));
});

test('nothing is lost', () => {
    const text = Array.from({ length: 500 }, (_, i) => `- item number ${i} x${i}`).join('\n');
    const parts = splitText(text, 4096);
    assert.ok(parts.length > 1);
    assert.equal(parts.join('\n'), text);
});
