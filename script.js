let PRODUCTS = [];
const cart = new Map();            // code -> { product, qty }
let SELECTED_INDEX = 0;            // choice carousel index

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
  buildChoiceCarousel();

  // Flap -> open cart drawer
  document.getElementById('flap').addEventListener('click', () => {
    openDrawer('#cart-drawer');
    renderCartList(); // make sure content is fresh
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
    card.innerHTML = `
      <div class="img" style="background-image:url('${p.image}')"></div>
      <div class="meta">
        <div class="title">${escape(p.name)}</div>
        <div class="series">${escape(p.series || '')}</div>
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

  // initial render
  renderChoice();

  // nav
  document.getElementById('prev').addEventListener('click', () => {
    SELECTED_INDEX = (SELECTED_INDEX - 1 + PRODUCTS.length) % PRODUCTS.length;
    renderChoice();
  });
  document.getElementById('next').addEventListener('click', () => {
    SELECTED_INDEX = (SELECTED_INDEX + 1) % PRODUCTS.length;
    renderChoice();
  });

  // tap to add
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
  screen.querySelector('.label').textContent = p.name;
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

    // qty controls
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
