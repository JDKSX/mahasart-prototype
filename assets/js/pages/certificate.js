/* เกียรติบัตร: ?no=CERT-2569-0001 · ใครมีเลขที่ก็ตรวจสอบได้ (แสดงชื่อ ไม่แสดงอีเมล) · พิมพ์ A4 แนวนอนด้วย window.print()
   ไม่มีเลขที่ในลิงก์ = แสดงช่องตรวจสอบเลขที่ · เลขที่ไม่ถูกต้อง = ไม่พบ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('cert-root');

  function crumbs(last) {
    return '<nav class="crumbs no-print" aria-label="เส้นทางหน้า"><a href="index.html">หน้าแรก</a><span aria-hidden="true">›</span><a href="courses.html">คอร์สเรียน</a><span aria-hidden="true">›</span><span aria-current="page">' + h(last) + '</span></nav>';
  }
  function verifyForm(prefill, err) {
    return '<form class="crt-form" id="verify-form" novalidate><div class="field"><label for="cert-no">เลขที่เกียรติบัตร</label>' +
      '<input class="input" id="cert-no" type="text" autocomplete="off" spellcheck="false" placeholder="เช่น CERT-2569-0001" value="' + h(prefill || '') + '"' + (err ? ' aria-invalid="true" aria-describedby="cert-err"' : '') + '>' +
      (err ? '<p class="err" id="cert-err" role="alert">' + h(err) + '</p>' : '') + '</div>' +
      '<button type="submit" class="btn btn--primary">ตรวจสอบเลขที่</button></form>';
  }

  var no = (MH.util.param('no') || '').trim();
  var en = no ? MH.store.all('course_enrollments').filter(function (e) { return e.certificate_no && e.certificate_no.toUpperCase() === no.toUpperCase(); })[0] : null;
  var course = en ? MH.store.find('courses', en.course_id) : null;

  if (!en || !course) {
    document.title = (no ? 'ไม่พบเกียรติบัตร' : 'ตรวจสอบเกียรติบัตร') + ' · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs(no ? 'ไม่พบเกียรติบัตร' : 'ตรวจสอบเกียรติบัตร') + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">?</p><h1>' + (no ? 'ไม่พบเกียรติบัตรเลขที่นี้' : 'ตรวจสอบเกียรติบัตร') + '</h1>' +
      '<p>' + (no ? 'เลขที่ “' + h(no) + '” ไม่ตรงกับเกียรติบัตรใดในระบบ ตรวจตัวอักษรและขีดกลางอีกครั้ง' : 'กรอกเลขที่ที่อยู่บนเกียรติบัตรเพื่อตรวจสอบว่าเป็นของจริง') + '</p>' +
      '<div class="crt-verify">' + verifyForm(no, '') + '</div>' +
      '<div class="btn-row"><a class="btn btn--outline" href="courses.html">ดูคอร์สเรียน</a></div></div>';
  } else {
    var member = MH.store.find('members', en.member_id);
    var expert = MH.store.find('experts', course.expert_id);
    var minutes = MH.q.lessons(course.id).reduce(function (s, l) { return s + (Number(l.minutes) || 0); }, 0);
    var name = member && member.display_name ? member.display_name : 'ผู้เรียน';
    var when = en.completed_at || en.updated_at;
    document.title = 'เกียรติบัตร ' + en.certificate_no + ' · MAHASART';
    root.innerHTML =
      '<div class="page-head no-print">' + crumbs('เกียรติบัตร') + '<h1>เกียรติบัตร</h1><p class="lede">เลขที่ ' + h(en.certificate_no) + ' · ตรวจสอบแล้วว่ามีอยู่ในระบบ</p></div>' +
      '<div class="crt-wrap">' +
        '<div class="crt-tools no-print"><p class="notice notice--ok" role="status"><span><b>เลขที่นี้ถูกต้อง</b> ออกให้ ' + h(name) + ' สำหรับคอร์ส “' + h(course.title) + '” (ไม่แสดงอีเมลของผู้เรียน)</span></p>' +
          '<div class="btn-row"><button type="button" class="btn btn--primary" id="print-btn">' + MH.ui.icon('i-copy') + 'พิมพ์เกียรติบัตร</button></div></div>' +
        '<article class="crt" aria-label="เกียรติบัตร"><div class="crt-in">' +
          '<svg class="crt-logo" aria-hidden="true"><use href="#logo"/></svg>' +
          '<p class="crt-org">MAHASART · ศูนย์รวมศาสตร์แห่งปัญญา</p>' +
          '<h2 class="crt-title">เกียรติบัตร</h2>' +
          '<p class="crt-sub">ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า</p>' +
          '<p class="crt-name">' + h(name) + '</p>' +
          '<p class="crt-sub">ได้เรียนจบและผ่านแบบทดสอบของคอร์ส</p>' +
          '<p class="crt-course">' + h(course.title) + '</p>' +
          '<p class="crt-meta">เวลาเรียนรวม ' + minutes + ' นาที · เรียนจบเมื่อ ' + h(MH.util.dateLong(when)) + '</p>' +
          '<div class="crt-sign"><div><b>' + h(expert ? expert.display_name : 'ผู้สอน') + '</b><span>ผู้สอน</span></div><div><b>MAHASART</b><span>ผู้ออกเกียรติบัตร</span></div></div>' +
          '<p class="crt-no">เลขที่ <b>' + h(en.certificate_no) + '</b> · ตรวจสอบได้ที่ ' + h((MH.store.setting('site_url') || 'https://mahasart.net').replace(/^https?:\/\//, '')) + '/certificate.html</p>' +
        '</div></article>' +
        '<div class="crt-verify no-print"><p class="crs-note">เมื่อพิมพ์ ให้เลือกกระดาษ A4 แนวนอน (ปิดส่วนหัวและท้ายกระดาษของเบราว์เซอร์เพื่อความสวยงาม) ต้นแบบนี้ใช้ข้อมูลตัวอย่าง</p>' +
          '<section class="card" aria-labelledby="ver-h"><h2 class="card-h" id="ver-h">ตรวจสอบเกียรติบัตรเลขที่อื่น</h2>' + verifyForm('', '') + '</section></div>' +
      '</div>';
    /* พิมพ์ A4 แนวนอนไร้ขอบ: ใส่ @page ผ่าน CSSOM เฉพาะหน้านี้ (ไม่กระทบการพิมพ์หน้าอื่นที่โหลด courses.css และไม่ใช้ <style> แบบ inline) */
    try { var st = document.createElement('style'); document.head.appendChild(st); st.sheet.insertRule('@page{size:A4 landscape;margin:0}', 0); } catch (e) { /* เบราว์เซอร์ไม่รองรับ: ผู้ใช้เลือกแนวนอนเอง */ }
    var pb = document.getElementById('print-btn');
    if (pb) pb.addEventListener('click', function () { window.print(); });
  }

  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'verify-form') return;
    e.preventDefault();
    var v = document.getElementById('cert-no').value.trim();
    if (!v) {
      var f = e.target, field = f.querySelector('.field');
      if (!field.querySelector('.err')) {
        var p = document.createElement('p'); p.className = 'err'; p.id = 'cert-err'; p.setAttribute('role', 'alert'); p.textContent = 'กรอกเลขที่เกียรติบัตรก่อน เช่น CERT-2569-0001';
        field.appendChild(p);
      }
      var inp = document.getElementById('cert-no'); inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', 'cert-err'); inp.focus();
      return;
    }
    location.href = 'certificate.html?no=' + encodeURIComponent(v);
  });
})();
