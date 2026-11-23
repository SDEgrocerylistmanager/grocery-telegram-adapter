// Reads the messages sent to the bot (long polling, no public URL needed) and answers
// /start and /id with the chat id, which the user pastes in the Grocery List Manager.
const WAIT_SECONDS = 30;
const RETRY_MS = 5000;

function replyFor(message) {
    const text = (message?.text || '').trim();
    if (!/^\/(start|id)(@\w+)?(\s|$)/.test(text)) return null;
    return [
        `Your chat id is ${message.chat.id}`,
        '',
        'Paste it in the Telegram settings of Grocery List Manager to receive your lists here.',
    ].join('\n');
}

function createPoller({ telegram, log = console, retryMs = RETRY_MS }) {
    let running = false;
    let offset = 0;

    async function handle(update) {
        const reply = replyFor(update.message);
        if (reply) await telegram.sendMessage(update.message.chat.id, reply);
    }

    async function loop() {
        while (running) {
            try {
                const updates = await telegram.getUpdates(offset, WAIT_SECONDS);
                for (const update of updates) {
                    offset = update.update_id + 1; // acknowledged even if the reply fails
                    try {
                        await handle(update);
                    } catch (error) {
                        log.error(`Reply failed: ${error.message}`);
                    }
                }
            } catch (error) {
                log.error(`Polling failed: ${error.message}`);
                await new Promise((resolve) => setTimeout(resolve, retryMs));
            }
        }
    }

    return {
        start() {
            if (running) return;
            running = true;
            loop();
        },
        stop() {
            running = false;
        },
        handle,
    };
}

module.exports = { createPoller, replyFor };
