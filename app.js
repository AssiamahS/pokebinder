const CONDITIONS = { NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played', HP: 'Heavily Played', DMG: 'Damaged' };
const narrow = matchMedia('(max-width: 760px)'); // sheet is 2 pockets wide here, 3 otherwise
const $ = sel => document.querySelector(sel);
const state = { site: {}, cards: [], q: '', show: 'available', sort: 'price' };

const price = card => card.ask ?? card.market;
const isSold = card => card.status === 'sold';
const condition = card => card.grade || CONDITIONS[card.condition] || card.condition || '';
const setLine = card => [card.set, card.number ? 'no. ' + card.number : ''].filter(Boolean).join(', ');
const askText = (card, short) => (isSold(card) ? 'Sold' : card.ask != null ? usd(card.ask) : short ? 'Offer' : 'Make an offer');

function art(card) {
  return card.image
    ? `<img src="${esc(card.image)}" alt="${esc(card.name)}" loading="lazy" width="600" height="825">`
    : `<span class="noimg">${esc(card.id)}</span>`;
}

function offerLink(card) {
  const { contactEmail, ebayUser } = state.site;
  if (card.listing) return { href: card.listing, label: 'Buy it on eBay', external: true };
  if (contactEmail) {
    const subject = encodeURIComponent(`Offer: ${card.name} (${setLine(card)})`);
    return { href: `mailto:${contactEmail}?subject=${subject}`, label: 'Send an offer' };
  }
  if (ebayUser) return { href: `https://www.ebay.com/usr/${encodeURIComponent(ebayUser)}`, label: 'Message on eBay', external: true };
  return null;
}

function pocketHtml(card) {
  const sold = isSold(card);
  return `<button type="button" class="pocket${sold ? ' sold' : ''}" data-id="${esc(card.id)}">
    <span class="sleeve"><span class="holo">${art(card)}</span>
      ${sold ? '<span class="stamp">Sold</span>' : ''}
      ${card.qty > 1 && !sold ? `<span class="qty">${card.qty} copies</span>` : ''}
    </span>
    <span class="pocket-name">${esc(card.name)}</span>
    <span class="pocket-set">${esc(setLine(card))}</span>
    <span class="pocket-row"><span class="chip">${esc(card.grade || card.condition || '')}</span><span class="sticker">${askText(card, true)}</span></span>
  </button>`;
}

function visibleCards() {
  const q = state.q.trim().toLowerCase();
  return state.cards
    .filter(c => state.show === 'all' || (c.status || 'available') === state.show)
    .filter(c => !q || `${c.name} ${c.set} ${c.rarity} ${c.grade || ''}`.toLowerCase().includes(q))
    .sort((a, b) => (state.sort === 'name' ? a.name.localeCompare(b.name) : (price(b) ?? -1) - (price(a) ?? -1)));
}

function render() {
  const list = visibleCards();
  const cols = narrow.matches ? 2 : 3;
  const empties = (cols - (list.length % cols)) % cols; // finish the row with empty pockets
  $('#grid').innerHTML = list.length
    ? list.map(pocketHtml).join('') + '<span class="pocket blank" aria-hidden="true"><span class="sleeve"></span></span>'.repeat(empties)
    : '<p class="empty">No cards match. Try a different search, or switch to Everything.</p>';
  $('#count').textContent = `${list.length} card${list.length === 1 ? '' : 's'} shown.`;
}

function renderFan() {
  const top = state.cards.filter(c => !isSold(c) && c.image).sort((a, b) => (price(b) ?? 0) - (price(a) ?? 0)).slice(0, 3);
  // Middle slot gets the most valuable card.
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  $('#fan').innerHTML = order
    .map(c => `<button type="button" class="fan-card" data-id="${esc(c.id)}" aria-label="${esc(c.name)}"><span class="holo">${art(c)}</span></button>`)
    .join('');
}

function openCard(id) {
  const card = state.cards.find(c => c.id === id);
  if (!card) return;
  const link = isSold(card) ? null : offerLink(card);
  $('#d-art').innerHTML = art(card);
  $('#d-name').textContent = card.name;
  $('#d-meta').textContent = [setLine(card), card.rarity].filter(Boolean).join(', ');
  $('#d-cond').textContent = condition(card);
  $('#d-note').textContent = card.note || '';
  $('#d-ask').textContent = askText(card);
  $('#d-market').textContent = card.market != null ? `Market price ${usd(card.market)}` : '';
  $('#d-sales').innerHTML = salesHtml(card);
  $('#d-action').innerHTML = isSold(card)
    ? '<p class="note">This one has found a new home.</p>'
    : link
      ? `<a class="btn" href="${esc(link.href)}"${link.external ? ' target="_blank" rel="noopener"' : ''}>${link.label}</a>`
      : '<p class="note">Contact details are being added. Check back soon to send an offer.</p>';
  const dialog = $('#detail');
  if (!dialog.open) dialog.showModal();
  history.replaceState(null, '', '#' + encodeURIComponent(id));
}

function fillSite(site) {
  const title = site.owner ? `${site.owner}'s binder` : 'The binder';
  document.title = title;
  $('#owner').textContent = title;
  $('#tagline').textContent = site.tagline || '';
  $('#payments').innerHTML = (site.payments || []).map(p => `<li>${esc(p)}</li>`).join('');
  $('#shipping').textContent = site.shipping || '';
  $('#sample').hidden = !site.sample;
  if (site.ebayUser) {
    $('#ebay').href = `https://www.ebay.com/usr/${encodeURIComponent(site.ebayUser)}`;
    $('#ebay').hidden = false;
  }
}

// Foil glare follows the pointer. Skipped when the visitor asks for less motion.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
function foil(e) {
  const el = e.target.closest && e.target.closest('.holo');
  if (!el || calm) return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  const tilt = el.classList.contains('big') ? 14 : 8;
  el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
  el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  el.style.setProperty('--ry', ((x - 0.5) * tilt).toFixed(2) + 'deg');
  el.style.setProperty('--rx', ((0.5 - y) * tilt).toFixed(2) + 'deg');
  el.style.setProperty('--glare', '1');
}
function unfoil(e) {
  const el = e.target.closest && e.target.closest('.holo');
  if (!el) return;
  ['--rx', '--ry', '--glare'].forEach(p => el.style.removeProperty(p));
}

async function main() {
  try {
    const { site, cards } = await loadBinder();
    state.site = site;
    state.cards = cards;
    fillSite(site);
    renderFan();
    render();
    const wanted = decodeURIComponent(location.hash.slice(1));
    if (cards.some(c => c.id === wanted)) openCard(wanted);
  } catch (err) {
    $('#grid').innerHTML = `<p class="empty">The binder did not load (${esc(err.message)}). Refresh the page to try again.</p>`;
  }
}

document.addEventListener('click', e => {
  const opener = e.target.closest('[data-id]');
  if (opener) return openCard(opener.dataset.id);
  const seg = e.target.closest('[data-show]');
  if (seg) {
    state.show = seg.dataset.show;
    document.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', String(b === seg)));
    render();
  }
});
narrow.addEventListener('change', render);
document.addEventListener('pointermove', foil);
document.addEventListener('pointerout', unfoil);
$('#q').addEventListener('input', e => { state.q = e.target.value; render(); });
$('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
$('#d-close').addEventListener('click', () => $('#detail').close());
$('#detail').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$('#detail').addEventListener('close', () => history.replaceState(null, '', location.pathname));
main();
