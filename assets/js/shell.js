/* MAHASART prototype — โครงหน้าฝั่งผู้ใช้ + ส่วนประกอบที่ใช้ซ้ำ
   หน้าแต่ละหน้าต้องมี: <body data-page="<key>" data-base="">  <div id="mh-header"></div> <main id="main">…</main> <div id="mh-footer"></div>
   โหลดลำดับ: data/*.js → store.js → astro.js → shell.js → pages/<page>.js
   API: MH.ui.icon · MH.ui.art · MH.ui.toast · MH.ui.confirm · MH.ui.dialog · MH.ui.amuletCard · MH.ui.articleItem · MH.ui.articleCard · MH.ui.lineInquiry · MH.ui.empty · MH.base */
(function () {
  'use strict';
  var MH = window.MH = window.MH || {};
  var h = MH.util.h;

  /* ทางสำรองของ <dialog> สำหรับ Safari/iOS ต่ำกว่า 15.4 (ไม่มี showModal) */
  if (typeof document.createElement('dialog').showModal !== 'function') {
    var proto = (window.HTMLDialogElement || window.HTMLUnknownElement || HTMLElement).prototype;
    proto.showModal = function () {
      var self = this;
      this.setAttribute('open', ''); this.classList.add('dlg-fallback');
      this.setAttribute('role', this.getAttribute('role') || 'dialog'); this.setAttribute('aria-modal', 'true');
      this._bd = document.createElement('div'); this._bd.className = 'dlg-backdrop';
      this.parentNode.insertBefore(this._bd, this);
      this._esc = function (e) { if (e.key === 'Escape') { self.dispatchEvent(new Event('cancel')); self.close(); } };
      document.addEventListener('keydown', this._esc);
      var f = this.querySelector('input, select, textarea, button, a[href]'); if (f) f.focus();
    };
    proto.close = function () {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      if (this._bd) this._bd.remove();
      document.removeEventListener('keydown', this._esc);
      this.dispatchEvent(new Event('close'));
    };
  }
  var body = document.body;
  MH.base = body.getAttribute('data-base') || '';

  /* ---------- sprite ---------- */
  var SPRITE = '<svg width="0" height="0" class="sr-only" aria-hidden="true"><defs>' +
    '<radialGradient id="orb" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#E9DEFF"/><stop offset=".35" stop-color="#8F72F0"/><stop offset="1" stop-color="#22165E"/></radialGradient></defs>' +
    '<symbol id="logo" viewBox="0 0 40 40"><g fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="20" r="18"/><rect x="9" y="9" width="22" height="22"/><rect x="9" y="9" width="22" height="22" transform="rotate(45 20 20)"/><circle cx="20" cy="20" r="5"/></g><circle cx="20" cy="20" r="1.6" fill="currentColor"/></symbol>' +
    '<symbol id="i-search" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></g></symbol>' +
    '<symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></symbol>' +
    '<symbol id="i-user" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></g></symbol>' +
    '<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-back" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-book" viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5zM12 6.5V19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-screen" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M10 8v4.5l3.8-2.25zM8 20h8M12 16v4"/></g></symbol>' +
    '<symbol id="i-ai" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="4.5" y="7.5" width="15" height="11" rx="3.5"/><path d="M12 3.5v4M9.5 15.5h5M2.5 12v2.5M21.5 12v2.5"/></g><circle cx="9.3" cy="12" r="1.2" fill="currentColor"/><circle cx="14.7" cy="12" r="1.2" fill="currentColor"/></symbol>' +
    '<symbol id="i-expert" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-.5a7 7 0 0 1 14 0v.5M12 14l-1.4 3 1.4 1.6 1.4-1.6z"/></g></symbol>' +
    '<symbol id="i-dial" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.8"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/></g></symbol>' +
    '<symbol id="i-news" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9h5M7 12.5h10M7 16h10M15 8h2.5v2H15z"/></g></symbol>' +
    '<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5.5 9.5V20h4.5v-6h4v6h4.5V9.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-amulet" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 18.5V10a4 4 0 0 1 8 0v8.5M9.5 16h5"/><circle cx="12" cy="10.5" r="1.3"/></g></symbol>' +
    '<symbol id="i-scroll" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10.5a2 2 0 0 1 2 2V18a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 18v-1.5h11V18a2.5 2.5 0 0 0 2.5 2.5M7 3.5A2 2 0 0 0 5 5.5v11"/><path d="M9 8h6.5M9 11h6.5M9 14h4"/></g></symbol>' +
    '<symbol id="i-unlock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 7.6-1.7M12 14.5v2.5"/></g></symbol>' +
    '<symbol id="i-shield" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/></g></symbol>' +
    '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-send" viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-down" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-info" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></g></symbol>' +
    '<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-trash" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></g></symbol>' +
    '<symbol id="i-copy" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></g></symbol>' +
    '<symbol id="i-calc" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/></g></symbol>' +
    '<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>' +
    /* ภาพประกอบวัตถุมงคลชั่วคราว */
    '<symbol id="a-somdej" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="22" y="6" width="56" height="88" rx="5"/><path d="M31 84V44a19 19 0 0 1 38 0v40"/><circle cx="50" cy="38" r="5"/><path d="M41 66c0-11 4-19 9-19s9 8 9 19z"/><path d="M38 71h24M35 76h30M32 81h36"/></g></symbol>' +
    '<symbol id="a-coin" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="50" cy="11" r="5"/><ellipse cx="50" cy="56" rx="29" ry="36"/><ellipse cx="50" cy="56" rx="22" ry="29"/><circle cx="50" cy="45" r="5.5"/><path d="M40 73c0-12 4.5-21 10-21s10 9 10 21z" stroke-linejoin="round"/></g></symbol>' +
    '<symbol id="a-beads" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-dasharray="0 11.78"/><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/></symbol>' +
    '<symbol id="a-statue" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M44 18l6-10 6 10z"/><circle cx="50" cy="24" r="5.5"/><path d="M40 33h20l4 31H36z"/><path d="M43 64v22M57 64v22M30 90h40M67 26v58M63 28h8"/></g></symbol>' +
    '<symbol id="a-pidta" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M50 10c18 0 31 21 31 46S68 92 50 92 19 81 19 56s13-46 31-46z"/><path d="M50 30c-10 0-17 11-17 24s7 24 17 24 17-11 17-24-7-24-17-24z"/><path d="M38 48c7 5 17 5 24 0M41 58c6 3 12 3 18 0"/></g></symbol>' +
    '<symbol id="a-crystal" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M50 6l21 23-7 63H36l-7-63z"/><path d="M29 29h42M50 6l-9 23 9 63 9-63z"/></g></symbol>' +
    '<symbol id="a-scroll" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="20" y="14" width="60" height="72" rx="4"/><path d="M32 32h36M32 44h36M32 56h24"/><circle cx="64" cy="70" r="8"/><path d="M60 77l-3 10 7-4 7 4-3-10"/></g></symbol>' +
    '<symbol id="i-cart" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.2 11h10.4l2-8H6.4"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></g></symbol>' +
    '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-heart-fill" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" fill="currentColor"/></symbol>' +
    '<symbol id="i-calendar" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></g></symbol>' +
    '<symbol id="i-play" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></g></symbol>' +
    '<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>' +
    '<symbol id="a-none" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"><rect x="20" y="20" width="60" height="60" rx="6"/></g><path d="M35 60l10-12 8 9 6-6 8 9" fill="none" stroke="currentColor" stroke-width="2"/></symbol>' +
    '</svg>';

  /* ---------- UI helpers ---------- */
  MH.ui = {
    icon: function (id, cls) { return '<svg class="' + (cls || 'ico') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; },
    art: function (id) { return '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#' + (id || 'a-none') + '"/></svg>'; },

    toast: function (msg) {
      var host = document.querySelector('.toast-host');
      if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
      var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
      host.appendChild(t);
      setTimeout(function () { t.remove(); }, 3200);
    },

    /** dialog ทั่วไป: { title, html, actions:[{label, cls, value}] } → Promise<value|null> */
    dialog: function (opts) {
      return new Promise(function (resolve) {
        var d = document.createElement('dialog'); d.className = 'dialog';
        d.setAttribute('aria-labelledby', 'dlg-title');
        d.innerHTML = '<div class="d-body"><h2 id="dlg-title">' + h(opts.title) + '</h2>' + (opts.html || '') + '</div><div class="d-foot"></div>';
        var foot = d.querySelector('.d-foot');
        (opts.actions || [{ label: 'ปิด', cls: 'btn--outline', value: null }]).forEach(function (a) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (a.cls || 'btn--outline'); b.textContent = a.label;
          b.addEventListener('click', function () { d.close(); resolve(a.value === undefined ? null : a.value); });
          foot.appendChild(b);
        });
        d.addEventListener('cancel', function () { resolve(null); });
        d.addEventListener('close', function () { setTimeout(function () { d.remove(); }, 0); });
        document.body.appendChild(d);
        d.showModal();
        if (opts.onOpen) opts.onOpen(d);
      });
    },

    /** ยืนยันก่อนทำสิ่งที่ย้อนกลับยาก → Promise<boolean> */
    confirm: function (opts) {
      return MH.ui.dialog({
        title: opts.title, html: '<p>' + h(opts.body || '') + '</p>',
        actions: [{ label: 'ยกเลิก', cls: 'btn--outline', value: false }, { label: opts.okLabel || 'ยืนยัน', cls: opts.danger ? 'btn--danger' : 'btn--primary', value: true }]
      }).then(function (v) { return v === true; });
    },

    empty: function (title, text, actionHtml) {
      return '<div class="empty"><b>' + h(title) + '</b>' + h(text || '') + (actionHtml ? '<div class="btn-row" data-center>' + actionHtml + '</div>' : '') + '</div>';
    },

    provenanceTag: function (type) {
      var p = MH.labels.provenance[type];
      return p ? '<span class="tag ' + p.cls + '">' + h(p.label) + '</span>' : '<span class="tag">ยังไม่ระบุประเภท</span>';
    },

    /** สั่งซื้อออนไลน์ได้ไหม (มีราคา เปิดแสดงราคา มีของ และไม่ใช่สินค้าหมด/ไม่ขาย) */
    canBuy: function (m) { return !!(m && m.is_price_visible && m.price_amount != null && (m.stock_qty || 0) > 0 && m.stock_status !== 'sold' && m.stock_status !== 'not_for_sale'); },
    /** บรรทัดราคา + สถานะของ */
    priceLine: function (m) {
      if (!m || !m.is_price_visible || m.price_amount == null) return '';
      var out = (m.stock_qty || 0) <= 0 || m.stock_status === 'sold';
      return '<p class="price">' + MH.money(m.price_amount) + (out ? ' <small>สินค้าหมด</small>' : (m.stock_qty <= 3 ? ' <small>เหลือ ' + m.stock_qty + ' ชิ้น</small>' : '')) + '</p>';
    },
    /** การ์ดวัตถุมงคล (li) — ใช้ในหน้าแรก รายการ และผลค้นหา */
    amuletCard: function (m) {
      var url = MH.base + 'amulet.html?code=' + encodeURIComponent(m.code);
      return '<li class="amulet">' +
        '<a class="thumb' + (m.tone === 'violet' ? ' thumb--violet' : '') + '" href="' + url + '" tabindex="-1" aria-hidden="true">' + MH.ui.art(m.art) + '</a>' +
        '<div class="body">' + MH.ui.provenanceTag(m.provenance_type) +
        '<h3><a href="' + url + '">' + h(m.name) + '</a></h3>' +
        (m.belief_text ? '<p class="belief">ความเชื่อ: ' + h(m.belief_text) + '</p>' : '') +
        MH.ui.priceLine(m) +
        '<div class="card-acts">' + (MH.ui.canBuy(m) ? '<button type="button" class="btn btn--gold btn--sm" data-add-cart="' + m.id + '">' + MH.ui.icon('i-cart') + 'ใส่ตะกร้า</button>' : '') +
        '<button type="button" class="ask" data-ask="' + h(m.code) + '">สอบถามทาง LINE' + MH.ui.icon('i-arrow') + '</button></div>' +
        '</div></li>';
    },

    articleThumb: function (a, extraCls) {
      var t = a.thumb || {};
      var inner = t.art ? MH.ui.art(t.art) : h(t.glyph || '✦');
      return '<span class="art-thumb' + (t.tone === 'amber' ? ' amber' : '') + (extraCls ? ' ' + extraCls : '') + '" aria-hidden="true">' + inner + '</span>';
    },
    articleMeta: function (a) {
      var c = MH.q.category(a.category_id);
      return (c ? h(c.name) + ' · ' : '') + h(MH.util.dateShort(a.published_at));
    },
    /** แถวบทความแบบย่อ (li) */
    articleItem: function (a) {
      return '<li><a class="art-item" href="' + MH.base + 'article.html?slug=' + encodeURIComponent(a.slug) + '">' + MH.ui.articleThumb(a) +
        '<span><h3>' + h(a.title) + '</h3><span class="art-meta">' + MH.ui.articleMeta(a) + '</span></span></a></li>';
    },
    /** การ์ดบทความแบบใหญ่ (li) */
    articleCard: function (a) {
      return '<li><a class="art-card" href="' + MH.base + 'article.html?slug=' + encodeURIComponent(a.slug) + '">' + MH.ui.articleThumb(a) +
        '<span class="b"><span class="art-meta">' + MH.ui.articleMeta(a) + '</span><h3>' + h(a.title) + '</h3><p>' + h(a.excerpt) + '</p></span></a></li>';
    },

    /** ปุ่มรายการโปรด (type: article | amulet | expert | course) · ต้องเป็นสมาชิก */
    favButton: function (type, id, label) {
      var m = MH.member && MH.member.current(), on = !!(m && MH.q.favorite(m.id, type, id));
      return '<button type="button" class="btn btn--outline btn--sm fav-btn" data-fav="' + h(type) + ':' + Number(id) + '" aria-pressed="' + on + '">' +
        MH.ui.icon(on ? 'i-heart-fill' : 'i-heart') + '<span>' + (on ? 'อยู่ในรายการโปรด' : (label || 'เก็บเป็นรายการโปรด')) + '</span></button>';
    },

    /** ปุ่มใต้ผลดูดวง: บันทึกผล + ให้ AI อธิบาย
        opts = { tool: 'taksa'|'rasi'|'numerology', title, input (ไม่มีชื่อคน), summary, explain: 'query string ต่อท้าย ai.html' } */
    resultActions: function (opts) {
      var payload = h(JSON.stringify({ tool: opts.tool, title: opts.title, input: opts.input || {}, summary: opts.summary }));
      return '<div class="result-actions">' +
        '<button type="button" class="btn btn--outline btn--sm" data-save-reading="' + payload + '">' + MH.ui.icon('i-bookmark') + 'บันทึกผลนี้</button>' +
        '<a class="btn btn--violet btn--sm" href="' + MH.base + 'ai.html?' + (opts.explain || ('explain=' + encodeURIComponent(opts.tool))) + '">' + MH.ui.icon('i-sparkle') + 'ให้ AI อธิบายผลนี้</a>' +
        '</div>';
    },

    /** QR พร้อมเพย์ตัวอย่าง (ลายจำลองจากเลขอ้างอิง ไม่ใช่ QR ที่สแกนจ่ายได้จริง) */
    promptpayQR: function (ref) {
      var n = 25, cells = '', seed = 0;
      for (var i = 0; i < ref.length; i++) seed = (seed * 31 + ref.charCodeAt(i)) >>> 0;
      function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
      function finder(x, y) { return '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="currentColor"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="currentColor"/>'; }
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
        var inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
        if (!inF && rnd() > 0.52) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
      }
      return '<svg class="pp-qr" viewBox="-2 -2 ' + (n + 4) + ' ' + (n + 4) + '" role="img" aria-label="QR พร้อมเพย์ตัวอย่าง เลขอ้างอิง ' + h(ref) + '"><rect x="-2" y="-2" width="' + (n + 4) + '" height="' + (n + 4) + '" fill="#fff"/><g fill="currentColor">' + cells + '</g>' +
        finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</svg>';
    },

    /** ปุ่มสอบถาม LINE (ต้นแบบ: แสดงกล่องจำลองแทนการเปิด LINE จริง) */
    lineInquiry: function (code) {
      var m = MH.q.amulet(code); if (!m) return;
      MH.store.track(m.id, 'line_clicks');
      var oa = MH.store.setting('line_oa_id') || '@mahasart';
      var msg = 'สอบถาม ' + m.code + ' ' + m.name;
      MH.ui.dialog({
        title: 'สอบถามทาง LINE',
        html: '<p>ในระบบจริง ปุ่มนี้จะเปิด LINE OA <b>' + h(oa) + '</b> พร้อมพิมพ์ข้อความนี้ให้</p>' +
          '<p class="notice"><span id="line-msg">' + h(msg) + '</span></p>' +
          '<p class="muted">ต้นแบบยังไม่เชื่อมกับ LINE จริง คัดลอกข้อความไปส่งเองได้</p>',
        actions: [{ label: 'ปิด', cls: 'btn--outline', value: null }, { label: 'คัดลอกข้อความ', cls: 'btn--primary', value: 'copy' }]
      }).then(function (v) {
        if (v !== 'copy') return;
        var done = function () { MH.ui.toast('คัดลอกข้อความแล้ว'); };
        if (navigator.clipboard) navigator.clipboard.writeText(msg).then(done, function () { MH.ui.toast('คัดลอกไม่ได้ ให้เลือกข้อความแล้วคัดลอกเอง'); });
        else MH.ui.toast('คัดลอกไม่ได้ ให้เลือกข้อความแล้วคัดลอกเอง');
      });
    }
  };

  /* sprite ใส่ทุกหน้า (ฝั่งผู้ใช้และหลังบ้าน) */
  body.insertAdjacentHTML('afterbegin', SPRITE);

  /* ---------- maintenance mode (ไม่ใช้กับหลังบ้าน) ---------- */
  var page = body.getAttribute('data-page') || '';
  var isAdmin = body.hasAttribute('data-admin-page');
  if (!isAdmin && MH.store.setting('maintenance_mode') && page !== 'maintenance' && !MH.auth.user()) {
    location.replace(MH.base + 'maintenance.html');
    return;
  }

  /* ---------- theme (ก่อนวาดหน้า) ---------- */
  var root = document.documentElement;
  try { var saved = localStorage.getItem('mahasart-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /* ---------- header / footer / tabbar ---------- */
  var NAV = [
    { key: 'index', href: 'index.html', label: 'หน้าแรก' },
    { key: 'horoscope', href: 'horoscope.html', label: 'พยากรณ์ออนไลน์' },
    { key: 'ai', href: 'ai.html', label: 'Mahasart AI' },
    { key: 'amulets', href: 'amulets.html', label: 'วัตถุมงคล' },
    { key: 'articles', href: 'articles.html', label: 'คลังความรู้' },
    { key: 'courses', href: 'courses.html', label: 'คอร์สเรียน' },
    { key: 'experts', href: 'experts.html', label: 'ผู้เชี่ยวชาญ' }
  ];
  /* หน้าย่อยที่นับเป็นเมนูไหน */
  var NAV_OF = { taksa: 'horoscope', daily: 'horoscope', rasi: 'horoscope', numerology: 'horoscope', amulet: 'amulets', article: 'articles',
    cart: 'amulets', checkout: 'amulets', order: 'amulets', course: 'courses', lesson: 'courses', certificate: 'courses', pricing: 'courses',
    expert: 'experts', booking: 'experts', session: 'experts', login: 'account', register: 'account' };
  var activeNav = NAV_OF[page] || page;

  var B = MH.base;
  var headerHost = document.getElementById('mh-header');
  if (headerHost) {
    var user = MH.auth.user(), member = MH.member && MH.member.current();
    headerHost.outerHTML =
      '<a class="skip" href="#main">ข้ามไปเนื้อหา</a>' +
      '<div class="proto-bar"><div class="wrap"><span>ต้นแบบ MAHASART · ข้อมูลทั้งหมดเป็นตัวอย่าง</span>' +
      '<a href="' + B + (user ? 'admin/index.html' : 'admin/login.html') + '">' + (user ? 'กลับหลังบ้าน (' + h(MH.labels.role[user.role]) + ')' : 'เข้าหลังบ้าน') + '</a></div></div>' +
      '<header class="site-header" id="top"><div class="wrap">' +
      '<a class="brand" href="' + B + 'index.html" aria-label="MAHASART หน้าแรก"><svg aria-hidden="true"><use href="#logo"/></svg><span><b>MAHASART</b><small>ศูนย์รวมศาสตร์แห่งปัญญา</small></span></a>' +
      '<nav class="main-nav" id="main-nav" aria-label="เมนูหลัก"><ul>' +
      NAV.map(function (n) { return '<li><a href="' + B + n.href + '"' + (n.key === activeNav ? ' aria-current="page"' : '') + '>' + n.label + '</a></li>'; }).join('') +
      '</ul></nav>' +
      '<div class="actions">' +
      '<button class="icon-btn" id="search-btn" type="button" aria-label="ค้นหา" aria-expanded="false" aria-controls="search-row">' + MH.ui.icon('i-search') + '</button>' +
      '<button class="icon-btn" id="theme-btn" type="button" aria-label="เปลี่ยนธีม">' + MH.ui.icon('i-moon') + '</button>' +
      '<a class="icon-btn cart-btn" href="' + B + 'cart.html" aria-label="ตะกร้าสินค้า">' + MH.ui.icon('i-cart') + '<span class="cart-badge" data-cart-count hidden></span></a>' +
      (member
        ? '<a class="btn btn--outline login-link member-link" href="' + B + 'account.html">' + MH.ui.icon('i-user') + '<span>' + h(member.display_name.split(' ')[0]) + (MH.member.isPremium(member) ? ' <span class="tag tag--stone">พรีเมียม</span>' : '') + '</span></a>'
        : '<a class="btn btn--primary login-link" href="' + B + 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search) + '">' + MH.ui.icon('i-user') + 'เข้าสู่ระบบ</a>') +
      '<button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="เปิดเมนู" aria-expanded="false" aria-controls="main-nav">' + MH.ui.icon('i-menu') + '</button>' +
      '</div></div>' +
      '<div class="search-row" id="search-row" hidden><form class="wrap" role="search" id="search-form" action="' + B + 'search.html">' +
      '<label class="sr-only" for="q-top">ค้นหาบทความหรือวัตถุมงคล</label>' +
      '<input class="input" id="q-top" name="q" type="search" placeholder="ค้นหาบทความหรือวัตถุมงคล">' +
      '<button class="btn btn--primary" type="submit">ค้นหา</button></form></div></header>';
  }

  var footerHost = document.getElementById('mh-footer');
  if (footerHost) {
    var site = (MH.store.setting('site_url') || 'https://mahasart.net').replace(/^https?:\/\//, '');
    footerHost.outerHTML = '<footer class="site-footer" id="footer"><div class="wrap">' +
      '<div><a class="brand" href="' + B + 'index.html"><svg aria-hidden="true"><use href="#logo"/></svg><span><b>MAHASART</b><small>' + h(site) + '</small></span></a>' +
      '<ul class="foot-links">' +
      '<li><a href="' + B + 'page.html?slug=about">เกี่ยวกับเรา</a></li>' +
      '<li><a href="' + B + 'page.html?slug=privacy">นโยบายความเป็นส่วนตัว</a></li>' +
      '<li><a href="' + B + 'page.html?slug=terms">เงื่อนไขการใช้งาน</a></li>' +
      '<li><a href="' + B + 'page.html?slug=disclaimer">คำชี้แจงเรื่องความเชื่อ</a></li>' +
      '<li><a href="' + B + 'guide.html">คู่มือผู้ทดสอบ</a></li>' +
      '<li><button class="link-btn" type="button" data-cookie-open>ตั้งค่าคุกกี้</button></li>' +
      '</ul></div>' +
      '<div class="foot-right"><p>' + h(MH.store.setting('disclaimer') || '') + ' · ต้นแบบ ต.ค. 2569</p>' +
      '<p class="visit-counter" id="visit-counter" aria-label="สถิติผู้เข้าชม" hidden></p></div>' +
      '</div></footer>' +
      '<nav class="tabbar" aria-label="เมนูลัด">' +
      tab('index', 'index.html', 'i-home', 'หน้าหลัก') +
      tab('horoscope', 'horoscope.html', 'i-dial', 'พยากรณ์') +
      tab('amulets', 'amulets.html', 'i-amulet', 'วัตถุมงคล') +
      tab('articles', 'articles.html', 'i-book', 'คลังความรู้') +
      tab('account', 'account.html', 'i-user', 'บัญชี') +
      '</nav>';
  }
  function tab(key, href, icon, label) {
    var cur = key === activeNav;
    return '<a href="' + B + href + '"' + (cur ? ' aria-current="page"' : '') + '>' + MH.ui.icon(icon) + label + '</a>';
  }

  /* ---------- wiring ---------- */
  var themeBtn = document.getElementById('theme-btn');
  function syncTheme() {
    if (!themeBtn) return;
    var dark = effectiveTheme() === 'dark';
    themeBtn.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
    themeBtn.setAttribute('aria-label', dark ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด');
  }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('mahasart-theme', next); } catch (e) {}
    syncTheme();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
  syncTheme();

  var header = document.querySelector('.site-header');
  var menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = header.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
  });
  var searchBtn = document.getElementById('search-btn'), searchRow = document.getElementById('search-row');
  if (searchBtn) searchBtn.addEventListener('click', function () {
    searchRow.hidden = !searchRow.hidden;
    searchBtn.setAttribute('aria-expanded', String(!searchRow.hidden));
    if (!searchRow.hidden) document.getElementById('q-top').focus();
  });
  var searchForm = document.getElementById('search-form');
  if (searchForm) searchForm.addEventListener('submit', function (e) {
    var v = document.getElementById('q-top').value.trim();
    if (!v) { e.preventDefault(); document.getElementById('q-top').focus(); }
  });

  /* ---------- ความยินยอมคุกกี้ (PDPA) · เก็บใน localStorage mh_consent = {analytics, at} ---------- */
  function readConsent() { try { return JSON.parse(localStorage.getItem('mh_consent')); } catch (e) { return null; } }
  function writeConsent(a) { try { localStorage.setItem('mh_consent', JSON.stringify({ analytics: a, at: new Date().toISOString() })); } catch (e) {} }
  function closeCookieBar() {
    var b = document.getElementById('cookie-bar');
    if (b) b.remove();
    body.classList.remove('has-consent');
  }
  function openCookieBar() {
    if (document.getElementById('cookie-bar')) return;
    var bar = document.createElement('div');
    bar.className = 'cookie-bar'; bar.id = 'cookie-bar';
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'ความยินยอมคุกกี้');
    bar.innerHTML = '<p>เว็บไซต์ใช้คุกกี้ที่จำเป็นต่อการทำงาน และคุกกี้วิเคราะห์การเข้าชมเพื่อปรับปรุงบริการ · ' +
      '<a href="' + B + 'page.html?slug=privacy">นโยบายความเป็นส่วนตัว</a></p>' +
      '<div class="cookie-acts"><button class="btn btn--primary" type="button" data-consent="all">ยอมรับทั้งหมด</button>' +
      '<button class="btn btn--primary" type="button" data-consent="necessary">เฉพาะที่จำเป็น</button></div>';
    body.appendChild(bar);
    body.classList.add('has-consent');
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (!btn) return;
      var all = btn.getAttribute('data-consent') === 'all';
      writeConsent(all);
      closeCookieBar();
      MH.ui.toast(all ? 'บันทึกแล้ว: ยอมรับทั้งหมด' : 'บันทึกแล้ว: เฉพาะคุกกี้ที่จำเป็น');
    });
  }
  if (!isAdmin) {
    if (!readConsent()) openCookieBar();
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cookie-open]')) openCookieBar();
    });
  }

  /* ---------- ปุ่มส่งความเห็น (ผู้ทดสอบ) · ตั้งค่า feedback_url ว่าง = ไม่แสดง ---------- */
  var fbUrl = MH.store.setting('feedback_url');
  if (fbUrl && /^https?:\/\//.test(fbUrl)) {
    var fb = document.createElement('a');
    fb.className = 'fab-feedback'; fb.href = fbUrl; fb.target = '_blank'; fb.rel = 'noopener';
    fb.textContent = 'ส่งความเห็น';
    body.appendChild(fb);
  }

  /* นับการเข้าชม (เฉพาะหน้าฝั่งผู้ใช้) */
  if (!isAdmin && MH.visits) {
    MH.visits.track();
    var vc = document.getElementById('visit-counter');
    if (vc && MH.store.setting('show_public_counter')) {
      var vs = MH.visits.stats(), n = function (x) { return Number(x).toLocaleString('th-TH'); };
      vc.innerHTML = '<span><i class="live-dot" aria-hidden="true"></i>ออนไลน์ <b>' + n(vs.online) + '</b></span>' +
        '<span>วันนี้ <b>' + n(vs.today.visitors) + '</b></span><span>สัปดาห์นี้ <b>' + n(vs.week.visitors) + '</b></span>' +
        '<span>เดือนนี้ <b>' + n(vs.month.visitors) + '</b></span><span>ทั้งหมด <b>' + n(vs.total.visitors) + '</b></span>';
      vc.hidden = false;
    }
  }

  /* จำนวนในตะกร้าบนหัวเว็บ */
  function syncCart() {
    var n = MH.cart ? MH.cart.count() : 0;
    document.querySelectorAll('[data-cart-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });
    var cb = document.querySelector('.cart-btn'); if (cb) cb.setAttribute('aria-label', 'ตะกร้าสินค้า' + (n ? ' ' + n + ' ชิ้น' : ' ว่าง'));
  }
  document.addEventListener('mh:cart', syncCart); syncCart();

  /* ปุ่มที่ใช้ร่วมกันทุกหน้า (event delegation): สอบถาม LINE · รายการโปรด · บันทึกผลดูดวง */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ask]');
    if (b) { e.preventDefault(); MH.ui.lineInquiry(b.getAttribute('data-ask')); return; }

    var f = e.target.closest('[data-fav]');
    if (f) {
      var m = MH.member.current(); if (!m) { location.href = MH.member.loginUrl(); return; }
      var parts = f.getAttribute('data-fav').split(':'), type = parts[0], id = Number(parts[1]);
      var ex = MH.q.favorite(m.id, type, id);
      if (ex) MH.store.purge('member_favorites', ex.id); else MH.store.insert('member_favorites', { member_id: m.id, type: type, ref_id: id });
      f.outerHTML = MH.ui.favButton(type, id);
      MH.ui.toast(ex ? 'เอาออกจากรายการโปรดแล้ว' : 'เก็บเป็นรายการโปรดแล้ว ดูได้ที่หน้าบัญชี');
      return;
    }

    var ac = e.target.closest('[data-add-cart]');
    if (ac) {
      var r = MH.cart.add(Number(ac.getAttribute('data-add-cart')), 1);
      if (!r.ok) { MH.ui.toast(r.error); return; }
      MH.ui.dialog({ title: 'ใส่ตะกร้าแล้ว', html: '<p>ในตะกร้ามีสินค้า ' + MH.cart.count() + ' ชิ้น</p>',
        actions: [{ label: 'เลือกต่อ', cls: 'btn--outline', value: null }, { label: 'ไปที่ตะกร้า', cls: 'btn--primary', value: 'go' }] })
        .then(function (v) { if (v === 'go') location.href = MH.base + 'cart.html'; });
      return;
    }

    var sv = e.target.closest('[data-save-reading]');
    if (sv) {
      var mem = MH.member.current(); if (!mem) { location.href = MH.member.loginUrl(); return; }
      var data = JSON.parse(sv.getAttribute('data-save-reading'));
      var limit = MH.member.plan(mem).save_limit;
      var mine = MH.store.all('member_saved_readings').filter(function (r) { return r.member_id === mem.id; });
      if (limit && mine.length >= limit) {
        MH.ui.dialog({ title: 'บันทึกครบ ' + limit + ' รายการแล้ว', html: '<p>สมาชิกทั่วไปบันทึกผลได้ ' + limit + ' รายการ ลบรายการเก่าที่หน้าบัญชี หรือสมัครพรีเมียมเพื่อบันทึกไม่จำกัด</p>',
          actions: [{ label: 'ปิด', cls: 'btn--outline', value: null }, { label: 'ดูแพ็กเกจ', cls: 'btn--primary', value: 'go' }] })
          .then(function (v) { if (v === 'go') location.href = MH.base + 'pricing.html'; });
        return;
      }
      MH.store.insert('member_saved_readings', { member_id: mem.id, tool: data.tool, title: data.title, input: data.input, summary: data.summary });
      sv.disabled = true; sv.innerHTML = MH.ui.icon('i-check') + 'บันทึกแล้ว';
      MH.ui.toast('บันทึกผลแล้ว ดูได้ที่หน้าบัญชี → ผลดูดวงที่บันทึก');
    }
  });

  /* ---------- แถบโหลดด้านบน + แจ้งเมื่อไม่มีอินเทอร์เน็ต (ทุกหน้า รวมหลังบ้าน) ----------
     MH.ui.progress.start() / done() ใช้กับงานที่รอผลได้ · กดลิงก์ไปหน้าอื่นจะแสดงแถบเองจนหน้าใหม่ขึ้น */
  var pbar = document.createElement('div');
  pbar.className = 'top-progress'; pbar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(pbar);
  MH.ui.progress = {
    start: function () { pbar.classList.remove('is-done'); pbar.classList.add('is-run'); },
    done: function () { if (!pbar.classList.contains('is-run')) return; pbar.classList.add('is-done'); setTimeout(function () { pbar.classList.remove('is-run', 'is-done'); }, 450); }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || a.target || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(tel:|mailto:|javascript:)/i.test(href)) return;
    MH.ui.progress.start();
  });
  window.addEventListener('pageshow', function () { MH.ui.progress.done(); });

  var offBar = document.createElement('div');
  offBar.className = 'offline-bar'; offBar.setAttribute('role', 'status'); offBar.hidden = true;
  offBar.textContent = 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต · สิ่งที่กรอกไว้ยังอยู่ในหน้านี้ ระบบจะลองใหม่เมื่อกลับมาออนไลน์';
  document.body.appendChild(offBar);
  function netSync(e) {
    offBar.hidden = navigator.onLine;
    if (e && e.type === 'online') MH.ui.toast('กลับมาออนไลน์แล้ว');
  }
  window.addEventListener('online', netSync);
  window.addEventListener('offline', netSync);
  netSync();
})();
