/* ดวงรายวัน: วันนี้ · สีประจำวัน · กาลกิณี · ดวง 12 ราศีประจำสัปดาห์ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, A = MH.astro;
  var SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  var rs = A.ruleset();
  document.querySelectorAll('[data-ruleset]').forEach(function (el) { el.textContent = rs ? rs.name : 'ยังไม่ได้เลือกตำรา'; });
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });

  function paint(root) {
    root.querySelectorAll('[data-hex]').forEach(function (el) { el.style.background = el.getAttribute('data-hex'); });
  }
  /* 'YYYY-MM-DD' → Date เวลาท้องถิ่น (กัน timezone เลื่อนวัน) */
  function parseDay(iso) { var p = iso.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function dm(d) { return d.getDate() + ' ' + SHORT[d.getMonth()]; }
  function dmy(d) { return dm(d) + ' ' + (d.getFullYear() + 543); }
  /* 26 ต.ค. – 1 พ.ย. 2569 · ถ้าคนละปีใส่ปีทั้งสองข้าง */
  function rangeText(a, b) {
    if (a.getFullYear() !== b.getFullYear()) return dmy(a) + ' – ' + dmy(b);
    return dm(a) + ' – ' + dmy(b);
  }

  /* ---------- วันนี้ ---------- */
  var now = new Date();
  var planet = A.planetOfWeekday(now), info = A.planetInfo(planet);
  var kala = A.kalakiniFor(planet);
  var kalaHtml = kala.length
    ? '<p class="v">วันนี้เป็นวันกาลกิณีของคนเกิดวัน ' + kala.map(function (b) { return h(b.label); }).join(', ') + '</p>' +
      '<p class="sub">' + kala.map(function (b) { return '<a href="taksa.html?day=' + encodeURIComponent(b.key) + '">ดูทักษาของคนเกิดวัน' + h(b.label) + '</a>'; }).join(' · ') + '</p>'
    : '<p class="v">วันนี้ไม่ตรงกับกาลกิณีของวันเกิดใด</p>';
  var today = document.getElementById('today');
  today.innerHTML =
    '<div><p class="k">วันที่</p><p class="v">' + h(MH.util.dateLong(now.toISOString(), true)) + '</p></div>' +
    '<div><p class="k">สีประจำวัน</p><p class="v v-row"><span class="sw sw--lg" data-hex="' + h(info.hex) + '"></span>' + h(info.color_name) + '</p>' +
      '<p class="sub">สีของวัน' + h(info.day_name) + ' ใส่แล้วเข้ากับดาวเจ้าวัน</p></div>' +
    '<div><p class="k">ควรระวัง</p>' + kalaHtml + '</div>';
  paint(today);

  /* ---------- ดวง 12 ราศี ---------- */
  var cur = MH.q.currentHoroscopes();
  var head = document.getElementById('week-h'), note = document.getElementById('week-note'), body = document.getElementById('week-body');

  if (!cur.items.length) {
    note.textContent = '';
    body.innerHTML = MH.ui.empty('ยังไม่มีดวงที่เผยแพร่ในช่วงนี้', 'ทีมงานกำลังเตรียมดวง 12 ราศีของสัปดาห์นี้ กลับมาดูใหม่ได้เร็ว ๆ นี้ หรือดูราศีของคุณจากวันเกิดไปก่อน',
      '<a class="btn btn--primary" href="rasi.html">ดูราศีจากวันเกิด</a><a class="btn btn--outline" href="articles.html?cat=thai-astrology">อ่านบทความโหราศาสตร์ไทย</a>');
    return;
  }

  var start = parseDay(cur.period_start);
  if (cur.period_type === 'day') {
    head.innerHTML = 'ดวงประจำวันที่ <span class="nowrap">' + h(dmy(start)) + '</span>';
  } else {
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    head.innerHTML = 'ดวงประจำสัปดาห์ <span class="nowrap">' + h(rangeText(start, end)) + '</span>';
  }
  note.textContent = 'อ่านดวงของราศีคุณ ถ้าไม่แน่ใจว่าราศีอะไร ให้ดูจากวันเกิดก่อน · ช่วงวันของแต่ละราศีเป็นไปตามตำรา “' + (rs ? rs.name : '-') + '”';

  var byRasi = {};
  cur.items.forEach(function (it) { byRasi[it.rasi] = it; });
  var ranges = rs ? MH.store.all('rasi_ranges').filter(function (r) { return r.ruleset_id === rs.id; }) : [];
  if (!ranges.length) ranges = cur.items.map(function (it) { return { rasi: it.rasi, name: it.rasi }; });

  body.innerHTML = '<ul class="rasi-grid">' + ranges.map(function (r) {
    var it = byRasi[r.rasi];
    var span = r.start_month ? (r.start_day + ' ' + SHORT[r.start_month - 1] + ' – ' + r.end_day + ' ' + SHORT[r.end_month - 1]) : '';
    return '<li class="rasi-card" id="rasi-' + h(r.rasi) + '"><h3>ราศี' + h(r.name) + '</h3>' +
      (span ? '<p class="range">เกิดช่วง ' + h(span) + '</p>' : '') +
      (it ? '<p>' + h(it.body) + '</p>' : '<p class="muted">ยังไม่มีดวงของราศีนี้ในช่วงนี้</p>') + '</li>';
  }).join('') + '</ul>';

  /* ลิงก์ #rasi-xxx จากหน้าราศี: เลื่อนมาที่การ์ดและเน้น (เนื้อหาถูกวาดหลังโหลด จึงทำเอง) */
  var id = decodeURIComponent(location.hash.replace(/^#/, ''));
  var target = id && document.getElementById(id);
  if (target && target.classList.contains('rasi-card')) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'center' });
  }
})();
