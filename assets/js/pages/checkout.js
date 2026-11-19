/* สั่งซื้อ: ต้องเป็นสมาชิก · ฟอร์มที่อยู่แบบไทย (เติมจากคำสั่งซื้อล่าสุด) · สรุปสินค้าและค่าส่ง · ยืนยันเรื่องความเชื่อ
   กด "ไปชำระเงิน" → MH.commerce.placeOrder (จองสต็อก) → payment.html?ref=… */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, root = document.getElementById('checkout-root');
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });

  var PROVINCES = ['กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร',
    'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
    'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก',
    'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี',
    'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย',
    'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'];

  function state(big, title, text, btns, cls) {
    root.innerHTML = '<div class="state ' + (cls || '') + '"><p class="big" aria-hidden="true">' + big + '</p><h2>' + h(title) + '</h2><p>' + h(text) + '</p><div class="btn-row">' + btns + '</div></div>';
  }

  var member = MH.member.current();
  if (!member) {
    state('!', 'เข้าสู่ระบบก่อนสั่งซื้อ', 'การสั่งซื้อต้องเป็นสมาชิก เพื่อเก็บคำสั่งซื้อและเลขพัสดุไว้ให้ติดตาม ตะกร้าของคุณยังอยู่ครบ',
      '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบ</a><a class="btn btn--outline" href="cart.html">กลับไปตะกร้า</a>');
    return;
  }
  var items = MH.cart.items();
  if (!items.length) {
    root.innerHTML = MH.ui.empty('ตะกร้ายังว่าง', 'เลือกวัตถุมงคลใส่ตะกร้าก่อน แล้วค่อยกลับมากรอกที่อยู่', '<a class="btn btn--primary" href="amulets.html">ไปหน้าวัตถุมงคล</a>');
    return;
  }
  var bad = items.filter(function (x) { return x.problem; });
  if (bad.length) {
    state('!', 'ในตะกร้ามีรายการที่สั่งซื้อไม่ได้', bad.map(function (x) { return (x.amulet ? x.amulet.name : 'สินค้า') + ': ' + x.problem; }).join(' · ') + ' กลับไปแก้ที่ตะกร้าก่อน',
      '<a class="btn btn--primary" href="cart.html">กลับไปตะกร้า</a>', 'state--bad');
    return;
  }

  /* ที่อยู่ล่าสุดจากคำสั่งซื้อก่อนหน้า */
  var last = MH.store.all('orders', { withTrashed: true }).filter(function (o) { return o.member_id === member.id && o.shipping; })
    .sort(function (a, b) { return b.id - a.id; })[0];
  var pre = last ? last.shipping : { name: member.display_name, phone: String(member.phone || '').replace(/\D/g, ''), line: '', subdistrict: '', district: '', province: '', postcode: '' };
  var prefilled = !!last;

  var t = MH.cart.totals(items);
  var timeout = MH.store.setting('payment_timeout_min') || 30;

  function field(id, label, value, opts) {
    opts = opts || {};
    return '<div class="field' + (opts.full ? ' full' : '') + '"><label for="' + id + '">' + label + (opts.req === false ? '' : ' <span class="req" aria-hidden="true">*</span>') + '</label>' +
      '<input class="input" id="' + id + '" value="' + h(value || '') + '" autocomplete="' + (opts.ac || 'off') + '"' + (opts.mode ? ' inputmode="' + opts.mode + '"' : '') +
      (opts.max ? ' maxlength="' + opts.max + '"' : '') + (opts.req === false ? '' : ' aria-required="true"') + '>' + (opts.hint ? '<p class="hint" id="' + id + '-hint">' + opts.hint + '</p>' : '') + '</div>';
  }
  var provOpts = '<option value="">เลือกจังหวัด</option>' + PROVINCES.map(function (p) { return '<option' + (p === pre.province ? ' selected' : '') + '>' + h(p) + '</option>'; }).join('');

  root.innerHTML = '<div class="sh-grid">' +
    '<form class="sh-card sh-form" id="co-form" novalidate aria-labelledby="addr-h"><h2 id="addr-h">ที่อยู่จัดส่ง</h2>' +
    (prefilled ? '<p class="sh-note" id="prefill-note">เติมจากคำสั่งซื้อล่าสุดของคุณให้แล้ว (' + h(last.order_no) + ') แก้ได้ถ้าครั้งนี้ส่งที่อื่น</p>' : '') +
    '<div class="form-grid">' +
      field('co-name', 'ชื่อผู้รับ', pre.name, { ac: 'name' }) +
      field('co-phone', 'เบอร์โทรศัพท์', pre.phone, { ac: 'tel', mode: 'tel', hint: 'ขึ้นต้นด้วย 0 ตัวเลข 9–10 หลัก เช่น 0812345678' }) +
      field('co-line', 'ที่อยู่ (บ้านเลขที่ หมู่ ซอย ถนน)', pre.line, { full: true, ac: 'address-line1' }) +
      field('co-sub', 'ตำบล / แขวง', pre.subdistrict, { ac: 'address-level3' }) +
      field('co-dist', 'อำเภอ / เขต', pre.district, { ac: 'address-level2' }) +
      '<div class="field"><label for="co-prov">จังหวัด <span class="req" aria-hidden="true">*</span></label><select class="select" id="co-prov" autocomplete="address-level1" aria-required="true">' + provOpts + '</select></div>' +
      field('co-zip', 'รหัสไปรษณีย์', pre.postcode, { ac: 'postal-code', mode: 'numeric', max: 5, hint: 'ตัวเลข 5 หลัก' }) +
      '<div class="field full"><label for="co-note">หมายเหตุถึงร้าน <span class="muted">(ไม่บังคับ)</span></label><textarea class="textarea" id="co-note" maxlength="200" rows="3"></textarea><p class="hint">เช่น ฝากห่อกันกระแทก สูงสุด 200 ตัวอักษร</p></div>' +
    '</div>' +
    '<div class="sh-ack"><p><b>การสั่งซื้อวัตถุมงคลเป็นไปตามความเชื่อ ไม่รับประกันผล</b></p>' +
      '<div class="field"><label class="check" for="co-ack"><input type="checkbox" id="co-ack" aria-required="true"> <span>ฉันเข้าใจว่าสรรพคุณเป็นความเชื่อ และยืนยันการสั่งซื้อรายการด้านขวา</span></label></div></div>' +
    '<div class="sh-form-actions"><button type="submit" class="btn btn--primary" id="co-submit">ไปชำระเงิน' + MH.ui.icon('i-arrow') + '</button><a class="btn btn--outline" href="cart.html">กลับไปแก้ตะกร้า</a></div>' +
    '<p class="sh-note">กด “ไปชำระเงิน” แล้วระบบจะจองสินค้าให้ ต้องชำระผ่าน PromptPay ภายใน ' + timeout + ' นาที ถ้าเกินเวลา ระบบยกเลิกและคืนสต็อกให้อัตโนมัติ</p></form>' +
    '<aside class="sh-card sh-aside" aria-labelledby="sum-h"><h2 id="sum-h">สรุปรายการ</h2><ul class="sh-sum-items">' +
      items.map(function (it) { return '<li><span>' + h(it.amulet.name) + ' × ' + it.qty + '</span><span class="num">' + MH.money(it.line_total) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="sh-row"><span>ค่าสินค้า</span><b>' + MH.money(t.subtotal) + '</b></div>' +
      '<div class="sh-row"><span>ค่าส่ง (EMS)</span><b>' + (t.shipping_fee === 0 ? 'ส่งฟรี' : MH.money(t.shipping_fee)) + '</b></div>' +
      '<div class="sh-row sh-row--total"><span>ยอดชำระ</span><b>' + MH.money(t.total) + '</b></div>' +
      '<p class="sh-note"><a href="cart.html">แก้รายการในตะกร้า</a></p></aside></div>';

  var form = document.getElementById('co-form'), submit = document.getElementById('co-submit');
  function $(id) { return document.getElementById(id); }

  /* ---------- ตรวจและแสดงข้อผิดพลาด ---------- */
  function clearErrors() {
    form.querySelectorAll('.sh-errs, .field .err').forEach(function (n) { n.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
  }
  function showErrors(errs) {
    clearErrors();
    if (!errs.length) return true;
    var box = document.createElement('div'); box.className = 'sh-errs'; box.setAttribute('role', 'alert'); box.tabIndex = -1;
    box.innerHTML = '<h2>ยังไปชำระเงินไม่ได้ แก้ ' + errs.length + ' จุดนี้ก่อน</h2><ul>' + errs.map(function (e) { return '<li><a href="#' + e.field + '">' + h(e.msg) + '</a></li>'; }).join('') + '</ul>';
    form.prepend(box);
    errs.forEach(function (e) {
      var el = $(e.field); if (!el) return;
      el.setAttribute('aria-invalid', 'true');
      var p = document.createElement('p'); p.className = 'err'; p.id = e.field + '-err'; p.textContent = e.msg;
      el.setAttribute('aria-describedby', p.id);
      (el.closest('.field') || el.parentNode).appendChild(p);
    });
    box.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (ev) { ev.preventDefault(); var tg = $(a.getAttribute('href').slice(1)); if (tg) tg.focus(); });
    });
    box.focus();
    return false;
  }
  function collect() {
    return { name: $('co-name').value.trim(), phone: $('co-phone').value.trim(), line: $('co-line').value.trim(), subdistrict: $('co-sub').value.trim(),
      district: $('co-dist').value.trim(), province: $('co-prov').value, postcode: $('co-zip').value.trim(), note: $('co-note').value.trim(), ack: $('co-ack').checked };
  }
  function validate(v) {
    var e = [], digits = v.phone.replace(/[\s-]/g, '');
    if (!v.name) e.push({ field: 'co-name', msg: 'กรอกชื่อผู้รับ' });
    else if (v.name.length > 100) e.push({ field: 'co-name', msg: 'ชื่อผู้รับยาวเกิน 100 ตัวอักษร' });
    if (!v.phone) e.push({ field: 'co-phone', msg: 'กรอกเบอร์โทรศัพท์ให้ขนส่งติดต่อได้' });
    else if (!/^0\d{8,9}$/.test(digits)) e.push({ field: 'co-phone', msg: 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมีตัวเลข 9–10 หลัก เช่น 0812345678 (ตอนนี้ได้ ' + digits.replace(/\D/g, '').length + ' หลัก)' });
    if (!v.line) e.push({ field: 'co-line', msg: 'กรอกที่อยู่ (บ้านเลขที่ หมู่ ซอย ถนน)' });
    else if (v.line.length > 200) e.push({ field: 'co-line', msg: 'ที่อยู่ยาวเกิน 200 ตัวอักษร' });
    if (!v.subdistrict) e.push({ field: 'co-sub', msg: 'กรอกตำบล / แขวง' });
    if (!v.district) e.push({ field: 'co-dist', msg: 'กรอกอำเภอ / เขต' });
    if (!v.province || PROVINCES.indexOf(v.province) < 0) e.push({ field: 'co-prov', msg: 'เลือกจังหวัด' });
    if (!/^\d{5}$/.test(v.postcode)) e.push({ field: 'co-zip', msg: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก (ตอนนี้ ' + (v.postcode ? v.postcode.length + ' ตัวอักษร' : 'ยังว่าง') + ')' });
    if (v.note.length > 200) e.push({ field: 'co-note', msg: 'หมายเหตุยาวเกิน 200 ตัวอักษร' });
    if (!v.ack) e.push({ field: 'co-ack', msg: 'ติ๊กยืนยันว่าเข้าใจเรื่องความเชื่อและไม่รับประกันผลก่อน' });
    return e;
  }

  form.addEventListener('input', function (ev) {
    var el = ev.target, err = document.getElementById(el.id + '-err');
    if (err) { err.remove(); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
  });
  form.addEventListener('change', function (ev) {
    var el = ev.target, err = document.getElementById(el.id + '-err');
    if (err) { err.remove(); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
  });
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = collect();
    if (!showErrors(validate(v))) return;
    submit.disabled = true;
    var r = MH.commerce.placeOrder({ name: v.name, phone: v.phone.replace(/[\s-]/g, ''), line: v.line, subdistrict: v.subdistrict, district: v.district, province: v.province, postcode: v.postcode }, v.note);
    if (r.error || !r.payment) {
      submit.disabled = false;
      clearErrors();
      var box = document.createElement('div'); box.className = 'sh-errs'; box.setAttribute('role', 'alert'); box.tabIndex = -1;
      box.innerHTML = '<h2>สร้างคำสั่งซื้อไม่ได้</h2><p>' + h(r.error || 'เกิดข้อผิดพลาด ลองอีกครั้ง') + ' <a href="cart.html">กลับไปตะกร้า</a></p>';
      form.prepend(box); box.focus();
      return;
    }
    location.href = MH.pay.url(r.payment);
  });
})();
