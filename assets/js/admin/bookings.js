/* หลังบ้าน: การนัดหมาย
   ผู้เชี่ยวชาญ (bookings.view_own) เห็นเฉพาะนัดของตัวเอง (experts.user_id = ผู้ใช้ที่ล็อกอิน) · ทีมงานที่มี bookings.view เห็นทั้งหมด
   ทำเครื่องหมาย "ไม่มาตามนัด" หลังเวลาเริ่ม · "ยกเลิกโดยผู้เชี่ยวชาญ" คืนเงินเต็มเสมอ */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store, me = MH.admin.user;
  function $(id) { return document.getElementById(id); }
  function pad(n) { return ('0' + n).slice(-2); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var STCLS = { pending_payment: 'st--warn', confirmed: 'st--info', completed: 'st--ok', cancelled: 'st--bad', no_show: 'st--bad' };
  var STATUS = [{ k: '', t: 'ทั้งหมด' }, { k: 'pending_payment', t: 'รอชำระเงิน' }, { k: 'confirmed', t: 'ยืนยันแล้ว' }, { k: 'completed', t: 'ปรึกษาเสร็จแล้ว' }, { k: 'cancelled', t: 'ยกเลิก' }, { k: 'no_show', t: 'ไม่มาตามนัด' }];

  var seeAll = MH.admin.can('bookings.view');
  var myExpert = S.all('experts').filter(function (e) { return e.user_id === me.id; })[0] || null;
  var experts = S.all('experts');
  var f = { q: MH.util.param('q') || '', status: MH.util.param('status') || '', from: MH.util.param('from') || '', to: MH.util.param('to') || '', expert: MH.util.param('expert') || '' };
  if (MH.util.param('day') === 'today') f.from = f.to = MH.util.todayISO();
  if (!STATUS.some(function (s) { return s.k === f.status; })) f.status = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.from)) f.from = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.to)) f.to = '';
  if (!seeAll || !experts.some(function (e) { return String(e.id) === f.expert; })) f.expert = '';

  /* ---------- ส่วนบน ---------- */
  if (seeAll) {
    $('f-expert').insertAdjacentHTML('beforeend', experts.map(function (e) { return '<option value="' + e.id + '">' + h(e.display_name) + '</option>'; }).join(''));
    $('scope-note').textContent = 'นัดผู้เชี่ยวชาญทุกท่าน · ทำเครื่องหมายไม่มาตามนัดหรือยกเลิกแทนผู้เชี่ยวชาญได้';
  } else {
    $('f-expert-wrap').hidden = true;
    $('scope-note').textContent = 'เฉพาะนัดของคุณ · ทำเครื่องหมายไม่มาตามนัดหรือยกเลิกนัดได้';
    if (!myExpert) $('notes').innerHTML = '<div class="notice notice--warn" role="status"><span>บัญชีนี้ยังไม่ได้ผูกกับโปรไฟล์ผู้เชี่ยวชาญ จึงยังไม่มีนัดให้แสดง ติดต่อผู้ดูแลระบบให้ผูกบัญชีให้</span></div>';
  }
  $('f-q').value = f.q; $('f-from').value = f.from; $('f-to').value = f.to; $('f-expert').value = f.expert;

  /* ---------- ข้อมูล ---------- */
  function payOf(b) { return MH.pay.forPayable('booking', b.id)[0] || null; }
  function load() {
    var rows = S.all('expert_bookings');
    if (!seeAll) rows = myExpert ? rows.filter(function (b) { return b.expert_id === myExpert.id; }) : [];
    return rows.sort(function (a, b) { return String(b.start_at || b.created_at).localeCompare(String(a.start_at || a.created_at)); });
  }
  function matches(b, skipStatus) {
    var q = f.q.trim().toLowerCase(), m = S.find('members', b.member_id);
    if (q && (b.booking_no + ' ' + (m ? m.display_name : '')).toLowerCase().indexOf(q) < 0) return false;
    if (f.expert && String(b.expert_id) !== f.expert) return false;
    var dk = b.start_at ? dayKey(b.start_at) : '';
    if (f.from && (!dk || dk < f.from)) return false;
    if (f.to && (!dk || dk > f.to)) return false;
    return skipStatus || !f.status || b.status === f.status;
  }
  function canAct(b) { return seeAll || (myExpert && b.expert_id === myExpert.id); }
  function hasRoomAccess(b) { return myExpert && b.expert_id === myExpert.id; }
  function syncUrl() {
    var p = new URLSearchParams();
    ['q', 'status', 'from', 'to', 'expert'].forEach(function (k) { if (f[k]) p.set(k, f[k]); });
    var qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* ไฟล์ในเครื่องบางเบราว์เซอร์ไม่ให้แก้ URL */ }
  }

  function row(b) {
    var m = S.find('members', b.member_id), e = S.find('experts', b.expert_id), p = payOf(b), started = b.start_at && new Date(b.start_at) <= new Date();
    var acts = '';
    if (hasRoomAccess(b) && (b.status === 'confirmed' || b.status === 'completed')) acts += '<a class="btn btn--outline btn--sm" href="../session.html?booking=' + b.id + '" target="_blank" rel="noopener" aria-label="เปิดห้อง ' + h(b.booking_no) + ' (แท็บใหม่)">เปิดห้อง ↗</a>';
    if (canAct(b) && b.status === 'confirmed' && started) acts += '<button type="button" class="btn btn--outline btn--sm" data-noshow="' + b.id + '" aria-label="ทำเครื่องหมายไม่มาตามนัด ' + h(b.booking_no) + '">ไม่มาตามนัด</button>';
    if (canAct(b) && (b.status === 'confirmed' || b.status === 'pending_payment')) acts += '<button type="button" class="btn btn--danger btn--sm" data-xcancel="' + b.id + '" aria-label="ยกเลิกนัด ' + h(b.booking_no) + ' โดยผู้เชี่ยวชาญ">ยกเลิกโดยผู้เชี่ยวชาญ</button>';
    return '<tr>' +
      '<td class="cell-title"><b>' + h(b.booking_no) + '</b><span class="cell-sub">' + h(b.topic || '') + '</span></td>' +
      '<td data-label="สมาชิก">' + h(m ? m.display_name : '-') + '</td>' +
      (seeAll ? '<td data-label="ผู้เชี่ยวชาญ">' + h(e ? e.display_name : '-') + '</td>' : '') +
      '<td data-label="เวลานัด" class="nowrap">' + (b.start_at ? h(MH.util.dateTime(b.start_at)) : '-') + '</td>' +
      '<td data-label="ช่องทาง">' + h(MH.labels.sessionType[b.session_type] || b.session_type) + ' ' + b.minutes + ' นาที</td>' +
      '<td data-label="ยอดชำระ" class="num">' + MH.money(b.total) + (b.discount ? '<span class="cell-sub">ลดพรีเมียม ' + MH.money(b.discount) + '</span>' : '') + '</td>' +
      '<td data-label="สถานะ"><span class="st ' + (STCLS[b.status] || '') + '">' + h(MH.labels.bookingStatus[b.status] || b.status) + '</span>' +
        (b.status === 'cancelled' && b.cancelled_reason ? '<span class="cell-sub">' + h(b.cancelled_reason) + '</span>' : '') + '</td>' +
      '<td data-label="การชำระเงิน">' + (p ? h(MH.labels.paymentStatus[p.status] || p.status) : '-') + '</td>' +
      '<td class="act-cell"><div class="cell-actions">' + acts + '</div></td></tr>';
  }

  function render() {
    var all = load(), base = all.filter(function (b) { return matches(b, true); });
    var shown = base.filter(function (b) { return !f.status || b.status === f.status; });
    $('f-clear').hidden = !(f.q || f.status || f.from || f.to || f.expert);
    $('status-chips').innerHTML = STATUS.map(function (s) {
      var n = base.filter(function (b) { return !s.k || b.status === s.k; }).length;
      return '<button type="button" class="chip" data-status="' + s.k + '" aria-pressed="' + (f.status === s.k) + '">' + s.t + ' <span class="n">' + n + '</span></button>';
    }).join('');
    $('result-count').textContent = 'แสดง ' + shown.length + ' จาก ' + all.length + ' นัด';
    var host = $('list');
    if (!all.length) { host.innerHTML = MH.ui.empty('ยังไม่มีนัดหมาย', seeAll ? 'เมื่อสมาชิกจองนัด จะขึ้นที่นี่' : 'เมื่อมีสมาชิกจองเวลาของคุณ จะขึ้นที่นี่ เปิดช่วงเวลาให้จองได้ที่ตารางเวลาของฉัน', seeAll ? '' : '<a class="btn btn--primary" href="schedule.html">ไปที่ตารางเวลาของฉัน</a>'); return; }
    if (!shown.length) { host.innerHTML = MH.ui.empty('ไม่พบนัดที่ตรงกับตัวกรอง', 'ลองเปลี่ยนช่วงวันที่หรือสถานะ', '<button type="button" class="btn btn--outline" id="clear-f">ล้างตัวกรอง</button>'); return; }
    host.innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายการนัดหมาย</caption><thead><tr><th scope="col">เลขที่นัด</th><th scope="col">สมาชิก</th>' + (seeAll ? '<th scope="col">ผู้เชี่ยวชาญ</th>' : '') +
      '<th scope="col">เวลานัด</th><th scope="col">ช่องทาง</th><th scope="col">ยอดชำระ</th><th scope="col">สถานะ</th><th scope="col">การชำระเงิน</th><th scope="col"><span class="sr-only">การกระทำ</span></th></tr></thead>' +
      '<tbody>' + shown.map(row).join('') + '</tbody></table></div>' +
      '<p class="mini-note">ยกเลิกโดยผู้เชี่ยวชาญ คืนเงินเต็มจำนวนเสมอ และปิดช่วงเวลานั้นไว้ไม่ให้จองซ้ำ (เปิดคืนได้ที่หน้าตารางเวลา) · "ไม่มาตามนัด" ไม่คืนเงินและไม่นับเป็นรายได้</p>';
  }

  /* ---------- กล่องถามเหตุผล ---------- */
  function askReason(o) {
    return new Promise(function (resolve) {
      MH.ui.dialog({
        title: o.title,
        html: '<p>' + h(o.body) + '</p><form id="rs-form" novalidate><div class="field"><label for="rs-text">' + h(o.label) + '</label><textarea class="textarea" id="rs-text" rows="3" maxlength="300"></textarea></div>' +
          '<div class="btn-row"><button type="button" class="btn btn--outline" data-rs-x>ไม่ยกเลิก</button><button type="submit" class="btn btn--danger">' + h(o.okLabel) + '</button></div></form>',
        actions: [],
        onOpen: function (d) {
          var form = d.querySelector('#rs-form'), ta = d.querySelector('#rs-text');
          ta.focus();
          d.querySelector('[data-rs-x]').addEventListener('click', function () { d.close(); resolve(null); });
          d.addEventListener('cancel', function () { resolve(null); });
          form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            form.querySelectorAll('.err').forEach(function (n) { n.remove(); });
            var v = ta.value.trim();
            if (v.length < 5) {
              ta.setAttribute('aria-invalid', 'true');
              var p = document.createElement('p'); p.className = 'err'; p.setAttribute('role', 'alert'); p.textContent = 'ระบุเหตุผลอย่างน้อย 5 ตัวอักษร เพื่อแจ้งสมาชิก';
              ta.closest('.field').appendChild(p); ta.focus(); return;
            }
            d.close(); resolve(v);
          });
        }
      });
    });
  }

  /* ---------- การกระทำ ---------- */
  function noShow(id) {
    var b = S.find('expert_bookings', id);
    if (!b || !canAct(b) || b.status !== 'confirmed' || !b.start_at || new Date(b.start_at) > new Date()) { MH.ui.toast('ทำเครื่องหมายไม่ได้ นัดนี้เปลี่ยนสถานะไปแล้วหรือยังไม่ถึงเวลาเริ่ม'); render(); return; }
    var m = S.find('members', b.member_id);
    MH.ui.confirm({ title: 'ทำเครื่องหมาย "ไม่มาตามนัด"?', body: (m ? m.display_name : 'สมาชิก') + ' ไม่เข้าห้องตามนัด ' + b.booking_no + ' ระบบจะไม่คืนเงินและไม่นับเป็นรายได้ ย้อนกลับไม่ได้', okLabel: 'ทำเครื่องหมาย', danger: true }).then(function (ok) {
      if (!ok) return;
      var cur = S.find('expert_bookings', id);
      if (!cur || cur.status !== 'confirmed') { render(); return; }
      S.update('expert_bookings', id, { status: 'no_show', no_show_at: new Date().toISOString(), no_show_by: me.id }, 'update');
      MH.ui.toast('ทำเครื่องหมายไม่มาตามนัดแล้ว'); render();
    });
  }
  function expertCancel(id) {
    var b = S.find('expert_bookings', id);
    if (!b || !canAct(b) || ['confirmed', 'pending_payment'].indexOf(b.status) < 0) { MH.ui.toast('ยกเลิกไม่ได้ นัดนี้เปลี่ยนสถานะไปแล้ว'); render(); return; }
    var paid = MH.pay.forPayable('booking', b.id).some(function (p) { return p.status === 'paid'; });
    askReason({ title: 'ยกเลิกนัด ' + b.booking_no + ' โดยผู้เชี่ยวชาญ?',
      body: paid ? 'สมาชิกชำระเงินแล้ว ' + MH.money(b.total) + ' จะได้รับเงินคืนเต็มจำนวนเสมอ และช่วงเวลานี้จะถูกปิดไม่ให้จองซ้ำ' : 'สมาชิกยังไม่ได้ชำระเงิน การยกเลิกจะปิดรายการชำระเงินที่ค้างอยู่ และช่วงเวลานี้จะถูกปิดไม่ให้จองซ้ำ',
      label: 'เหตุผลที่ยกเลิก (สมาชิกจะเห็น)', okLabel: 'ยืนยันยกเลิกนัด' }).then(function (why) {
      if (!why) return;
      var r = MH.commerce.cancelBooking(b.id, 'ผู้เชี่ยวชาญยกเลิก: ' + why);
      if (!r.ok) { MH.ui.toast('ยกเลิกไม่สำเร็จ นัดนี้เปลี่ยนสถานะไปแล้ว'); render(); return; }
      var ps = MH.pay.forPayable('booking', b.id);
      ps.filter(function (p) { return p.status === 'pending'; }).forEach(function (p) { MH.pay.expire(p.id); });
      /* ผู้เชี่ยวชาญเป็นฝ่ายยกเลิก: คืนเงินเต็มเสมอ แม้ใกล้เวลานัดที่ cancelBooking จะไม่คืนให้ */
      ps.filter(function (p) { return p.status === 'paid'; }).forEach(function (p) { S.update('payments', p.id, { status: 'refunded' }, 'refund'); });
      if (b.slot_id) S.update('expert_slots', b.slot_id, { status: 'blocked' }, 'update');
      MH.ui.toast(paid ? 'ยกเลิกนัดแล้ว และคืนเงิน ' + MH.money(b.total) + ' ให้สมาชิก' : 'ยกเลิกนัดแล้ว'); render();
    });
  }

  /* ---------- เหตุการณ์ ---------- */
  $('f-q').addEventListener('input', function () { f.q = this.value; syncUrl(); render(); });
  $('f-expert').addEventListener('change', function () { f.expert = this.value; syncUrl(); render(); });
  $('f-from').addEventListener('change', function () { f.from = this.value; syncUrl(); render(); });
  $('f-to').addEventListener('change', function () { f.to = this.value; syncUrl(); render(); });
  function clearAll() { f = { q: '', status: '', from: '', to: '', expert: '' }; $('f-q').value = ''; $('f-from').value = ''; $('f-to').value = ''; $('f-expert').value = ''; syncUrl(); render(); }
  $('f-clear').addEventListener('click', clearAll);
  $('status-chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-status]'); if (!b) return;
    f.status = b.getAttribute('data-status'); syncUrl(); render();
    var again = $('status-chips').querySelector('[data-status="' + f.status + '"]'); if (again) again.focus();
  });
  $('list').addEventListener('click', function (e) {
    if (e.target.closest('#clear-f')) { clearAll(); $('f-q').focus(); return; }
    var n = e.target.closest('[data-noshow]'); if (n) { noShow(Number(n.getAttribute('data-noshow'))); return; }
    var c = e.target.closest('[data-xcancel]'); if (c) expertCancel(Number(c.getAttribute('data-xcancel')));
  });

  render();
})();
