const CONDITIONS = { NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played', HP: 'Heavily Played', DMG: 'Damaged' };
const $ = sel => document.querySelector(sel);
let state = { site: {}, cards: [], q: '', show: 'available', sort: 'price' };

function price(card) {
  return card.ask ?? card.market;
}

function offerLink(card) {
  const { contactEmail, ebayUser } = state.site;
  if (card.listing) return { href: card.listing, label: 'Buy on eBay', external: true };
  if (contactEmail) {
    const subject = encodeURIComponent(`Offer: ${card.name} (${card.set} #${card.number})`);
    return { href: `mailto:${contactEmail}?subject=${subject}`, label: 'Make an offer' };
  }
  if (ebayUser) return { href: `https://www.ebay.com/usr/${encodeURIComponent(ebayUser)}`, label: 'Ask on eBay', external: true };
  return null;
}

function cardHtml(card) {
  const sold = card.status === 'sold';
  const link = sold ? null : offerLink(card);
  const cond = card.grade || CONDITIONS[card.condition] || card.condition || '';
  const ask = card.ask != null
    ? `<span class="ask">${usd(card.ask)}</span>`
    : `<span class="ask open">Open to offers</span>`;
  const market = card.market != null ? `<span class="market">Market ${usd(card.market)}</span>` : '';
  const img = card.image
    ? `<img src="${esc(card.image)}" alt="${esc(card.name)}" loading="lazy" width="245" height="342">`
    : `<div class="noimg">${esc(card.id)}</div>`;
  const action = sold
    ? '<span class="btn off">Sold</span>'
    : link
      ? `<a class="btn" href="${esc(link.href)}"${link.external ? ' target="_blank" rel="noopener"' : ''}>${link.label}</a>`
      : '<span class="btn off">Contact coming soon</span>';
  return `<article class="card${sold ? ' sold' : ''}">
    <div class="art">${img}${card.qty > 1 && !sold ? `<span class="qty">x${card.qty}</span>` : ''}</div>
    <h3>${esc(card.name)}</h3>
    <p class="meta">${esc(card.set)}${card.number ? ' · #' + esc(card.number) : ''}</p>
    <p class="cond">${esc(cond)}</p>
    ${card.note ? `<p class="note">${esc(card.note)}</p>` : ''}
    <p class="prices">${ask}${market}</p>
    <p class="sales">Recent sales: ${salesHtml(card)}</p>
    ${action}
  </article>`;
}

function render() {
  const q = state.q.trim().toLowerCase();
  const list = state.cards
    .filter(c => state.show === 'all' || (c.status || 'available') === state.show)
    .filter(c => !q || `${c.name} ${c.set} ${c.rarity} ${c.grade || ''}`.toLowerCase().includes(q))
    .sort((a, b) => state.sort === 'name'
      ? a.name.localeCompare(b.name)
      : (price(b) ?? -1) - (price(a) ?? -1));
  $('#grid').innerHTML = list.map(cardHtml).join('') || '<p class="empty">No cards match.</p>';
  $('#count').textContent = `${list.length} card${list.length === 1 ? '' : 's'}`;
}

function fillSite(site) {
  document.title = `${site.owner}'s Binder`;
  $('#owner').textContent = `${site.owner}'s Binder`;
  $('#tagline').textContent = site.tagline || '';
  $('#payments').innerHTML = (site.payments || []).map(p => `<li>${esc(p)}</li>`).join('');
  $('#shipping').textContent = site.shipping || '';
  $('#sample').hidden = !site.sample;
  const ebay = $('#ebay');
  if (site.ebayUser) {
    ebay.href = `https://www.ebay.com/usr/${encodeURIComponent(site.ebayUser)}`;
    ebay.hidden = false;
  }
}

async function main() {
  try {
    const { site, cards } = await loadBinder();
    state.site = site;
    state.cards = cards;
    fillSite(site);
    render();
  } catch (err) {
    $('#grid').innerHTML = `<p class="empty">Could not load the binder: ${esc(err.message)}</p>`;
  }
}

$('#q').addEventListener('input', e => { state.q = e.target.value; render(); });
$('#show').addEventListener('change', e => { state.show = e.target.value; render(); });
$('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
main();
