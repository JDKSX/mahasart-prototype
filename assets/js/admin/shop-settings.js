/* หลังบ้าน: ตั้งค่าร้านค้า — ค่าส่ง · ยอดส่งฟรี · เวลาชำระ (5–120 นาที) · ชื่อบัญชีพร้อมเพย์
   ตรวจตัวเลขก่อนบันทึก แล้วบันทึกด้วย MH.store.setSetting (ลง audit ให้อัตโนมัติ) */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store, A = MH.admin;
  function $(id) { return document.getElementById(id); }
  var root = $('ss-root');
  var KEYS = ['shipping_fee', 'free_shipping_min', 'payment_timeout_min', 'promptpay_display_name'];

  function cur() { var o = {}; KEYS.forEach(function (k) { o[k] = S.setting(k); }); return o; }
  function num(v) { return v == null ? '' : String(v); }

  function preview(v) {
    var fee = Number(v.shipping_fee) || 0, min = Number(v.free_shipping_min) || 0;
    return 'ลูกค้าจะเห็น: ค่าส่ง EMS ' + MH.money(fee) + (min ? ' · ส่งฟรีเมื่อซื้อสินค้าครบ ' + MH.money(min) : ' · ไม่มีส่งฟรี') + ' · ต้องชำระภายใน ' + (v.payment_timeout_min || '-') + ' นาที · ชื่อบัญชีรับเงิน “' + (v.promptpay_display_name || '-') + '”';
  }

  function render() {
    var v = cur();
    root.innerHTML = '<form id="ss-form" novalidate>' +
      '<section class="form-section" aria-labelledby="s-ship"><h2 id="s-ship">การจัดส่ง</h2><p class="hint">ใช้กับตะกร้าและหน้าสั่งซื้อทันที ไม่กระทบคำสั่งซื้อที่สั่งไปแล้ว</p>' +
        '<div class="sh-set-grid">' +
        '<div class="field"><label for="f-fee">ค่าส่ง EMS เหมาจ่าย <span class="req" aria-hidden="true">*</span></label><div class="sh-aff"><input class="input" id="f-fee" inputmode="numeric" value="' + h(num(v.shipping_fee)) + '" autocomplete="off" aria-required="true"><span>บาท</span></div><p class="hint">จำนวนเต็ม 0 ขึ้นไป (0 = ไม่คิดค่าส่ง)</p></div>' +
        '<div class="field"><label for="f-free">ส่งฟรีเมื่อค่าสินค้าครบ <span class="req" aria-hidden="true">*</span></label><div class="sh-aff"><input class="input" id="f-free" inputmode="numeric" value="' + h(num(v.free_shipping_min)) + '" autocomplete="off" aria-required="true"><span>บาท</span></div><p class="hint">จำนวนเต็ม 0 ขึ้นไป (0 = ไม่มีส่งฟรี) นับเฉพาะค่าสินค้า ไม่รวมค่าส่ง</p></div>' +
        '</div></section>' +
      '<section class="form-section" aria-labelledby="s-pay"><h2 id="s-pay">การชำระเงิน PromptPay</h2><p class="hint">ใช้กับทุกรายการที่ชำระที่หน้าชำระเงินกลาง ทั้งร้านค้า นัดผู้เชี่ยวชาญ คอร์ส และแพ็กเกจ</p>' +
        '<div class="sh-set-grid">' +
        '<div class="field"><label for="f-timeout">เวลาชำระ <span class="req" aria-hidden="true">*</span></label><div class="sh-aff"><input class="input" id="f-timeout" inputmode="numeric" value="' + h(num(v.payment_timeout_min)) + '" autocomplete="off" aria-required="true"><span>นาที</span></div><p class="hint">5–120 นาที เกินเวลาแล้วระบบยกเลิกและคืนสต็อกอัตโนมัติ</p></div>' +
        '<div class="field"><label for="f-acct">ชื่อบัญชีพร้อมเพย์ที่แสดง <span class="req" aria-hidden="true">*</span></label><input class="input" id="f-acct" value="' + h(v.promptpay_display_name || '') + '" maxlength="100" autocomplete="off" aria-required="true"><p class="hint">แสดงใต้ QR ให้ลูกค้าเช็กชื่อก่อนโอน สูงสุด 100 ตัวอักษร</p></div>' +
        '</div></section>' +
      '<div class="notice" id="ss-preview" role="status"></div>' +
      '<div class="form-actions"><button type="submit" class="btn btn--primary">บันทึกการตั้งค่า</button><button type="button" class="btn btn--outline" id="ss-reset">ยกเลิกการแก้ไข</button></div></form>';
    var form = $('ss-form'), guard = A.dirtyGuard(form);
    function read() { return { shipping_fee: $('f-fee').value.trim(), free_shipping_min: $('f-free').value.trim(), payment_timeout_min: $('f-timeout').value.trim(), promptpay_display_name: $('f-acct').value.trim() }; }
    function upd() { $('ss-preview').textContent = preview(read()); }
    form.addEventListener('input', upd); upd();
    $('ss-reset').addEventListener('click', function () { guard.clean(); render(); MH.ui.toast('คืนค่าที่บันทึกไว้แล้ว'); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = read(), errs = [], INT = /^\d+$/;
      if (!INT.test(r.shipping_fee)) errs.push({ field: 'f-fee', msg: 'ค่าส่งต้องเป็นจำนวนเต็ม 0 ขึ้นไป (ไม่คิดค่าส่งให้ใส่ 0)' });
      else if (Number(r.shipping_fee) > 9999) errs.push({ field: 'f-fee', msg: 'ค่าส่งสูงเกินไป ไม่เกิน 9,999 บาท' });
      if (!INT.test(r.free_shipping_min)) errs.push({ field: 'f-free', msg: 'ยอดส่งฟรีต้องเป็นจำนวนเต็ม 0 ขึ้นไป (ไม่มีส่งฟรีให้ใส่ 0)' });
      else if (Number(r.free_shipping_min) > 1000000) errs.push({ field: 'f-free', msg: 'ยอดส่งฟรีสูงเกินไป ไม่เกิน 1,000,000 บาท' });
      if (!INT.test(r.payment_timeout_min) || Number(r.payment_timeout_min) < 5 || Number(r.payment_timeout_min) > 120) errs.push({ field: 'f-timeout', msg: 'เวลาชำระต้องเป็นจำนวนเต็มนาที ระหว่าง 5 ถึง 120' });
      if (!r.promptpay_display_name) errs.push({ field: 'f-acct', msg: 'กรอกชื่อบัญชีพร้อมเพย์ที่จะแสดงใต้ QR' });
      else if (r.promptpay_display_name.length > 100) errs.push({ field: 'f-acct', msg: 'ชื่อบัญชียาวเกิน 100 ตัวอักษร (ตอนนี้ ' + r.promptpay_display_name.length + ')' });
      if (!A.showErrors(form, errs)) return;
      var before = cur(), changed = 0;
      [['shipping_fee', Number(r.shipping_fee)], ['free_shipping_min', Number(r.free_shipping_min)], ['payment_timeout_min', Number(r.payment_timeout_min)], ['promptpay_display_name', r.promptpay_display_name]].forEach(function (kv) {
        if (JSON.stringify(before[kv[0]]) !== JSON.stringify(kv[1])) { S.setSetting(kv[0], kv[1]); changed++; }
      });
      guard.clean();
      MH.ui.toast(changed ? 'บันทึกการตั้งค่าแล้ว (' + changed + ' รายการ)' : 'ไม่มีอะไรเปลี่ยน');
      render();
      window.scrollTo(0, 0);
    });
  }

  render();
})();
