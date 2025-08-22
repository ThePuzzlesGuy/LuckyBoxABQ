let PRODUCTS = [];
const cart = new Map(); // key: code, value: {product, qty}

async function init(){
  PRODUCTS = await fetch('products.json').then(r=>r.json());
  renderGrid(PRODUCTS);
  restoreCart();
  updateCartUI();
  bindKeypad();
}
document.addEventListener('DOMContentLoaded', init);

function renderGrid(list){
  const grid = document.querySelector('.grid');
  grid.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('article');
    div.className = 'slot';
    div.innerHTML = `
      <div class="thumb" style="background-image:url('${p.image}'), linear-gradient(135deg,#f0f4ff,#f9fafb)"></div>
      <div class="meta">
        <div class="title">${escapeHTML(p.name)}</div>
        <div class="series">${escapeHTML(p.series || '')}</div>
        <div class="row">
          <div class="price">$${p.price.toFixed(2)}</div>
          <div class="code">${p.code}</div>
        </div>
      </div>
      <button class="add" aria-label="Add ${escapeHTML(p.name)}">＋</button>
    `;
    div.querySelector('.add').addEventListener('click', ()=> addToCart(p.code, 1));
    grid.appendChild(div);
  });
}

function bindKeypad(){
  const screen = document.querySelector('.keypad .screen code');
  const msg = document.querySelector('.keypad .screen span');
  let buffer = '';
  const setMsg = (t)=> msg.textContent = t || '';
  const setScreen = ()=> screen.textContent = buffer || '—';

  document.querySelectorAll('.keypad .keys button[data-k]').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const k = btn.dataset.k;
      if(/[A-C]/.test(k) && buffer.length<1){ buffer = k; setMsg('enter number'); setScreen(); return;}
      if(/[1-3]/.test(k) && buffer.length===1){ buffer += k; setMsg('tap add'); setScreen(); return;}
    });
  });
  document.getElementById('kp-clear').addEventListener('click', ()=>{ buffer=''; setMsg(''); setScreen(); });
  document.getElementById('kp-add').addEventListener('click', ()=>{
    if(buffer.length===2){
      addToCart(buffer, 1);
      setMsg('added to cart');
      buffer=''; setScreen();
      setTimeout(()=> setMsg(''), 1200);
    }
  });
}

function addToCart(code, qty=1){
  const product = PRODUCTS.find(p=>p.code===code);
  if(!product){ toast('Unknown code'); return; }
  const item = cart.get(code) || {product, qty:0};
  item.qty += qty;
  cart.set(code, item);
  persistCart();
  updateCartUI();
}

function removeFromCart(code){
  cart.delete(code);
  persistCart();
  updateCartUI();
}

function changeQty(code, delta){
  const item = cart.get(code);
  if(!item) return;
  item.qty += delta;
  if(item.qty<=0){ cart.delete(code); }
  persistCart();
  updateCartUI();
}

function updateCartUI(){
  const list = document.querySelector('.cart .items');
  const totalEl = document.getElementById('cart-total');
  list.innerHTML = '';
  let total = 0;
  for(const [code, item] of cart){
    const line = item.product.price * item.qty;
    total += line;
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <div>
        <strong>${escapeHTML(item.product.name)}</strong>
        <small style="display:block;color:#9fb0cb">${escapeHTML(item.product.series||'')}</small>
        <small>${code}</small>
      </div>
      <div class="qty">
        <button aria-label="decrease" onclick="changeQty('${code}',-1)">−</button>
        <strong>${item.qty}</strong>
        <button aria-label="increase" onclick="changeQty('${code}',1)">＋</button>
      </div>
      <div style="text-align:right">
        $${line.toFixed(2)} <button class="remove" onclick="removeFromCart('${code}')">✕</button>
      </div>
    `;
    list.appendChild(row);
  }
  totalEl.textContent = '$' + total.toFixed(2);
  document.getElementById('checkout-btn').disabled = total<=0;
}

function persistCart(){
  const obj = Array.from(cart.values()).map(x=>({code:x.product.code, name:x.product.name, series:x.product.series, price:x.product.price, qty:x.qty}));
  localStorage.setItem('luckybox_cart', JSON.stringify(obj));
}

function restoreCart(){
  try{
    const arr = JSON.parse(localStorage.getItem('luckybox_cart') || '[]');
    arr.forEach(it => {
      const product = PRODUCTS.find(p=>p.code===it.code);
      if(product) cart.set(product.code, {product, qty: it.qty});
    });
  }catch(e){}
}

/* Drawer / Order form */
function openDrawer(){
  const drawer = document.querySelector('.drawer'); drawer.classList.add('open');
  // prefill hidden cart field
  const payload = Array.from(cart.values()).map(x=>({code:x.product.code, name:x.product.name, series:x.product.series, price:x.product.price, qty:x.qty}));
  document.getElementById('order-items').value = JSON.stringify(payload, null, 2);
  document.getElementById('order-total').value = document.getElementById('cart-total').textContent;
}
function closeDrawer(){ document.querySelector('.drawer').classList.remove('open'); }

/* Utility */
function escapeHTML(str){ return String(str).replace(/[&<>"]/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s])); }
function toast(t){
  alert(t);
}

// Hook checkout
document.addEventListener('click', e=>{
  if(e.target && e.target.id==='checkout-btn'){ openDrawer(); }
  if(e.target && e.target.classList.contains('close')){ closeDrawer(); }
  if(e.target && e.target.classList.contains('drawer')){ closeDrawer(); }
});