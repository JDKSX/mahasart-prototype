/* หลังบ้าน: รายละเอียดคำสั่งซื้อ ?id= — ข้อมูลครบ · ประวัติการชำระ · ปุ่มตามสถานะ (ต้อง orders.manage)
   paid → เริ่มแพ็ก · packing → จัดส่ง (บังคับเลขพัสดุ EB123456789TH) · shipped → ส่งถึงแล้ว · ยกเลิก/คืนเงิน (ต้องใส่เหตุผล)
   ใบปะหน้าพัสดุ: ส่วนที่ซ่อนอยู่ แสดงเมื่อกดพิมพ์ แล้วเรียก window.print() */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store, A = MH.admin;
  function $(id) { return document.getElementById(id); }
  var root = $('od-root'), headBox = $('od-head'), main = $('main');
  var canManage = MH.auth.can('orders.manage');
  var TRACK_RE = /^[A-Z]{2}[0-9]{9}TH$/;
  var id = MH.util.param('id');

  function pill(status) { return '<span class="sh-pill sh-pill--o-' + h(status) + '">' + h(MH.labels.orderStatus[status] || status) + '</span>'; }
  function payPill(status) { return '<span class="sh-pill sh-pill--p-' + h(status) + '">' + h(MH.labels.paymentStatus[status] || status) + '</span>'; }
  function addrText(a) {
    if (!a) return '-';
    var bkk = a.province === 'กรุงเทพมหานคร';
    return h(a.line) + '<br>' + (bkk ? 'แขวง' : 'ต.') + h(a.subdistrict) + ' ' + (bkk ? 'เขต' : 'อ.') + h(a.district) + '<br>' + (bkk ? '' : 'จ.') + h(a.province) + ' ' + h(a.postcode);
  }
  function nowISO() { return new Date().toISOString(); }
  /* ปิดรายการชำระที่ค้างหลังยกเลิกคำสั่งซื้อที่ยังไม่ชำระ (ผ่าน MH.pay.expire ไม่แก้ตาราง payments ตรง ๆ) */
  function closePending(orderId) {
    MH.pay.forPayable('order', orderId).filter(function (p) { return p.status === 'pending'; }).forEach(function (p) { MH.pay.expire(p.id); });
  }

  /* ---------- กล่องฟอร์มสั้น ๆ (ใส่เลขพัสดุ / เหตุผลยกเลิก) → Promise<values|null> ---------- */
  function formDialog(o) {
    return new Promise(function (resolve) {
      var d = document.createElement('dialog'); d.className = 'dialog dialog--wide';
      d.setAttribute('aria-labelledby', 'fd-title');
      d.innerHTML = '<form novalidate><div class="d-body"><h2 id="fd-title">' + h(o.title) + '</h2>' + o.html + '</div>' +
        '<div class="d-foot"><button type="button" class="btn btn--outline" data-cancel>ยกเลิก</button><button type="submit" class="btn ' + (o.okClass || 'btn--primary') + '">' + h(o.okLabel) + '</button></div></form>';
      document.body.appendChild(d);
      var f = d.querySelector('form'), done = false;
      function finish(v) { if (done) return; done = true; resolve(v); }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var r = o.validate(f);
        if (!A.showErrors(f, r.errs)) return;
        finish(r.values); d.close();
      });
      d.querySelector('[data-cancel]').addEventListener('click', function () { finish(null); d.close(); });
      d.addEventListener('cancel', function () { finish(null); });
      d.addEventListener('close', function () { finish(null); setTimeout(function () { d.remove(); }, 0); });
      d.showModal();
      var first = f.querySelector('input,textarea'); if (first) first.focus();
    });
  }

  /* ---------- การกระทำ ---------- */
  function fresh() { return S.find('orders', id); }

  function startPacking() {
    var o = fresh();
    if (!o || o.status !== 'paid') { MH.ui.toast('เริ่มแพ็กไม่ได้ สถานะคำสั่งซื้อเปลี่ยนไปแล้ว'); render(); return; }
    S.update('orders', o.id, { status: 'packing', packing_at: nowISO() }, 'update');
    MH.ui.toast('เริ่มแพ็กแล้ว'); render();
  }

  function ship() {
    var o = fresh();
    if (!o || o.status !== 'packing') { MH.ui.toast('จัดส่งไม่ได้ ต้องอยู่ในสถานะ “กำลังแพ็ก” ก่อน'); render(); return; }
    formDialog({
      title: 'จัดส่ง ' + o.order_no,
      html: '<p class="muted">ใส่เลขพัสดุ EMS ให้ลูกค้าเห็นในคำสั่งซื้อของเขา ใส่แล้วสถานะจะเป็น “จัดส่งแล้ว”</p>' +
        '<div class="field"><label for="trk-input">เลขพัสดุ <span class="req" aria-hidden="true">*</span></label>' +
        '<input class="input" id="trk-input" autocomplete="off" autocapitalize="characters" maxlength="13" aria-required="true">' +
        '<p class="hint">ตัวอักษร 2 ตัว ตัวเลข 9 ตัว ลงท้าย TH เช่น EB123456789TH</p></div>',
      okLabel: 'บันทึกและจัดส่ง',
      validate: function (f) {
        var v = f.querySelector('#trk-input').value.replace(/\s+/g, '').toUpperCase(), errs = [];
        if (!v) errs.push({ field: 'trk-input', msg: 'กรอกเลขพัสดุก่อนจัดส่ง' });
        else if (!TRACK_RE.test(v)) errs.push({ field: 'trk-input', msg: 'รูปแบบเลขพัสดุไม่ถูกต้อง ต้องเป็นตัวอักษร 2 ตัว ตัวเลข 9 ตัว ลงท้าย TH เช่น EB123456789TH' });
        else {
          var dup = S.all('orders').filter(function (x) { return x.id !== o.id && x.tracking_no === v; })[0];
          if (dup) errs.push({ field: 'trk-input', msg: 'เลขพัสดุนี้ใช้กับคำสั่งซื้อ ' + dup.order_no + ' แล้ว ตรวจเลขอีกครั้ง' });
        }
        return { errs: errs, values: v };
      }
    }).then(function (v) {
      if (!v) return;
      var cur = fresh();
      if (!cur || cur.status !== 'packing') { MH.ui.toast('สถานะคำสั่งซื้อเปลี่ยนไปแล้ว'); render(); return; }
      S.update('orders', cur.id, { status: 'shipped', tracking_no: v, shipped_at: nowISO() }, 'ship');
      MH.ui.toast('จัดส่งแล้ว เลขพัสดุ ' + v); render();
    });
  }

  function deliver() {
    var o = fresh();
    MH.ui.confirm({ title: 'ยืนยันว่าส่งถึงลูกค้าแล้ว?', body: 'ใช้เมื่อขนส่งแจ้งว่าส่งถึงแล้ว หรือลูกค้าแจ้งว่าได้รับของ คำสั่งซื้อ ' + o.order_no + ' จะปิดเป็น “ได้รับสินค้าแล้ว”', okLabel: 'ส่งถึงแล้ว' }).then(function (ok) {
      if (!ok) return;
      var cur = fresh();
      if (!cur || cur.status !== 'shipped') { MH.ui.toast('สถานะคำสั่งซื้อเปลี่ยนไปแล้ว'); render(); return; }
      S.update('orders', cur.id, { status: 'delivered', delivered_at: nowISO() }, 'deliver');
      MH.ui.toast('บันทึกว่าส่งถึงแล้ว'); render();
    });
  }

  function cancel() {
    var o = fresh(), paid = o.payment_status === 'paid';
    formDialog({
      title: (paid ? 'ยกเลิกและคืนเงิน ' : 'ยกเลิก ') + o.order_no,
      html: '<p class="muted">' + (paid ? 'ลูกค้าชำระเงินแล้ว สถานะจะเป็น “คืนเงินแล้ว” และการชำระเงินถูกทำเป็นคืนเงิน ต้องโอนเงินคืนลูกค้าตามจริงนอกระบบนี้ ' : 'คำสั่งซื้อนี้ยังไม่ชำระเงิน ') +
        'สินค้าที่จองไว้จะคืนเข้าสต็อกทันที ทำย้อนกลับไม่ได้</p>' +
        '<div class="field"><label for="cancel-reason">เหตุผล (ลูกค้าจะเห็น) <span class="req" aria-hidden="true">*</span></label>' +
        '<textarea class="textarea" id="cancel-reason" maxlength="200" rows="3" aria-required="true"></textarea><p class="hint">เช่น สินค้าชำรุดก่อนส่ง หรือลูกค้าขอยกเลิก สูงสุด 200 ตัวอักษร</p></div>',
      okLabel: paid ? 'ยืนยันยกเลิกและคืนเงิน' : 'ยืนยันยกเลิก', okClass: 'btn--danger',
      validate: function (f) {
        var v = f.querySelector('#cancel-reason').value.trim(), errs = [];
        if (!v) errs.push({ field: 'cancel-reason', msg: 'กรอกเหตุผลที่ยกเลิก ลูกค้าจะเห็นข้อความนี้' });
        else if (v.length < 5) errs.push({ field: 'cancel-reason', msg: 'เหตุผลสั้นเกินไป เขียนให้ลูกค้าเข้าใจ (อย่างน้อย 5 ตัวอักษร)' });
        return { errs: errs, values: v };
      }
    }).then(function (reason) {
      if (!reason) return;
      var cur = fresh();
      if (!cur || ['pending_payment', 'paid', 'packing'].indexOf(cur.status) < 0) { MH.ui.toast('ยกเลิกไม่ได้ สถานะคำสั่งซื้อเปลี่ยนไปแล้ว'); render(); return; }
      if (MH.commerce.cancelOrder(cur.id, reason)) { closePending(cur.id); MH.ui.toast(cur.payment_status === 'paid' ? 'ยกเลิกและคืนเงินแล้ว สต็อกคืนให้แล้ว' : 'ยกเลิกแล้ว สต็อกคืนให้แล้ว'); }
      else MH.ui.toast('ยกเลิกไม่ได้');
      render();
    });
  }

  /* ---------- ใบปะหน้าพัสดุ ---------- */
  function labelHtml(o) {
    var a = o.shipping || {}, its = S.all('order_items').filter(function (i) { return i.order_id === o.id; });
    return '<h2>ใบปะหน้าพัสดุ · ' + h(String(o.shipping_method || 'ems').toUpperCase()) + '</h2>' +
      '<p>ผู้ส่ง: ' + h(S.setting('site_name') || 'MAHASART') + ' · LINE ' + h(S.setting('line_oa_id') || '') + '</p><hr>' +
      '<p>ผู้รับ</p><p class="sh-to">' + h(a.name) + '</p><p>โทร ' + h(a.phone) + '</p><p>' + addrText(a) + '</p>' +
      '<p class="sh-zip">' + h(a.postcode) + '</p><hr>' +
      '<p>เลขพัสดุ: <b>' + (o.tracking_no ? h(o.tracking_no) : 'ยังไม่มี (ใส่เมื่อจัดส่ง)') + '</b></p>' +
      '<p>คำสั่งซื้อ: <b>' + h(o.order_no) + '</b></p>' +
      '<ul>' + its.map(function (i) { return '<li>' + h(i.code) + ' ' + h(i.name) + ' × ' + i.qty + '</li>'; }).join('') + '</ul>' +
      (o.note ? '<p>หมายเหตุลูกค้า: ' + h(o.note) + '</p>' : '');
  }
  function printLabel() {
    var o = fresh(); if (!o) return;
    var el = $('label-print');
    if (!el) { el = document.createElement('section'); el.id = 'label-print'; el.className = 'sh-label'; el.hidden = true; el.setAttribute('aria-label', 'ใบปะหน้าพัสดุสำหรับพิมพ์'); main.appendChild(el); }
    el.innerHTML = labelHtml(o);
    el.hidden = false; document.body.classList.add('is-printing');
    var restored = false;
    function restore() { if (restored) return; restored = true; el.hidden = true; document.body.classList.remove('is-printing'); window.removeEventListener('afterprint', restore); }
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(restore, 60000);
  }

  /* ---------- วาด ---------- */
  function render() {
    var o = id ? S.find('orders', id) : null;
    if (!o || o.deleted_at) {
      headBox.innerHTML = '<div><h1>ไม่พบคำสั่งซื้อ</h1></div><div class="btn-row"><a class="btn btn--outline" href="orders.html">กลับรายการ</a></div>';
      root.innerHTML = MH.ui.empty('ไม่พบคำสั่งซื้อนี้', 'ลิงก์อาจผิด หรือคำสั่งซื้อถูกลบไปแล้ว', '<a class="btn btn--primary" href="orders.html">กลับรายการคำสั่งซื้อ</a>');
      return;
    }
    document.title = o.order_no + ' · หลังบ้าน MAHASART';
    var member = o.member_id ? S.find('members', o.member_id) : null;
    var its = S.all('order_items').filter(function (i) { return i.order_id === o.id; });
    var pays = MH.pay.forPayable('order', o.id);
    var logs = S.all('audit_logs').filter(function (l) { return l.subject_type === 'orders' && l.subject_id === o.id; }).sort(function (a, b) { return b.id - a.id; }).slice(0, 10);
    var printable = ['paid', 'packing', 'shipped', 'delivered'].indexOf(o.status) >= 0;

    var btns = '<a class="btn btn--outline" href="orders.html">กลับรายการ</a>';
    if (printable) btns += '<button type="button" class="btn btn--outline" data-act="print">พิมพ์ใบปะหน้า</button>';
    if (canManage) {
      if (o.status === 'paid') btns += '<button type="button" class="btn btn--primary" data-act="pack">เริ่มแพ็ก</button>';
      if (o.status === 'packing') btns += '<button type="button" class="btn btn--primary" data-act="ship">จัดส่ง (ใส่เลขพัสดุ)</button>';
      if (o.status === 'shipped') btns += '<button type="button" class="btn btn--primary" data-act="deliver">ส่งถึงแล้ว</button>';
      if (['pending_payment', 'paid', 'packing'].indexOf(o.status) >= 0) btns += '<button type="button" class="btn btn--danger" data-act="cancel">' + (o.payment_status === 'paid' ? 'ยกเลิกและคืนเงิน' : 'ยกเลิกคำสั่งซื้อ') + '</button>';
    }
    headBox.innerHTML = '<div><h1>' + h(o.order_no) + '</h1><p class="head-meta">' + pill(o.status) + ' สั่งเมื่อ ' + h(MH.util.dateTime(o.created_at)) + '</p></div><div class="btn-row">' + btns + '</div>';

    var hint = '';
    if (!canManage) hint = '<div class="notice" role="note">' + h(MH.labels.role[A.user.role]) + ' ดูคำสั่งซื้อได้อย่างเดียว ถ้าต้องแพ็กหรือจัดส่งให้แจ้งผู้ดูแลแค็ตตาล็อก</div>';
    else if (o.status === 'pending_payment') hint = '<div class="notice notice--warn" role="note">รอลูกค้าชำระเงิน ถ้าเลยเวลา ระบบยกเลิกและคืนสต็อกเอง ยังแพ็กไม่ได้จนกว่าจะชำระแล้ว</div>';
    else if (o.status === 'shipped') hint = '<div class="notice" role="note">ส่งออกไปแล้วจึงยกเลิกหรือคืนเงินจากหน้านี้ไม่ได้ ถ้าลูกค้าขอคืน ให้รอรับพัสดุคืนแล้วจัดการนอกระบบนี้</div>';
    else if (o.status === 'cancelled' || o.status === 'refunded') hint = '<div class="notice notice--danger" role="note"><span><b>' + h(MH.labels.orderStatus[o.status]) + '</b> ' + h(o.cancelled_reason || '') + '</span></div>';

    var dates = [['สั่งซื้อ', o.created_at], ['ชำระเงิน', o.paid_at], ['เริ่มแพ็ก', o.packing_at], ['จัดส่ง', o.shipped_at], ['ส่งถึง', o.delivered_at]]
      .map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + (r[1] ? h(MH.util.dateTime(r[1])) : '<span class="muted">-</span>') + '</dd>'; }).join('');

    root.innerHTML = hint + '<div class="sh-adm-grid"><div>' +
      '<section class="sh-adm-card" aria-labelledby="od-items"><h2 id="od-items">รายการสินค้า</h2><div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายการสินค้าในคำสั่งซื้อ</caption>' +
        '<thead><tr><th scope="col">รหัส</th><th scope="col">สินค้า</th><th scope="col">ราคา</th><th scope="col">จำนวน</th><th scope="col">รวม</th></tr></thead><tbody>' + its.map(function (i) {
          return '<tr><td data-label="รหัส" class="num">' + h(i.code) + '</td><td data-label="สินค้า">' + h(i.name) + '</td><td data-label="ราคา" class="num">' + h(MH.money(i.price)) + '</td><td data-label="จำนวน" class="num">' + i.qty + '</td><td data-label="รวม" class="num">' + h(MH.money(i.price * i.qty)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="sh-row"><span>ค่าสินค้า</span><b>' + h(MH.money(o.subtotal)) + '</b></div>' +
        '<div class="sh-row"><span>ค่าส่ง (' + h(String(o.shipping_method || 'ems').toUpperCase()) + ')</span><b>' + (o.shipping_fee ? h(MH.money(o.shipping_fee)) : 'ส่งฟรี') + '</b></div>' +
        '<div class="sh-row sh-row--total"><span>ยอดรวม</span><b>' + h(MH.money(o.total)) + '</b></div></section>' +
      '<section class="sh-adm-card" aria-labelledby="od-addr"><h2 id="od-addr">ที่อยู่จัดส่ง</h2><address class="sh-addr"><b>' + h((o.shipping || {}).name) + '</b> · ' + h((o.shipping || {}).phone) + '<br>' + addrText(o.shipping) + '</address>' +
        (o.note ? '<p class="sh-note">หมายเหตุจากลูกค้า: ' + h(o.note) + '</p>' : '') + '</section>' +
      '<section class="sh-adm-card" aria-labelledby="od-pay"><h2 id="od-pay">ประวัติการชำระเงิน</h2>' + (pays.length ? '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">ประวัติการชำระเงินของคำสั่งซื้อ</caption>' +
        '<thead><tr><th scope="col">รหัส</th><th scope="col">ยอด</th><th scope="col">สถานะ</th><th scope="col">เวลา</th><th scope="col">อ้างอิงธนาคาร</th></tr></thead><tbody>' + pays.map(function (p) {
          return '<tr><td data-label="รหัส" class="num">' + h(p.ref) + '</td><td data-label="ยอด" class="num">' + h(MH.money(p.amount)) + '</td><td data-label="สถานะ">' + payPill(p.status) + '</td>' +
            '<td data-label="เวลา">' + h(p.paid_at ? 'ชำระ ' + MH.util.dateTime(p.paid_at) : (p.status === 'pending' ? 'หมดเวลา ' + MH.util.dateTime(p.expires_at) : MH.util.dateTime(p.created_at))) + '</td><td data-label="อ้างอิงธนาคาร">' + (p.gateway_ref ? h(p.gateway_ref) : '<span class="muted">-</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted">ยังไม่มีรายการชำระเงิน</p>') + '</section></div>' +
      '<div><section class="sh-adm-card" aria-labelledby="od-st"><h2 id="od-st">สถานะและวันที่</h2><dl class="sh-kv"><dt>สถานะ</dt><dd>' + pill(o.status) + '</dd><dt>การชำระเงิน</dt><dd>' + payPill(o.payment_status) + '</dd>' + dates + '</dl></section>' +
      '<section class="sh-adm-card" aria-labelledby="od-trk"><h2 id="od-trk">พัสดุ</h2>' + (o.tracking_no
        ? '<div class="sh-track"><code>' + h(o.tracking_no) + '</code></div><p class="sh-note">ส่งด้วย ' + h(String(o.shipping_method || 'ems').toUpperCase()) + (o.shipped_at ? ' · จัดส่ง ' + h(MH.util.dateShort(o.shipped_at)) : '') + '</p>'
        : '<p class="muted">ยังไม่มีเลขพัสดุ ใส่ได้ตอนกด “จัดส่ง”</p>') + '</section>' +
      '<section class="sh-adm-card" aria-labelledby="od-cu"><h2 id="od-cu">ลูกค้า</h2><dl class="sh-kv"><dt>สมาชิก</dt><dd>' + h(member ? member.display_name : '-') + '</dd><dt>อีเมล</dt><dd>' + h(member ? member.email : '-') + '</dd><dt>เข้าสู่ระบบด้วย</dt><dd>' + h(member ? (MH.labels.provider[member.auth_provider] || member.auth_provider) : '-') + '</dd></dl></section>' +
      '<section class="sh-adm-card" aria-labelledby="od-log"><h2 id="od-log">ประวัติการดำเนินการ</h2>' + (logs.length ? '<ul class="sh-log">' + logs.map(function (l) {
        return '<li><span>' + h(MH.labels.action[l.action] || l.action) + ' · ' + h(l.user_id ? A.userName(l.user_id) : 'ลูกค้า/ระบบ') + '</span><time datetime="' + h(l.created_at) + '">' + h(MH.util.dateTime(l.created_at)) + '</time></li>';
      }).join('') + '</ul>' : '<p class="muted">ยังไม่มีบันทึก</p>') + '</section></div></div>';
  }

  headBox.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'print') printLabel();
    else if (!canManage) MH.ui.toast('บทบาทนี้ทำรายการนี้ไม่ได้');
    else if (act === 'pack') startPacking();
    else if (act === 'ship') ship();
    else if (act === 'deliver') deliver();
    else if (act === 'cancel') cancel();
  });

  render();
})();
