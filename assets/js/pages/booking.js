/* จองนัดผู้เชี่ยวชาญ: ?expert=<slug>&slot=<id>[&type=chat|video|phone]
   ต้องเป็นสมาชิก · สรุปนัด → เลือกช่องทาง → เรื่องที่ปรึกษา 10–300 ตัว → รับทราบนโยบาย → MH.commerce.createBooking → หน้าชำระเงิน */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store;
  var root = document.getElementById('bk-root');
  var submitting = false;

  function pad(n) { return ('0' + n).slice(-2); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function initial(name) { return String(name || '').replace(/^(อาจารย์|ครู|ดร\.|หมอ)\s*/, '').charAt(0) || '✦'; }
  function crumbs(items) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span aria-hidden="true">›</span>' : '') + (it[0] && !last ? '<a href="' + it[0] + '">' + h(it[1]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + h(it[1]) + '</span>');
    }).join('') + '</nav>';
  }
  /** หน้าสถานะ: mark = ตัวอักษรใหญ่ด้านบน */
  function state(title, text, btns, mark) {
    document.title = title + ' · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['experts.html', 'ผู้เชี่ยวชาญ'], [null, 'จองนัด']]) + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">' + (mark || '?') + '</p><h1>' + h(title) + '</h1><p>' + h(text) + '</p><div class="btn-row">' + (btns || '') + '</div></div>';
  }

  var member = MH.member.current();
  if (!member) {
    state('เข้าสู่ระบบก่อนจองนัด', 'การจองนัดและชำระเงินทำได้เฉพาะสมาชิก เข้าสู่ระบบแล้วระบบจะพากลับมาที่หน้านี้', '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบ</a><a class="btn btn--outline" href="experts.html">กลับไปดูผู้เชี่ยวชาญ</a>', '✦');
    return;
  }

  var slug = MH.util.param('expert'), e = slug ? MH.q.expert(slug) : null;
  if (!e || e.status !== 'active' || e.deleted_at) {
    state('ไม่พบผู้เชี่ยวชาญท่านนี้', 'ลิงก์อาจพิมพ์ผิด หรือผู้เชี่ยวชาญท่านนี้ยังไม่เปิดรับนัด', '<a class="btn btn--primary" href="experts.html">กลับไปดูผู้เชี่ยวชาญ</a>');
    return;
  }
  var expertUrl = 'expert.html?slug=' + encodeURIComponent(e.slug);

  var slotId = MH.util.param('slot'), slot = slotId ? S.find('expert_slots', slotId) : null;
  var slotOk = slot && slot.expert_id === e.id && slot.status === 'open' && new Date(slot.start_at) > new Date();
  if (!slotOk) {
    /* ผู้ใช้กดย้อนกลับมาหลังจองไปแล้ว: บอกว่ามีนัดรอชำระอยู่ */
    var mine = slot ? S.all('expert_bookings').filter(function (b) { return b.slot_id === slot.id && b.member_id === member.id && b.status === 'pending_payment'; })[0] : null;
    var pay = mine ? MH.pay.forPayable('booking', mine.id).filter(function (p) { return p.status === 'pending'; })[0] : null;
    if (mine && pay) {
      state('คุณจองเวลานี้ไว้แล้ว', 'นัด ' + mine.booking_no + ' รอชำระเงินอยู่ ชำระให้เสร็จก่อนหมดเวลา ไม่เช่นนั้นระบบจะปล่อยคิวคืน', '<a class="btn btn--primary" href="' + h(MH.pay.url(pay)) + '">ไปชำระเงิน</a><a class="btn btn--outline" href="account.html?tab=bookings">ดูนัดของฉัน</a>', '✓');
    } else {
      state('ช่วงเวลานี้ไม่ว่างแล้ว', 'อาจมีคนจองไปก่อน หรือเลยเวลาแล้ว เลือกเวลาอื่นของ' + e.display_name + 'ได้ที่หน้าโปรไฟล์', '<a class="btn btn--primary" href="' + h(expertUrl) + '#cal-h">เลือกเวลาใหม่</a><a class="btn btn--outline" href="experts.html">ดูผู้เชี่ยวชาญท่านอื่น</a>', '⌛');
    }
    return;
  }

  var types = e.session_types || [];
  if (!types.length) { state('ผู้เชี่ยวชาญท่านนี้ยังไม่เปิดให้จอง', 'ยังไม่ได้ตั้งช่องทางและราคา ลองเลือกท่านอื่นหรือกลับมาใหม่ภายหลัง', '<a class="btn btn--primary" href="experts.html">ดูผู้เชี่ยวชาญท่านอื่น</a>'); return; }

  document.title = 'จองนัด ' + e.display_name + ' · MAHASART';
  var plan = MH.member.plan(member), disc = plan.booking_discount || 0;
  var hours = S.setting('booking_cancel_hours') || 24, timeout = S.setting('payment_timeout_min') || 30;
  var preType = MH.util.param('type');
  var chosen = types.length === 1 ? types[0].type : (types.some(function (t) { return t.type === preType; }) ? preType : '');

  root.innerHTML =
    '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['experts.html', 'ผู้เชี่ยวชาญ'], [expertUrl, e.display_name], [null, 'จองนัด']]) + '<h1>จองนัดกับ' + h(e.display_name) + '</h1>' +
      '<p class="lede">ตรวจรายละเอียดให้ครบ แล้วกดยืนยันเพื่อไปชำระเงินผ่าน PromptPay</p></div>' +
    '<div class="bk-grid">' +
      '<form class="bk-form card" id="bk-form" novalidate>' +
        '<div id="bk-errs"></div>' +
        '<fieldset class="fs" id="bk-type-fs"><legend>1. เลือกช่องทางปรึกษา</legend><div class="opts">' + types.map(function (t) {
          return '<label class="opt' + (chosen === t.type ? ' is-on' : '') + '"><input type="radio" name="bk-type" value="' + h(t.type) + '"' + (chosen === t.type ? ' checked' : '') + '>' +
            '<span class="opt-body"><b>' + h(MH.labels.sessionType[t.type] || t.type) + '</b><span class="opt-min">' + Number(t.minutes) + ' นาที</span><span class="opt-price">' + MH.money(t.price) + '</span></span></label>';
        }).join('') + '</div></fieldset>' +
        '<div class="field"><label for="bk-topic">2. เรื่องที่อยากปรึกษา</label>' +
          '<textarea class="textarea" id="bk-topic" rows="5" maxlength="400" aria-describedby="bk-topic-hint" placeholder="เล่าเรื่องที่อยากปรึกษาสั้น ๆ เช่น ช่วงเวลา สถานการณ์ และสิ่งที่อยากรู้"></textarea>' +
          '<span class="hint" id="bk-topic-hint">กรอก 10–300 ตัวอักษร · <span id="bk-count" class="num">0 / 300</span></span></div>' +
        '<div class="field"><label class="check" for="bk-ack"><input type="checkbox" id="bk-ack"><span>ฉันรับทราบว่าคำปรึกษาเป็นไปตามความเชื่อ ไม่รับประกันผล และรับทราบนโยบายยกเลิก: ยกเลิกก่อนเวลานัดอย่างน้อย ' + hours + ' ชั่วโมง คืนเงินเต็มจำนวน หลังจากนั้นไม่คืนเงิน</span></label></div>' +
        '<div class="btn-row"><button type="submit" class="btn btn--gold" id="bk-submit">ยืนยันและไปชำระเงิน</button><a class="btn btn--outline" href="' + h(expertUrl) + '">เปลี่ยนเวลา</a></div>' +
      '</form>' +
      '<aside class="bk-sum card" aria-labelledby="sum-h"><h2 id="sum-h">สรุปการจอง</h2>' +
        '<div class="bk-who"><span class="exp-av" aria-hidden="true">' + h(initial(e.display_name)) + '</span><div><b>' + h(e.display_name) + '</b><p>' + h(e.title) + '</p></div></div>' +
        '<dl class="pb-rows"><div><dt>วัน</dt><dd>' + h(MH.util.dateLong(slot.start_at, true)) + '</dd></div><div><dt>เวลาเริ่ม</dt><dd>' + hm(slot.start_at) + ' น.</dd></div><div><dt>ช่องทาง</dt><dd id="sum-type">ยังไม่ได้เลือก</dd></div></dl>' +
        '<dl class="pb-rows" id="sum-money"></dl>' +
        '<p class="fine-line">ชำระผ่าน PromptPay ภายใน ' + timeout + ' นาทีหลังกดยืนยัน ถ้าไม่ชำระ ระบบจะปล่อยคิวนี้คืนอัตโนมัติ</p>' +
        '<p class="fine-line">' + (disc ? 'คุณเป็นสมาชิก' + h(plan.name) + ' ได้ส่วนลด ' + Math.round(disc * 100) + '% ของค่าปรึกษา' : 'สมาชิกพรีเมียมลดค่าปรึกษา 10%') + '</p>' +
      '</aside>' +
    '</div>' +
    '<p class="disclaimer">' + h(S.setting('disclaimer') || '') + '</p>';

  var form = document.getElementById('bk-form'), topic = document.getElementById('bk-topic'), ack = document.getElementById('bk-ack');

  function selectedType() { var r = form.querySelector('input[name="bk-type"]:checked'); return r ? r.value : ''; }
  function sumMoney() {
    var t = types.filter(function (x) { return x.type === selectedType(); })[0], host = document.getElementById('sum-money');
    document.getElementById('sum-type').textContent = t ? (MH.labels.sessionType[t.type] || t.type) + ' · ' + t.minutes + ' นาที' : 'ยังไม่ได้เลือก';
    if (!t) { host.innerHTML = '<div><dt>ราคา</dt><dd class="muted">เลือกช่องทางก่อน</dd></div>'; return; }
    var d = Math.round(t.price * disc);
    host.innerHTML = '<div><dt>ค่าปรึกษา</dt><dd>' + MH.money(t.price) + '</dd></div>' +
      (d ? '<div class="disc"><dt>ส่วนลดพรีเมียม ' + Math.round(disc * 100) + '%</dt><dd>−' + MH.money(d) + '</dd></div>' : '') +
      '<div class="tot"><dt>ยอดสุทธิ</dt><dd>' + MH.money(t.price - d) + '</dd></div>';
  }
  function updCount() { document.getElementById('bk-count').textContent = topic.value.length + ' / 300'; }

  form.addEventListener('change', function (ev) {
    if (ev.target.name === 'bk-type') {
      form.querySelectorAll('.opt').forEach(function (o) { o.classList.toggle('is-on', o.querySelector('input').checked); });
      sumMoney();
    }
  });
  topic.addEventListener('input', updCount);

  /* ---------- แสดงข้อผิดพลาด ---------- */
  function clearErrs() {
    document.getElementById('bk-errs').innerHTML = '';
    form.querySelectorAll('.field .err, .fs .err').forEach(function (n) { n.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
  }
  function showErrs(errs) {
    clearErrs();
    var box = document.getElementById('bk-errs');
    box.innerHTML = '<div class="notice notice--danger form-err" role="alert" tabindex="-1"><div><b>ยังจองไม่ได้ แก้ ' + errs.length + ' จุดนี้ก่อน</b><ul>' +
      errs.map(function (x) { return '<li><a href="#' + x.field + '">' + h(x.msg) + '</a></li>'; }).join('') + '</ul></div></div>';
    errs.forEach(function (x) {
      var el = document.getElementById(x.field), p = document.createElement('p');
      p.className = 'err'; p.id = x.field + '-err'; p.textContent = x.msg;
      if (x.field === 'bk-type-fs') { el.appendChild(p); el.setAttribute('aria-describedby', p.id); }
      else { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', p.id + (el.id === 'bk-topic' ? ' bk-topic-hint' : '')); (el.closest('.field') || el.parentNode).appendChild(p); }
    });
    box.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var t = document.getElementById(a.getAttribute('href').slice(1));
        if (t) { (t.id === 'bk-type-fs' ? t.querySelector('input') : t).focus(); }
      });
    });
    var alert = box.firstChild; alert.focus(); alert.scrollIntoView({ block: 'center' });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (submitting) return;
    var errs = [], type = selectedType(), text = topic.value.trim();
    if (!type) errs.push({ field: 'bk-type-fs', msg: 'เลือกช่องทางปรึกษา' });
    if (text.length < 10) errs.push({ field: 'bk-topic', msg: 'เล่าเรื่องที่อยากปรึกษาอย่างน้อย 10 ตัวอักษร (ตอนนี้ ' + text.length + ' ตัว)' });
    else if (text.length > 300) errs.push({ field: 'bk-topic', msg: 'เรื่องที่ปรึกษายาวเกิน 300 ตัวอักษร (ตอนนี้ ' + text.length + ' ตัว) ตัดให้สั้นลง' });
    if (!ack.checked) errs.push({ field: 'bk-ack', msg: 'ติ๊กรับทราบเรื่องความเชื่อและนโยบายยกเลิกก่อน' });
    if (errs.length) { showErrs(errs); return; }
    clearErrs();
    submitting = true;
    var btn = document.getElementById('bk-submit'); btn.disabled = true; btn.textContent = 'กำลังจอง…';
    var r = MH.commerce.createBooking(e.id, slot.id, type, text);
    if (r.error) {
      submitting = false; btn.disabled = false; btn.textContent = 'ยืนยันและไปชำระเงิน';
      if (r.error.indexOf('จองไปแล้ว') >= 0) {
        state('ช่วงเวลานี้ไม่ว่างแล้ว', 'มีคนจองเวลานี้ไปก่อนหน้านี้ไม่นาน เลือกเวลาอื่นของ' + e.display_name + 'ได้ที่หน้าโปรไฟล์', '<a class="btn btn--primary" href="' + h(expertUrl) + '#cal-h">เลือกเวลาใหม่</a>', '⌛');
      } else {
        document.getElementById('bk-errs').innerHTML = '<div class="notice notice--danger form-err" role="alert" tabindex="-1"><span>' + h(r.error) + '</span></div>';
        document.getElementById('bk-errs').firstChild.focus();
      }
      return;
    }
    location.href = MH.pay.url(r.payment);
  });

  sumMoney(); updCount();
})();
