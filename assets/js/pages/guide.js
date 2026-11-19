/* หน้าคู่มือผู้ทดสอบ: รายการ 6 อย่างที่ทำเครื่องหมายได้ (เก็บใน localStorage mh_guide_done) + ปุ่มส่งความเห็น */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var KEY = 'mh_guide_done';
  var TASKS = [
    { id: 'horo', t: 'ดูดวงทักษา แล้วกด "ให้ AI อธิบายผลนี้"', href: 'taksa.html' },
    { id: 'article', t: 'อ่านบทความในคลังความรู้', href: 'articles.html' },
    { id: 'amulet', t: 'ใส่วัตถุมงคลลงตะกร้า แล้วไปจนถึงหน้าจ่ายเงิน (จำลอง)', href: 'amulets.html' },
    { id: 'booking', t: 'จองผู้เชี่ยวชาญ', href: 'experts.html' },
    { id: 'course', t: 'เรียนคอร์สจนได้เกียรติบัตร', href: 'courses.html' },
    { id: 'admin', t: 'ลองหลังบ้าน (เลือกบทบาทได้ ไม่มีรหัสผ่าน)', href: 'admin/login.html' }
  ];
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  var done = load();

  var list = document.getElementById('guide-list');
  list.innerHTML = TASKS.map(function (k, i) {
    return '<li class="guide-item"><input type="checkbox" id="gt-' + k.id + '" data-id="' + k.id + '"' + (done.indexOf(k.id) >= 0 ? ' checked' : '') + '>' +
      '<label for="gt-' + k.id + '">' + (i + 1) + '. ' + h(k.t) + '</label>' +
      '<a class="btn btn--outline" href="' + k.href + '">ไปหน้านี้</a></li>';
  }).join('');

  function progress() {
    document.getElementById('guide-progress').textContent = 'ทำแล้ว ' + done.length + ' จาก ' + TASKS.length + ' อย่าง';
  }
  list.addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-id');
    if (!id) return;
    var i = done.indexOf(id);
    if (e.target.checked && i < 0) done.push(id);
    if (!e.target.checked && i >= 0) done.splice(i, 1);
    save(done); progress();
  });
  progress();

  var url = MH.store.setting('feedback_url');
  document.getElementById('guide-feedback').innerHTML = url
    ? '<a class="btn btn--primary" href="' + h(url) + '" target="_blank" rel="noopener">ส่งความเห็น</a>'
    : '<p class="guide-note">ลิงก์แบบสอบถามจะมาเร็ว ๆ นี้</p>';
})();
