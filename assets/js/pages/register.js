/* สมัครสมาชิก: อีเมล + รหัสผ่าน (ต้นแบบไม่เก็บรหัสผ่าน) หรือ LINE / Google ผ่านทางเดียวกับหน้า login
   ต้องโหลด login.js ก่อน (ตัวช่วย MH.memberAuth) */
(function () {
  'use strict';
  var MH = window.MH, S = MH.store, AU = MH.memberAuth;
  function $(id) { return document.getElementById(id); }

  var nx = AU.nextParam();
  if (nx) $('to-login').href = 'login.html?next=' + encodeURIComponent(nx);

  document.querySelectorAll('[data-provider]').forEach(function (b) {
    b.addEventListener('click', function () { AU.social(b.getAttribute('data-provider')); });
  });

  /* อีเมลที่ใช้ได้อยู่แล้วตามกฎกลาง · บัญชีที่สมาชิกลบเองแล้วถือว่าว่าง สมัครใหม่ด้วยอีเมลเดิมได้ */
  function taken(email) {
    var e = email.toLowerCase();
    return MH.member.emailTaken(email) && S.all('members').some(function (m) { return m.email.toLowerCase() === e; });
  }

  var form = $('reg-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('rg-name').value.trim(), email = $('rg-email').value.trim(), p1 = $('rg-pass').value, p2 = $('rg-pass2').value, errs = [];
    if (!name) errs.push({ field: 'rg-name', msg: 'กรอกชื่อที่แสดง' });
    else if (name.length > 60) errs.push({ field: 'rg-name', msg: 'ชื่อยาวเกิน 60 ตัวอักษร (ตอนนี้ ' + name.length + ')' });
    if (!email) errs.push({ field: 'rg-email', msg: 'กรอกอีเมล ใช้เข้าสู่ระบบและรับแจ้งเตือนคำสั่งซื้อ' });
    else if (!AU.EMAIL_RE.test(email)) errs.push({ field: 'rg-email', msg: 'อีเมลไม่ถูกรูปแบบ ต้องมี @ และโดเมน เช่น name@example.com' });
    else if (taken(email)) errs.push({ field: 'rg-email', msg: 'อีเมลนี้มีบัญชีอยู่แล้ว ไปหน้าเข้าสู่ระบบแทน หรือใช้อีเมลอื่น' });
    if (!p1) errs.push({ field: 'rg-pass', msg: 'ตั้งรหัสผ่าน' });
    else if (p1.length < 8) errs.push({ field: 'rg-pass', msg: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร (ตอนนี้ ' + p1.length + ' ตัว)' });
    if (!p2) errs.push({ field: 'rg-pass2', msg: 'พิมพ์รหัสผ่านอีกครั้งเพื่อยืนยัน' });
    else if (p1 && p2 !== p1) errs.push({ field: 'rg-pass2', msg: 'รหัสผ่านสองช่องไม่ตรงกัน พิมพ์ใหม่ให้เหมือนกัน' });
    if (!$('rg-terms').checked) errs.push({ field: 'rg-terms', msg: 'ต้องยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัคร' });
    if (!AU.showErrors(form, errs)) return;

    MH.member.register({ display_name: name, email: email, auth_provider: 'email', consent_marketing: $('rg-marketing').checked, terms_accepted_at: new Date().toISOString() });
    var r = MH.member.login('email', { email: email });
    if (r.error) { AU.showErrors(form, [{ field: 'rg-email', msg: r.error }]); return; }
    MH.ui.toast('สมัครสมาชิกแล้ว ยินดีต้อนรับคุณ ' + r.member.display_name);
    setTimeout(AU.goAfter, 500);
  });
})();
