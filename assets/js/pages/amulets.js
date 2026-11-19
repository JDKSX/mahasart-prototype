/* รายการวัตถุมงคล: ตัวกรองหมวด/ประเภท/คำค้น (sync กับ URL) · แบ่งหน้า 12 ชิ้น · คำอธิบายป้ายประเภท */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, PER = 12;
  var cats = MH.q.categories('amulet');
  var PROV_ORDER = ['certified', 'new_edition', 'replica', 'natural_stone', 'worship_statue'];
  var PROV_TEXT = {
    certified: 'มีเอกสารจากผู้ออกใบรับรอง ระบุผู้ออกและเลขที่ไว้ในหน้าสินค้า พร้อมรูปใบรับรอง',
    new_edition: 'สร้างโดยวัดหรือผู้สร้างที่ระบุชื่อ บอกชื่อรุ่นและปีที่สร้าง ไม่ใช่ของเก่า',
    replica: 'ทำตามแบบพระที่มีชื่อเสียง ไม่ใช่ขององค์ต้นแบบ เหมาะกับผู้ที่ต้องการบูชาเป็นพุทธานุสติ',
    natural_stone: 'หินจากธรรมชาติ สีและลายของแต่ละเม็ดไม่เหมือนกัน ไม่ใช่พระหรือเหรียญ',
    worship_statue: 'องค์พระหรือเทพสำหรับตั้งบูชาบนหิ้งหรือโต๊ะทำงาน บอกวัสดุและขนาดไว้ในหน้าสินค้า'
  };

  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });

  var chipsHost = document.getElementById('cat-chips'), provSel = document.getElementById('am-prov'), qInput = document.getElementById('am-q');
  var form = document.getElementById('am-form'), clearBtn = document.getElementById('am-clear');
  var countEl = document.getElementById('am-count'), listEl = document.getElementById('am-list'), emptyEl = document.getElementById('am-empty'), pagerEl = document.getElementById('am-pager');

  /* ---------- สถานะจาก URL ---------- */
  var p = new URLSearchParams(location.search);
  var SORTS = ['price_asc', 'price_desc'];
  var state = { cat: p.get('cat') || '', prov: p.get('prov') || '', q: p.get('q') || '', buy: p.get('buy') === '1', sort: SORTS.indexOf(p.get('sort')) >= 0 ? p.get('sort') : '', page: Math.max(1, parseInt(p.get('p'), 10) || 1) };

  /* ---------- สร้างตัวควบคุมครั้งเดียว (กดแล้วโฟกัสไม่หลุด) ---------- */
  chipsHost.innerHTML = '<button type="button" class="chip" data-cat="" aria-pressed="false">ทั้งหมด</button>' + cats.map(function (c) {
    return '<button type="button" class="chip" data-cat="' + h(c.slug) + '" aria-pressed="false">' + h(c.name) + '</button>';
  }).join('');
  provSel.innerHTML = '<option value="">ทุกประเภท</option>' + PROV_ORDER.map(function (k) {
    return '<option value="' + k + '">' + h(MH.labels.provenance[k].label) + '</option>';
  }).join('');
  /* ตัวกรอง "สั่งซื้อออนไลน์ได้" และเรียงตามราคา (เติมเข้าฟอร์มเดิม) */
  clearBtn.insertAdjacentHTML('beforebegin',
    '<div class="field"><label for="am-sort">เรียงตาม</label><select class="select" id="am-sort"><option value="">แนะนำ (ค่าเริ่มต้น)</option><option value="price_asc">ราคาต่ำไปสูง</option><option value="price_desc">ราคาสูงไปต่ำ</option></select></div>' +
    '<div class="field sh-check-field"><span class="label">การสั่งซื้อ</span><label class="check" for="am-buy"><input type="checkbox" id="am-buy"> สั่งซื้อออนไลน์ได้</label></div>');
  var sortSel = document.getElementById('am-sort'), buyChk = document.getElementById('am-buy');
  sortSel.value = state.sort; buyChk.checked = state.buy;
  if (!document.querySelector('link[href$="shop.css"]')) {
    var cssLink = document.createElement('link'); cssLink.rel = 'stylesheet'; cssLink.href = MH.base + 'assets/css/shop.css'; document.head.appendChild(cssLink);
  }
  qInput.value = state.q;
  if (state.prov && PROV_ORDER.indexOf(state.prov) >= 0) provSel.value = state.prov;

  document.getElementById('prov-list').innerHTML = PROV_ORDER.map(function (k) {
    return '<li>' + MH.ui.provenanceTag(k) + '<p>' + h(PROV_TEXT[k]) + '</p><button type="button" data-prov="' + k + '">ดูเฉพาะชิ้นที่ติดป้ายนี้</button></li>';
  }).join('');

  /* ---------- กรอง ---------- */
  function filtered() {
    var opts = {};
    if (state.cat) {
      var c = cats.filter(function (x) { return x.slug === state.cat; })[0];
      if (!c) return [];
      opts.categoryId = c.id;
    }
    if (state.prov) {
      if (PROV_ORDER.indexOf(state.prov) < 0) return [];
      opts.provenance = state.prov;
    }
    if (state.q.trim()) opts.q = state.q;
    var list = MH.q.amulets(opts);
    if (state.buy) list = list.filter(MH.ui.canBuy);
    if (state.sort) {
      /* ชิ้นที่ไม่แสดงราคาไว้ท้ายสุดเสมอ */
      var priced = function (m) { return m.is_price_visible && m.price_amount != null; };
      list = list.slice().sort(function (a, b) {
        if (priced(a) !== priced(b)) return priced(a) ? -1 : 1;
        if (!priced(a)) return 0;
        return state.sort === 'price_asc' ? a.price_amount - b.price_amount : b.price_amount - a.price_amount;
      });
    }
    return list;
  }
  function hasFilter() { return !!(state.cat || state.prov || state.q.trim() || state.buy || state.sort); }

  function syncURL() {
    var sp = new URLSearchParams();
    if (state.cat) sp.set('cat', state.cat);
    if (state.prov) sp.set('prov', state.prov);
    if (state.q.trim()) sp.set('q', state.q.trim());
    if (state.buy) sp.set('buy', '1');
    if (state.sort) sp.set('sort', state.sort);
    if (state.page > 1) sp.set('p', state.page);
    var qs = sp.toString(), file = location.pathname.split('/').pop() || 'amulets.html';
    try { history.replaceState(null, '', file + (qs ? '?' + qs : '')); } catch (e) {}
  }

  function renderPager(pages) {
    if (pages <= 1) { pagerEl.innerHTML = ''; return; }
    var html = '<button type="button" data-go="' + (state.page - 1) + '" aria-label="หน้าก่อนหน้า"' + (state.page === 1 ? ' disabled' : '') + '>‹</button>';
    for (var i = 1; i <= pages; i++) {
      html += '<button type="button" data-go="' + i + '" aria-label="หน้า ' + i + '"' + (i === state.page ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }
    html += '<button type="button" data-go="' + (state.page + 1) + '" aria-label="หน้าถัดไป"' + (state.page === pages ? ' disabled' : '') + '>›</button>';
    pagerEl.innerHTML = html;
  }

  function render() {
    var all = filtered(), pages = Math.max(1, Math.ceil(all.length / PER));
    if (state.page > pages) state.page = pages;
    var slice = all.slice((state.page - 1) * PER, state.page * PER);

    chipsHost.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === state.cat)); });
    clearBtn.hidden = !hasFilter();

    countEl.innerHTML = 'พบ <b class="num">' + all.length + '</b> ชิ้น' + (pages > 1 ? ' · หน้า ' + state.page + ' จาก ' + pages : '');
    if (!all.length) {
      listEl.hidden = true; listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.innerHTML = MH.ui.empty('ไม่พบวัตถุมงคลตามตัวกรองนี้', 'ลองเปลี่ยนคำค้น หรือเลือกหมวดและประเภทอื่น',
        '<button type="button" class="btn btn--primary" data-clear>ล้างตัวกรอง</button>');
    } else {
      emptyEl.hidden = true; emptyEl.innerHTML = '';
      listEl.hidden = false;
      listEl.innerHTML = slice.map(MH.ui.amuletCard).join('');
    }
    renderPager(all.length ? pages : 1);
    syncURL();
  }

  function clearAll() {
    state = { cat: '', prov: '', q: '', buy: false, sort: '', page: 1 };
    provSel.value = ''; qInput.value = ''; sortSel.value = ''; buyChk.checked = false;
    render();
  }

  /* ---------- เหตุการณ์ ---------- */
  chipsHost.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    state.cat = b.getAttribute('data-cat'); state.page = 1; render();
  });
  provSel.addEventListener('change', function () { state.prov = provSel.value; state.page = 1; render(); });
  sortSel.addEventListener('change', function () { state.sort = sortSel.value; state.page = 1; render(); });
  buyChk.addEventListener('change', function () { state.buy = buyChk.checked; state.page = 1; render(); });
  qInput.addEventListener('input', function () { state.q = qInput.value; state.page = 1; render(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  clearBtn.addEventListener('click', clearAll);
  emptyEl.addEventListener('click', function (e) { if (e.target.closest('[data-clear]')) { clearAll(); qInput.focus(); } });
  pagerEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b || b.disabled) return;
    state.page = Number(b.getAttribute('data-go')); render();
    countEl.scrollIntoView({ block: 'start' });
    countEl.focus({ preventScroll: true });
  });
  document.getElementById('prov-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-prov]'); if (!b) return;
    state.prov = b.getAttribute('data-prov'); provSel.value = state.prov; state.page = 1; render();
    document.getElementById('cat-label').scrollIntoView({ block: 'start' });
    provSel.focus({ preventScroll: true });
  });

  render();
})();
