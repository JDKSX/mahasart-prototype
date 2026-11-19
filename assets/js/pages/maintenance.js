/* หน้าปิดปรับปรุง: ถ้า maintenance_mode เปิดอยู่ → แจ้งปิดปรับปรุง · ถ้าปิดอยู่ → บอกว่าเว็บเปิดตามปกติ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('maint-root');
  var on = !!MH.store.setting('maintenance_mode');
  var staff = MH.auth.user();
  var oa = MH.store.setting('line_oa_id') || '@mahasart';

  if (on) {
    /* คนทั่วไปเห็นหน้านี้หน้าเดียว จึงซ่อนเมนูที่พาไปหน้าอื่น (ทุกหน้าจะเด้งกลับมาที่นี่) · ทีมงานที่ล็อกอินยังเข้าหน้าอื่นได้ */
    if (!staff) document.body.setAttribute('data-maint', 'on');
    document.title = 'ปิดปรับปรุงชั่วคราว · MAHASART';
    root.innerHTML =
      '<div class="soon-card">' +
        '<span class="soon-ico">' + MH.ui.icon('i-shield') + '</span>' +
        '<h1>เว็บปิดปรับปรุงชั่วคราว</h1>' +
        '<p class="lede">ทีมงานกำลังปรับปรุงระบบให้ใช้งานได้ดีขึ้น ขออภัยในความไม่สะดวก กลับมาใหม่อีกครั้งในอีกสักครู่</p>' +
        '<div class="btn-row"><button type="button" class="btn btn--primary" id="reload">' + MH.ui.icon('i-arrow') + 'ลองเปิดเว็บใหม่</button></div>' +
        (staff
          ? '<div class="notice notice--ok" role="status"><span>คุณเข้าสู่ระบบเป็นทีมงาน (' + h(staff.name) + ') จึงเปิดดูหน้าอื่นได้ปกติ <a href="index.html">ไปหน้าแรก</a></span></div>'
          : '') +
        '<p class="fine-print">มีเรื่องเร่งด่วน ติดต่อทาง LINE OA ' + h(oa) + '</p>' +
      '</div>';
    document.getElementById('reload').addEventListener('click', function () { location.href = 'index.html'; });
  } else {
    document.title = 'เว็บเปิดให้ใช้งานตามปกติ · MAHASART';
    root.innerHTML =
      '<div class="soon-card">' +
        '<span class="soon-ico">' + MH.ui.icon('i-unlock') + '</span>' +
        '<h1>เว็บเปิดให้ใช้งานตามปกติ</h1>' +
        '<p class="lede">ตอนนี้ไม่ได้อยู่ในช่วงปิดปรับปรุง ใช้งานได้ทุกหน้าตามปกติ</p>' +
        '<div class="btn-row"><a class="btn btn--primary" href="index.html">' + MH.ui.icon('i-home') + 'กลับหน้าแรก</a></div>' +
      '</div>';
  }
})();
