/* แดชบอร์ด: ส่วนผู้เชี่ยวชาญ (เพิ่ม <section> ลงใน #dash-extra ตามสิทธิ์)
   ผู้เชี่ยวชาญ → นัดวันนี้/สัปดาห์นี้ + รายได้เดือนนี้ · ทีมงานที่มี experts.view → ผู้สมัครรอตรวจ · ทีมงานที่มี bookings.view → นัดวันนี้ทั้งระบบ */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin || !MH.admin.allowed) return;
  var host = document.getElementById('dash-extra'); if (!host) return;
  var h = MH.util.h, S = MH.store, me = MH.admin.user;
  function pad(n) { return ('0' + n).slice(-2); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var now = new Date(), todayKey = dayKey(now);
  var mon = new Date(now.getFullYear(), now.getMonth(), now.getDate()); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  var nextMon = new Date(mon); nextMon.setDate(nextMon.getDate() + 7);
  var experts = S.all('experts'), bookings = S.all('expert_bookings');
  var live = function (b) { return b.status === 'confirmed' || b.status === 'completed'; };

  function list(items, empty) {
    return items.length ? '<ul class="dash-list">' + items.join('') + '</ul>' : '<p class="muted">' + h(empty) + '</p>';
  }
  function bookingLi(b, withExpert) {
    var m = S.find('members', b.member_id), e = S.find('experts', b.expert_id);
    return '<li><a href="bookings.html?from=' + dayKey(b.start_at) + '&amp;to=' + dayKey(b.start_at) + '"><b>' + hm(b.start_at) + ' น. · ' + h(m ? m.display_name : 'สมาชิก') + '</b>' +
      '<span>' + (withExpert && e ? h(e.display_name) + ' · ' : '') + h(MH.labels.sessionType[b.session_type] || b.session_type) + ' ' + b.minutes + ' นาที · ' + h(MH.labels.bookingStatus[b.status]) + '</span></a></li>';
  }
  function section(title, note, inner, link) {
    var el = document.createElement('section'); el.className = 'card'; el.setAttribute('aria-label', title);
    el.innerHTML = '<div class="sec-head"><h2>' + h(title) + '</h2>' + (link ? '<a href="' + link[0] + '">' + h(link[1]) + '</a>' : '') + '</div>' + (note ? '<p class="sec-note">' + h(note) + '</p>' : '') + inner;
    host.appendChild(el);
  }

  /* ---------- ผู้เชี่ยวชาญ: นัดของฉัน ---------- */
  var mine = experts.filter(function (e) { return e.user_id === me.id; })[0];
  if (mine && MH.admin.can(['bookings.view_own', 'expert.self'])) {
    var my = bookings.filter(function (b) { return b.expert_id === mine.id && b.start_at; });
    var today = my.filter(function (b) { return live(b) && dayKey(b.start_at) === todayKey; }).sort(function (a, b) { return a.start_at.localeCompare(b.start_at); });
    var week = my.filter(function (b) { var d = new Date(b.start_at); return b.status === 'confirmed' && d >= mon && d < nextMon && d > now; });
    var rate = mine.commission_rate != null ? mine.commission_rate : (S.setting('expert_commission') || 0.2);
    var monthNet = bookings.filter(function (b) {
      if (b.expert_id !== mine.id || b.status !== 'completed') return false;
      var d = new Date(b.completed_at || b.start_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).reduce(function (s, b) { return s + Math.round((b.total || 0) * (1 - rate)); }, 0);
    section('นัดของฉัน', mine.status === 'active' ? '' : 'โปรไฟล์ยังไม่เปิดรับนัด (' + (MH.labels.expertStatus[mine.status] || mine.status) + ')',
      '<div class="dash-nums"><div><b>' + today.length + '</b><span>นัดวันนี้</span></div><div><b>' + week.length + '</b><span>นัดที่เหลือในสัปดาห์นี้</span></div><div><b>' + MH.money(monthNet) + '</b><span>รายได้เดือนนี้</span></div></div>' +
      list(today.map(function (b) { return bookingLi(b, false); }), 'วันนี้ไม่มีนัด') +
      '<div class="btn-row"><a class="btn btn--outline btn--sm" href="schedule.html">ตารางเวลาของฉัน</a><a class="btn btn--outline btn--sm" href="my-expert.html">โปรไฟล์และรายได้</a></div>',
      ['bookings.html', 'ดูนัดทั้งหมด']);
  }

  /* ---------- ทีมงาน: ผู้สมัครรอตรวจ ---------- */
  if (MH.admin.can('experts.view')) {
    var pend = experts.filter(function (e) { return e.status === 'pending'; });
    section('ผู้สมัครผู้เชี่ยวชาญรอตรวจ', pend.length ? 'รอตรวจคุณสมบัติ ' + pend.length + ' ท่าน' : '',
      list(pend.map(function (e) {
        return '<li><a href="expert-edit.html?id=' + e.id + '"><b>' + h(e.display_name) + '</b><span>ประสบการณ์ ' + Number(e.years_experience || 0) + ' ปี · สมัครเมื่อ ' + h(MH.util.dateShort(e.applied_at || e.created_at)) + '</span></a></li>';
      }), 'ไม่มีผู้สมัครค้างตรวจ'), ['experts.html', 'ดูผู้เชี่ยวชาญทั้งหมด']);
  }

  /* ---------- ทีมงาน: นัดวันนี้ทั้งระบบ ---------- */
  if (MH.admin.can('bookings.view')) {
    var all = bookings.filter(function (b) { return b.start_at && live(b) && dayKey(b.start_at) === todayKey; }).sort(function (a, b) { return a.start_at.localeCompare(b.start_at); });
    section('นัดผู้เชี่ยวชาญวันนี้ทั้งระบบ', all.length ? 'วันนี้มี ' + all.length + ' นัด' : '', list(all.map(function (b) { return bookingLi(b, true); }), 'วันนี้ยังไม่มีนัด'), ['bookings.html?day=today', 'ดูในรายการนัด']);
  }
})();
