const MAX_MESSAGE = 4096; // Telegram limit for one message

// Splits a text in messages of at most `max` characters, on line boundaries when possible.
function splitText(text, max = MAX_MESSAGE) {
    const parts = [];
    let current = '';
    for (const line of text.split('\n')) {
        // A single line longer than a message is cut
        const pieces = line.length > max ? line.match(new RegExp(`[\\s\\S]{1,${max}}`, 'g')) : [line];
        for (const piece of pieces) {
            const candidate = current === '' ? piece : `${current}\n${piece}`;
            if (candidate.length <= max) {
                current = candidate;
            } else {
                parts.push(current);
                current = piece;
            }
        }
    }
    if (current.trim() !== '') parts.push(current);
    return parts;
}

module.exports = { splitText, MAX_MESSAGE };
