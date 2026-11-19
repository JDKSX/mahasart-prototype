/* หลังบ้าน: รายการผู้เชี่ยวชาญทุกสถานะ (รอตรวจขึ้นก่อน) · คะแนน · จำนวนนัด · รายได้ส่วนแบ่งแพลตฟอร์ม */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store;
  function $(id) { return document.getElementById(id); }
  var SPEC = { 'thai-astrology': 'โหราศาสตร์ไทย', 'auspicious-time': 'ฤกษ์มงคล', 'fengshui': 'ฮวงจุ้ย', 'numerology': 'เลขศาสตร์' };
  function specName(s) { var c = MH.q.categoryBySlug('article', s); return c ? c.name : (SPEC[s] || s); }
  var ORDER = { pending: 0, active: 1, suspended: 2 };
  var STCLS = { pending: 'st--warn', active: 'st--ok', suspended: 'st--bad' };
  var STATUS = [{ k: '', t: 'ทั้งหมด' }, { k: 'pending', t: 'รอตรวจคุณสมบัติ' }, { k: 'active', t: 'เปิดรับนัด' }, { k: 'suspended', t: 'ระงับ' }];

  var f = { q: MH.util.param('q') || '', status: MH.util.param('status') || '' };
  if (['pending', 'active', 'suspended'].indexOf(f.status) < 0) f.status = '';
  $('f-q').value = f.q;

  /* รายได้: นัดที่จบแล้วเท่านั้น · ยอดที่ลูกค้าจ่าย แบ่งตาม commission_rate ของผู้เชี่ยวชาญ */
  function stats(e) {
    var rate = e.commission_rate != null ? e.commission_rate : (S.setting('expert_commission') || 0.2);
    var mine = S.all('expert_bookings').filter(function (b) { return b.expert_id === e.id; });
    var done = mine.filter(function (b) { return b.status === 'completed'; });
    var gross = done.reduce(function (s, b) { return s + (b.total || 0); }, 0);
    var net = done.reduce(function (s, b) { return s + Math.round((b.total || 0) * (1 - rate)); }, 0);
    return { rate: rate, done: done.length, upcoming: mine.filter(function (b) { return b.status === 'confirmed'; }).length, gross: gross, platform: gross - net, rating: MH.q.expertRating(e.id) };
  }
  function load() {
    return S.all('experts').sort(function (a, b) { return (ORDER[a.status] - ORDER[b.status]) || a.id - b.id; }).map(function (e) { return { e: e, s: stats(e) }; });
  }
  function matches(it, skipStatus) {
    var e = it.e, q = f.q.trim().toLowerCase();
    if (q && [e.display_name, e.title, e.contact_email, (e.specialties || []).map(specName).join(' ')].join(' ').toLowerCase().indexOf(q) < 0) return false;
    return skipStatus || !f.status || e.status === f.status;
  }
  function syncUrl() {
    var p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.status) p.set('status', f.status);
    var qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* เปิดจากไฟล์บางเบราว์เซอร์ไม่ให้แก้ URL */ }
  }

  function row(it) {
    var e = it.e, s = it.s, url = 'expert-edit.html?id=' + e.id, pending = e.status === 'pending';
    return '<tr>' +
      '<td class="cell-title"><a href="' + url + '">' + h(e.display_name) + '</a><span class="cell-sub">' + h(e.title || 'ยังไม่ได้ตั้งคำโปรย') + '</span>' +
        '<span class="cell-sub">' + (e.specialties || []).map(function (x) { return h(specName(x)); }).join(' · ') + ' · ' + Number(e.years_experience || 0) + ' ปี</span></td>' +
      '<td data-label="สถานะ"><span class="st ' + (STCLS[e.status] || '') + '">' + h(MH.labels.expertStatus[e.status] || e.status) + '</span>' +
        (e.review_decision === 'rejected' && e.status === 'suspended' ? '<span class="cell-sub">ไม่ผ่านการตรวจ</span>' : '') + '</td>' +
      '<td data-label="คะแนน">' + (s.rating.count ? '★ ' + s.rating.avg.toFixed(1) + ' <span class="muted">(' + s.rating.count + ' รีวิว)</span>' : '<span class="muted">ยังไม่มีรีวิว</span>') + '</td>' +
      '<td data-label="จำนวนนัด" class="num">จบแล้ว ' + s.done + '<span class="cell-sub">รอถึงเวลา ' + s.upcoming + '</span></td>' +
      '<td data-label="ยอดจากนัดที่จบ" class="num">' + MH.money(s.gross) + '</td>' +
      '<td data-label="ส่วนแบ่งแพลตฟอร์ม" class="num">' + MH.money(s.platform) + '<span class="cell-sub">อัตรา ' + Math.round(s.rate * 1000) / 10 + '%</span></td>' +
      '<td class="act-cell"><a class="btn ' + (pending ? 'btn--primary' : 'btn--outline') + ' btn--sm" href="' + url + '" aria-label="' + (pending ? 'ตรวจคุณสมบัติ ' : 'ดูรายละเอียด ') + h(e.display_name) + '">' + (pending ? 'ตรวจคุณสมบัติ' : 'ดูรายละเอียด') + '</a></td></tr>';
  }

  function render() {
    var items = load(), base = items.filter(function (it) { return matches(it, true); });
    var shown = base.filter(function (it) { return !f.status || it.e.status === f.status; });
    var pend = items.filter(function (it) { return it.e.status === 'pending'; }).length;
    $('notes').innerHTML = (pend ? '<div class="notice notice--warn" role="status"><span><b>มีผู้สมัครรอตรวจคุณสมบัติ ' + pend + ' ท่าน</b> กดเข้าไปตรวจรายละเอียดแล้วอนุมัติหรือปฏิเสธพร้อมเหตุผล</span></div>' : '') +
      (MH.admin.can('experts.manage') ? '' : '<div class="notice" role="note">' + h(MH.labels.role[MH.admin.user.role]) + ' ดูข้อมูลผู้เชี่ยวชาญได้อย่างเดียว การอนุมัติ ระงับ และปรับส่วนแบ่งทำได้เฉพาะผู้ดูแลระบบ</div>');
    $('status-chips').innerHTML = STATUS.map(function (x) {
      var n = base.filter(function (it) { return !x.k || it.e.status === x.k; }).length;
      return '<button type="button" class="chip" data-status="' + x.k + '" aria-pressed="' + (f.status === x.k) + '">' + x.t + ' <span class="n">' + n + '</span></button>';
    }).join('');
    $('result-count').textContent = 'แสดง ' + shown.length + ' จาก ' + items.length + ' ท่าน';
    var host = $('list');
    if (!items.length) { host.innerHTML = MH.ui.empty('ยังไม่มีผู้เชี่ยวชาญ', 'เมื่อมีผู้สมัครจากหน้าเว็บ จะขึ้นที่นี่เป็นสถานะรอตรวจคุณสมบัติ'); return; }
    if (!shown.length) { host.innerHTML = MH.ui.empty('ไม่พบผู้เชี่ยวชาญที่ตรงกับตัวกรอง', 'ลองเปลี่ยนคำค้นหรือเลือกสถานะอื่น', '<button type="button" class="btn btn--outline" id="clear-f">ล้างตัวกรอง</button>'); return; }
    host.innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายการผู้เชี่ยวชาญ</caption>' +
      '<thead><tr><th scope="col">ผู้เชี่ยวชาญ</th><th scope="col">สถานะ</th><th scope="col">คะแนน</th><th scope="col">จำนวนนัด</th><th scope="col">ยอดจากนัดที่จบ</th><th scope="col">ส่วนแบ่งแพลตฟอร์ม</th><th scope="col"><span class="sr-only">การกระทำ</span></th></tr></thead>' +
      '<tbody>' + shown.map(row).join('') + '</tbody></table></div>' +
      '<p class="mini-note">ยอดและส่วนแบ่งนับเฉพาะนัดที่ปรึกษาเสร็จแล้ว คำนวณจากยอดที่ลูกค้าจ่ายจริง (หลังส่วนลดพรีเมียม) ตามอัตราส่วนแบ่งของผู้เชี่ยวชาญแต่ละท่าน</p>';
  }

  $('f-q').addEventListener('input', function () { f.q = this.value; syncUrl(); render(); });
  $('status-chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-status]'); if (!b) return;
    f.status = b.getAttribute('data-status'); syncUrl(); render();
    var again = $('status-chips').querySelector('[data-status="' + f.status + '"]'); if (again) again.focus();
  });
  $('list').addEventListener('click', function (e) {
    if (!e.target.closest('#clear-f')) return;
    f = { q: '', status: '' }; $('f-q').value = ''; syncUrl(); render(); $('f-q').focus();
  });

  render();
})();
