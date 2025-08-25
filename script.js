
let PRODUCTS = [];
const cart = new Map();
let SELECTED_INDEX = 0;
document.addEventListener('DOMContentLoaded', init);

async function init(){
  try{ PRODUCTS = await fetch('products.json').then(r=>r.json()); }catch(e){ PRODUCTS = PRODUCTS||[]; }
  renderGrid(PRODUCTS);
  restoreCart();
  renderTotal(); renderCartScreen();
  buildCarousel();
   buildCartCarousel();
  document.addEventListener('click', (e)=>{
    if(e.target.closest('.coin')){
      if(cart.size===0){ alert('Add at least one item first.'); return; }
      openDrawer();
    }
    if(e.target.closest('.close') || e.target.classList.contains('drawer')) closeDrawer();
  });
}

function renderGrid(list){
  const grid = document.querySelector('.grid');
  grid.innerHTML = '';
  list.slice(0,9).forEach(p => {
    const div = document.createElement('article');
    div.className = 'slot';
    div.innerHTML = `<div class="thumb" style="background-image:url('${p.image}')"></div>
      <div class="meta"><div class="title">${escapeHTML(p.name)}</div>
      <div class="series">${escapeHTML(p.series || '')}</div>
      <div class="row"><div class="price">$${p.price.toFixed(2)}</div><div class="code"></div></div></div>`;
    grid.appendChild(div);
  });
}

function buildCarousel(){
  const scr = document.querySelector('.mini-screen');
  if(!scr) return;
  scr.addEventListener('click', ()=>{ const p = PRODUCTS[SELECTED_INDEX]; if(p) addToCart(p.code,1); });
  const prev = document.querySelector('.mini-keys .prev');
  const next = document.querySelector('.mini-keys .next');
  prev.addEventListener('click', ()=>{ SELECTED_INDEX = (SELECTED_INDEX-1+PRODUCTS.length)%PRODUCTS.length; if(PRODUCTS && PRODUCTS.length){ renderCarousel(); } });
  next.addEventListener('click', ()=>{ SELECTED_INDEX = (SELECTED_INDEX+1)%PRODUCTS.length; if(PRODUCTS && PRODUCTS.length){ renderCarousel(); } });
  if(PRODUCTS && PRODUCTS.length){ renderCarousel(); }
}
function renderCarousel(){
  const p = PRODUCTS[SELECTED_INDEX]; const scr = document.querySelector('.mini-screen');
  if(!p || !scr) return; scr.style.backgroundImage = `url('${p.image}')`; scr.querySelector('.label').textContent = p.name;
}

function addToCart(code, qty=1){
  const product = PRODUCTS.find(p=>p.code===code); if(!product) return;
  const item = cart.get(code) || {product, qty:0}; item.qty += qty; cart.set(code,item);
  persistCart(); renderTotal(); renderCartScreen();
}
function changeQty(code, delta){
  const item = cart.get(code); if(!item) return; item.qty += delta;
  if(item.qty<=0){ cart.delete(code); const el=document.querySelector(`.tray-item[data-code="${code}"]`); el&&el.remove(); }
  else{ }
  persistCart(); renderTotal(); renderCartScreen();
}
function trayAddOrUpdate(code){
  const row = document.getElementById('tray-row');
  let el = row.querySelector(`[data-code="${code}"]`);
  const item = cart.get(code); if(!item) return;
  if(!el){
    el = document.createElement('div'); el.className='tray-item'; el.dataset.code=code; el.style.backgroundImage = `url('${item.product.image}')`;
    el.innerHTML = `<div class="badge">1</div><div class="mini-qty"><button class="minus">−</button><button class="plus">＋</button></div>`;
    el.querySelector('.minus').addEventListener('click', (ev)=>{ ev.stopPropagation(); changeQty(code,-1); });
    el.querySelector('.plus').addEventListener('click', (ev)=>{ ev.stopPropagation(); changeQty(code,1); });
    row.appendChild(el);
  }
  const badge = el.querySelector('.badge'); badge.textContent = item.qty; badge.style.display = item.qty>1 ? 'block' : 'none';
}
function setupCartTray(){ for(const [code] of cart) }
function renderTotal(){
  const el = document.getElementById('reader-total'); let t=0; for(const [, it] of cart){ t += it.product.price * it.qty; } if(el) el.textContent = '$'+t.toFixed(2);
  const payload = Array.from(cart.values()).map(x=>({code:x.product.code, name:x.product.name, series:x.product.series, price:x.product.price, qty:x.qty}));
  const totalEl = document.getElementById('order-total'); const itemsEl = document.getElementById('order-items');
  if(totalEl) totalEl.value = '$'+t.toFixed(2); if(itemsEl) itemsEl.value = JSON.stringify(payload, null, 2);
}
function persistCart(){ const obj = Array.from(cart.values()).map(x=>({code:x.product.code, qty:x.qty})); localStorage.setItem('luckybox_cart', JSON.stringify(obj)); }
function restoreCart(){ try{ const arr = JSON.parse(localStorage.getItem('luckybox_cart')||'[]'); arr.forEach(it=>{ const p=PRODUCTS.find(p=>p.code===it.code); if(p) cart.set(p.code,{product:p, qty:it.qty}); }); }catch(e){} }
function openDrawer(){ document.querySelector('.drawer').classList.add('open'); renderTotal(); renderCartScreen(); }
function closeDrawer(){ document.querySelector('.drawer').classList.remove('open'); }
function escapeHTML(str){ return String(str).replace(/[&<>"]/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s])); }


let CART_KEYS = []; // codes in cart
let CART_INDEX = 0;
function syncCartKeys(){ CART_KEYS = Array.from(cart.keys()); if(CART_INDEX>=CART_KEYS.length) CART_INDEX=Math.max(0,CART_KEYS.length-1); }

  const code=CART_KEYS[CART_INDEX]; const item=cart.get(code);
  disp.style.backgroundImage=`url('${item.product.image}')`; lab.textContent=item.product.name; qtyEl.textContent=item.qty;
}

function buildCartCarousel(){
  const disp = document.querySelector('.cart-display');
  const prev = disp.querySelector('.prev');
  const next = disp.querySelector('.next');
  const plus = disp.querySelector('.plus');
  const minus = disp.querySelector('.minus');
  prev.addEventListener('click', ()=>{ if(CART_KEYS.length){ CART_INDEX=(CART_INDEX-1+CART_KEYS.length)%CART_KEYS.length; renderCartScreen(); } });
  next.addEventListener('click', ()=>{ if(CART_KEYS.length){ CART_INDEX=(CART_INDEX+1)%CART_KEYS.length; renderCartScreen(); } });
  plus.addEventListener('click', ()=>{ const code=CART_KEYS[CART_INDEX]; if(code) changeQty(code,+1); });
  minus.addEventListener('click', ()=>{ const code=CART_KEYS[CART_INDEX]; if(code) changeQty(code,-1); });
  renderCartScreen();
}

function renderCartScreen(){
  syncCartKeys();
  const disp=document.querySelector('.cart-display');
  const qtyEl=disp.querySelector('.cqty');
  const lab=disp.querySelector('.label');
  if(CART_KEYS.length===0){
    disp.style.backgroundImage='none';
    lab.textContent='Cart is empty';
    qtyEl.textContent='0';
    return;
  }
  const code=CART_KEYS[CART_INDEX];
  const item=cart.get(code);
  disp.style.backgroundImage=`url('${item.product.image}')`;
  lab.textContent=item.product.name;
  qtyEl.textContent=item.qty;
}
