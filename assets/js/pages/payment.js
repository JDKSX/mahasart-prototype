/* หน้าชำระเงิน PromptPay กลาง: payment.html?ref=PAY-xxxx
   ใช้ร่วมกันทุกประเภท (order · booking · enrollment · subscription) · ต้องล็อกอินและเป็นเจ้าของรายการ
   QR จำลอง + นับถอยหลังถึง expires_at + ปุ่ม "จำลองว่าโอนแล้ว" → MH.pay.markPaid
   ระบบจริง: ยืนยันจาก webhook ของธนาคาร/payment gateway เท่านั้น */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store, root = document.getElementById('payment-root');
  var heading = document.getElementById('page-h'), lede = document.getElementById('page-lede');
  var timer = null;

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function setHead(title, text) {
    heading.textContent = title; lede.textContent = text; document.title = title + ' · MAHASART';
  }
  function state(big, title, text, btns, cls) {
    stop();
    root.innerHTML = '<div class="state ' + (cls || '') + '"><p class="big" aria-hidden="true">' + big + '</p><h2>' + h(title) + '</h2><p>' + h(text) + '</p>' + (btns ? '<div class="btn-row">' + btns + '</div>' : '') + '</div>';
  }
  function two(n) { return ('0' + n).slice(-2); }
  function clock(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60);
    return (hh ? hh + ':' : '') + two(mm) + ':' + two(s % 60);
  }

  /* อธิบายสิ่งที่จ่าย: ชื่อ เลขอ้างอิง ปุ่มไปต่อตามสัญญา (PROTOTYPE_NOTES_P23 ข้อ 5) */
  function describe(p) {
    var kind = MH.labels.payableType[p.payable_type] || p.payable_type;
    var d = { kind: kind, ref: '-', lines: [], open: false, next: 'index.html', nextLabel: 'กลับหน้าแรก', again: 'index.html', againLabel: 'กลับหน้าแรก', later: null, laterLabel: '' };
    var rec;
    if (p.payable_type === 'order') {
      rec = S.find('orders', p.payable_id);
      d.again = 'amulets.html'; d.againLabel = 'ไปเลือกวัตถุมงคล';
      if (rec) {
        var its = S.all('order_items').filter(function (i) { return i.order_id === rec.id; });
        d.ref = rec.order_no; d.open = rec.status === 'pending_payment';
        d.lines.push(['สินค้า', its.map(function (i) { return i.name + ' × ' + i.qty; }).join(', ') || '-']);
        d.next = 'order.html?no=' + encodeURIComponent(rec.order_no); d.nextLabel = 'ดูคำสั่งซื้อ'; d.later = d.next; d.laterLabel = 'ไว้ชำระทีหลัง (ดูคำสั่งซื้อ)';
      }
    } else if (p.payable_type === 'booking') {
      rec = S.find('expert_bookings', p.payable_id);
      d.next = 'account.html?tab=bookings'; d.nextLabel = 'ดูการนัดหมายของฉัน'; d.again = 'experts.html'; d.againLabel = 'เลือกผู้เชี่ยวชาญใหม่';
      if (rec) {
        var ex = S.find('experts', rec.expert_id);
        d.ref = rec.booking_no; d.open = rec.status === 'pending_payment';
        d.lines.push(['ผู้เชี่ยวชาญ', ex ? ex.display_name : '-'], ['เวลานัด', rec.start_at ? MH.util.dateTime(rec.start_at) : '-'],
          ['ช่องทาง', (MH.labels.sessionType[rec.session_type] || rec.session_type) + ' · ' + rec.minutes + ' นาที']);
        if (rec.discount) d.lines.push(['ส่วนลดพรีเมียม', '-' + MH.money(rec.discount)]);
        d.later = d.next; d.laterLabel = 'ไว้ชำระทีหลัง (ดูการนัดหมาย)';
      }
    } else if (p.payable_type === 'enrollment') {
      rec = S.find('course_enrollments', p.payable_id);
      d.again = 'courses.html'; d.againLabel = 'ดูคอร์สเรียน';
      if (rec) {
        var c = S.find('courses', rec.course_id);
        d.ref = c ? c.title : '-'; d.open = rec.status === 'pending_payment';
        if (c) { d.next = 'course.html?slug=' + encodeURIComponent(c.slug); d.nextLabel = 'เริ่มเรียนคอร์ส'; d.later = d.next; d.laterLabel = 'ไว้ชำระทีหลัง (ดูหน้าคอร์ส)'; }
        d.lines.push(['คอร์ส', c ? c.title : '-']);
      }
    } else if (p.payable_type === 'subscription') {
      rec = S.find('subscriptions', p.payable_id);
      d.next = 'account.html?tab=plan'; d.nextLabel = 'ดูแพ็กเกจของฉัน'; d.again = 'pricing.html'; d.againLabel = 'ดูแพ็กเกจ';
      if (rec) {
        var pl = MH.q.plan(rec.plan_key);
        d.ref = (pl ? pl.name : rec.plan_key) + ' (รายเดือน)'; d.open = rec.status === 'pending_payment';
        d.lines.push(['แพ็กเกจ', pl ? pl.name : rec.plan_key], ['รอบบิล', 'รายเดือน ต่ออายุทีละ 1 เดือน']);
        d.later = d.next; d.laterLabel = 'ไว้ชำระทีหลัง (ดูแพ็กเกจ)';
      }
    }
    d.exists = !!rec;
    return d;
  }

  function summaryDl(p, d, extra) {
    var rows = [['รายการ', d.kind], ['เลขอ้างอิง', d.ref]].concat(d.lines).concat([['ยอดชำระ', MH.money(p.amount)], ['รหัสชำระเงิน', p.ref]]).concat(extra || []);
    return '<dl class="sh-kv">' + rows.map(function (r) { return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>'; }).join('') + '</dl>';
  }

  function render() {
    stop();
    var member = MH.member.current();
    if (!member) {
      setHead('ชำระเงิน', 'เข้าสู่ระบบก่อนจึงจะเห็นรายการชำระเงิน');
      state('!', 'เข้าสู่ระบบก่อนชำระเงิน', 'หน้านี้ดูได้เฉพาะเจ้าของรายการที่เข้าสู่ระบบแล้ว เข้าสู่ระบบแล้วระบบจะพากลับมาที่นี่',
        '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบ</a><a class="btn btn--outline" href="index.html">กลับหน้าแรก</a>');
      return;
    }
    var ref = MH.util.param('ref'), p = ref ? MH.pay.byRef(ref) : null;
    if (!p) {
      setHead('ไม่พบรายการชำระเงิน', 'ตรวจเลขอ้างอิงในลิงก์อีกครั้ง');
      state('?', 'ไม่พบรายการชำระเงิน', ref ? 'ไม่มีรายการชำระเงินเลขอ้างอิง ' + ref + ' ลิงก์อาจพิมพ์ผิดหรือรายการถูกลบแล้ว' : 'ลิงก์นี้ไม่มีเลขอ้างอิง (ต้องเป็น payment.html?ref=PAY-xxxx)',
        '<a class="btn btn--primary" href="account.html?tab=orders">ดูคำสั่งซื้อของฉัน</a><a class="btn btn--outline" href="index.html">กลับหน้าแรก</a>');
      return;
    }
    if (p.member_id !== member.id) {
      setHead('ไม่มีสิทธิ์ดูรายการนี้', 'รายการชำระเงินนี้เป็นของสมาชิกท่านอื่น');
      state('!', 'ไม่มีสิทธิ์ดูรายการนี้', 'รายการชำระเงินนี้ไม่ได้เป็นของบัญชีที่เข้าสู่ระบบอยู่ จึงไม่แสดงรายละเอียด ถ้าเป็นรายการของคุณ ให้เข้าสู่ระบบด้วยบัญชีที่สั่งซื้อ',
        '<a class="btn btn--primary" href="account.html?tab=orders">ดูคำสั่งซื้อของฉัน</a><a class="btn btn--outline" href="index.html">กลับหน้าแรก</a>', 'state--bad');
      return;
    }
    var d = describe(p);

    if (p.status === 'pending' && new Date(p.expires_at) <= new Date()) { MH.pay.expire(p.id); p = MH.pay.byRef(ref); }

    if (p.status === 'paid') {
      setHead('ชำระเงินสำเร็จ', 'ระบบบันทึกการชำระเงินแล้ว');
      root.innerHTML = '<div class="state state--ok"><p class="big" aria-hidden="true">✓</p><h2>ชำระเงินสำเร็จ</h2>' +
        '<p>' + h(d.kind) + ' ' + h(d.ref) + ' ยอด ' + h(MH.money(p.amount)) + (p.paid_at ? ' ชำระเมื่อ ' + h(MH.util.dateTime(p.paid_at)) : '') + '</p>' +
        '<div class="btn-row"><a class="btn btn--primary" id="pay-next" href="' + h(d.next) + '">' + h(d.nextLabel) + MH.ui.icon('i-arrow') + '</a><a class="btn btn--outline" href="index.html">กลับหน้าแรก</a></div></div>';
      return;
    }
    if (p.status === 'refunded') {
      setHead('คืนเงินแล้ว', 'รายการนี้ได้รับคืนเงินแล้ว');
      state('↺', 'รายการนี้คืนเงินแล้ว', d.kind + ' ' + d.ref + ' ยอด ' + MH.money(p.amount) + ' คืนเงินให้แล้ว หากไม่เห็นเงินคืนในบัญชี ติดต่อทีมงานทาง LINE OA',
        '<a class="btn btn--primary" href="' + h(d.next) + '">' + h(d.nextLabel) + '</a><a class="btn btn--outline" href="index.html">กลับหน้าแรก</a>');
      return;
    }
    if (p.status === 'expired') {
      setHead('หมดเวลาชำระเงิน', 'รายการนี้เลยเวลาที่กำหนดแล้ว');
      state('⏱', 'หมดเวลาชำระเงิน', d.kind + ' ' + d.ref + ' ไม่ได้ชำระภายในเวลาที่กำหนด ระบบยกเลิกรายการและคืนสินค้า/คิวให้แล้ว ไม่มีการตัดเงิน เลือกใหม่ได้เลย',
        '<a class="btn btn--primary" href="' + h(d.again) + '">' + h(d.againLabel) + '</a><a class="btn btn--outline" href="' + h(d.next) + '">' + h(d.nextLabel) + '</a>');
      return;
    }
    /* pending: รายการที่จ่ายต้องยังรอชำระอยู่ (กันจ่ายเข้ารายการที่ถูกยกเลิกไปแล้ว) */
    if (!d.exists || !d.open) {
      setHead('รายการนี้ถูกยกเลิกแล้ว', 'ไม่ต้องชำระเงิน');
      state('!', 'รายการนี้ถูกยกเลิกแล้ว', d.kind + ' ' + d.ref + ' ถูกยกเลิกหรือไม่อยู่ในสถานะรอชำระเงิน จึงไม่ต้องชำระและไม่มีการตัดเงิน',
        '<a class="btn btn--primary" href="' + h(d.again) + '">' + h(d.againLabel) + '</a>' + (d.exists ? '<a class="btn btn--outline" href="' + h(d.next) + '">' + h(d.nextLabel) + '</a>' : ''), 'state--bad');
      return;
    }

    setHead('ชำระเงินด้วย PromptPay', 'สแกน QR ด้วยแอปธนาคารภายในเวลาที่กำหนด');
    var exp = new Date(p.expires_at).getTime();
    var acct = S.setting('promptpay_display_name') || '';
    root.innerHTML = '<div class="sh-card"><div class="sh-pay">' +
      '<div class="sh-qr">' + MH.ui.promptpayQR(p.ref) + '<small>QR ตัวอย่าง สแกนจ่ายจริงไม่ได้</small>' +
        '<p class="sh-lbl">ชื่อบัญชีรับเงิน</p><p class="num">' + h(acct) + '</p></div>' +
      '<div class="sh-stack">' +
        '<div><p class="muted">ยอดที่ต้องชำระ</p><p class="sh-amount" id="pay-amount">' + h(MH.money(p.amount)) + '</p></div>' +
        '<div><p class="muted">เหลือเวลาชำระ</p><p class="sh-timer" id="pay-timer" role="timer" aria-live="off">--:--</p><p class="sh-sr-live" id="pay-timer-sr" aria-live="polite"></p>' +
          '<p class="sh-note">ถ้าเลยเวลา ระบบจะยกเลิกรายการและคืนสินค้า/คิวให้อัตโนมัติ</p></div>' +
        summaryDl(p, d) +
        '<div class="sh-sim"><p><b>เฉพาะต้นแบบ:</b> ในระบบจริงไม่มีปุ่มนี้ ธนาคารจะแจ้งผลการโอนมาที่ระบบและยืนยันให้อัตโนมัติ ลูกค้าไม่ต้องกดอะไร ปุ่มด้านล่างจำลองว่าธนาคารแจ้งผลแล้ว</p>' +
          '<div class="btn-row"><button type="button" class="btn btn--gold" id="pay-sim">จำลองว่าโอนแล้ว</button>' +
          (d.later ? '<a class="btn btn--outline" href="' + h(d.later) + '">' + h(d.laterLabel) + '</a>' : '') + '</div></div>' +
      '</div></div></div>';

    var tEl = document.getElementById('pay-timer'), sr = document.getElementById('pay-timer-sr'), lastMin = -1;
    function tick() {
      var left = exp - Date.now();
      if (left <= 0) { stop(); MH.pay.expire(p.id); render(); return; }
      tEl.textContent = clock(left);
      tEl.classList.toggle('is-low', left < 120000);
      var m = Math.floor(left / 60000);
      if (m !== lastMin && (m <= 5 || lastMin === -1)) { sr.textContent = 'เหลือเวลาชำระ ' + (m ? m + ' นาที' : 'ไม่ถึง 1 นาที'); }
      lastMin = m;
    }
    tick();
    timer = setInterval(tick, 1000);

    document.getElementById('pay-sim').addEventListener('click', function () {
      var r = MH.pay.markPaid(p.id);
      if (!r.ok) { MH.ui.toast(r.error || 'ยืนยันการชำระเงินไม่สำเร็จ'); render(); return; }
      MH.ui.toast('ชำระเงินสำเร็จ');
      render();
      var nx = document.getElementById('pay-next'); if (nx) nx.focus();
    });
  }

  render();
})();
