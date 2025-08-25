let PRODUCTS = [];
const cart = new Map();            // code -> { product, qty }
let SELECTED_INDEX = 0;            // choice carousel index
let CART_KEYS = [];                // codes currently in cart
let CART_INDEX = 0;                // cart carousel index

document.addEventListener('DOMContentLoaded', init);

async function init(){
  try {
    PRODUCTS = await fetch('products.json').then(r => r.json());
  } catch (e) {
    PRODUCTS = [];
  }

  if (PRODUCTS.length === 0) {
    // Fail-safe placeholder so the UI still renders
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
  buildCartCarousel();

  document.getElementById('checkout').addEventListener('click', () => {
    if (cart.size === 0) { alert('Add at least one item first.'); return; }
    openDrawer();
  });

  document.querySelector('.drawer').addEventListener('click', (e) => {
    if (e.target.classList.contains('drawer') || e.target.classList.contains('close')) {
      closeDrawer();
    }
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

/* ---------- CART as a screen ---------- */
function syncCartKeys(){
  CART_KEYS = Array.from(cart.keys());
  if (CART_INDEX >= CART_KEYS.length) CART_INDEX = Math.max(0, CART_KEYS.length - 1);
}

function buildCartCarousel(){
  const cs = document.getElementById('cart-screen');
  if (!cs) return;

  cs.querySelector('.o-prev').addEventListener('click', () => {
    if (!CART_KEYS.length) return;
    CART_INDEX = (CART_INDEX - 1 + CART_KEYS.length) % CART_KEYS.length;
    renderCartScreen();
  });
  cs.querySelector('.o-next').addEventListener('click', () => {
    if (!CART_KEYS.length) return;
    CART_INDEX = (CART_INDEX + 1) % CART_KEYS.length;
    renderCartScreen();
  });
  cs.querySelector('.o-plus').addEventListener('click', () => {
    const code = CART_KEYS[CART_INDEX];
    if (code) changeQty(code, +1);
  });
  cs.querySelector('.o-minus').addEventListener('click', () => {
    const code = CART_KEYS[CART_INDEX];
    if (code) changeQty(code, -1);
  });

  renderCartScreen();
}

function renderCartScreen(){
  syncCartKeys();
  const cs = document.getElementById('cart-screen');
  const qtyEl = cs.querySelector('.qty');
  const labelEl = cs.querySelector('.label');

  if (CART_KEYS.length === 0){
    cs.style.backgroundImage = 'none';
    labelEl.textContent = 'Cart is empty';
    qtyEl.textContent = '0';
    return;
  }

  const code = CART_KEYS[CART_INDEX];
  const item = cart.get(code);
  cs.style.backgroundImage = `url('${item.product.image}')`;
  labelEl.textContent = item.product.name;
  qtyEl.textContent = item.qty;
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
  renderCartScreen();
}

function changeQty(code, delta){
  const curr = cart.get(code);
  if (!curr) return;
  curr.qty += delta;
  if (curr.qty <= 0) cart.delete(code);
  persistCart();
  renderTotal();
  renderCartScreen();
}

function renderTotal(){
  const el = document.getElementById('total');
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
  document.getElementById('order-items').value = JSON.stringify(payload, null, 2);
  document.getElementById('order-total').value = '$' + t.toFixed(2);
}

/* ---------- STORAGE & DRAWER ---------- */
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

function openDrawer(){ document.querySelector('.drawer').classList.add('open'); }
function closeDrawer(){ document.querySelector('.drawer').classList.remove('open'); }

/* ---------- utils ---------- */
function escape(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
