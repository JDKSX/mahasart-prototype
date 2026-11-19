/* หน้าเข้าสู่ระบบจำลอง: เลือกผู้ใช้ตัวอย่างตามบทบาท */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var list = document.querySelector('[data-users]');
  var next = MH.util.param('next');
  /* กันการพาไปเว็บอื่น: รับเฉพาะชื่อไฟล์ในโฟลเดอร์ admin */
  if (!next || !/^[a-z-]+\.html(\?[\w=&%.-]*)?$/.test(next) || next.indexOf('login.html') === 0) next = 'index.html';

  var current = MH.auth.user();
  list.innerHTML = MH.store.all('users').map(function (u) {
    return '<li><button type="button" data-user="' + u.id + '"' + (u.is_active ? '' : ' disabled') + '>' +
      '<span class="av" aria-hidden="true">' + h(u.name.replace(/^อาจารย์/, '').trim().charAt(0)) + '</span>' +
      '<span><b>' + h(u.name) + (current && current.id === u.id ? ' (ใช้อยู่)' : '') + '</b>' +
      '<span>' + h(MH.labels.role[u.role]) + ' · ' + h(u.email) + (u.is_active ? '' : ' · ปิดใช้งานแล้ว') + '</span></span>' +
      '</button></li>';
  }).join('');

  list.addEventListener('click', function (e) {
    var b = e.target.closest('[data-user]'); if (!b || b.disabled) return;
    MH.auth.login(b.getAttribute('data-user'));
    location.href = next;
  });
})();
