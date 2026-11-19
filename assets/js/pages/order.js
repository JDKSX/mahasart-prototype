/* คำสั่งซื้อของสมาชิก: order.html?no=MO-2569-0001
   ต้องเป็นเจ้าของ · timeline สถานะ · เลขพัสดุ (คัดลอกได้) · รายการสินค้า ที่อยู่ ยอด
   pending_payment → ไปชำระ/ยกเลิก · shipped → "ได้รับสินค้าแล้ว" */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store, root = document.getElementById('order-root');
  var heading = document.getElementById('page-h'), lede = document.getElementById('page-lede');
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = S.setting('disclaimer') || ''; });

  function state(big, title, text, btns, cls) {
    root.innerHTML = '<div class="state ' + (cls || '') + '"><p class="big" aria-hidden="true">' + big + '</p><h2>' + h(title) + '</h2><p>' + h(text) + '</p><div class="btn-row">' + btns + '</div></div>';
  }
  function pill(status) { return '<span class="sh-pill sh-pill--o-' + h(status) + '">' + h(MH.labels.orderStatus[status] || status) + '</span>'; }
  function addressHtml(a) {
    if (!a) return '-';
    var bkk = a.province === 'กรุงเทพมหานคร';
    return '<address class="sh-addr"><b>' + h(a.name) + '</b> · ' + h(a.phone) + '<br>' + h(a.line) + '<br>' + (bkk ? 'แขวง' : 'ต.') + h(a.subdistrict) + ' ' + (bkk ? 'เขต' : 'อ.') + h(a.district) + '<br>' +
      (bkk ? '' : 'จ.') + h(a.province) + ' ' + h(a.postcode) + '</address>';
  }
  /* ปิดรายการชำระที่ค้างหลังยกเลิก (ผ่าน MH.pay.expire เพื่อไม่แก้ตาราง payments ตรง ๆ) */
  function closePending(orderId) {
    MH.pay.forPayable('order', orderId).filter(function (p) { return p.status === 'pending'; }).forEach(function (p) { MH.pay.expire(p.id); });
  }

  function stepsHtml(o) {
    var reached = { pending_payment: 1, paid: 2, packing: 3, shipped: 4, delivered: 5 }[o.status], bad = null;
    if (o.status === 'cancelled') { reached = 1; bad = { at: 1, label: 'ยกเลิกคำสั่งซื้อ' }; }
    if (o.status === 'refunded') { reached = o.packing_at ? 3 : 2; bad = { at: reached, label: 'ยกเลิกและคืนเงิน' }; }
    var defs = [
      { t: 'สั่งซื้อ', d: o.created_at }, { t: 'ชำระแล้ว', d: o.paid_at }, { t: 'กำลังแพ็ก', d: o.packing_at },
      { t: 'จัดส่ง', d: o.shipped_at }, { t: 'ได้รับ', d: o.delivered_at }];
    var waitText = ['', 'รอชำระเงิน', 'รอแพ็ก', 'รอจัดส่ง', 'รอได้รับสินค้า'];
    return '<ol class="sh-steps" aria-label="สถานะคำสั่งซื้อ">' + defs.map(function (s, i) {
      var cls, title = s.t, date = s.d ? MH.util.dateShort(s.d) : '', cur = '';
      if (i < reached) cls = 'is-done';
      else if (bad && i === bad.at) { cls = 'is-bad'; title = bad.label; date = MH.util.dateShort(o.updated_at); }
      else if (!bad && i === reached) { cls = 'is-now'; title = waitText[i] || s.t; date = ''; cur = ' aria-current="step"'; }
      else cls = 'is-wait';
      if (i < reached && i === 0) date = MH.util.dateShort(o.created_at);
      return '<li class="sh-step ' + cls + '"' + cur + '><b>' + h(title) + '</b>' + (date ? '<span class="sh-step-d">' + h(date) + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
  }

  function render() {
    var member = MH.member.current();
    if (!member) {
      state('!', 'เข้าสู่ระบบก่อนดูคำสั่งซื้อ', 'คำสั่งซื้อดูได้เฉพาะเจ้าของที่เข้าสู่ระบบแล้ว', '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบ</a><a class="btn btn--outline" href="index.html">กลับหน้าแรก</a>');
      return;
    }
    var no = MH.util.param('no'), o = no ? S.all('orders').filter(function (x) { return x.order_no === no; })[0] : null;
    if (!o) {
      heading.textContent = 'ไม่พบคำสั่งซื้อ'; document.title = 'ไม่พบคำสั่งซื้อ · MAHASART'; lede.textContent = '';
      state('?', 'ไม่พบคำสั่งซื้อ', no ? 'ไม่มีคำสั่งซื้อเลขที่ ' + no + ' ตรวจเลขที่ในลิงก์อีกครั้ง' : 'ลิงก์นี้ไม่มีเลขที่คำสั่งซื้อ (ต้องเป็น order.html?no=MO-xxxx-xxxx)',
        '<a class="btn btn--primary" href="account.html?tab=orders">ดูคำสั่งซื้อของฉัน</a><a class="btn btn--outline" href="amulets.html">ไปหน้าวัตถุมงคล</a>');
      return;
    }
    if (o.member_id !== member.id) {
      heading.textContent = 'ไม่มีสิทธิ์ดูคำสั่งซื้อนี้'; document.title = 'ไม่มีสิทธิ์ · MAHASART'; lede.textContent = '';
      state('!', 'ไม่มีสิทธิ์ดูคำสั่งซื้อนี้', 'คำสั่งซื้อนี้ไม่ได้เป็นของบัญชีที่เข้าสู่ระบบอยู่ จึงไม่แสดงรายละเอียด', '<a class="btn btn--primary" href="account.html?tab=orders">ดูคำสั่งซื้อของฉัน</a>', 'state--bad');
      return;
    }
    heading.textContent = 'คำสั่งซื้อ ' + o.order_no; document.title = 'คำสั่งซื้อ ' + o.order_no + ' · MAHASART';
    lede.innerHTML = 'สั่งเมื่อ ' + h(MH.util.dateTime(o.created_at)) + ' · ' + pill(o.status);

    var its = S.all('order_items').filter(function (i) { return i.order_id === o.id; });
    var pays = MH.pay.forPayable('order', o.id), pendingPay = pays.filter(function (p) { return p.status === 'pending'; })[0];
    var notes = '';
    if (o.status === 'pending_payment') {
      notes = '<div class="notice notice--warn" role="status"><span><b>รอชำระเงิน</b> ' + (pendingPay ? 'ชำระภายใน ' + h(MH.util.dateTime(pendingPay.expires_at)) + ' ถ้าเลยเวลา ระบบยกเลิกและคืนสต็อกให้อัตโนมัติ' : 'ยังไม่มีรายการชำระที่เปิดอยู่') + '</span></div>';
    } else if (o.status === 'cancelled' || o.status === 'refunded') {
      notes = '<div class="notice notice--danger" role="status"><span><b>' + h(MH.labels.orderStatus[o.status]) + '</b> ' + h(o.cancelled_reason || '') + (o.status === 'refunded' ? ' ยอด ' + h(MH.money(o.total)) + ' คืนเงินให้ผ่านช่องทางเดิมแล้ว' : '') + '</span></div>';
    } else if (o.status === 'paid' || o.status === 'packing') {
      notes = '<div class="notice" role="status"><span>ชำระเงินแล้ว ทีมงานกำลังเตรียมพัสดุ จะใส่เลขพัสดุให้ที่หน้านี้เมื่อจัดส่ง ถ้าต้องการยกเลิกหลังชำระเงินแล้ว ติดต่อทีมงานทาง LINE OA</span></div>';
    }

    var track = '';
    if (o.tracking_no) {
      track = '<section class="sh-card" aria-labelledby="trk-h"><h2 id="trk-h">เลขพัสดุ</h2><div class="sh-track"><code id="trk-no">' + h(o.tracking_no) + '</code>' +
        '<button type="button" class="btn btn--outline btn--sm" id="trk-copy">' + MH.ui.icon('i-copy') + 'คัดลอกเลขพัสดุ</button></div>' +
        '<p class="sh-note">ส่งด้วย ' + h(String(o.shipping_method || 'ems').toUpperCase()) + ' · นำเลขนี้ไปติดตามที่เว็บไปรษณีย์ไทย' + (o.shipped_at ? ' · จัดส่งเมื่อ ' + h(MH.util.dateShort(o.shipped_at)) : '') + '</p></section>';
    }

    var actions = '';
    if (o.status === 'pending_payment') {
      actions = (pendingPay ? '<a class="btn btn--gold" id="go-pay" href="' + h(MH.pay.url(pendingPay)) + '">ไปชำระเงิน ' + h(MH.money(pendingPay.amount)) + '</a>' : '') +
        '<button type="button" class="btn btn--outline" id="cancel-order">ยกเลิกคำสั่งซื้อ</button>';
    } else if (o.status === 'shipped') {
      actions = '<button type="button" class="btn btn--primary" id="got-it">ได้รับสินค้าแล้ว</button>';
    }

    root.innerHTML = notes + '<div class="sh-grid"><div class="sh-stack">' +
      '<section class="sh-card" aria-labelledby="st-h"><h2 id="st-h">สถานะ</h2>' + stepsHtml(o) + '</section>' + track +
      '<section class="sh-card" aria-labelledby="it-h"><h2 id="it-h">รายการสินค้า</h2><ul class="sh-items">' + its.map(function (i) {
        var a = S.find('amulets', i.amulet_id), tone = a && a.tone === 'violet' ? ' thumb--violet' : '';
        return '<li><span class="thumb' + tone + '" aria-hidden="true">' + MH.ui.art(a ? a.art : 'a-none') + '</span><div><h3>' + h(i.name) + '</h3><p>รหัส ' + h(i.code) + ' · ' + h(MH.money(i.price)) + ' × ' + i.qty + '</p></div>' +
          '<span class="num">' + h(MH.money(i.price * i.qty)) + '</span></li>';
      }).join('') + '</ul></section></div>' +
      '<aside class="sh-stack sh-aside" aria-label="สรุปคำสั่งซื้อ"><section class="sh-card"><h2>ยอดชำระ</h2>' +
        '<div class="sh-row"><span>ค่าสินค้า</span><b>' + h(MH.money(o.subtotal)) + '</b></div>' +
        '<div class="sh-row"><span>ค่าส่ง (' + h(String(o.shipping_method || 'ems').toUpperCase()) + ')</span><b>' + (o.shipping_fee ? h(MH.money(o.shipping_fee)) : 'ส่งฟรี') + '</b></div>' +
        '<div class="sh-row sh-row--total"><span>ยอดรวม</span><b>' + h(MH.money(o.total)) + '</b></div>' +
        '<p class="sh-note">การชำระเงิน: ' + h(MH.labels.paymentStatus[o.payment_status] || o.payment_status) + (o.paid_at ? ' เมื่อ ' + h(MH.util.dateTime(o.paid_at)) : '') + ' · PromptPay</p>' +
        (actions ? '<div class="sh-cta">' + actions + '</div>' : '') + '</section>' +
      '<section class="sh-card"><h2>ที่อยู่จัดส่ง</h2>' + addressHtml(o.shipping) + (o.note ? '<p class="sh-note">หมายเหตุ: ' + h(o.note) + '</p>' : '') + '</section></aside></div>';

    var copy = document.getElementById('trk-copy');
    if (copy) copy.addEventListener('click', function () {
      var done = function () { MH.ui.toast('คัดลอกเลขพัสดุแล้ว'); };
      if (navigator.clipboard) navigator.clipboard.writeText(o.tracking_no).then(done, function () { MH.ui.toast('คัดลอกไม่ได้ ให้เลือกเลขพัสดุแล้วคัดลอกเอง'); });
      else MH.ui.toast('คัดลอกไม่ได้ ให้เลือกเลขพัสดุแล้วคัดลอกเอง');
    });
    var cancel = document.getElementById('cancel-order');
    if (cancel) cancel.addEventListener('click', function () {
      MH.ui.confirm({ title: 'ยกเลิกคำสั่งซื้อ ' + o.order_no + '?', body: 'สินค้าที่จองไว้จะคืนเข้าสต็อก และรายการชำระเงินที่ค้างจะถูกปิด ถ้าต้องการซื้ออีกต้องเลือกสินค้าใหม่', okLabel: 'ยกเลิกคำสั่งซื้อ', danger: true }).then(function (ok) {
        if (!ok) return;
        if (MH.commerce.cancelOrder(o.id, 'สมาชิกยกเลิกเอง ก่อนชำระเงิน')) { closePending(o.id); MH.ui.toast('ยกเลิกคำสั่งซื้อแล้ว'); } else MH.ui.toast('ยกเลิกไม่ได้ สถานะคำสั่งซื้อเปลี่ยนไปแล้ว');
        render();
      });
    });
    var got = document.getElementById('got-it');
    if (got) got.addEventListener('click', function () {
      MH.ui.confirm({ title: 'ยืนยันว่าได้รับสินค้าแล้ว?', body: 'ตรวจสินค้าให้ครบก่อนกดยืนยัน เมื่อยืนยันแล้วคำสั่งซื้อจะปิดและแก้กลับไม่ได้', okLabel: 'ได้รับสินค้าแล้ว' }).then(function (ok) {
        if (!ok) return;
        S.update('orders', o.id, { status: 'delivered', delivered_at: new Date().toISOString() }, 'deliver');
        MH.ui.toast('ขอบคุณ บันทึกว่าได้รับสินค้าแล้ว');
        render();
      });
    });
  }

  render();
})();
