/* หลังบ้าน: รายชื่อสมาชิก — กรองช่องทาง/แพ็กเกจ/สถานะ + ค้นหา · ไม่แสดงวันเกิด · ลิงก์ไปรายละเอียด
   รับ ?provider= ?plan= ?status= ?q= จากแดชบอร์ด */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, S = MH.store;
  function $(id) { return document.getElementById(id); }
  var PROV = MH.labels.provider, STAT = MH.labels.memberStatus;

  $('f-provider').innerHTML = '<option value="">ทุกช่องทาง</option>' + Object.keys(PROV).map(function (k) { return '<option value="' + k + '">' + h(PROV[k]) + '</option>'; }).join('');
  $('f-plan').innerHTML = '<option value="">ทุกแพ็กเกจ</option>' + S.all('plans').map(function (p) { return '<option value="' + h(p.key) + '">' + h(p.name) + '</option>'; }).join('');
  $('f-status').innerHTML = '<option value="">ทุกสถานะ</option>' + Object.keys(STAT).map(function (k) { return '<option value="' + k + '">' + h(STAT[k]) + '</option>'; }).join('');
  [['provider', 'f-provider'], ['plan', 'f-plan'], ['status', 'f-status'], ['q', 'f-q']].forEach(function (p) {
    var v = MH.util.param(p[0]); if (v) $(p[1]).value = v;
  });

  function filtered() {
    var q = $('f-q').value.trim().toLowerCase(), pv = $('f-provider').value, pl = $('f-plan').value, st = $('f-status').value;
    return S.all('members').filter(function (m) {
      return (!pv || m.auth_provider === pv) && (!st || m.status === st) && (!pl || MH.member.plan(m).key === pl) &&
        (!q || (m.display_name + ' ' + m.email).toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id; });
  }

  function render() {
    var all = S.all('members').length, rows = filtered();
    $('mb-count').textContent = 'แสดง ' + rows.length + ' จากสมาชิกทั้งหมด ' + all + ' คน';
    if (!rows.length) {
      $('list').innerHTML = MH.ui.empty(all ? 'ไม่พบสมาชิกที่ตรงกับตัวกรอง' : 'ยังไม่มีสมาชิก',
        all ? 'ลองล้างตัวกรอง หรือค้นหาด้วยคำอื่น' : 'เมื่อมีคนสมัครที่หน้า register.html จะขึ้นที่นี่', all ? '<button type="button" class="btn btn--outline" id="clear-f">ล้างตัวกรอง</button>' : '');
      var c = $('clear-f'); if (c) c.addEventListener('click', function () { ['f-q', 'f-provider', 'f-plan', 'f-status'].forEach(function (id) { $(id).value = ''; }); render(); $('f-q').focus(); });
      return;
    }
    $('list').innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายชื่อสมาชิก</caption>' +
      '<thead><tr><th scope="col">ชื่อ</th><th scope="col">อีเมล</th><th scope="col">ช่องทาง</th><th scope="col">แพ็กเกจ</th><th scope="col">สถานะ</th><th scope="col">สมัครเมื่อ</th><th scope="col">เข้าล่าสุด</th><th scope="col"><span class="sr-only">การกระทำ</span></th></tr></thead><tbody>' +
      rows.map(function (m) {
        var plan = MH.member.plan(m), prem = plan.key === 'premium';
        return '<tr><td data-label="" class="nm"><a class="m-title" href="member-detail.html?id=' + m.id + '">' + h(m.display_name) + '</a></td>' +
          '<td data-label="อีเมล">' + h(m.email) + '</td>' +
          '<td data-label="ช่องทาง">' + h(PROV[m.auth_provider] || m.auth_provider) + '</td>' +
          '<td data-label="แพ็กเกจ">' + (prem ? '<span class="tag tag--stone">' + h(plan.name) + '</span>' : h(plan.name)) + '</td>' +
          '<td data-label="สถานะ"><span class="pill ' + (m.status === 'active' ? 'pill--published' : 'pill--danger') + '">' + h(STAT[m.status] || m.status) + '</span></td>' +
          '<td data-label="สมัครเมื่อ">' + h(MH.util.dateShort(m.created_at)) + '</td>' +
          '<td data-label="เข้าล่าสุด">' + (m.last_login_at ? h(MH.util.dateTime(m.last_login_at)) : '<span class="muted">ยังไม่เคยเข้า</span>') + '</td>' +
          '<td data-label="" class="acts"><a class="btn btn--outline btn--sm" href="member-detail.html?id=' + m.id + '" aria-label="ดูรายละเอียด ' + h(m.display_name) + '">ดูรายละเอียด</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  ['f-provider', 'f-plan', 'f-status'].forEach(function (id) { $(id).addEventListener('change', render); });
  $('f-q').addEventListener('input', render);
  render();
})();
