// ------------ DATA & STATE ------------
let PRODUCTS = [];
const cart = new Map();            // code -> { product, qty }
let SELECTED_INDEX = 0;            // choice carousel index

document.addEventListener('DOMContentLoaded', init);

async function init(){
  try {
    // cache-bust to avoid stale JSON while iterating
    const res = await fetch('./products.json?ts=' + Date.now());
    PRODUCTS = await res.json();
  } catch (e) {
    console.error('Failed to load products.json', e);
    PRODUCTS = [];
  }

  if (PRODUCTS.length === 0) {
    PRODUCTS = [{
      code: 'DEMO',
      name: 'Sample Item',
      series: 'Replace images via products.json',
      price: 0,
      image: 'images/lulu-animal-party.jpg'
    }];
  }

  renderGrid(PRODUCTS);
  restoreCart();
  renderTotal();
  buildChoiceCarousel();

  const coin = document.getElementById('checkout');
  if (coin) {
    coin.addEventListener('click', () => {
      if (cart.size === 0) { alert('Add at least one item first.'); return; }
      openDrawer();
    });
  }

  wireCartPanel();

  const pcoin = document.getElementById('panel-checkout');
  if (pcoin) {
    pcoin.addEventListener('click', () => {
      if (cart.size === 0) { alert('Add at least one item first.'); return; }
      closeCartPanel();
      openDrawer();
    });
  }

  const drawer = document.querySelector('.drawer');
  if (drawer) {
    drawer.addEventListener('click', (e) => {
      if (e.target.classList.contains('drawer') || e.target.classList.contains('close')) {
        closeDrawer();
      }
    });
  }
}

/* ---------- LEFT GRID ---------- */
function renderGrid(list){
  const grid = document.querySelector('.grid');
  if (!grid) return;
  grid.innerHTML = '';
  list.slice(0, 9).forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="img" style="background-image:url('${p.image}')"></div>
      <div class="meta">
        <div class="title">${escapeHTML(p.name)}</div>
        <div class="series">${escapeHTML(p.series || '')}</div>
        <div class="row"><div class="price">$${p.price.toFixed(2)}</div><div></div></div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ---------- CHOICE SCREEN (tap to add) ---------- */
function buildChoiceCarousel(){
  const screen = document.getElementById('choice-screen');
  if (!screen) return;

  renderChoice();

  const prev = document.getElementById('prev');
  const next = document.getElementById('next');

  if (prev) prev.addEventListener('click', () => {
    SELECTED_INDEX = (SELECTED_INDEX - 1 + PRODUCTS.length) % PRODUCTS.length;
    renderChoice();
  });
  if (next) next.addEventListener('click', () => {
    SELECTED_INDEX = (SELECTED_INDEX + 1) % PRODUCTS.length;
    renderChoice();
  });

  screen.addEventListener('click', () => {
    const p = PRODUCTS[SELECTED_INDEX];
    addToCart(p.code, 1);
  });
}

function renderChoice(){
  const p = PRODUCTS[SELECTED_INDEX];
  const screen = document.getElementById('choice-screen');
  if (!p || !screen) return;
  screen.style.backgroundImage = `url('${p.image}')`;
  const label = screen.querySelector('.label');
  if (label) label.textContent = p.name;
}

/* ---------- CART LOGIC ---------- */
function addToCart(code, qty=1){
  const p = PRODUCTS.find(x => x.code === code);
  if (!p) return;
  const curr = cart.get(code) || { product: p, qty: 0 };
  curr.qty += qty;
  cart.set(code, curr);
  persistCart();
  renderTotal();
  renderCartPanel();
}

function changeQty(code, delta){
  const curr = cart.get(code);
  if (!curr) return;
  curr.qty += delta;
  if (curr.qty <= 0) cart.delete(code);
  persistCart();
  renderTotal();
  renderCartPanel();
}

function renderTotal(){
  const tot = [...cart.values()].reduce((s, x) => s + x.product.price * x.qty, 0);
  const flapTotal = document.getElementById('total');
  if (flapTotal) flapTotal.textContent = '$' + tot.toFixed(2);
  const panelTotal = document.getElementById('total-panel');
  if (panelTotal) panelTotal.textContent = '$' + tot.toFixed(2);

  // payload for Netlify form
  const payload = Array.from(cart.values()).map(x => ({
    code: x.product.code,
    name: x.product.name,
    series: x.product.series,
    price: x.product.price,
    qty: x.qty
  }));
  const itemsField = document.getElementById('order-items');
  const totalField = document.getElementById('order-total');
  if (itemsField) itemsField.value = JSON.stringify(payload, null, 2);
  if (totalField) totalField.value = '$' + tot.toFixed(2);
}

/* ---------- STORAGE ---------- */
function persistCart(){
  const arr = Array.from(cart.values()).map(x => ({ code: x.product.code, qty: x.qty }));
  localStorage.setItem('luckybox_cart', JSON.stringify(arr));
}
function restoreCart(){
  try{
    const arr = JSON.parse(localStorage.getItem('luckybox_cart') || '[]');
    arr.forEach(row => {
      const p = PRODUCTS.find(x => x.code === row.code);
      if (p) cart.set(p.code, { product: p, qty: row.qty });
    });
  }catch(e){}
}

/* ---------- DRAWER ---------- */
function openDrawer(){ const d=document.querySelector('.drawer'); if(d) d.classList.add('open'); }
function closeDrawer(){ const d=document.querySelector('.drawer'); if(d) d.classList.remove('open'); }

/* ---------- CART PANEL (flap + slide out) ---------- */
function wireCartPanel(){
  const flap = document.getElementById('cart-flap');
  const panel = document.getElementById('cart-panel');
  if (!flap || !panel) return;
  const closeBtn = panel.querySelector('.close-cart');

  const open = () => {
    renderCartPanel();
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    flap.setAttribute('aria-expanded','true');
    flap.classList.add('open');
  };
  const close = () => {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden','true');
    flap.setAttribute('aria-expanded','false');
    flap.classList.remove('open');
  };

  flap.addEventListener('click', open);
  flap.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); open(); }
  });
  if (closeBtn) closeBtn.addEventListener('click', close);

  document.addEventListener('click', (e)=>{
    if(!panel.classList.contains('open')) return;
    if(!panel.contains(e.target) && e.target !== flap && !flap.contains(e.target)){
      close();
    }
  });

  window.closeCartPanel = close;
}

function renderCartPanel(){
  const wrap = document.getElementById('cart-items');
  if (!wrap) return;
  const items = Array.from(cart.values());

  if (items.length === 0){
    wrap.innerHTML = `<div class="ci-empty">Cart is empty.</div>`;
    return;
  }

  wrap.innerHTML = items.map(x => `
    <div class="ci">
      <img src="${x.product.image}" alt="">
      <div class="ci-meta">
        <div class="ci-title">${escapeHTML(x.product.name)}</div>
        <div class="ci-price">$${x.product.price.toFixed(2)}</div>
      </div>
      <div class="ci-qty">
        <button class="minus" data-id="${x.product.code}">−</button>
        <span>${x.qty}</span>
        <button class="plus" data-id="${x.product.code}">＋</button>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.minus,.plus').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.currentTarget.dataset.id;
      const delta = e.currentTarget.classList.contains('plus') ? 1 : -1;
      changeQty(id, delta);
    });
  });
}

/* ---------- utils ---------- */
function escapeHTML(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
