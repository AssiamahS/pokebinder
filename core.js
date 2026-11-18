// Shared by index.html and seller.html. No build step, no keys.
const API = 'https://api.tcgdex.net/v2/en/cards/';
const CACHE_KEY = 'pokebinder.cards.v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const usd = n =>
  n == null ? '' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n >= 100 ? 0 : 2 });

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}

function writeCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* private mode */ }
}

// TCGplayer market price for the chosen print (holofoil, normal, reverse-holofoil...).
function marketPrice(data, variant) {
  const tp = data.pricing && data.pricing.tcgplayer;
  if (!tp) return null;
  const prints = Object.entries(tp).filter(([, v]) => v && typeof v === 'object' && v.marketPrice != null);
  if (!prints.length) return null;
  const hit = prints.find(([k]) => k === variant) || prints[0];
  return hit[1].marketPrice;
}

async function lookup(id, variant, cache) {
  const key = id + '|' + (variant || '');
  const hit = cache[key];
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;
  const res = await fetch(API + encodeURIComponent(id));
  if (!res.ok) throw new Error('card ' + id + ': HTTP ' + res.status);
  const d = await res.json();
  const entry = {
    at: Date.now(),
    name: d.name,
    set: d.set ? d.set.name : '',
    number: d.localId,
    rarity: d.rarity || '',
    image: d.image ? d.image + '/high.webp' : '',
    market: marketPrice(d, variant),
  };
  cache[key] = entry;
  return entry;
}

// Inventory rows from cards.json merged with live card data. A failed lookup
// keeps the row (shown by id) instead of dropping it from the binder.
async function loadBinder() {
  const [site, rows] = await Promise.all([
    fetch('site.json').then(r => r.json()),
    fetch('cards.json').then(r => r.json()),
  ]);
  const cache = readCache();
  const cards = await Promise.all(rows.map(async row => {
    try {
      return { ...row, ...(await lookup(row.id, row.variant, cache)) };
    } catch (err) {
      console.warn(err.message);
      return { ...row, name: row.id, set: '', number: '', rarity: '', image: '', market: null };
    }
  }));
  writeCache(cache);
  return { site, cards };
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Recent-sales lookups. Plain search links: eBay's sold-data API is restricted
// and PriceCharting's API is paid, but their public pages are one click away.
function salesLinks(card) {
  const q = encodeURIComponent([card.name, card.set, card.number, card.grade || ''].filter(Boolean).join(' '));
  const links = [
    ['eBay sold', `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1&_sop=13`],
    ['PriceCharting', `https://www.pricecharting.com/search-products?type=prices&q=${q}`],
  ];
  if (card.cert) links.push(['PSA cert', `https://www.psacard.com/cert/${encodeURIComponent(card.cert)}`]);
  return links;
}

const salesHtml = card => salesLinks(card)
  .map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`)
  .join(' · ');
