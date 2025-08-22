let PRODUCTS = [];
const cart = new Map(); // key: code, value: {product, qty}

async function init(){
  PRODUCTS = await fetch('products.json').then(r=>r.json());
  renderGrid(PRODUCTS);
  restoreCart();
  for(const [code] of cart){ trayAddOrUpdate(code); }
  bindKeypad();
  setupRestockTarget();
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
    `;
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

  // animation from slot
  const slot = [...document.querySelectorAll('.slot .code')]
    .find(el => el.textContent === code);
  if(slot){ runDropAnimation(slot.closest('.slot'), product); }

  persistCart();
  trayAddOrUpdate(code);
}


function removeFromCart(code){
  cart.delete(code);
  const el = document.querySelector(`.tray-item[data-code="${code}"]`);
  if(el) el.remove();
  persistCart();
  updateCartUI();
}

function changeQty(code, delta){
  const item = cart.get(code);
  if(!item) return;
  item.qty += delta;
  if(item.qty<=0){
    cart.delete(code);
    const el = document.querySelector(`.tray-item[data-code="${code}"]`);
    if(el) el.remove();
  }else{
    trayAddOrUpdate(code);
  }
  persistCart();
  updateCartUI();
}
  persistCart();
  updateCartUI();
}


function updateCartUI(){
  // cart UI removed; nothing to update here
}


function persistCart(){
  const obj = Array.from(cart.values()).map(x=>({code:x.product.code, name:x.product.name, series:x.product.series, price:x.product.price, qty:x.qty}));
  localStorage.setItem('luckybox_cart', JSON.stringify(obj));
}


/* --- Pickup tray rendering & drop animation --- */
function trayAddOrUpdate(code){
  const row = document.getElementById('tray-row');
  let el = row.querySelector(`[data-code="${code}"]`);
  const item = cart.get(code);
  if(!item) return;
  if(!el){
    el = document.createElement('div');
    el.className = 'tray-item';
    el.dataset.code = code;
    el.draggable = true;
    el.style.backgroundImage = `url('${item.product.image}')`;
    el.innerHTML = `<div class="badge">1</div>
      <div class="mini-qty">
        <button class="minus" aria-label="decrease">−</button>
        <button class="plus" aria-label="increase">＋</button>
      </div>`;
    // qty clicks
    el.querySelector('.minus').addEventListener('click', (ev)=>{ ev.stopPropagation(); changeQty(code,-1); });
    el.querySelector('.plus').addEventListener('click', (ev)=>{ ev.stopPropagation(); changeQty(code,1); });
    // drag events
    el.addEventListener('dragstart', (e)=>{ el.classList.add('dragging'); e.dataTransfer.setData('text/plain', code); });
    el.addEventListener('dragend', ()=> el.classList.remove('dragging'));
    row.appendChild(el);
  }
  const badge = el.querySelector('.badge');
  badge.textContent = item.qty;
  if(item.qty <= 1){ badge.style.display = 'none'; } else { badge.style.display = 'block'; }
}
  el.querySelector('.badge').textContent = item.qty;
  if(item.qty <= 1){ el.querySelector('.badge').style.display = 'none'; }
  else{ el.querySelector('.badge').style.display = 'block'; }
}

function runDropAnimation(fromEl, product){
  try{
    const rect = fromEl.getBoundingClientRect();
    const tray = document.querySelector('.tray').getBoundingClientRect();
    const clone = document.createElement('div');
    clone.className = 'fall-clone';
    clone.style.left = (rect.left + rect.width/2 - 40) + 'px';
    clone.style.top = (rect.top + rect.height/2 - 40) + 'px';
    clone.style.backgroundImage = `url('${product.image}')`;
    document.body.appendChild(clone);

    const endX = tray.left + 20 + Math.random()*40; // rough landing left edge
    const endY = tray.top + 6;

    clone.animate([
      { transform:'translate(0,0) scale(1)', offset:0 },
      { transform:`translate(${endX - (rect.left + rect.width/2 - 40)}px, ${endY - (rect.top + rect.height/2 - 40)}px) scale(.95)`, offset:.85},
      { transform:`translate(${endX - (rect.left + rect.width/2 - 40)}px, ${endY - (rect.top + rect.height/2 - 40)}px) scale(1)`, offset:1}
    ], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = ()=>{
      clone.remove();
    };
  }catch(e){}
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
/* payment logos open drawer */
document.addEventListener('click', e=>{
  const btn = e.target.closest('.logo-pill');
  if(btn){ 
    // quick blink effect on reader glow
    const glow = document.querySelector('.reader-glow');
    if(glow){ glow.animate([{opacity:1},{opacity:.2},{opacity:1}], {duration:400}); }
    openDrawer();
  }
});

// compute total before drawer opens
const _openDrawer = openDrawer;
openDrawer = function(){
  // recompute total
  let total = 0;
  for(const [code, item] of cart){ total += item.product.price * item.qty; }
  document.getElementById('cart-total')?.remove(); // old element no longer exists, safe
  const payload = Array.from(cart.values()).map(x=>({code:x.product.code, name:x.product.name, series:x.product.series, price:x.product.price, qty:x.qty}));
  document.getElementById('order-items').value = JSON.stringify(payload, null, 2);
  document.getElementById('order-total').value = '$'+total.toFixed(2);
  document.querySelector('.drawer').classList.add('open');
}

function setupRestockTarget(){
  const target = document.getElementById('restock');
  if(!target) return;
  target.addEventListener('dragover', (e)=>{ e.preventDefault(); target.classList.add('drag-over'); });
  target.addEventListener('dragleave', ()=> target.classList.remove('drag-over'));
  target.addEventListener('drop', (e)=>{
    e.preventDefault();
    target.classList.remove('drag-over');
    const code = e.dataTransfer.getData('text/plain');
    if(code){ removeFromCart(code); }
  });
}
