/* ส่วนเพิ่มบนแดชบอร์ด (ลงใน #dash-extra ตามสิทธิ์):
   courses.view → คอร์สรอตรวจ + ผู้เรียนใหม่ 7 วัน (ผู้เชี่ยวชาญเห็นเฉพาะคอร์สของตัวเอง)
   revenue.view → รายได้เดือนนี้ + สมาชิกพรีเมียมที่ใช้งานอยู่ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin || !MH.admin.allowed) return;
  var host = document.getElementById('dash-extra'); if (!host) return;
  var me = MH.admin.user, can = function (p) { return MH.admin.can(p); };
  var money = function (n) { return MH.money(Math.round(n * 100) / 100); };
  var out = '';

  if (can('courses.view')) {
    var experts = MH.store.all('experts');
    var mine = me.role === 'expert' ? experts.filter(function (e) { return e.user_id === me.id; })[0] : null;
    var courses = MH.store.all('courses').filter(function (c) { return me.role !== 'expert' || (mine && c.expert_id === mine.id); });
    var ids = courses.map(function (c) { return c.id; });
    var weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    var newLearners = MH.store.all('course_enrollments').filter(function (en) {
      return ids.indexOf(en.course_id) >= 0 && en.status === 'active' && en.enrolled_at && new Date(en.enrolled_at).getTime() >= weekAgo;
    });
    var inReview = courses.filter(function (c) { return c.status === 'in_review'; });
    var drafts = courses.filter(function (c) { return c.status === 'draft'; });
    var exName = function (c) { var e = experts.filter(function (x) { return x.id === c.expert_id; })[0]; return e ? e.display_name : '-'; };
    out += '<section class="card" aria-labelledby="dc-h"><div class="sec-head"><h2 id="dc-h">' + (me.role === 'expert' ? 'คอร์สของฉัน' : 'คอร์สเรียน') + '</h2><a href="courses.html">ดูทั้งหมด</a></div>' +
      '<p class="stat-sum"><span>ผู้เรียนใหม่ 7 วัน <b>' + newLearners.length + '</b> คน</span><span>เผยแพร่แล้ว <b>' + courses.filter(function (c) { return c.status === 'published'; }).length + '</b> คอร์ส</span>' +
      (me.role === 'expert' ? '<span>ฉบับร่าง <b>' + drafts.length + '</b> คอร์ส</span>' : '') + '</p>' +
      (inReview.length
        ? '<h3 class="card-h">คอร์สรอตรวจ (' + inReview.length + ')</h3><ul class="task-list">' + inReview.map(function (c) {
          return '<li><a href="course-edit.html?id=' + c.id + '"><b>' + h(c.title) + '</b><span>ผู้สอน ' + h(exName(c)) + ' · อัปเดต ' + h(MH.util.dateShort(c.updated_at)) + '</span></a></li>';
        }).join('') + '</ul>'
        : '<p class="muted">ไม่มีคอร์สรอตรวจ</p>') + '</section>';
  }

  if (can('revenue.view')) {
    var now = new Date(), first = new Date(now.getFullYear(), now.getMonth(), 1);
    var paid = MH.store.all('payments').filter(function (p) { return p.status === 'paid' && new Date(p.paid_at || p.created_at) >= first; });
    var total = paid.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var subs = MH.store.all('subscriptions');
    var activeN = subs.filter(function (s) { return s.status === 'active'; }).length;
    var endingN = subs.filter(function (s) { return s.status === 'cancelled' && s.renews_at && new Date(s.renews_at) > now; }).length;
    out += '<section class="card" aria-labelledby="dr-h"><div class="sec-head"><h2 id="dr-h">รายได้และแพ็กเกจ</h2><a href="revenue.html">ดูรายงาน</a></div>' +
      '<p class="stat-sum"><span>รายได้เดือนนี้ <b>' + h(money(total)) + '</b> (' + paid.length + ' รายการ)</span></p>' +
      '<p class="stat-sum"><span>สมาชิกพรีเมียมที่ใช้งานอยู่ <b>' + activeN + '</b> คน</span>' + (endingN ? '<span>ยกเลิกต่ออายุแล้วแต่ยังใช้ได้ <b>' + endingN + '</b> คน</span>' : '') + '</p>' +
      '<p class="muted"><a href="plans.html">จัดการแพ็กเกจและรายชื่อผู้สมัคร</a></p></section>';
  }

  if (out) host.insertAdjacentHTML('beforeend', out);
})();
