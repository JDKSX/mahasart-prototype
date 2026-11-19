/* หลังบ้าน: ตารางเวลาของผู้เชี่ยวชาญที่ล็อกอิน (experts.user_id = ผู้ใช้)
   ดูเป็นสัปดาห์ · เพิ่มช่วงเวลา (ทำซ้ำทุกสัปดาห์ 1–4 สัปดาห์) ห้ามซ้อนกับช่วงเดิม ห้ามเป็นอดีต
   ปิด/เปิดช่วง (blocked/open) · ช่วงที่ booked แก้ไม่ได้ */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store, me = MH.admin.user;
  var root = document.getElementById('sc-root');
  function pad(n) { return ('0' + n).slice(-2); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  /* รูปแบบเดียวกับข้อมูลตั้งต้น (เวลาท้องถิ่นไทย) เพื่อให้เรียงตามตัวอักษรได้ถูกต้อง */
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00+07:00'; }
  function mondayOf(d) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function parseDay(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return isNaN(d) || d.getMonth() !== Number(m[2]) - 1 ? null : d; }
  var MAX_DAYS = 180;

  var ex = S.all('experts').filter(function (e) { return e.user_id === me.id; })[0] || null;
  if (!ex) {
    root.innerHTML = MH.ui.empty('บัญชีนี้ไม่ได้เป็นผู้เชี่ยวชาญ', 'ตารางเวลาเปิดให้เฉพาะบัญชีที่ผูกกับโปรไฟล์ผู้เชี่ยวชาญ ถ้าคุณควรมีโปรไฟล์ ให้ผู้ดูแลระบบผูกบัญชีให้ที่หน้าตรวจผู้เชี่ยวชาญ',
      MH.admin.can('experts.view') ? '<a class="btn btn--primary" href="experts.html">ไปที่รายการผู้เชี่ยวชาญ</a>' : '<a class="btn btn--primary" href="index.html">กลับแดชบอร์ด</a>');
    return;
  }
  var slotMin = Math.max(30, Math.max.apply(null, [0].concat((ex.session_types || []).map(function (t) { return Number(t.minutes) || 0; }))));
  var week = mondayOf(parseDay(MH.util.param('week')) || new Date());

  function mySlots() { return S.all('expert_slots').filter(function (s) { return s.expert_id === ex.id; }).sort(function (a, b) { return a.start_at.localeCompare(b.start_at); }); }
  function bookingOfSlot(slot) { return S.all('expert_bookings').filter(function (b) { return b.slot_id === slot.id && ['cancelled'].indexOf(b.status) < 0; })[0] || null; }
  function syncUrl() { try { history.replaceState(null, '', location.pathname + '?week=' + dayKey(week)); } catch (e) { /* ไฟล์ในเครื่องบางเบราว์เซอร์ไม่ให้แก้ URL */ } }

  function chip(s) {
    var past = new Date(s.start_at) <= new Date(), t = hm(s.start_at);
    if (s.status === 'booked') {
      var b = bookingOfSlot(s);
      return '<a class="slot-chip slot-chip--booked" href="bookings.html' + (b ? '?q=' + encodeURIComponent(b.booking_no) : '') + '" aria-label="' + t + ' จองแล้ว แก้ไขไม่ได้ ดูนัด"><span>' + t + '</span><small>จองแล้ว</small></a>';
    }
    if (s.status === 'blocked') {
      return '<button type="button" class="slot-chip slot-chip--blocked" data-toggle="' + s.id + '"' + (past ? ' disabled' : '') + ' aria-label="' + t + ' ปิดอยู่' + (past ? ' (ผ่านมาแล้ว)' : ' กดเพื่อเปิดให้จอง') + '"><span>' + t + '</span><small>ปิดอยู่</small></button>';
    }
    return '<button type="button" class="slot-chip slot-chip--open" data-toggle="' + s.id + '"' + (past ? ' disabled' : '') + ' aria-label="' + t + ' เปิดให้จอง' + (past ? ' (ผ่านมาแล้ว)' : ' กดเพื่อปิดช่วงนี้') + '"><span>' + t + '</span><small>เปิด</small></button>';
  }

  function render(keepFocus) {
    var slots = mySlots(), today = dayKey(new Date()), days = [], counts = { open: 0, booked: 0, blocked: 0 };
    for (var i = 0; i < 7; i++) { var d = new Date(week); d.setDate(week.getDate() + i); days.push(d); }
    var end = new Date(week); end.setDate(end.getDate() + 6);
    var thisWeek = dayKey(mondayOf(new Date())) === dayKey(week);
    var grid = days.map(function (d) {
      var k = dayKey(d), list = slots.filter(function (s) { return dayKey(s.start_at) === k; });
      list.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });
      return '<div class="wk-day' + (k === today ? ' is-today' : '') + (k < today ? ' is-past' : '') + '" role="listitem"><h3>' + h(d.toLocaleDateString('th-TH', { weekday: 'long' })) + '<span>' + h(d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })) + (k === today ? ' · วันนี้' : '') + '</span></h3>' +
        (list.length ? list.map(chip).join('') : '<p class="wk-none">ไม่มีช่วงเวลา</p>') + '</div>';
    }).join('');
    var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    root.innerHTML =
      (ex.status === 'active' ? '' : '<div class="notice-stack"><div class="notice notice--warn" role="status"><span>โปรไฟล์ของคุณยังอยู่ในสถานะ <b>' + h(MH.labels.expertStatus[ex.status] || ex.status) + '</b> จัดตารางไว้ล่วงหน้าได้ แต่สมาชิกจะจองได้เมื่อผ่านการตรวจคุณสมบัติและเปิดรับนัด</span></div></div>') +
      '<section class="form-section" aria-labelledby="sc-week-h"><h2 id="sc-week-h">ตารางสัปดาห์</h2>' +
        '<div class="wk-nav"><button type="button" class="btn btn--outline btn--sm" data-wk="-1">‹ สัปดาห์ก่อน</button><span class="range" aria-live="polite">' + h(MH.util.dateShort(week.toISOString())) + ' – ' + h(MH.util.dateShort(end.toISOString())) + '</span>' +
        '<button type="button" class="btn btn--outline btn--sm" data-wk="1">สัปดาห์ถัดไป ›</button>' + (thisWeek ? '' : '<button type="button" class="btn btn--outline btn--sm" data-wk="0">กลับสัปดาห์นี้</button>') + '</div>' +
        '<p class="legend"><span><b>' + counts.open + '</b> เปิดให้จอง</span><span><b>' + counts.booked + '</b> จองแล้ว</span><span><b>' + counts.blocked + '</b> ปิดอยู่</span><span>กดที่ช่วงเวลาเพื่อสลับ เปิด/ปิด · ช่วงที่จองแล้วแก้ไขไม่ได้ · เวลาเป็นเวลาประเทศไทย</span></p>' +
        '<div class="wk-grid" role="list" aria-label="ช่วงเวลาในสัปดาห์นี้">' + grid + '</div></section>' +
      '<form class="form-section" id="add-form" novalidate aria-labelledby="sc-add-h"><h2 id="sc-add-h">เพิ่มช่วงเวลา</h2><p class="hint">แต่ละช่วงห่างกันอย่างน้อย ' + slotMin + ' นาที (ตามช่องทางที่ยาวที่สุดของคุณ) และต้องเป็นเวลาในอนาคต ไม่เกิน ' + MAX_DAYS + ' วันข้างหน้า</p>' +
        '<div class="add-grid"><div class="field"><label for="sc-date">วันที่</label><input class="input" id="sc-date" type="date" value="' + dayKey(tomorrow) + '"></div>' +
        '<div class="field"><label for="sc-time">เวลาเริ่ม</label><input class="input" id="sc-time" type="time" step="900" value="10:00"></div>' +
        '<div class="field"><label for="sc-repeat">ทำซ้ำทุกสัปดาห์</label><select class="select" id="sc-repeat"><option value="1">ครั้งเดียว ไม่ทำซ้ำ</option><option value="2">2 สัปดาห์ (วันเดียวกัน เวลาเดียวกัน)</option><option value="3">3 สัปดาห์</option><option value="4">4 สัปดาห์</option></select></div></div>' +
        '<div class="btn-row"><button type="submit" class="btn btn--primary">เพิ่มช่วงเวลา</button></div></form>';
    if (keepFocus) { var f = root.querySelector(keepFocus); if (f) f.focus(); }
  }

  /* ---------- เพิ่มช่วงเวลา ---------- */
  function addSlots(form) {
    MH.admin.clearErrors(form);
    var dRaw = form.querySelector('#sc-date').value, tRaw = form.querySelector('#sc-time').value, n = Number(form.querySelector('#sc-repeat').value) || 1;
    var base = parseDay(dRaw), tm = /^(\d{2}):(\d{2})$/.exec(tRaw || ''), errs = [];
    if (!base) errs.push({ field: 'sc-date', msg: 'เลือกวันที่ให้ถูกต้อง' });
    if (!tm) errs.push({ field: 'sc-time', msg: 'เลือกเวลาเริ่ม' });
    if (errs.length) { MH.admin.showErrors(form, errs); return; }
    var existing = mySlots().map(function (s) { return new Date(s.start_at).getTime(); }), now = Date.now(), limit = now + MAX_DAYS * 864e5, add = [];
    for (var i = 0; i < n; i++) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7 * i, Number(tm[1]), Number(tm[2]), 0, 0), ms = d.getTime();
      var label = d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + hm(d) + ' น.';
      if (ms <= now) { errs.push({ field: i === 0 ? 'sc-date' : 'sc-repeat', msg: label + ' เป็นเวลาที่ผ่านมาแล้ว เลือกเวลาในอนาคต' }); continue; }
      if (ms > limit) { errs.push({ field: i === 0 ? 'sc-date' : 'sc-repeat', msg: label + ' ไกลเกิน ' + MAX_DAYS + ' วัน เลือกวันที่ใกล้กว่านี้' }); continue; }
      if (existing.some(function (x) { return Math.abs(x - ms) < slotMin * 60000; })) { errs.push({ field: i === 0 ? 'sc-time' : 'sc-repeat', msg: label + ' ซ้อนกับช่วงเวลาที่มีอยู่แล้ว (ต้องห่างกันอย่างน้อย ' + slotMin + ' นาที)' }); continue; }
      add.push(d);
    }
    if (errs.length) { MH.admin.showErrors(form, errs); return; }
    add.forEach(function (d) { S.insert('expert_slots', { expert_id: ex.id, start_at: isoOf(d), status: 'open' }); });
    week = mondayOf(add[0]); syncUrl();
    MH.ui.toast('เพิ่มช่วงเวลา ' + add.length + ' ช่วงแล้ว');
    render('#sc-date');
  }

  /* ---------- เหตุการณ์ ---------- */
  root.addEventListener('click', function (e) {
    var w = e.target.closest('[data-wk]');
    if (w) {
      var v = Number(w.getAttribute('data-wk'));
      if (v === 0) week = mondayOf(new Date()); else week.setDate(week.getDate() + 7 * v);
      syncUrl(); render('[data-wk="1"]'); return;
    }
    var t = e.target.closest('[data-toggle]'); if (!t) return;
    var id = Number(t.getAttribute('data-toggle')), s = S.find('expert_slots', id);
    if (!s || s.expert_id !== ex.id) return;
    if (s.status === 'booked') { MH.ui.toast('ช่วงที่มีคนจองแล้ว แก้ไขไม่ได้'); return; }
    if (new Date(s.start_at) <= new Date()) { MH.ui.toast('ช่วงเวลาที่ผ่านมาแล้วแก้ไขไม่ได้'); return; }
    var next = s.status === 'open' ? 'blocked' : 'open';
    S.update('expert_slots', id, { status: next }, 'update');
    MH.ui.toast(next === 'blocked' ? 'ปิดช่วง ' + hm(s.start_at) + ' แล้ว สมาชิกจะไม่เห็นช่วงนี้' : 'เปิดช่วง ' + hm(s.start_at) + ' ให้จองแล้ว');
    render('[data-toggle="' + id + '"]');
  });
  root.addEventListener('submit', function (e) {
    if (e.target.id === 'add-form') { e.preventDefault(); addSlots(e.target); }
  });

  render();
})();
