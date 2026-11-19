/* หลังบ้าน: ผู้ใช้ทีมงาน — เพิ่มผู้ใช้ เปลี่ยนบทบาท ปิด/เปิดใช้งาน
   กฎ: ปิดตัวเองไม่ได้ · เปลี่ยนบทบาทตัวเองไม่ได้ · ต้องเหลือผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อย 1 คน */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, A = MH.admin, S = MH.store;
  function $(id) { return document.getElementById(id); }

  var me = A.user;
  var ROLES = Object.keys(MH.labels.role);
  var ROLE_HINT = {
    admin: 'ทำได้ทุกอย่าง รวมจัดการผู้ใช้ ตั้งค่า และดูบันทึกการใช้งาน',
    editor: 'ตรวจและเผยแพร่บทความกับดวง 12 ราศี จัดหมวด หน้าแรก หน้าคงที่ ดูวัตถุมงคลได้อย่างเดียว',
    writer: 'เขียนบทความและดวง 12 ราศีของตัวเอง แล้วส่งให้บรรณาธิการตรวจ',
    catalog: 'จัดการวัตถุมงคลทั้งหมดและดูสถิติ',
    astrologer: 'แก้และอนุมัติตำรา ตรวจบทความโหราศาสตร์ไทย'
  };
  var addBtn = $('add-user'), panel = $('add-panel'), form = $('add-form');

  $('u-role').innerHTML = '<option value="">เลือกบทบาท</option>' + ROLES.map(function (r) { return '<option value="' + r + '">' + h(MH.labels.role[r]) + '</option>'; }).join('');

  /** ถ้าปรับผู้ใช้ u เป็นบทบาท/สถานะนี้ จะไม่เหลือผู้ดูแลระบบที่ใช้งานอยู่เลยหรือไม่ */
  function leavesNoAdmin(u, role, active) {
    return S.all('users').filter(function (x) {
      var r = x.id === u.id ? role : x.role, a = x.id === u.id ? active : x.is_active;
      return r === 'admin' && a;
    }).length === 0;
  }

  function render(focusSel) {
    var users = S.all('users').sort(function (a, b) { return a.id - b.id; });
    var admins = users.filter(function (u) { return u.role === 'admin' && u.is_active; }).length;
    $('list').innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">ผู้ใช้ทีมงาน</caption>' +
      '<thead><tr><th scope="col">ชื่อ</th><th scope="col">อีเมล</th><th scope="col">บทบาท</th><th scope="col">สถานะ</th><th scope="col">เข้าระบบล่าสุด</th><th scope="col"><span class="sr-only">การกระทำ</span></th></tr></thead><tbody>' +
      users.map(function (u) {
        var self = u.id === me.id;
        var opts = ROLES.map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + h(MH.labels.role[r]) + '</option>'; }).join('');
        return '<tr><td data-label="" class="nm"><b>' + h(u.name) + '</b>' + (self ? ' <span class="tag">คุณ</span>' : '') + '</td>' +
          '<td data-label="อีเมล">' + h(u.email) + '</td>' +
          '<td data-label="บทบาท"><label class="sr-only" for="role-' + u.id + '">บทบาทของ ' + h(u.name) + '</label>' +
            '<select class="select select--sm" id="role-' + u.id + '" data-role="' + u.id + '"' + (self ? ' disabled' : '') + '>' + opts + '</select></td>' +
          '<td data-label="สถานะ">' + (u.is_active ? '<span class="pill pill--published">ใช้งานอยู่</span>' : '<span class="pill pill--archived">ปิดใช้งาน</span>') + '</td>' +
          '<td data-label="เข้าระบบล่าสุด">' + (u.last_login_at ? h(MH.util.dateTime(u.last_login_at)) : '<span class="muted">ยังไม่เคยเข้า</span>') + '</td>' +
          '<td data-label="" class="acts">' +
            '<button type="button" class="btn ' + (u.is_active ? 'btn--danger-o' : 'btn--outline') + ' btn--sm" data-toggle="' + u.id + '"' + (self ? ' disabled aria-describedby="self-why"' : '') + ' aria-label="' + (u.is_active ? 'ปิดใช้งาน ' : 'เปิดใช้งาน ') + h(u.name) + '">' + (u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน') + '</button>' +
            (self ? '<p class="why" id="self-why">ปิดบัญชีหรือเปลี่ยนบทบาทของตัวเองไม่ได้</p>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="muted foot-note">ทีมงาน ' + users.length + ' คน · ผู้ดูแลระบบที่ใช้งานอยู่ ' + admins + ' คน (ต้องเหลืออย่างน้อย 1 คนเสมอ)</p>';
    if (focusSel) { var el = document.querySelector(focusSel); if (el) el.focus(); }
  }

  /* ---------- เปลี่ยนบทบาท / ปิด-เปิดใช้งาน ---------- */
  $('list').addEventListener('change', function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-role'); if (!id) return;
    var u = S.find('users', id), role = e.target.value;
    if (!u || role === u.role) return;
    var back = function () { render('#role-' + u.id); };
    if (u.id === me.id) { MH.ui.toast('เปลี่ยนบทบาทของตัวเองไม่ได้'); back(); return; }
    if (leavesNoAdmin(u, role, u.is_active)) { MH.ui.toast('ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อย 1 คน เปลี่ยนบทบาทนี้ไม่ได้'); back(); return; }
    function go() {
      S.update('users', u.id, { role: role });
      MH.ui.toast('เปลี่ยนบทบาทของ ' + u.name + ' เป็น' + MH.labels.role[role] + ' แล้ว');
      render('#role-' + u.id);
    }
    if (role === 'admin') {
      MH.ui.confirm({ title: 'ให้ ' + u.name + ' เป็นผู้ดูแลระบบ?', body: 'ผู้ดูแลระบบทำได้ทุกอย่าง รวมจัดการผู้ใช้และตั้งค่าเว็บ', okLabel: 'ให้เป็นผู้ดูแลระบบ' }).then(function (ok) { if (ok) go(); else back(); });
    } else go();
  });
  $('list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-toggle]'); if (!b || b.disabled) return;
    var u = S.find('users', b.getAttribute('data-toggle')); if (!u) return;
    if (u.id === me.id) { MH.ui.toast('ปิดบัญชีของตัวเองไม่ได้'); return; }
    var next = !u.is_active;
    if (!next && leavesNoAdmin(u, u.role, false)) { MH.ui.toast('ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อย 1 คน ปิดคนนี้ไม่ได้'); return; }
    function go() {
      S.update('users', u.id, { is_active: next });
      MH.ui.toast((next ? 'เปิดใช้งาน ' : 'ปิดใช้งาน ') + u.name + ' แล้ว');
      render('[data-toggle="' + u.id + '"]');
    }
    if (next) go();
    else MH.ui.confirm({ title: 'ปิดใช้งาน ' + u.name, body: 'ผู้ใช้นี้จะเข้าหลังบ้านไม่ได้ ข้อมูลและประวัติที่เคยทำยังอยู่ เปิดใช้งานกลับมาได้ภายหลัง', okLabel: 'ปิดใช้งาน', danger: true }).then(function (ok) { if (ok) go(); });
  });

  /* ---------- เพิ่มผู้ใช้ ---------- */
  function openAdd(open) {
    panel.hidden = !open; addBtn.setAttribute('aria-expanded', String(open));
    if (open) { $('u-name').focus(); panel.scrollIntoView({ block: 'nearest' }); }
    else { form.reset(); A.clearErrors(form); $('u-role-hint').textContent = ''; addBtn.focus(); }
  }
  addBtn.addEventListener('click', function () { openAdd(panel.hidden); });
  $('add-cancel').addEventListener('click', function () { openAdd(false); });
  $('u-role').addEventListener('change', function () { $('u-role-hint').textContent = this.value ? ROLE_HINT[this.value] : ''; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('u-name').value.trim(), email = $('u-email').value.trim(), role = $('u-role').value, errs = [];
    if (!name) errs.push({ field: 'u-name', msg: 'กรอกชื่อ-นามสกุล' });
    else if (name.length > 80) errs.push({ field: 'u-name', msg: 'ชื่อยาวเกิน 80 ตัวอักษร (ตอนนี้ ' + name.length + ')' });
    if (!email) errs.push({ field: 'u-email', msg: 'กรอกอีเมล ระบบจริงจะส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลนี้' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.push({ field: 'u-email', msg: 'อีเมลไม่ถูกรูปแบบ ต้องมี @ และโดเมน เช่น name@mahasart.net' });
    else if (S.all('users', { withTrashed: true }).some(function (u) { return String(u.email).toLowerCase() === email.toLowerCase(); })) {
      errs.push({ field: 'u-email', msg: 'อีเมลนี้มีผู้ใช้อยู่แล้ว ใช้อีเมลอื่น หรือเปิดใช้งานบัญชีเดิม' });
    }
    if (ROLES.indexOf(role) < 0) errs.push({ field: 'u-role', msg: 'เลือกบทบาทของผู้ใช้' });
    if (!A.showErrors(form, errs)) return;
    S.insert('users', { name: name, email: email, role: role, is_active: true, last_login_at: null });
    MH.ui.toast('เพิ่ม ' + name + ' แล้ว (ต้นแบบไม่ส่งอีเมลจริง ระบบจริงจะส่งลิงก์ตั้งรหัสผ่านไปที่ ' + email + ')');
    openAdd(false);
    render();
  });

  render();
})();
