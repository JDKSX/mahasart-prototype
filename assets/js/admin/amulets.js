/* หลังบ้าน: รายการวัตถุมงคล (ค้นหา กรอง ดูความครบตามเงื่อนไขเผยแพร่) */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h;
  function $(id) { return document.getElementById(id); }

  var canCreate = MH.auth.can('amulets.create');
  var canEdit = MH.auth.can('amulets.edit');
  var STATUS = [{ k: '', t: 'ทั้งหมด' }, { k: 'draft', t: 'ฉบับร่าง' }, { k: 'published', t: 'เผยแพร่' }, { k: 'archived', t: 'เก็บ' }, { k: 'incomplete', t: 'ข้อมูลไม่ครบ' }];
  var PROV_KEYS = Object.keys(MH.labels.provenance);

  var cats = MH.store.all('categories').filter(function (c) { return c.type === 'amulet'; })
    .sort(function (a, b) { return a.sort_order - b.sort_order; });
  var catName = {};
  cats.forEach(function (c) { catName[c.id] = c.name + (c.is_active ? '' : ' (ปิดใช้)'); });

  /* ---------- ตัวกรองจาก URL ---------- */
  var f = {
    q: MH.util.param('q') || '', cat: MH.util.param('cat') || '',
    prov: MH.util.param('prov') || '', status: MH.util.param('status') || (MH.util.param('filter') === 'incomplete' ? 'incomplete' : ''),
    stock: MH.util.param('stock') === 'low' ? 'low' : ''
  };
  if (!cats.some(function (c) { return String(c.id) === f.cat; })) f.cat = '';
  if (f.prov !== 'none' && PROV_KEYS.indexOf(f.prov) < 0) f.prov = '';
  if (['draft', 'published', 'archived', 'incomplete'].indexOf(f.status) < 0) f.status = '';
  /* incomplete = ข้อมูลยังไม่ครบตามเงื่อนไขเผยแพร่ (ลิงก์จากแดชบอร์ด) */
  /* ใกล้หมด = เผยแพร่อยู่ ยังเปิดขาย (ไม่ใช่ส่งมอบแล้ว/ไม่เปิดให้บูชา) และสต็อก ≤ 2 (ลิงก์จากแดชบอร์ดร้านค้า) */
  function isLow(m) { return MH.q.isLive(m) && m.stock_status !== 'sold' && m.stock_status !== 'not_for_sale' && (m.stock_qty || 0) <= 2; }
  function statusOk(it, k) { return !k || (k === 'incomplete' ? it.miss.length > 0 : it.m.status === k); }

  /* ---------- ส่วนบนของหน้า ---------- */
  if (canCreate) $('add-btn').hidden = false;
  var notes = $('notes');
  if (!canEdit) {
    notes.innerHTML = '<div class="notice" role="note">' + h(MH.labels.role[MH.admin.user.role]) + ' ดูรายการวัตถุมงคลได้อย่างเดียว ถ้าต้องแก้ไขให้แจ้งผู้ดูแลแค็ตตาล็อก</div>';
  }
  var moved = MH.util.param('moved');
  if (moved) {
    var trashLink = MH.auth.can('trash.view') ? ' <a href="trash.html">เปิดถังขยะ</a>' : '';
    notes.insertAdjacentHTML('beforeend', '<div class="notice notice--ok" role="status">ย้าย ' + h(moved) + ' ไปถังขยะแล้ว กู้คืนได้ภายหลัง.' + trashLink + '</div>');
    syncUrl();
  }

  $('f-cat').insertAdjacentHTML('beforeend', cats.map(function (c) {
    return '<option value="' + c.id + '">' + h(catName[c.id]) + '</option>';
  }).join(''));
  $('f-q').value = f.q; $('f-cat').value = f.cat; $('f-prov').value = f.prov;

  /* ---------- ความครบตามเงื่อนไขเผยแพร่ (สัญญาข้อ 6) ---------- */
  function missingOf(m, imgs) {
    var out = [];
    if (!m.provenance_type) out.push('ยังไม่เลือกป้ายประเภท');
    if (!imgs.some(function (i) { return i.collection === 'gallery'; })) out.push('ยังไม่มีรูปแกลเลอรี');
    var noAlt = imgs.filter(function (i) { return !String(i.alt_text || '').trim(); }).length;
    if (noAlt) out.push('มีรูปที่ยังไม่มีคำบรรยาย ' + noAlt + ' รูป');
    if (m.provenance_type === 'certified') {
      if (!String(m.certificate_issuer || '').trim()) out.push('ยังไม่ระบุผู้ออกใบรับรอง');
      if (!String(m.certificate_no || '').trim()) out.push('ยังไม่ระบุเลขที่ใบรับรอง');
      if (!imgs.some(function (i) { return i.collection === 'certificate'; })) out.push('ยังไม่มีรูปใบรับรอง');
    }
    var bad = [];
    [m.name, m.belief_text, m.description].forEach(function (t) {
      MH.util.bannedIn(t).forEach(function (w) { if (bad.indexOf(w) < 0) bad.push(w); });
    });
    if (bad.length) out.push('มีคำต้องห้าม: ' + bad.join(', '));
    return out;
  }

  /* ---------- ข้อมูลที่ใช้วาด ---------- */
  function load() {
    var media = MH.store.all('media').filter(function (x) { return x.owner_type === 'amulets'; });
    var featured = MH.store.setting('featured_amulets') || [];
    return MH.store.all('amulets').sort(function (a, b) { return a.id - b.id; }).map(function (m) {
      var imgs = media.filter(function (x) { return x.owner_id === m.id; });
      return { m: m, miss: missingOf(m, imgs), star: featured.indexOf(m.id) >= 0 };
    });
  }
  function matches(it, skipStatus) {
    var m = it.m, q = f.q.trim().toLowerCase();
    if (q && [m.name, m.code].join(' ').toLowerCase().indexOf(q) < 0) return false;
    if (f.cat && String(m.category_id) !== f.cat) return false;
    if (f.prov === 'none' ? !!m.provenance_type : (f.prov && m.provenance_type !== f.prov)) return false;
    if (!skipStatus && !statusOk(it, f.status)) return false;
    if (!skipStatus && f.stock === 'low' && !isLow(m)) return false;
    return true;
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.cat) p.set('cat', f.cat);
    if (f.prov) p.set('prov', f.prov);
    if (f.status) p.set('status', f.status);
    if (f.stock) p.set('stock', f.stock);
    var qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* เปิดจากไฟล์บางเบราว์เซอร์ไม่ให้แก้ URL */ }
  }

  /* ---------- วาด ---------- */
  function priceCell(m) {
    if (m.price_amount == null) return '<span class="muted">ยังไม่ตั้งราคา</span>';
    return h(MH.money(m.price_amount)) + (m.is_price_visible ? '' : ' <span class="muted">(ไม่แสดงบนเว็บ)</span>');
  }
  function stockCell(m) {
    var n = m.stock_qty || 0;
    if (isLow(m)) return '<span class="miss miss--bad" title="ใกล้หมด เหลือ ' + n + ' ชิ้น">' + n + ' ชิ้น<span class="sr-only"> (ใกล้หมด)</span></span>';
    return n + ' ชิ้น';
  }
  function row(it) {
    var m = it.m, miss = it.miss, tone = m.tone === 'violet' ? ' thumb--violet' : '';
    var prov = m.provenance_type ? MH.ui.provenanceTag(m.provenance_type) : '<span class="tag tag--missing">ยังไม่ระบุประเภท</span>';
    var done = miss.length
      ? '<span class="miss miss--bad" title="' + h('ขาด: ' + miss.join(' · ')) + '">ขาด ' + miss.length + ' อย่าง<span class="sr-only"> (' + h(miss.join(', ')) + ')</span></span>'
      : '<span class="miss miss--ok">ครบ</span>';
    var star = it.star
      ? '<span class="star" title="แนะนำที่หน้าแรก">' + MH.ui.icon('i-star') + '<span class="sr-only">แนะนำที่หน้าแรก</span></span>'
      : '<span class="muted" aria-hidden="true">-</span><span class="sr-only">ไม่ได้แนะนำที่หน้าแรก</span>';
    var editUrl = 'amulet-edit.html?id=' + m.id;
    var previewUrl = '../amulet.html?code=' + encodeURIComponent(m.code) + '&amp;preview=1';
    return '<tr>' +
      '<td data-label="รหัส" class="num code">' + h(m.code) + '</td>' +
      '<td data-label="" class="nm"><div class="m-name"><span class="thumb m-thumb' + tone + '" aria-hidden="true">' + MH.ui.art(m.art) + '</span>' +
        '<span><a class="m-title" href="' + editUrl + '">' + h(m.name) + '</a></span></div></td>' +
      '<td data-label="หมวด">' + h(catName[m.category_id] || '-') + '</td>' +
      '<td data-label="ป้ายประเภท">' + prov + '</td>' +
      '<td data-label="สถานะ">' + MH.admin.pill(m.status) + '</td>' +
      '<td data-label="การให้บูชา">' + h(MH.labels.stock[m.stock_status] || '-') + '</td>' +
      '<td data-label="ราคา" class="num">' + priceCell(m) + '</td>' +
      '<td data-label="สต็อก" class="num">' + stockCell(m) + '</td>' +
      '<td data-label="ความครบ">' + done + '</td>' +
      '<td data-label="หน้าแรก">' + star + '</td>' +
      '<td data-label="" class="acts"><div class="btn-row">' +
        '<a class="btn btn--outline btn--sm" href="' + editUrl + '" aria-label="' + (canEdit ? 'แก้ไข ' : 'ดูรายละเอียด ') + h(m.code + ' ' + m.name) + '">' + (canEdit ? 'แก้ไข' : 'ดูรายละเอียด') + '</a>' +
        '<a class="btn btn--outline btn--sm" href="' + previewUrl + '" target="_blank" rel="noopener" aria-label="ดูตัวอย่าง ' + h(m.code) + ' (เปิดแท็บใหม่)">ดูตัวอย่าง</a>' +
      '</div></td></tr>';
  }

  function render() {
    var items = load();
    var base = items.filter(function (it) { return matches(it, true); });
    var shown = base.filter(function (it) { return statusOk(it, f.status) && (f.stock !== 'low' || isLow(it.m)); });

    $('status-chips').innerHTML = STATUS.map(function (s) {
      var n = base.filter(function (it) { return statusOk(it, s.k); }).length;
      return '<button type="button" class="chip" data-status="' + s.k + '" aria-pressed="' + (f.status === s.k) + '">' + s.t + ' <span class="chip-n">' + n + '</span></button>';
    }).join('') + '<button type="button" class="chip" data-low="1" aria-pressed="' + (f.stock === 'low') + '">สต็อกใกล้หมด <span class="chip-n">' + base.filter(function (it) { return isLow(it.m); }).length + '</span></button>';

    $('result-count').textContent = 'แสดง ' + shown.length + ' จาก ' + items.length + ' รายการ';

    var host = $('list');
    if (!items.length) {
      host.innerHTML = MH.ui.empty('ยังไม่มีวัตถุมงคล', 'เริ่มจากเพิ่มชิ้นแรก แล้วติดป้ายประเภทให้ชัดเจน', canCreate ? '<a class="btn btn--primary" href="amulet-edit.html">เพิ่มวัตถุมงคล</a>' : '');
      return;
    }
    if (!shown.length) {
      host.innerHTML = MH.ui.empty('ไม่พบวัตถุมงคลที่ตรงกับตัวกรอง', 'ลองเปลี่ยนคำค้นหรือล้างตัวกรอง', '<button type="button" class="btn btn--outline" id="clear-f">ล้างตัวกรอง</button>');
      return;
    }
    host.innerHTML = '<div class="table-wrap"><table class="table table--stack">' +
      '<caption class="sr-only">รายการวัตถุมงคล</caption>' +
      '<thead><tr><th scope="col">รหัส</th><th scope="col">ชื่อ</th><th scope="col">หมวด</th><th scope="col">ป้ายประเภท</th><th scope="col">สถานะ</th><th scope="col">การให้บูชา</th><th scope="col">ราคา</th><th scope="col">สต็อก</th><th scope="col">ความครบ</th><th scope="col">หน้าแรก</th><th scope="col"><span class="sr-only">การกระทำ</span></th></tr></thead>' +
      '<tbody>' + shown.map(row).join('') + '</tbody></table></div>';
  }

  /* ---------- เหตุการณ์ ---------- */
  $('f-q').addEventListener('input', function () { f.q = this.value; syncUrl(); render(); });
  $('f-cat').addEventListener('change', function () { f.cat = this.value; syncUrl(); render(); });
  $('f-prov').addEventListener('change', function () { f.prov = this.value; syncUrl(); render(); });
  $('status-chips').addEventListener('click', function (e) {
    var lowBtn = e.target.closest('[data-low]');
    if (lowBtn) { f.stock = f.stock === 'low' ? '' : 'low'; syncUrl(); render(); var lb = $('status-chips').querySelector('[data-low]'); if (lb) lb.focus(); return; }
    var b = e.target.closest('[data-status]'); if (!b) return;
    f.status = b.getAttribute('data-status'); syncUrl(); render();
    var again = $('status-chips').querySelector('[data-status="' + f.status + '"]'); if (again) again.focus();
  });
  $('list').addEventListener('click', function (e) {
    if (!e.target.closest('#clear-f')) return;
    f = { q: '', cat: '', prov: '', status: '', stock: '' };
    $('f-q').value = ''; $('f-cat').value = ''; $('f-prov').value = '';
    syncUrl(); render(); $('f-q').focus();
  });

  render();
})();
