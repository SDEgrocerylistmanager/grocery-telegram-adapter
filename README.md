[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE.md)

# grocery-telegram-adapter

Adapter service of the Grocery List Manager: it hides the
[Telegram Bot API](https://core.telegram.org/bots/api). The orchestrator calls it to send a
grocery list to the user's Telegram chat. It also runs the bot, which tells each user their
chat id.

The service has **no authentication**: it must stay on the internal Docker network, with no
published port.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/messages` | Send `{ "chat_id": "123456789", "text": "..." }` to a chat |
| GET | `/health` | Liveness probe, also says if the bot token is set |

`chat_id` is an integer or a string of digits; `text` is at most 20000 characters. Texts longer
than a Telegram message (4096 characters) are sent as several messages, split on line
boundaries. The answer is `201` with `{ "data": { "chat_id", "message_ids": [...] } }`.

| Status | Meaning |
|---|---|
| `400` | Invalid body |
| `422` | Chat not reachable: wrong chat id, the user never pressed Start, or blocked the bot |
| `502` | Telegram refused the message for another reason |
| `503` | Telegram unreachable or rate limiting, or bot token missing or wrong |

## Linking a user to a chat

A bot can only write to users who opened it first. The user opens the bot and sends `/start`
(or `/id`); the bot answers with the chat id, and the user pastes it in the Telegram settings
of the frontend, which stores it in the backend (`telegram_chat_id` of the user).

The adapter reads the bot messages with long polling (`getUpdates`), so no public URL or
webhook is needed. Only one process may poll a bot at a time: set `TELEGRAM_POLLING=false` on
any other instance using the same token.

Known limit: nothing proves that the chat id belongs to the user who enters it, so a user
could send their own list to somebody else's chat.

## Configuration

Create a bot with [@BotFather](https://t.me/BotFather) and put its token in `.env` (see
`.env.example`). Never commit it.

| Variable | Default | Meaning |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | none | Without it every send answers `503` |
| `TELEGRAM_POLLING` | `true` | Answer `/start` with the chat id |
| `PORT` | `8005` | Listening port |
| `REQUEST_TIMEOUT_MS` | `10000` | Timeout of each call to Telegram |

## Development

```
make init        # enable the commit message hook
npm install
npm start        # http://localhost:8005
npm test         # node --test, Telegram is faked
```

Run one test: `node --test --test-name-pattern="<name>" test/app.test.js`.

## Authors
- Palmieri Filippo @FilizZPalm
- Radice Lorenzo @radix54

## License
Copyright (C) 2026  Palmieri Filippo, Radice Lorenzo

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
