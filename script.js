(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Theme */
  var themeBtn = $('#theme');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function syncThemeLabel() { if (themeBtn) themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme'); }
  syncThemeLabel();
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeLabel();
  });

  /* Mobile menu */
  var menuBtn = $('#menu-btn'), mobileNav = $('#mobile-nav');
  function setMenu(open) {
    if (!menuBtn || !mobileNav) return;
    mobileNav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(!mobileNav.classList.contains('open')); });
  $$('#mobile-nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Header state + back to top */
  var header = $('#site'), toTop = $('#to-top');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (toTop) toTop.classList.toggle('show', y > 900);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* Active section in the nav */
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && byId[en.target.id]) {
          navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
          byId[en.target.id].setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* Reveal on scroll */
  var reveals = $$('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* Toast */
  var toast = $('#toast'), toastTimer;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  /* Copy email */
  var copyBtn = $('#copy-email'), email = $('#email');
  if (copyBtn && email) copyBtn.addEventListener('click', function () {
    var text = email.textContent.trim();
    var done = function () { copyBtn.querySelector('span').textContent = 'Copied'; say('Email address copied'); setTimeout(function () { copyBtn.querySelector('span').textContent = 'Copy'; }, 2000); };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents(email);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      say('Press ⌘C or Ctrl+C to copy');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  /* Project filters and ordering */
  var grid = $('#project-grid'), empty = $('#empty');
  var cards = $$('.proj', grid);
  cards.forEach(function (c, i) { c.dataset.order = i; });
  var currentFilter = 'all';
  function applyFilter() {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = currentFilter === 'all' || (c.dataset.cat || '').split(' ').indexOf(currentFilter) > -1;
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  }
  $$('.filter').forEach(function (b) {
    b.addEventListener('click', function () {
      currentFilter = b.dataset.filter;
      $$('.filter').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      applyFilter();
    });
  });
  function applySort(mode) {
    var sorted = cards.slice().sort(function (a, b) {
      if (mode === 'recent') return (Number(b.dataset.ts) || 0) - (Number(a.dataset.ts) || 0);
      return a.dataset.order - b.dataset.order;
    });
    sorted.forEach(function (c) {
      c.classList.toggle('feature', mode === 'featured' && c.dataset.featured === '1');
      grid.insertBefore(c, empty);
    });
  }
  cards.forEach(function (c) { if (c.classList.contains('feature')) c.dataset.featured = '1'; });
  $$('.seg').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.disabled) return;
      $$('.seg').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      applySort(b.dataset.sort);
    });
  });

  /* Live GitHub data (written to data/github.json by a scheduled GitHub Action; no browser calls to GitHub) */
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!isFinite(s)) return '';
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    var d = Math.round(s / 86400);
    if (d < 31) return d + 'd ago';
    var m = Math.round(d / 30.4);
    return m < 12 ? m + 'mo ago' : Math.round(m / 12) + 'y ago';
  }
  function activityDate(r) { return (r.last_commit && r.last_commit.date) || r.pushed_at; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function renderGitHub(data) {
    var repos = (data && data.repos) || [];
    if (!repos.length) return;
    var byName = {};
    repos.forEach(function (r) { byName[r.name] = r; });

    // project cards
    cards.forEach(function (c) {
      var mine = (c.dataset.repo || '').split(' ').map(function (n) { return byName[n]; }).filter(Boolean);
      if (!mine.length) return;
      mine.sort(function (a, b) { return new Date(activityDate(b)) - new Date(activityDate(a)); });
      var top = mine[0], when = activityDate(top);
      c.dataset.ts = new Date(when).getTime();
      var u = $('[data-updated]', c);
      if (u) {
        u.textContent = 'updated ' + ago(when);
        u.title = new Date(when).toLocaleString();
        u.classList.toggle('fresh', Date.now() - new Date(when) < 7 * 86400000);
      }
      var l = $('[data-latest]', c);
      if (l && top.last_commit && top.last_commit.message) {
        l.textContent = '';
        var span = el('span', null, (mine.length > 1 ? top.name + ': ' : '') + top.last_commit.message);
        l.appendChild(span);
        l.hidden = false;
      }
    });
    var recentBtn = $('.seg[data-sort="recent"]');
    if (recentBtn) { recentBtn.disabled = false; recentBtn.removeAttribute('title'); }

    // repo count + "last active"
    var count = $('[data-gh="repoCount"]');
    if (count) count.textContent = String(repos.length);
    var last = $('[data-gh="lastActive"]');
    if (last) last.textContent = 'last update ' + ago(activityDate(repos[0]));

    // activity feed
    var feed = $('#feed');
    if (feed) {
      feed.textContent = '';
      repos.slice(0, 8).forEach(function (r) {
        var li = el('li');
        var ico = el('span', 'dot-ico'); ico.setAttribute('aria-hidden', 'true');
        ico.innerHTML = '<svg class="i"><use href="#i-commit"/></svg>';
        var what = el('div', 'what');
        var a = el('a', null, r.name); a.href = r.url;
        what.appendChild(a);
        if (r.language) what.appendChild(el('span', 'lang', r.language));
        what.appendChild(el('span', 'msg', (r.last_commit && r.last_commit.message) || r.description || 'Updated'));
        var t = el('time', null, ago(activityDate(r))); t.dateTime = activityDate(r);
        t.title = new Date(activityDate(r)).toLocaleString();
        li.appendChild(ico); li.appendChild(what); li.appendChild(t);
        feed.appendChild(li);
      });
    }
    var synced = $('#synced');
    var label = function (iso) { if (synced && iso) synced.textContent = 'Synced from GitHub ' + ago(iso) + ' · ' + repos.length + ' public repos tracked'; };
    label(data.generated_at);
    fetch('data/checked.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) { if (c && c.checked_at) label(c.checked_at); }).catch(function () {});
  }

  if (window.fetch) {
    fetch('data/github.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(renderGitHub)
      .catch(function () {
        var feed = $('#feed');
        if (feed) { feed.textContent = ''; feed.appendChild(el('li', 'feed-empty', 'Recent activity is unavailable right now. See my GitHub profile for the latest.')); }
        var synced = $('#synced'); if (synced) synced.textContent = 'GitHub data unavailable.';
      });
  }

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
