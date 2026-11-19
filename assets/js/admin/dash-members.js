/* ส่วนเพิ่มบนแดชบอร์ด: สรุปสมาชิก (เฉพาะผู้มีสิทธิ์ members.view) — สมาชิกทั้งหมด สมัครใหม่ 7 วัน พรีเมียม แยกตามช่องทาง */
(function () {
  'use strict';
  var MH = window.MH;
  if (!MH.admin || !MH.admin.allowed || !MH.admin.can('members.view')) return;
  var host = document.getElementById('dash-extra'); if (!host) return;
  var h = MH.util.h;

  var members = MH.store.all('members'), total = members.length;
  var weekAgo = Date.now() - 7 * 864e5;
  var fresh = members.filter(function (m) { return new Date(m.created_at).getTime() >= weekAgo; }).length;
  var premium = members.filter(function (m) { return MH.member.isPremium(m); }).length;
  var suspended = members.filter(function (m) { return m.status === 'suspended'; }).length;
  var byProv = Object.keys(MH.labels.provider).map(function (k) {
    return { key: k, label: MH.labels.provider[k], n: members.filter(function (m) { return m.auth_provider === k; }).length };
  });

  var sec = document.createElement('section');
  sec.className = 'card'; sec.setAttribute('aria-labelledby', 'dm-h');
  sec.innerHTML =
    '<div class="sec-head"><h2 id="dm-h">สมาชิก</h2><a href="members.html">ดูรายชื่อทั้งหมด</a></div>' +
    '<p class="sec-note">สมัครผ่านหน้าเว็บ · ไม่แสดงวันเกิดหรือข้อมูลส่วนตัวในแดชบอร์ด</p>' +
    '<div class="kpis">' +
      '<a class="kpi" href="members.html"><b>' + total + '</b><span>สมาชิกทั้งหมด</span>' + (suspended ? '<span class="note">ระงับอยู่ ' + suspended + ' คน</span>' : '') + '</a>' +
      '<div class="kpi"><b>' + fresh + '</b><span>สมัครใหม่ใน 7 วัน</span></div>' +
      '<a class="kpi" href="members.html?plan=premium"><b>' + premium + '</b><span>สมาชิกพรีเมียม</span></a>' +
    '</div>' +
    '<p class="sec-note">แยกตามช่องทางสมัคร</p>' +
    byProv.map(function (p) {
      return '<div class="bar-row"><span><a href="members.html?provider=' + h(p.key) + '">' + h(p.label) + '</a></span><div class="bar" role="img" aria-label="' + h(p.label) + ' ' + p.n + ' จาก ' + total + ' คน"><i data-w="' + (total ? Math.round(p.n / total * 100) : 0) + '"></i></div><span class="v">' + p.n + '</span></div>';
    }).join('');
  host.appendChild(sec);
  sec.querySelectorAll('.bar i[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
})();
