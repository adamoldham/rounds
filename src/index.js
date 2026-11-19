// Night rounds checkpoint logger. Stickers are NTAG21x tags that mirror their
// UID and tap counter into the URL: /tap?u=<14 hex>&c=<6 hex>

const TZ = "America/New_York";
// Minutes since 00:00 of the evening a duty night starts. After midnight counts as +24h.
const NIGHT_START = 21 * 60; // 9:00 PM
const ROUND1_END = 24 * 60 + 30; // 12:30 AM, split between round 1 and round 2
const NIGHT_END = 30 * 60; // 6:00 AM
const FRESH_MS = 120000; // time allowed between the tap and choosing a name
const FAST_GAP_SECONDS = 25; // flag different floors tapped faster than this

const STYLE = `
body{font-family:system-ui,sans-serif;max-width:30rem;margin:0 auto;padding:1rem;line-height:1.4}
select,button{font-size:1.1rem;width:100%;padding:.7rem;margin:.5rem 0}
.wide{max-width:60rem}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ccc;padding:.35rem;text-align:left;vertical-align:top}
.ok{background:#e6f4ea}.bad{background:#fde7e9}small{color:#555}`;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function html(body, status = 200, headers = {}, wide = false) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rounds</title><style>${STYLE}</style></head><body${wide ? ' class="wide"' : ""}>${body}</body></html>`;
  return new Response(page, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

const msg = (title, text) => `<h1>${esc(title)}</h1><p>${esc(text)}</p>`;

function getCookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

const cookieHeader = (did) => `did=${did}; Max-Age=31536000; Path=/; Secure; HttpOnly; SameSite=Lax`;

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function timeInfo(ms) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value])
  );
  const h = +parts.hour;
  const mi = +parts.minute;
  let d = Date.UTC(+parts.year, +parts.month - 1, +parts.day);
  if (h < 12) d -= 86400000; // early morning belongs to the previous night
  const night = new Date(d).toISOString().slice(0, 10);
  const t = (h < 12 ? h + 24 : h) * 60 + mi;
  let round = 0;
  if (t >= NIGHT_START && t < NIGHT_END) round = t < ROUND1_END ? 1 : 2;
  return { night, round, label: `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}` };
}

function confirmation(name, st, ti) {
  const r = ti.round ? `Round ${ti.round}` : "Outside the round window (not counted)";
  return `<h1>Recorded</h1><p><b>${esc(name)}</b></p><p>${esc(st.location)}</p><p>${esc(ti.label)}, ${esc(r)}</p>`;
}

async function recordTap(env, req, st, name, did, ctr, now) {
  const ti = timeInfo(now);
  await env.DB.prepare(
    "INSERT INTO taps (ts,night,round,name,uid,location,building,ctr,ip,device_id,ua) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    new Date(now).toISOString(), ti.night, ti.round, name, st.uid, st.location, st.building, ctr,
    req.headers.get("CF-Connecting-IP"), did, (req.headers.get("User-Agent") || "").slice(0, 200)
  ).run();
  return ti;
}

function parseTag(u, c) {
  u = (u || "").toUpperCase();
  c = (c || "").toUpperCase();
  if (!/^[0-9A-F]{14}$/.test(u) || !/^[0-9A-F]{6}$/.test(c)) return null;
  return { u, ctr: parseInt(c, 16) };
}

async function tapGet(req, env, url) {
  const tag = parseTag(url.searchParams.get("u"), url.searchParams.get("c"));
  if (!tag) return html(msg("Invalid link", "Tap the sticker again."), 400);
  if (/^0+$/.test(tag.u)) return html(msg("Sticker not set up", "The UID mirror is not enabled on this sticker."), 400);
  if (tag.ctr === 0) return html(msg("Tap again", "The counter read 0. If this keeps happening, the counter mirror is not enabled."), 400);

  const st = await env.DB.prepare("SELECT * FROM stickers WHERE uid=?").bind(tag.u).first();
  if (!st) return html(msg("Unknown sticker", "This sticker is not registered."), 404);

  const now = Date.now();
  const r = await env.DB.prepare("UPDATE stickers SET last_ctr=?1, last_seen_at=?2 WHERE uid=?3 AND last_ctr<?1")
    .bind(tag.ctr, now, tag.u).run();
  if (r.meta.changes !== 1) {
    const done = await env.DB.prepare("SELECT name FROM taps WHERE uid=? AND ctr=?").bind(tag.u, tag.ctr).first();
    if (done) return html(msg("Already recorded", `This tap was logged for ${done.name}.`));
    return html(msg("Link expired", "Tap the sticker again."), 409);
  }

  const did = getCookie(req, "did");
  if (did) {
    const dev = await env.DB.prepare("SELECT name FROM devices WHERE device_id=?").bind(did).first();
    if (dev) {
      const ti = await recordTap(env, req, st, dev.name, did, tag.ctr, now);
      return html(confirmation(dev.name, st, ti));
    }
  }

  const staff = (await env.DB.prepare("SELECT name FROM staff ORDER BY name").all()).results;
  const options = staff.map((s) => `<option>${esc(s.name)}</option>`).join("");
  const c = tag.ctr.toString(16).toUpperCase().padStart(6, "0");
  return html(
    `<h1>${esc(st.location)}</h1><p>Choose your name. This phone will be linked to it.</p>
<form method="post" action="/tap"><input type="hidden" name="u" value="${tag.u}"><input type="hidden" name="c" value="${c}">
<select name="name" required><option value="">Select your name</option>${options}</select>
<button type="submit">Record</button></form>`
  );
}

async function tapPost(req, env) {
  const f = await req.formData();
  const tag = parseTag(f.get("u"), f.get("c"));
  const name = String(f.get("name") || "");
  if (!tag || !name) return html(msg("Invalid request", "Tap the sticker again."), 400);

  const ok = await env.DB.prepare("SELECT 1 AS ok FROM staff WHERE name=?").bind(name).first();
  const st = await env.DB.prepare("SELECT * FROM stickers WHERE uid=?").bind(tag.u).first();
  const now = Date.now();
  if (!ok || !st || st.last_ctr !== tag.ctr || now - st.last_seen_at > FRESH_MS) {
    return html(msg("Link expired", "Tap the sticker again."), 409);
  }

  const did = getCookie(req, "did") || crypto.randomUUID();
  const existing = await env.DB.prepare("SELECT name FROM devices WHERE device_id=?").bind(did).first();
  const finalName = existing ? existing.name : name;
  if (!existing) {
    await env.DB.prepare("INSERT INTO devices (device_id,name,first_seen) VALUES (?,?,?)")
      .bind(did, name, new Date(now).toISOString()).run();
  }
  try {
    const ti = await recordTap(env, req, st, finalName, did, tag.ctr, now);
    return html(confirmation(finalName, st, ti), 200, { "set-cookie": cookieHeader(did) });
  } catch (e) {
    return html(msg("Already recorded", "This tap was already logged."), 200, { "set-cookie": cookieHeader(did) });
  }
}

async function admin(req, env, url) {
  const token = url.searchParams.get("token") || "";
  if (!env.ADMIN_TOKEN || !safeEqual(token, env.ADMIN_TOKEN)) return new Response("Not found", { status: 404 });

  const q = url.searchParams.get("night") || "";
  const night = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : timeInfo(Date.now()).night;
  const shift = (n) => new Date(Date.parse(night + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
  const link = (n) => `/admin?token=${encodeURIComponent(token)}&night=${n}`;

  const taps = (await env.DB.prepare("SELECT * FROM taps WHERE night=? ORDER BY ts").bind(night).all()).results;
  const stickers = (await env.DB.prepare("SELECT location,building FROM stickers ORDER BY building,location").all()).results;
  const staff = (await env.DB.prepare("SELECT name FROM staff ORDER BY name").all()).results.map((r) => r.name);

  const bld = {};
  for (const s of stickers) (bld[s.building] ||= []).push(s.location);
  const byName = {};
  for (const t of taps) (byName[t.name] ||= []).push(t);

  let rows = "";
  for (const name of staff) {
    const ts = byName[name] || [];
    if (!ts.length) {
      rows += `<tr><td>${esc(name)}</td><td colspan="3" class="bad">No taps</td></tr>`;
      continue;
    }
    for (const b of Object.keys(bld)) {
      const inB = ts.filter((t) => t.building === b);
      if (!inB.length) continue;
      const cells = [1, 2].map((r) => {
        const got = new Set(inB.filter((t) => t.round === r).map((t) => t.location));
        const miss = bld[b].filter((l) => !got.has(l));
        return `<td class="${miss.length ? "bad" : "ok"}">${got.size}/${bld[b].length}${miss.length ? `<br><small>missing: ${esc(miss.join(", "))}</small>` : ""}</td>`;
      }).join("");
      rows += `<tr><td>${esc(name)}</td><td>${esc(b)}</td>${cells}</tr>`;
    }
  }

  const flags = [];
  for (const [name, ts] of Object.entries(byName)) {
    for (let i = 1; i < ts.length; i++) {
      const gap = (Date.parse(ts[i].ts) - Date.parse(ts[i - 1].ts)) / 1000;
      if (gap < FAST_GAP_SECONDS && ts[i].location !== ts[i - 1].location) {
        flags.push(`${name}: ${ts[i - 1].location} to ${ts[i].location} in ${Math.round(gap)}s`);
      }
    }
  }

  const raw = taps.map((t) =>
    `<tr><td>${esc(timeInfo(Date.parse(t.ts)).label)}</td><td>${esc(t.name)}</td><td>${esc(t.location)}</td><td>${t.round || "-"}</td><td>${esc(t.ip)}</td></tr>`
  ).join("");

  return html(
    `<h1>Rounds for night of ${esc(night)}</h1>
<p><a href="${link(shift(-1))}">Previous night</a> | <a href="${link(shift(1))}">Next night</a></p>
<table><tr><th>RA</th><th>Building</th><th>Round 1</th><th>Round 2</th></tr>${rows}</table>
<h2>Flags</h2>${flags.length ? "<ul>" + flags.map((f) => `<li>${esc(f)}</li>`).join("") + "</ul>" : "<p>None</p>"}
<h2>All taps</h2><table><tr><th>Time</th><th>RA</th><th>Location</th><th>Round</th><th>IP</th></tr>${raw}</table>`,
    200, {}, true
  );
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === "/tap" && req.method === "GET") return await tapGet(req, env, url);
      if (url.pathname === "/tap" && req.method === "POST") return await tapPost(req, env);
      if (url.pathname === "/admin") return await admin(req, env, url);
      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error(e);
      return html(msg("Error", "Something went wrong. Tell your SRA."), 500);
    }
  },
};
