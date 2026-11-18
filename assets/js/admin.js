/* Vreymar Hardware, staff portal shell (role-based sidebar, guard, helpers) */
(function () {
  'use strict';
  const { Auth, Orders, Replacements, Catalog, ACCESS, ROLES, esc } = VH;

  const I = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    dash: I('<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"/>'),
    pos: I('<path d="M3 4h18v12H3zM8 20h8M12 16v4"/>'),
    orders: I('<path d="M1 6h13v10H1zM14 10h4l4 3v3h-8M5 19a2 2 0 1 0 0-.1M18 19a2 2 0 1 0 0-.1"/>'),
    inv: I('<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>'),
    rep: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    users: I('<path d="M9 11a4 4 0 1 0 0-.1M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0 0-.1M22 20c0-3-2-5-5-5"/>'),
    store: I('<path d="M3 9l2-5h14l2 5M3 9h18v11H3zM9 20v-6h6v6"/>')
  };
  const MODULES = [
    { sec: 'Overview' },
    { key: 'dashboard', href: 'index.html', icon: IC.dash, label: 'Dashboard' },
    { sec: 'Operations' },
    { key: 'pos', href: 'pos.html', icon: IC.pos, label: 'Point of sale' },
    { key: 'orders', href: 'orders.html', icon: IC.orders, label: 'Orders & deliveries', badge: () => Orders.all().filter(o => o.status === 'pending').length + Replacements.all().filter(r => r.status === 'pending').length },
    { sec: 'Inventory' },
    { key: 'inventory', href: 'inventory.html', icon: IC.inv, label: 'Products & stock', badge: () => Catalog.products().filter(p => p.stock <= p.threshold).length },
    { sec: 'Analytics' },
    { key: 'reports', href: 'reports.html', icon: IC.rep, label: 'Reports' },
    { sec: 'Administration' },
    { key: 'users', href: 'users.html', icon: IC.users, label: 'Manage users' }
  ];

  function toast(msg, type) {
    let w = document.querySelector('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'toast' + (type ? ' ' + type : ''); t.textContent = msg; w.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }
  document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
    const c = e.target.closest && e.target.closest('[data-close]'); if (c) closeModal(c.dataset.close);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = [...document.querySelectorAll('.modal-overlay.open')].pop(); if (m) m.classList.remove('open'); } });

  /* Confirm dialog that returns a Promise<boolean> */
  function confirmDlg(title, msg, okLabel, danger) {
    return new Promise(res => {
      let m = document.getElementById('confirm-dlg');
      if (!m) {
        m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'confirm-dlg';
        m.innerHTML = `<div class="modal" style="width:400px"><div class="modal-body" style="text-align:center;padding:28px">
          <div style="font-size:34px;margin-bottom:8px" id="cf-ic"></div><div class="modal-title" id="cf-t"></div>
          <p class="muted" style="font-size:13.5px;margin:8px 0 20px;line-height:1.55" id="cf-m"></p>
          <div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-ghost" id="cf-no">Cancel</button><button class="btn" id="cf-ok"></button></div></div></div>`;
        document.body.appendChild(m);
      }
      m.querySelector('#cf-ic').textContent = danger ? '⚠️' : '❓';
      m.querySelector('#cf-t').textContent = title; m.querySelector('#cf-m').textContent = msg;
      const ok = m.querySelector('#cf-ok'); ok.textContent = okLabel || 'Confirm'; ok.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
      const done = v => { m.classList.remove('open'); res(v); };
      ok.onclick = () => done(true); m.querySelector('#cf-no').onclick = () => done(false);
      m.classList.add('open'); ok.focus();
    });
  }

  function init(moduleKey, title) {
    const user = Auth.current();
    const page = location.pathname.split('/').pop() || 'index.html';
    if (!user) { location.replace('../login.html?next=' + encodeURIComponent('admin/' + page)); return null; }
    if (!Auth.isStaff(user)) {
      document.body.innerHTML = `<div class="noaccess"><h2>Staff only</h2><p class="muted">The staff portal is for Vreymar employees. You're signed in as a customer.</p><div style="margin-top:18px;display:flex;gap:10px;justify-content:center"><a class="btn btn-primary" href="../home.html">Go to store</a><a class="btn btn-ghost" href="../login.html" onclick="VH.Auth.logout()">Switch account</a></div></div>`;
      return null;
    }
    const allowed = ACCESS[user.role] || [];

    // sidebar
    let nav = '', pendingSec = null;
    MODULES.forEach(m => {
      if (m.sec) { pendingSec = m.sec; return; }
      if (!allowed.includes(m.key)) return;
      if (pendingSec) { nav += `<div class="sb-sec">${pendingSec}</div>`; pendingSec = null; }
      const b = m.badge ? m.badge() : 0;
      nav += `<a class="sb-item${m.key === moduleKey ? ' on' : ''}" href="${m.href}"><span class="ni">${m.icon}</span>${m.label}${b ? `<span class="sb-badge">${b}</span>` : ''}</a>`;
    });
    const sb = document.createElement('nav'); sb.id = 'sidebar';
    sb.innerHTML = `<a class="sb-logo" href="index.html"><div class="sb-mark" aria-hidden="true">V</div><div><div class="sb-name">Vreymar</div><div class="sb-sub">Staff portal</div></div></a>
      <div class="sb-nav">${nav}<div class="sb-sec">Storefront</div><a class="sb-item" href="../home.html" target="_blank" rel="noopener"><span class="ni">${IC.store}</span>View online store</a></div>
      <div class="sb-foot"><span>v1.0</span><span id="sb-clock"></span></div>`;
    document.body.prepend(sb);

    const tb = document.createElement('header'); tb.id = 'topbar';
    tb.innerHTML = `<div class="tb-left"><button class="burger" id="burger" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><span class="page-title">${esc(title)}</span></div>
      <div class="tb-right"><span id="tb-extra" style="display:flex;gap:8px"></span><span class="chip">Main store · Bagumbong</span><button class="theme-btn" type="button" data-theme-toggle aria-label="Switch colour theme"><span class="ic-swap ic-moon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg></span><span class="ic-swap ic-sun"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg></span></button>
        <div class="tb-user" id="tb-user" tabindex="0"><div class="avatar">${esc(Auth.initials(user))}</div><div><div class="tb-uname">${esc(Auth.fullName(user))}</div><div class="tb-urole">${ROLES[user.role]}</div></div>
          <div class="tb-menu" id="tb-menu"><a href="../account.html#profile">My profile</a><a href="../home.html">Online store</a><button id="tb-logout" style="color:var(--danger)">Sign out</button></div></div></div>`;
    sb.after(tb);

    document.getElementById('burger').onclick = () => document.body.classList.toggle('sb-open');
    document.addEventListener('click', e => {
      if (document.body.classList.contains('sb-open') && !e.target.closest('#sidebar') && !e.target.closest('#burger')) document.body.classList.remove('sb-open');
      if (!e.target.closest('#tb-user')) document.getElementById('tb-menu').classList.remove('open');
    });
    document.getElementById('tb-user').onclick = e => { if (!e.target.closest('.tb-menu')) document.getElementById('tb-menu').classList.toggle('open'); };
    document.getElementById('tb-logout').onclick = () => { Auth.logout(); location.href = '../login.html'; };
    const clock = () => { const el = document.getElementById('sb-clock'); if (el) el.textContent = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }); };
    clock(); setInterval(clock, 15000);

    if (moduleKey && !allowed.includes(moduleKey)) {
      document.getElementById('main').innerHTML = `<div class="noaccess"><h2>No access</h2><p class="muted">Your role (${ROLES[user.role]}) can't open this module. Ask an Admin if you need access.</p><a class="btn btn-primary" href="index.html" style="margin-top:16px">Back to dashboard</a></div>`;
      return null;
    }
    return user;
  }

  function topChips(html) { const el = document.getElementById('tb-extra'); if (el) el.innerHTML = html; }

  /* theme: light or dark, remembered per device; the toggle icons blur across */
  function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('vh-theme', t); } catch (e) {} }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-theme-toggle]')) setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); });
  /* rows that scroll sideways fade out at whichever edge still has more */
  function fadeRow(el) {
    if (!el || el.dataset.fade) return; el.dataset.fade = '1'; el.classList.add('fade-x');
    const upd = () => { const max = el.scrollWidth - el.clientWidth - 2; el.classList.toggle('mid', el.scrollLeft > 2); el.classList.toggle('at-end', el.scrollLeft >= max); };
    el.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  }
  /* each category sits on the colour of its material (same map as the storefront) */
  const TILES = { 1: 'steel', 2: 'pvc', 3: 'copper', 4: 'safety', 5: 'pvc', 6: 'moss', 7: 'safety', 8: 'lumber', 9: 'concrete', 10: 'clay', 11: 'steel', 12: 'lumber' };
  const tileOf = id => TILES[id] || 'concrete';
  window.Admin = { init, toast, openModal, closeModal, confirm: confirmDlg, topChips, setTheme, fadeRow, tileOf };
})();
