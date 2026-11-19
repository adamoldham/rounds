# rounds

Cloudflare Worker + D1 that logs RA night-round checkpoint taps from NTAG21x stickers.

## Sticker URL

Write each sticker with NXP TagWriter as a URL record:

    https://rounds.adamoldham.com/tap?u=00000000000000&c=000000

Turn on the UID mirror over the 14 zeros after `u=` and the interaction counter mirror over the
6 zeros after `c=`, enable the interaction counter, then password-protect the tag.
Write tags one at a time, not from a CSV import.

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
