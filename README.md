# rounds

Cloudflare Worker + D1 that logs RA night-round checkpoint taps from NTAG21x stickers.

## Sticker URL

Write each sticker with NXP TagWriter as a Link (leave the description empty, since a description
breaks iPhone background reading) with this URL:

    https://rounds.adamoldham.com/tap?id=

Turn on the interaction counter, the UID mirror and the interaction counter mirror in the editor.
The app places the mirror at the end of the URL, so a tap opens
`/tap?id=<14 hex UID>x<6 hex counter>`. Lock the tag with a write-only password last.
Write tags one at a time, not from a CSV import. The older `?u=...&c=...` format is also accepted.

## Setup

1. Create the tables: paste `schema.sql` into the D1 console for `rounds-db`.
2. Add staff and stickers: copy `seed.example.sql`, fill it in, paste it into the console.
3. Set a Worker secret named `ADMIN_TOKEN` (Worker > Settings > Variables and Secrets) to a long random string.
4. Report page: `https://rounds.adamoldham.com/admin?token=<ADMIN_TOKEN>`

## Behavior

- A tap is accepted only if its counter is higher than the last one seen for that sticker.
- First tap on a phone asks for a name and links that phone to it. Later taps log automatically.
- Round windows and the fast-tap flag are constants at the top of `src/index.js`.

## Maintenance (D1 console)

    -- unlink a phone (new phone, wrong name)
    DELETE FROM devices WHERE name = 'RA Name';

    -- add or remove staff
    INSERT INTO staff (name) VALUES ('RA Name');
    DELETE FROM staff WHERE name = 'RA Name';
