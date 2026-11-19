// Night rounds checkpoint logger. Stickers are NTAG21x tags that mirror their
// UID and tap counter into the URL: /tap?UID=<14 hex>x<6 hex>

const TZ = "America/New_York";
// Minutes since 00:00 of the evening a duty night starts. After midnight counts as +24h.
const NIGHT_START = 21 * 60; // 9:00 PM
const ROUND1_END = 24 * 60 + 30; // 12:30 AM, split between round 1 and round 2
const NIGHT_END = 30 * 60; // 6:00 AM
const FRESH_MS = 120000; // time allowed between the tap and choosing a name
const FAST_GAP_SECONDS = 25; // flag different floors tapped faster than this

// Look and feel copied from the sra.adamoldham.com site: same tokens, light/dark mode, 6px cards.
const THEME_JS = `(function(){var r=document.documentElement,K="theme";function sv(){try{var v=localStorage.getItem(K);return v==="light"||v==="dark"?v:null}catch(e){return null}}
function ef(){var t=r.getAttribute("data-theme");return t||(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}
var s=sv();if(s)r.setAttribute("data-theme",s);
function lb(b){var d=ef()==="dark";b.textContent=d?"\\u2600":"\\u263E";b.setAttribute("aria-label",d?"Switch to light mode":"Switch to dark mode")}
document.addEventListener("DOMContentLoaded",function(){var n=document.querySelector(".site-nav");if(!n)return;var b=document.createElement("button");b.type="button";b.className="theme-toggle";lb(b);
b.addEventListener("click",function(){var x=ef()==="dark"?"light":"dark";r.setAttribute("data-theme",x);try{localStorage.setItem(K,x)}catch(e){}lb(b)});n.appendChild(b)})})();`;

const STYLE = `
:root{--bg:#ffffff;--bg-soft:#f6f6f7;--line:#e3e3e7;--ink:#17171a;--ink-soft:#62626b;--accent:#4f2d7f;--on-accent:#ffffff;--good:#1e7a3c;--bad:#b3261e;color-scheme:light dark}
:root[data-theme="light"]{color-scheme:light}:root[data-theme="dark"]{color-scheme:dark}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#101012;--bg-soft:#18181b;--line:#2b2b31;--ink:#ededf0;--ink-soft:#9e9ea8;--accent:#b99be6;--on-accent:#101012;--good:#6fcf8f;--bad:#f2857d}}
:root[data-theme="dark"]{--bg:#101012;--bg-soft:#18181b;--line:#2b2b31;--ink:#ededf0;--ink-soft:#9e9ea8;--accent:#b99be6;--on-accent:#101012;--good:#6fcf8f;--bad:#f2857d}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px}
/* tap pages: centered card like the 404 page */
.card{min-height:calc(100vh - 24px);min-height:calc(100dvh - 24px);margin:12px;border:1px solid var(--line);border-radius:6px;background:var(--bg-soft);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;position:relative}
.center{width:100%;max-width:420px}
.center h1{margin:0;font-size:clamp(40px,12vw,84px);line-height:1.05;font-weight:600;color:var(--ink);letter-spacing:-.02em;overflow-wrap:anywhere}
.eyebrow{margin:0 0 10px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
.lead{margin:12px 0 22px;font-size:clamp(16px,4.5vw,20px);color:var(--ink-soft)}
.lead b{color:var(--ink)}
.pill{display:inline-block;margin:0;padding:4px 12px;border:1px solid var(--line);border-radius:999px;background:var(--bg);font-size:.9rem;color:var(--ink-soft)}
.pill.warn{border-color:var(--bad);color:var(--bad)}
.center select,.center .primary{display:block;width:100%;font:inherit;font-size:1rem;border-radius:4px;margin:10px 0}
.center select{padding:11px 12px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
.primary{padding:11px 22px;border:0;background:var(--accent);color:var(--on-accent);font-weight:600;cursor:pointer}
.primary:hover{filter:brightness(1.1)}
.foot-card{position:absolute;bottom:16px;left:0;right:0;font-size:13px;color:var(--ink-soft)}
/* report page: same header, headings and tables as the duty site */
.site-header{border-bottom:1px solid var(--line)}
.site-header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;flex-wrap:wrap}
.brand{font-weight:600;text-decoration:none;color:var(--ink)}
.brand small{display:block;font-weight:400;font-size:.78rem;color:var(--ink-soft)}
.site-nav{display:flex;gap:20px}
.theme-toggle{align-self:center;margin-left:4px;width:32px;height:32px;padding:0;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink-soft);font:inherit;font-size:16px;line-height:1;cursor:pointer}
.theme-toggle:hover{color:var(--ink);background:var(--bg-soft)}
main{padding:32px 0 24px}
h1{font-size:1.5rem;line-height:1.25;margin:0 0 6px;font-weight:600;letter-spacing:-.005em}
.meta{color:var(--ink-soft);font-size:.9rem;margin:0}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:24px 0 8px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:4px;overflow:hidden}
.seg a{font-size:.875rem;padding:6px 14px;background:var(--bg);color:var(--ink-soft);text-decoration:none}
.seg a+a{border-left:1px solid var(--line)}
.seg a:hover{color:var(--ink);background:var(--bg-soft)}
.section-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin:32px 0 12px}
.section-head h2{font-size:1.15rem;line-height:1.3;margin:0;font-weight:600}
.data-wrap{border:1px solid var(--line);border-radius:6px;overflow:auto;background:var(--bg)}
table.data{border-collapse:collapse;width:100%;font-size:.92rem}
.data th,.data td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
.data tbody tr:last-child td{border-bottom:0}
.data thead th{background:var(--bg-soft);font-weight:600}
.data td small{display:block;color:var(--ink-soft)}
.data td.ok{background:color-mix(in srgb,var(--good) 14%,var(--bg))}
.data td.bad{background:color-mix(in srgb,var(--bad) 13%,var(--bg))}
.status{color:var(--ink-soft);margin:12px 0}
.signout{font-size:.875rem;color:var(--ink-soft)}
.tok{display:block;width:100%;font:inherit;font-size:1rem;padding:11px 12px;margin:10px 0;border:1px solid var(--line);border-radius:4px;background:var(--bg);color:var(--ink)}
.notice{margin:0 0 14px;padding:10px 12px;border:1px solid var(--line);border-left:3px solid var(--bad);border-radius:6px;background:var(--bg-soft);font-size:.9rem}
.notice ul{margin:0;padding-left:18px}
footer{margin-top:40px;border-top:1px solid var(--line);padding:18px 0 32px;color:var(--ink-soft);font-size:.85rem}
.foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px}
.foot-links{display:flex;gap:16px}
.foot-links a{color:var(--ink-soft)}
.foot-links a:hover{color:var(--ink)}
@media (max-width:640px){.wrap{padding:0 14px}h1{font-size:1.35rem}}`;

const FOOTER = `<footer><div class="wrap foot"><span>&copy; Adam Oldham 2026</span><span class="foot-links"><a href="https://www.adamoldham.com/privacy">Privacy</a><a href="https://www.adamoldham.com/terms">Terms</a></span></div></footer>`;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// wide = false: centered card for the sticker tap pages. wide = true: full report layout with header and footer.
function html(body, status = 200, headers = {}, wide = false) {
  const shell = wide
    ? `<header class="site-header"><div class="wrap"><div class="brand">Reslife Resources<small>Night rounds</small></div><nav class="site-nav" aria-label="Main"></nav></div></header><main><div class="wrap">${body}</div></main>${FOOTER}`
    : `<div class="card"><div class="center">${body}</div><div class="foot-card">&copy; Adam Oldham 2026</div></div>`;
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Night rounds | Reslife Resources</title><meta name="robots" content="noindex"><script>${THEME_JS}</script><style>${STYLE}</style></head><body>${shell}</body></html>`;
  return new Response(page, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

const msg = (title, text) => `<h1>${esc(title)}</h1><p class="lead">${esc(text)}</p>`;

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
  return `<p class="eyebrow">&#10003; Recorded</p><h1>${esc(st.location)}</h1><p class="lead"><b>${esc(name)}</b></p><p class="pill${ti.round ? "" : " warn"}">${esc(ti.label)} &middot; ${esc(r)}</p>`;
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

// NXP TagWriter appends ?UID=<14 hex>x<6 hex counter> when both mirrors are on.
// Also accepts UID plus a separate ctr, and the older u= and c= format.
function tagFromUrl(url) {
  const p = url.searchParams;
  const raw = (p.get("UID") || p.get("uid") || p.get("id") || "").toUpperCase();
  const m = raw.match(/^([0-9A-F]{14})(?:X([0-9A-F]{6}))?$/);
  if (m) return parseTag(m[1], m[2] || p.get("ctr") || p.get("c"));
  return parseTag(p.get("u"), p.get("c"));
}

async function tapGet(req, env, url) {
  const tag = tagFromUrl(url);
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
    `<p class="eyebrow">Night rounds</p><h1>${esc(st.location)}</h1><p class="lead">Choose your name. This phone will be linked to it.</p>
<form method="post" action="/tap"><input type="hidden" name="u" value="${tag.u}"><input type="hidden" name="c" value="${c}">
<select name="name" required><option value="">Select your name</option>${options}</select>
<button class="primary" type="submit">Record</button></form>`
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

// ADMIN_TOKEN may hold several tokens separated by commas, so a temporary one can be added and removed later.
const tokenList = (env) => (env.ADMIN_TOKEN || "").split(",").map((t) => t.trim()).filter(Boolean);
const validToken = (env, t) => !!t && tokenList(env).some((x) => safeEqual(t, x));

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function validCookie(env, req) {
  const c = getCookie(req, "adm");
  if (!c) return false;
  for (const x of tokenList(env)) if (safeEqual(c, await sha256(x))) return true;
  return false;
}

const ADM_COOKIE = "Path=/admin; Secure; HttpOnly; SameSite=Strict";

async function sessionCookie(token) {
  return `adm=${await sha256(token)}; Max-Age=2592000; ${ADM_COOKIE}`;
}

function loginPage(error) {
  return html(
    `<p class="eyebrow">Night rounds</p><h1>Sign in</h1><p class="lead">${error ? esc(error) : "Enter the admin token."}</p>
<form method="post" action="/admin"><input class="tok" type="password" name="token" autocomplete="current-password" autofocus required>
<button class="primary" type="submit">Open report</button></form>`,
    error ? 401 : 200
  );
}

async function admin(req, env, url) {
  if (url.searchParams.get("logout")) {
    return new Response(null, { status: 302, headers: { location: "/admin", "set-cookie": `adm=; Max-Age=0; ${ADM_COOKIE}` } });
  }

  // Signing in with a token: from the form, or from an older ?token= link (accepted once, then removed from the URL).
  let submitted = url.searchParams.get("token");
  if (req.method === "POST") submitted = String((await req.formData()).get("token") || "").trim();
  if (submitted !== null) {
    if (validToken(env, submitted)) {
      const night = url.searchParams.get("night");
      const dest = night && /^\d{4}-\d{2}-\d{2}$/.test(night) ? `/admin?night=${night}` : "/admin";
      return new Response(null, { status: 303, headers: { location: dest, "set-cookie": await sessionCookie(submitted) } });
    }
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return loginPage("That token did not work.");
  }
  if (!(await validCookie(env, req))) return loginPage();

  const q = url.searchParams.get("night") || "";
  const night = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : timeInfo(Date.now()).night;
  const shift = (n) => new Date(Date.parse(night + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
  const link = (n) => `/admin?night=${n}`;

  const taps = (await env.DB.prepare("SELECT * FROM taps WHERE night=? ORDER BY ts").bind(night).all()).results;
  const stickers = (await env.DB.prepare("SELECT location,building FROM stickers ORDER BY building,location").all()).results;
  const staff = (await env.DB.prepare("SELECT name FROM staff WHERE report=1 ORDER BY name").all()).results.map((r) => r.name);

  const bld = {};
  for (const s of stickers) (bld[s.building] ||= []).push(s.location);
  const byName = {};
  for (const t of taps) (byName[t.name] ||= []).push(t);

  let rows = "";
  let idleRows = "";
  for (const name of staff) {
    const ts = byName[name] || [];
    if (!ts.length) {
      idleRows += `<tr><td>${esc(name)}</td><td colspan="3" class="bad">No taps</td></tr>`;
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

  const pretty = new Date(night + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return html(
    `<h1>Night rounds</h1>
<p class="meta">Night of ${esc(pretty)}</p>
<div class="toolbar"><div class="seg"><a href="${link(shift(-1))}">Previous night</a><a href="${link(shift(1))}">Next night</a></div><a class="signout" href="/admin?logout=1">Sign out</a></div>
<div class="section-head"><h2>All taps</h2></div>
<div class="data-wrap"><table class="data"><thead><tr><th>Time</th><th>RA</th><th>Location</th><th>Round</th><th>IP</th></tr></thead><tbody>${raw || '<tr><td colspan="5">No taps yet</td></tr>'}</tbody></table></div>
<div class="section-head"><h2>Flags</h2></div>
${flags.length ? '<div class="notice"><ul>' + flags.map((f) => `<li>${esc(f)}</li>`).join("") + "</ul></div>" : '<p class="status">None</p>'}
<div class="section-head"><h2>Rounds</h2></div>
<div class="data-wrap"><table class="data"><thead><tr><th>RA</th><th>Building</th><th>Round 1</th><th>Round 2</th></tr></thead><tbody>${rows}${idleRows}</tbody></table></div>`,
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
