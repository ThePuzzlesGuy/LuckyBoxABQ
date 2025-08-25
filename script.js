let PRODUCTS = [];
const cart = new Map();            // code -> { product, qty }
let SELECTED_INDEX = 0;            // selection index

document.addEventListener('DOMContentLoaded', init);

async function init(){
  // Load products
  try {
    PRODUCTS = await fetch('products.json').then(r => r.json());
  } catch (e) {
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

  // Render UI
  renderGrid(PRODUCTS);
  restoreCart();
  renderTotal();
  buildSelectionScreen();

  // Flap -> open cart drawer
  document.getElementById('flap').addEventListener('click', () => {
    openDrawer('#cart-drawer');
    renderCartList();
  });

  // Drawer close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeDrawer(btn.getAttribute('data-close')));
  });
  document.querySelectorAll('.drawer').forEach(d => {
    d.addEventListener('click', (e) => {
      if (e.target.classList.contains('drawer')) closeDrawer('#'+d.id);
    });
  });

  // Open checkout from cart
  document.getElementById('open-checkout').addEventListener('click', () => {
    if (cart.size === 0) { alert('Add at least one item first.'); return; }
    closeDrawer('#cart-drawer');
    openDrawer('#checkout-drawer');
  });
}

/* ---------- LEFT GRID ---------- */
function renderGrid(list){
  const grid = document.querySelector('.grid');
  grid.innerHTML = '';
  list.slice(0, 9).forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.code = p.code;
    card.innerHTML = `
      <div class="img" style="background-image:url('${p.image}')" data-code="${p.code}"></div>
      <div class="meta">
        <div class="title">${escape(p.name)}</div>
        <div class="series">${escape(p.series || '')}</div>
        <div class="row"><div class="price">$${p.price.toFixed(2)}</div><div></div></div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ---------- SELECTION SCREEN (combined with arrows) ---------- */
function buildSelectionScreen(){
  const screen = document.getElementById('choice-screen');
  if (!screen) return;

  // initial render
  renderChoice();

  // internal nav buttons (in the bottom bar)
  document.getElementById('nav-prev').addEventListener('click', (e) => {
    e.stopPropagation(); // keep from adding to cart
    SELECTED_INDEX = (SELECTED_INDEX - 1 + PRODUCTS.length) % PRODUCTS.length;
    renderChoice();
  });
  document.getElementById('nav-next').addEventListener('click', (e) => {
    e.stopPropagation();
    SELECTED_INDEX = (SELECTED_INDEX + 1) % PRODUCTS.length;
    renderChoice();
  });

  // tap the image area anywhere (except the bottom bar buttons) to add
  screen.addEventListener('click', (e) => {
    // ignore clicks originating from the bottom bar buttons
    if (e.target.closest('.screen-nav')) return;
    const p = PRODUCTS[SELECTED_INDEX];
    addToCart(p.code, 1);
    flyToFlap(p);
  });
}

function renderChoice(){
  const p = PRODUCTS[SELECTED_INDEX];
  const screen = document.getElementById('choice-screen');
  if (!p || !screen) return;
  screen.style.backgroundImage = `url('${p.image}')`;
  screen.querySelector('.label').textContent = p.name;
}

/* ---------- VISUAL FEEDBACK: FLY FROM GRID -> FLAP ---------- */
function flyToFlap(product){
  const flap = document.getElementById('flap');
  if (!flap) return;

  // start element: try grid card image; fallback to selection screen
  const startEl =
    document.querySelector(`.card[data-code="${cssEscape(product.code)}"] .img`)
    || document.getElementById('choice-screen');

  const start = startEl.getBoundingClientRect();
  const target = flap.getBoundingClientRect();

  const startCx = start.left + start.width / 2;
  const startCy = start.top + start.height / 2;
  const endCx = target.left + target.width / 2;
  const endCy = target.top + target.height * 0.35; // upper face of the flap

  const ghost = document.createElement('img');
  ghost.className = 'fly-ghost';
  ghost.src = product.image;
  ghost.style.left = (startCx - 43) + 'px';
  ghost.style.top  = (startCy - 43) + 'px';
  document.body.appendChild(ghost);

  // flap peek while landing
  flap.classList.add('peek');
  ghost.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 0 },
      { transform: `translate(${(endCx-startCx)*0.5}px, ${Math.max(120, endCy-startCy)*0.6}px) scale(.9) rotate(6deg)`, offset: .45 },
      { transform: `translate(${endCx-startCx}px, ${endCy-startCy}px) scale(.35) rotate(12deg)`, offset: 1 }
    ],
    { duration: 900, easing: 'cubic-bezier(.22,.99,.45,1)' }
  ).onfinish = () => {
    ghost.remove();
    setTimeout(() => flap.classList.remove('peek'), 150);
  };
}

/* ---------- CART LIST (drawer) ---------- */
function renderCartList(){
  const list = document.getElementById('cart-list');
  list.innerHTML = '';

  if (cart.size === 0){
    list.innerHTML = `<li class="cart-item" style="grid-template-columns:1fr;">
      <div style="text-align:center; width:100%;">Cart is empty — add an item by tapping the big screen.</div>
    </li>`;
    renderTotal();
    return;
  }

  for (const [, item] of cart){
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <img src="${item.product.image}" alt="">
      <div>
        <div class="cart-name">${escape(item.product.name)}</div>
        <div class="cart-series">${escape(item.product.series || '')}</div>
      </div>
      <div style="display:grid; gap:8px; justify-items:end;">
        <div class="cart-price">$${item.product.price.toFixed(2)}</div>
        <div class="cart-qty">
          <button class="minus" aria-label="Minus">−</button>
          <span class="qty">${item.qty}</span>
          <button class="plus" aria-label="Plus">＋</button>
        </div>
        <button class="remove btn ghost" style="padding:6px 10px">Remove</button>
      </div>
    `;
    li.querySelector('.plus').addEventListener('click', () => { changeQty(item.product.code, +1); renderCartList(); });
    li.querySelector('.minus').addEventListener('click', () => { changeQty(item.product.code, -1); renderCartList(); });
    li.querySelector('.remove').addEventListener('click', () => { setQty(item.product.code, 0); renderCartList(); });
    list.appendChild(li);
  }

  renderTotal();
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
}

function changeQty(code, delta){
  const curr = cart.get(code);
  if (!curr) return;
  curr.qty += delta;
  if (curr.qty <= 0) cart.delete(code);
  persistCart();
  renderTotal();
}

function setQty(code, qty){
  if (qty <= 0) { cart.delete(code); }
  else {
    const p = PRODUCTS.find(x => x.code === code);
    if (!p) return;
    cart.set(code, { product: p, qty });
  }
  persistCart();
  renderTotal();
}

function renderTotal(){
  const el = document.getElementById('total');
  if (!el) return;
  let t = 0;
  for (const [, item] of cart) t += item.product.price * item.qty;
  el.textContent = '$' + t.toFixed(2);

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
  if (totalField) totalField.value = '$' + t.toFixed(2);
}

/* ---------- STORAGE & DRAWERS ---------- */
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

function openDrawer(sel){ document.querySelector(sel).classList.add('open'); }
function closeDrawer(sel){ document.querySelector(sel).classList.remove('open'); }

/* ---------- utils ---------- */
function escape(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function cssEscape(id){ if (window.CSS && CSS.escape) return CSS.escape(id); return String(id).replace(/[^a-zA-Z0-9_\-]/g, ch => '\\' + ch.charCodeAt(0).toString(16) + ' '); }
