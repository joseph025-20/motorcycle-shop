// script.js — DOM-ready version with robust handlers
// storage keys (shared across pages)
const STORAGE_PRODUCTS_KEY = 'moto_products';
const STORAGE_CART_KEY = 'moto_cart';

// seed products (only used if none in storage)
const seed = [
  { id: 1, name: "Brake Pads - Performance", sku: "BP-1001", price: 1500, stock: 120, category: "brakes", image: "https://via.placeholder.com/600x400?text=Brake+Pads", description: "High quality front brake pads.", createdAt: new Date().toISOString() },
  { id: 2, name: "Full-Face Helmet", sku: "HL-221", price: 3500, stock: 50, category: "safety", image: "https://via.placeholder.com/600x400?text=Helmet", description: "Certified full-face helmet for maximum protection.", createdAt: new Date().toISOString() },
  { id: 3, name: "Chain & Sprocket Kit", sku: "CK-520", price: 2200, stock: 8, category: "engine", image: "https://via.placeholder.com/600x400?text=Chain+Kit", description: "Durable kit for medium bikes.", createdAt: new Date().toISOString() },
  { id: 4, name: "Engine Oil 1L", sku: "EO-1L", price: 900, stock: 80, category: "engine", image: "https://via.placeholder.com/600x400?text=Engine+Oil", description: "Synthetic blend oil, 1 litre.", createdAt: new Date().toISOString() },
  { id: 5, name: "Riding Gloves", sku: "GL-11", price: 1200, stock: 15, category: "safety", image: "https://via.placeholder.com/600x400?text=Gloves", description: "Comfortable gloves with knuckle protection.", createdAt: new Date().toISOString() },
  { id: 6, name: "Side Mirrors (Pair)", sku: "SM-33", price: 1800, stock: 3, category: "accessories", image: "https://via.placeholder.com/600x400?text=Mirrors", description: "Adjustable pair of mirrors.", createdAt: new Date().toISOString() }
];

// helper: load products from localStorage (seed if empty)
function loadProductsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(seed));
      return [...seed];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading products from storage', e);
    return [];
  }
}

// Cart helpers
function getCart() { try { return JSON.parse(localStorage.getItem(STORAGE_CART_KEY) || '[]'); } catch(e) { return []; } }
function saveCart(cart) { localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart)); updateCartCount(); }

// Utility
function formatPrice(n) { return 'KES ' + Number(n).toLocaleString(); }
function isLowStock(s) { return s > 0 && s <= 10; }
function isNewProduct(p) { if(!p.createdAt) return false; const days = (Date.now() - new Date(p.createdAt).getTime())/(1000*60*60*24); return days <= 30; }

// App state (will be initialized on DOMContentLoaded)
let products = [];
let pageSize = 9;
let currentPage = 1;
let currentFilterCat = 'all';
let currentQuery = '';
let currentSort = 'featured';

// DOM elements (declared here, assigned inside init)
let productListEl, searchBar, autocompleteEl, sortSelect, resultCountEl, paginationEl, newsletterEmail, subscribeBtn, featuredCats;

// Initialize after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // load products
  products = loadProductsFromStorage();

  // assign DOM nodes
  productListEl = document.getElementById('product-list');
  searchBar = document.getElementById('searchBar');
  autocompleteEl = document.getElementById('autocomplete');
  sortSelect = document.getElementById('sortSelect');
  resultCountEl = document.getElementById('resultCount');
  paginationEl = document.getElementById('pagination');
  newsletterEmail = document.getElementById('newsletterEmail');
  subscribeBtn = document.getElementById('subscribeBtn');
  featuredCats = document.querySelectorAll('.featured .cat');

  // wire up interactive controls (safe checks)
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => { currentSort = e.target.value; renderProducts(1); });
  }

  // top-nav category links (use delegation fallback)
  document.querySelectorAll('.top-nav a[data-cat]').forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const cat = a.getAttribute('data-cat') || 'all';
      currentFilterCat = cat;
      // set active class
      document.querySelectorAll('.top-nav a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      renderProducts(1);
      window.scrollTo({ top: 360, behavior: 'smooth' });
    });
  });

  // featured category tiles
  featuredCats.forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.getAttribute('data-cat');
      if (cat) {
        currentFilterCat = cat;
        document.querySelectorAll('.top-nav a').forEach(x => x.classList.remove('active'));
        const link = document.querySelector(`.top-nav a[data-cat="${cat}"]`);
        if (link) link.classList.add('active');
        renderProducts(1);
        window.scrollTo({ top: 360, behavior: 'smooth' });
      }
    });
  });

  // search input + autocomplete
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      currentQuery = e.target.value.trim();
      showAutocomplete(currentQuery);
      renderProducts(1);
    });
    searchBar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && autocompleteEl) autocompleteEl.classList.add('hidden');
    });
  }

  // newsletter subscribe
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => {
      const email = (newsletterEmail?.value || '').trim();
      if (!email || !email.includes('@')) return alert('Please enter a valid email');
      alert('Subscribed: ' + email);
      if (newsletterEmail) newsletterEmail.value = '';
    });
  }

  // shop now button (scroll to products)
  const shopNowBtn = document.getElementById('shopNow');
  if (shopNowBtn) shopNowBtn.addEventListener('click', () => window.scrollTo({ top: 520, behavior: 'smooth' }));

  // modal close (delegated as modal may not exist yet)
  const modalClose = document.getElementById('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeQuickView);

  // Delegated click handler for dynamic buttons inside product list
  document.addEventListener('click', (e) => {
    // Add to cart (grid or modal)
    const addBtn = e.target.closest('.btn-add') || (e.target.matches('button[data-add]') && e.target);
    if (addBtn) {
      const id = Number(addBtn.dataset.id || addBtn.getAttribute('data-id'));
      if (!isNaN(id)) addToCart(id, 1);
      return;
    }

    // Quick view
    const quickBtn = e.target.closest('.btn-quick');
    if (quickBtn) {
      const id = Number(quickBtn.dataset.id);
      openQuickView(id);
      return;
    }

    // Pagination buttons
    if (e.target.closest('.pagination button')) {
      const btn = e.target.closest('.pagination button');
      const page = Number(btn.textContent);
      if (!isNaN(page)) renderProducts(page);
      return;
    }

    // Autocomplete click
    if (e.target.closest('#autocomplete .item')) {
      const item = e.target.closest('.item');
      const id = item.dataset.id;
      if (id) location.href = `product.html?id=${id}`;
      return;
    }

    // close autocomplete if clicked outside
    if (autocompleteEl && !searchBar.contains(e.target) && !autocompleteEl.contains(e.target)) {
      autocompleteEl.classList.add('hidden');
    }

    // close quick view when clicking outside modal content
    if (e.target.id === 'quickView') closeQuickView();
  });

  // initial render
  renderProducts(1);

  // dynamic refresh if products updated elsewhere (add-product page)
  setInterval(() => {
    const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
    try {
      const fresh = raw ? JSON.parse(raw) : [];
      if (fresh.length !== products.length) {
        products = fresh;
        renderProducts(currentPage);
        updateCartCount();
      }
    } catch (err) { /* ignore parse errors */ }
  }, 1400);

  // update header cart count
  updateCartCount();
});

// ---------- render functions ----------
function getFilteredSortedProducts() {
  let list = [...products];
  if (currentFilterCat && currentFilterCat !== 'all') list = list.filter(p => p.category === currentFilterCat);
  if (currentQuery) {
    const q = currentQuery.toLowerCase();
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }
  switch (currentSort) {
    case 'newest': list.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)); break;
    case 'price-asc': list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'name': list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
    default: break;
  }
  return list;
}

function renderProducts(page = 1) {
  if (!productListEl) return;
  const list = getFilteredSortedProducts();
  resultCountEl && (resultCountEl.textContent = `${list.length} parts`);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  productListEl.innerHTML = '';
  pageItems.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product';
    const badgeHTML = isNewProduct(p) ? `<div class="badge">NEW</div>` : (isLowStock(p.stock) ? `<div class="badge low">Low</div>` : '');
    card.innerHTML = `
      ${badgeHTML}
      <img src="${p.image || 'https://via.placeholder.com/600x400?text=No+Image'}" alt="${p.name}">
      <h3>${p.name}</h3>
      <div class="meta">SKU: ${p.sku || ''} • ${p.category}</div>
      <div class="price">${formatPrice(p.price)}</div>
      <div class="actions">
        <button class="btn-quick" data-id="${p.id}">Quick view</button>
        <button class="btn-add" data-id="${p.id}">Add to cart</button>
        <a class="btn-details" href="product.html?id=${p.id}">Details</a>
      </div>
    `;
    productListEl.appendChild(card);
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if (!paginationEl) return;
  paginationEl.innerHTML = '';
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active');
    paginationEl.appendChild(btn);
  }
}

// ---------- autocomplete ----------
function showAutocomplete(q) {
  if (!autocompleteEl) return;
  if (!q) { autocompleteEl.classList.add('hidden'); return; }
  const matches = products.filter(p => (p.name || '').toLowerCase().includes(q.toLowerCase()) || (p.sku || '').toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  if (!matches.length) { autocompleteEl.classList.add('hidden'); return; }
  autocompleteEl.innerHTML = matches.map(m => `<div class="item" data-id="${m.id}"><strong>${m.name}</strong> — ${m.sku || ''}</div>`).join('');
  autocompleteEl.classList.remove('hidden');
}

// ---------- quick view modal ----------
function openQuickView(id) {
  const quickModal = document.getElementById('quickView');
  const modalBody = document.getElementById('modalBody');
  if (!quickModal || !modalBody) return;
  const p = products.find(x => Number(x.id) === Number(id));
  if (!p) return;
  modalBody.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:260px">
        <img src="${p.image}" alt="${p.name}" style="width:100%;border-radius:8px;object-fit:cover">
      </div>
      <div style="flex:1;min-width:240px">
        <h2 style="margin-top:0">${p.name}</h2>
        <div class="meta">SKU: ${p.sku || ''} • Category: ${p.category}</div>
        <div style="margin:10px 0" class="price">${formatPrice(p.price)}</div>
        <p style="color:#444">${p.description || ''}</p>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <label>Qty <input id="qQty" type="number" value="1" min="1" style="width:80px;padding:6px;border:1px solid #eee;border-radius:6px"></label>
          <button id="qAdd" style="background:var(--accent);color:#fff;padding:8px 12px;border-radius:8px;border:none;cursor:pointer">Add to cart</button>
          <a href="product.html?id=${p.id}" style="padding:8px 10px;border-radius:8px;border:1px solid #eee;text-decoration:none;color:#111">Open details</a>
        </div>
      </div>
    </div>
  `;
  quickModal.classList.remove('hidden');
  quickModal.setAttribute('aria-hidden', 'false');

  // attach add handler
  const qAdd = document.getElementById('qAdd');
  if (qAdd) qAdd.addEventListener('click', () => {
    const qty = parseInt(document.getElementById('qQty').value) || 1;
    addToCart(p.id, qty);
    closeQuickView();
  }, { once: true });
}

function closeQuickView() {
  const quickModal = document.getElementById('quickView');
  const modalBody = document.getElementById('modalBody');
  if (!quickModal || !modalBody) return;
  quickModal.classList.add('hidden');
  quickModal.setAttribute('aria-hidden', 'true');
  modalBody.innerHTML = '';
}

// ---------- cart behavior ----------
function addToCart(id, qty = 1) {
  const prod = products.find(p => Number(p.id) === Number(id));
  if (!prod) { alert('Product not found'); return; }
  const cart = getCart();
  const existing = cart.find(x => Number(x.id) === Number(id));
  if (existing) existing.qty = (existing.qty || 0) + qty;
  else cart.push({ id: prod.id, name: prod.name, price: prod.price, qty });
  saveCart(cart);
  const oldTitle = document.title;
  document.title = `✓ ${prod.name} added`;
  setTimeout(() => document.title = oldTitle, 900);
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (!el) return;
  const cnt = getCart().reduce((s, i) => s + (i.qty || 0), 0);
  el.textContent = cnt;
}
