/* หลังบ้าน: หน้าคงที่ 4 หน้า (เกี่ยวกับเรา นโยบายความเป็นส่วนตัว เงื่อนไขการใช้งาน คำชี้แจงเรื่องความเชื่อ)
   แก้ชื่อกับเนื้อหา · ดูตัวอย่างสดด้วย renderBody · เพิ่ม/ลบหน้าไม่ได้ */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, A = MH.admin, S = MH.store;
  function $(id) { return document.getElementById(id); }
  var root = $('root');
  var curId = null, form = null, guard = null;

  function pages() { return S.all('pages').sort(function (a, b) { return a.id - b.id; }); }

  root.innerHTML = '<div class="pg-layout"><nav class="pg-list" aria-label="เลือกหน้าคงที่"><ul id="pg-items"></ul></nav><div id="pg-edit"></div></div>';

  function renderList() {
    $('pg-items').innerHTML = pages().map(function (p) {
      var on = p.id === curId;
      return '<li><button type="button" class="pg-item" data-id="' + p.id + '"' + (on ? ' aria-current="true"' : '') + '>' +
        '<b>' + h(p.title) + '</b><span class="muted">/' + h(p.slug) + ' · แก้ไข ' + h(MH.util.dateShort(p.updated_at)) + '</span></button></li>';
    }).join('');
  }

  function open(id) {
    var p = S.find('pages', id);
    if (!p || p.deleted_at) { $('pg-edit').innerHTML = MH.ui.empty('ไม่พบหน้านี้', 'เลือกหน้าจากรายการด้านซ้าย'); return; }
    curId = p.id;
    try { history.replaceState(null, '', location.pathname + '?slug=' + encodeURIComponent(p.slug)); } catch (e) { /* ไม่เป็นไร */ }
    renderList();
    var viewUrl = '../page.html?slug=' + encodeURIComponent(p.slug);
    $('pg-edit').innerHTML = '<form id="pg-form" novalidate><section class="form-section" aria-labelledby="pg-h">' +
      '<h2 id="pg-h">แก้ไขหน้า “' + h(p.title) + '”</h2>' +
      '<p class="hint">ลิงก์ของหน้านี้คือ page.html?slug=' + h(p.slug) + ' (เปลี่ยนไม่ได้) · แก้ไขล่าสุด ' + h(MH.util.dateTime(p.updated_at)) + ' โดย ' + h(A.userName(p.updated_by)) + '</p>' +
      '<div class="field"><label for="pg-title">ชื่อหน้า</label><input class="input" id="pg-title" value="' + h(p.title) + '" autocomplete="off"></div>' +
      '<div class="pg-split">' +
        '<div class="field"><label for="pg-body">เนื้อหา</label><textarea class="textarea textarea--tall" id="pg-body">' + h(p.body) + '</textarea>' +
        '<p class="hint">เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่ · ขึ้นต้นบรรทัดด้วย ## เป็นหัวข้อ · ขึ้นต้นด้วย - เป็นรายการ</p></div>' +
        '<div class="field"><span class="label">ตัวอย่างที่ผู้เข้าชมเห็น</span><div class="pg-prev card"><div class="pv-title" id="pv-title"></div><div class="prose" id="pv-body"></div></div></div>' +
      '</div></section>' +
      '<div class="form-actions"><button type="submit" class="btn btn--primary">บันทึกหน้านี้</button>' +
      '<a class="btn btn--outline" href="' + viewUrl + '" target="_blank" rel="noopener">ดูหน้านี้บนเว็บ ↗</a></div></form>';
    form = $('pg-form');
    A.counter($('pg-title'), 100);
    guard = A.dirtyGuard(form);
    paint();
    form.addEventListener('input', paint);
    form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
  }

  function paint() {
    $('pv-title').textContent = $('pg-title').value.trim() || '(ยังไม่มีชื่อหน้า)';
    $('pv-body').innerHTML = MH.util.renderBody($('pg-body').value) || '<p class="muted">(ยังไม่มีเนื้อหา)</p>';
  }

  function save() {
    var title = $('pg-title').value.trim(), body = $('pg-body').value.trim(), errs = [];
    if (!title) errs.push({ field: 'pg-title', msg: 'กรอกชื่อหน้า ชื่อนี้แสดงเป็นหัวข้อและในเมนูท้ายเว็บ' });
    else if (title.length > 100) errs.push({ field: 'pg-title', msg: 'ชื่อหน้ายาวเกิน 100 ตัวอักษร (ตอนนี้ ' + title.length + ')' });
    if (!body) errs.push({ field: 'pg-body', msg: 'กรอกเนื้อหา หน้าที่ไม่มีเนื้อหาจะว่างเปล่าบนเว็บ' });
    var bad = MH.util.bannedIn(title + '\n' + body);
    if (body && bad.length) errs.push({ field: 'pg-body', msg: 'เนื้อหามีคำต้องห้าม: ' + bad.join(', ') + ' (ถ้าเป็นประโยคปฏิเสธ ให้มีคำว่า “ไม่” นำหน้า)' });
    if (!A.showErrors(form, errs)) return;
    var before = S.find('pages', curId);
    if (before.title === title && before.body === body) { guard.clean(); MH.ui.toast('ยังไม่มีอะไรเปลี่ยน'); return; }
    S.update('pages', curId, { title: title, body: body });
    guard.clean();
    MH.ui.toast('บันทึกหน้า “' + title + '” แล้ว');
    open(curId);
  }

  $('pg-items').addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'); if (!b) return;
    var id = Number(b.getAttribute('data-id')); if (id === curId) return;
    if (guard && guard.isDirty()) {
      MH.ui.confirm({ title: 'มีการแก้ไขที่ยังไม่บันทึก', body: 'ถ้าไปหน้าอื่น สิ่งที่แก้ไว้ในหน้านี้จะหายไป', okLabel: 'ทิ้งการแก้ไข', danger: true }).then(function (ok) {
        if (ok) { guard.clean(); open(id); }
      });
    } else open(id);
  });

  var first = S.all('pages').filter(function (p) { return p.slug === MH.util.param('slug'); })[0] || pages()[0];
  if (!first) root.innerHTML = MH.ui.empty('ยังไม่มีหน้าคงที่', 'ข้อมูลหน้าคงที่หายไป ใช้ปุ่ม “คืนค่าข้อมูลตัวอย่าง” ที่เมนูด้านซ้ายล่าง');
  else open(first.id);
})();
