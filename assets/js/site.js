/* Vreymar Hardware, storefront shell: navbar, footer, toast, product card */
(function () {
  'use strict';
  const { Auth, Cart, Catalog, CAT_COLORS, RULES, esc, peso } = VH;
  const page = document.body.dataset.page || '';

  /* one line-icon family: round caps, stroke width set in CSS from the text weight (--stroke) */
  const ICON = {
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cart: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2.1 11.2a1.8 1.8 0 0 0 1.8 1.5h8.7a1.8 1.8 0 0 0 1.8-1.4L21 8H6"/><circle cx="9.5" cy="20.5" r="1"/><circle cx="17.5" cy="20.5" r="1"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>',
    sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>'
  };
  /* theme toggle: the two icons cross-fade with a blur instead of snapping */
  const themeBtn = () => `<button class="theme-btn" type="button" data-theme-toggle aria-label="${document.documentElement.dataset.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}"><span class="ic-swap ic-moon">${ICON.moon}</span><span class="ic-swap ic-sun">${ICON.sun}</span></button>`;
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('vh-theme', t); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(b => b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'));
  }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-theme-toggle]')) setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); });

  const LINKS = [
    ['home', 'home.html', 'Home'],
    ['materials', 'materials.html', 'Materials'],
    ['estimate', 'estimate.html', 'Estimate AI'],
    ['cart', 'cart.html', 'My Cart'],
    ['about', 'about.html', 'About Us']
  ];

  function renderNav() {
    const user = Auth.current();
    const links = LINKS.map(([k, href, label]) => `<a class="nav-link${page === k ? ' active' : ''}" href="${href}">${label}</a>`).join('');
    const userHtml = user ? `
      <div class="nav-user" id="nav-user" tabindex="0" role="button" aria-haspopup="true">
        <div class="avatar">${esc(Auth.initials(user))}</div>
        <span class="nav-user-name">${esc(user.first)}</span>
        <div class="user-menu" id="user-menu">
          <div class="um-head"><strong>${esc(Auth.fullName(user))}</strong><span>${esc(VH.ROLES[user.role])} · ${esc(user.email)}</span></div>
          ${Auth.isStaff(user) ? '<a href="admin/index.html">Staff portal</a>' : ''}
          <a href="account.html">My account</a>
          <a href="account.html#orders">My orders</a>
          <a href="account.html#replacements">Replacements</a>
          <button class="danger" id="nav-logout">Sign out</button>
        </div>
      </div>` : `<a class="btn-signin" href="login.html">Sign In</a>`;

    const nav = document.createElement('nav');
    nav.className = 'nav';
    nav.innerHTML = `
      <a class="nav-logo" href="home.html" aria-label="Vreymar Hardware home">
        <div class="nav-logo-mark" aria-hidden="true">V</div>
        <div class="nav-logo-text">Vreymar<small>Hardware</small></div>
      </a>
      <div class="nav-links">${links}</div>
      <form class="nav-search" action="materials.html" role="search">
        ${ICON.search}<input type="search" name="q" placeholder="Search materials…" aria-label="Search materials" value="${esc(new URLSearchParams(location.search).get('q') || '')}"/>
      </form>
      ${themeBtn()}
      <a class="nav-icon-btn" href="cart.html" aria-label="Cart">${ICON.cart}<span class="cart-count" id="cart-badge">0</span></a>
      ${userHtml}
      <button class="nav-burger" id="nav-burger" aria-label="Open menu">${ICON.menu}</button>`;
    document.body.prepend(nav);

    const drawer = document.createElement('div');
    drawer.className = 'nav-drawer'; drawer.id = 'nav-drawer';
    drawer.innerHTML = LINKS.map(([k, href, label]) => `<a class="${page === k ? 'active' : ''}" href="${href}">${label}</a>`).join('') +
      (user ? `<a href="account.html">My Account</a>${Auth.isStaff(user) ? '<a href="admin/index.html">Staff Portal</a>' : ''}<a href="#" id="drawer-logout" style="color:var(--danger)">Sign Out</a>` : '<a href="login.html">Sign In / Create Account</a>');
    nav.after(drawer);

    document.getElementById('nav-burger').onclick = () => drawer.classList.toggle('open');
    const nu = document.getElementById('nav-user');
    if (nu) {
      nu.addEventListener('click', e => { if (!e.target.closest('.user-menu')) document.getElementById('user-menu').classList.toggle('open'); });
      document.addEventListener('click', e => { if (!e.target.closest('#nav-user')) document.getElementById('user-menu').classList.remove('open'); });
    }
    const out = () => { Auth.logout(); location.href = 'login.html'; };
    const lo = document.getElementById('nav-logout'); if (lo) lo.onclick = out;
    const dl = document.getElementById('drawer-logout'); if (dl) dl.onclick = e => { e.preventDefault(); out(); };
    syncBadge();
  }

  function syncBadge(bump) {
    const b = document.getElementById('cart-badge'); if (!b) return;
    b.textContent = Cart.count();
    if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
  document.addEventListener('vh:cart', () => syncBadge(true));
  window.addEventListener('storage', e => { if (e.key === VH.K.cart) syncBadge(); });

  function renderFooter() {
    const S = RULES.STORE;
    const f = document.createElement('footer');
    f.className = 'footer';
    f.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <h4>Vreymar Hardware</h4><p class="f-desc">Construction, electrical, and plumbing supplies for homeowners and contractors in Bagumbong, Caloocan City, serving the community for over 30 years.</p>
          </div>
          <div><h4>Shop</h4><ul class="f-links">
            <li><a href="materials.html">All Materials</a></li>
            <li><a href="materials.html?cat=9">Masonry & Steel</a></li>
            <li><a href="materials.html?cat=4">Electrical</a></li>
            <li><a href="materials.html?cat=5">Plumbing</a></li>
            <li><a href="estimate.html">Estimate AI</a></li></ul></div>
          <div><h4>Account</h4><ul class="f-links">
            <li><a href="account.html">My Account</a></li>
            <li><a href="account.html#orders">Track Orders</a></li>
            <li><a href="account.html#replacements">Returns & Replacements</a></li>
            <li><a href="about.html#policy">Return Policy</a></li>
            <li><a href="about.html#terms">Terms & Conditions</a></li></ul></div>
          <div><h4>Visit Us</h4><div class="f-contact">
            <div>${esc(S.address)}</div>
            <div><strong>${esc(S.phone)}</strong> · ${esc(S.mobile)}</div>
            <div>${esc(S.email)}</div>
            <div>${esc(S.hours)}</div></div></div>
        </div>
        <div class="f-name" aria-hidden="true">Vreymar<span>.</span></div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Vreymar Hardware. All rights reserved.</span>
          <span><a href="about.html#terms">Terms</a> · <a href="about.html#policy">Return Policy</a> · <a href="admin/index.html">Staff Portal</a></span>
        </div>
      </div>`;
    document.body.appendChild(f);
  }

  /* toast */
  function toast(msg, type) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : ''); t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2800);
  }

  /* modal helpers */
  function openModal(id) { const m = document.getElementById(id); m.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const m = document.getElementById(id); m.classList.remove('open'); if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = ''; }
  document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal-overlay') && !e.target.dataset.static) closeModal(e.target.id);
    const x = e.target.closest && e.target.closest('[data-close]'); if (x) closeModal(x.dataset.close);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = [...document.querySelectorAll('.modal-overlay.open')].pop(); if (m && !m.dataset.static) closeModal(m.id); } });

  /* product visuals: specimen tiles take the colour of the material */
  const TILES = { 1: 'steel', 2: 'pvc', 3: 'copper', 4: 'safety', 5: 'pvc', 6: 'moss', 7: 'safety', 8: 'lumber', 9: 'concrete', 10: 'clay', 11: 'steel', 12: 'lumber' };
  const tileOf = catId => TILES[catId] || 'concrete';
  /* photo slots: set p.img in the catalog, or map a SKU in assets/js/photos.js */
  const photoOf = p => p.img || (window.VH_PHOTOS && (VH_PHOTOS[p.sku] || VH_PHOTOS['cat-' + p.catId])) || '';
  function tint(p) { const c = CAT_COLORS[Catalog.category(p.catId).color] || '#6B7280'; return `background:linear-gradient(135deg,${c}22,${c}08)`; }
  /* one icon family (24px grid, 2px stroke, square caps) */
  const ico = d => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
  const ICONS = { plus: ico('<path d="M12 5v14M5 12h14"/>'), check: ico('<path d="M5 12.5l4.5 4.5L19 7.5"/>') };

  /* A card shows what a buyer decides on: the item, its price, and stock only when it matters.
     No invented ratings or "best seller" tags; a sale shows as the struck-through old price. */
  function productCard(p) {
    const cat = Catalog.category(p.catId);
    const st = Catalog.stockStatus(p);
    const inCart = Cart.items().some(c => c.id === p.id);
    const ph = photoOf(p); const img = ph ? `<img src="${esc(ph)}" alt="" loading="lazy" onerror="this.remove()"/>` : '';
    const stock = st.key === 'out' ? 'Out of stock' : st.key === 'low' ? 'Only ' + p.stock + ' ' + esc(p.unit) + ' left' : '';
    return `<article class="p-card${st.key === 'out' ? ' is-out' : ''}" data-id="${p.id}" tabindex="0">
      <div class="p-img" data-tile="${tileOf(p.catId)}">${img}${window.Art ? Art.cat(p.catId) : ''}</div>
      <div class="p-body">
        <div class="p-cat">${esc(cat.name)}</div>
        <div class="p-name">${esc(p.name)}</div>
        <div class="p-sku">${esc(p.brand || '')}</div>
        <div class="p-bottom">
          <div><div class="p-price">${peso(p.price)} <small>/${esc(p.unit)}</small></div>${p.orig ? `<span class="p-orig">Was ${peso(p.orig)}</span>` : ''}</div>
          <button class="p-add${inCart ? ' added' : ''}" data-add="${p.id}" ${st.key === 'out' ? 'disabled' : ''} aria-label="${inCart ? 'Add another' : 'Add'} ${esc(p.name)} to cart">${inCart ? ICONS.check : ICONS.plus}</button>
        </div>
        ${stock ? `<div class="p-stock ${st.key}">${stock}</div>` : ''}
      </div>
    </article>`;
  }
  function addToCart(id, qty) {
    const r = Cart.add(id, qty || 1);
    if (!r.ok) return toast(r.msg, 'danger'), r;
    toast(r.capped ? `Only ${r.product.stock} ${r.product.unit} available. Cart updated.` : `${r.product.name} added to cart`, r.capped ? 'warn' : 'success');
    return r;
  }
  /* re-render-safe pop on the button that was pressed */
  function popAdded(id) {
    requestAnimationFrame(() => document.querySelectorAll(`[data-add="${id}"]`).forEach(b => { b.classList.remove('just-added'); void b.offsetWidth; b.classList.add('just-added'); }));
  }
  /* brief loading state on a committing button, then run the action */
  function busy(btn, fn, ms) {
    if (!btn || btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    setTimeout(() => { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); fn(); }, ms || 450);
  }
  /* highlight a value that just changed */
  function flash(el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function stars() { return ''; }

  /* rows that scroll sideways fade out at whichever edge has more */
  function fadeRow(el) {
    if (!el || el.dataset.fade) return; el.dataset.fade = '1'; el.classList.add('fade-x');
    const upd = () => { const max = el.scrollWidth - el.clientWidth - 2; el.classList.toggle('mid', el.scrollLeft > 2); el.classList.toggle('at-end', el.scrollLeft >= max); };
    el.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  }

  /* scroll reveal */
  function reveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('visible'));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: .08, rootMargin: '0px 0px -30px 0px' });
    els.forEach(e => io.observe(e));
  }

  document.documentElement.classList.add('js');
  if (!document.body.hasAttribute('data-nonav')) renderNav();
  if (!document.body.hasAttribute('data-nofooter')) renderFooter();
  document.addEventListener('DOMContentLoaded', reveal);

  window.UI = { toast, openModal, closeModal, productCard, addToCart, popAdded, busy, flash, stars, tint, syncBadge, ICONS, tileOf, photoOf, fadeRow, setTheme, ICON };
})();
