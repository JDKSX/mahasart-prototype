/* แดชบอร์ด: ตัวนับการเข้าชมเว็บไซต์ (ออนไลน์ตอนนี้ · วันนี้ · สัปดาห์นี้ · เดือนนี้ · ทั้งหมด)
   ทุกบทบาทที่เข้าแดชบอร์ดได้เห็นส่วนนี้ · อัปเดตทุก 30 วินาที */
(function () {
  'use strict';
  var MH = window.MH;
  if (!MH.admin.allowed) return;
  var host = document.getElementById('visits');
  if (!host) return;
  var h = MH.util.h;
  var fmt = function (n) { return Number(n).toLocaleString('th-TH'); };

  function tile(label, v, sub, live) {
    return '<div class="v-tile' + (live ? ' v-tile--live' : '') + '">' +
      '<span class="v-label">' + (live ? '<span class="live-dot" aria-hidden="true"></span>' : '') + h(label) + '</span>' +
      '<b>' + fmt(v) + '</b>' +
      '<span class="v-sub">' + h(sub) + '</span></div>';
  }

  function render() {
    var s = MH.visits.stats(), now = new Date();
    var time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    host.innerHTML =
      '<div class="sec-head"><h2 id="v-h">สถิติการเข้าชมเว็บไซต์</h2><span class="muted num">อัปเดต ' + h(time) + ' น.</span></div>' +
      '<div class="v-grid" role="list">' +
        '<div role="listitem">' + tile('กำลังออนไลน์', s.online, 'คนที่เปิดหน้าเว็บใน 5 นาทีล่าสุด', true) + '</div>' +
        '<div role="listitem">' + tile('วันนี้', s.today.visitors, 'ผู้เข้าชม · เปิด ' + fmt(s.today.page_views) + ' หน้า') + '</div>' +
        '<div role="listitem">' + tile('สัปดาห์นี้', s.week.visitors, 'ตั้งแต่ ' + MH.util.dateShort(s.weekStart + 'T12:00:00') + ' · เปิด ' + fmt(s.week.page_views) + ' หน้า') + '</div>' +
        '<div role="listitem">' + tile('เดือนนี้', s.month.visitors, 'ตั้งแต่ ' + MH.util.dateShort(s.monthStart + 'T12:00:00') + ' · เปิด ' + fmt(s.month.page_views) + ' หน้า') + '</div>' +
        '<div role="listitem">' + tile('ทั้งหมด', s.total.visitors, 'ตั้งแต่ ' + MH.util.dateShort(s.total.since + 'T12:00:00') + ' · เปิด ' + fmt(s.total.page_views) + ' หน้า') + '</div>' +
      '</div>' +
      '<p class="fine-note">นับแบบไม่ใช้คุกกี้และไม่ระบุตัวบุคคล · คนเดียวเข้าหลายครั้งในวันเดียวนับเป็น 1 ผู้เข้าชม · ต้นแบบใช้ข้อมูลตัวอย่างรวมกับการเปิดหน้าเว็บจริงในเบราว์เซอร์นี้</p>';
  }

  render();
  setInterval(render, 30000);
})();
