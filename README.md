# rounds

Cloudflare Worker + D1 that logs RA night-round checkpoint taps from NTAG21x stickers.

## Sticker URL

In NXP TagWriter: Write tags > New dataset > Link. Leave the description empty (a description breaks
iPhone background reading). URI type `https://`, address:

    rounds.adamoldham.com/tap

Do not add a `?` yourself. Tap **Configure Mirroring Options**, pick the NTAG215 card type, enable UID
mirroring and counter mirroring, then Save & Write. TagWriter appends the mirror to the link, so a tap
opens `/tap?UID=<14 hex UID>x<6 hex counter>`. Write tags one at a time, not from a CSV import.
Set a password during the write only after the plain scan works, and re-test after.
Older `?id=`, `?u=...&c=...` formats are also accepted.

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
