/* หน้าแรก: ข้อความ hero จากค่าตั้ง · วัตถุมงคลแนะนำ · บทความล่าสุด · วงราศี · ทักษา */
(function () {
  'use strict';
  var MH = window.MH;

  /* hero text จาก settings (แก้ได้ที่หลังบ้าน → หน้าแรก) */
  var hero = { fortune: MH.store.setting('hero_fortune') || {}, amulet: MH.store.setting('hero_amulet') || {} };
  document.querySelectorAll('[data-hero]').forEach(function (el) {
    var p = el.getAttribute('data-hero').split('.'), v = hero[p[0]] && hero[p[0]][p[1]];
    if (v) el.textContent = v;
  });

  /* วัตถุมงคลแนะนำ 6 ชิ้น */
  var amHost = document.querySelector('[data-featured-amulets]');
  var featured = MH.q.featuredAmulets().slice(0, 6);
  amHost.innerHTML = featured.length
    ? featured.map(MH.ui.amuletCard).join('')
    : '<li>' + MH.ui.empty('ยังไม่มีวัตถุมงคลแนะนำ', 'ทีมงานยังไม่ได้เลือกรายการขึ้นหน้าแรก') + '</li>';

  /* บทความล่าสุด 4 เรื่อง */
  var arHost = document.querySelector('[data-latest-articles]');
  var latest = MH.q.articles({ limit: 4 });
  arHost.innerHTML = latest.length
    ? latest.map(MH.ui.articleItem).join('')
    : '<li>' + MH.ui.empty('ยังไม่มีบทความ', 'บทความแรกจะขึ้นที่นี่เมื่อเผยแพร่') + '</li>';

  /* วงราศีไทย 12 ราศีบนภาพ hero */
  var ring = document.getElementById('wheel-ring'), NS = 'http://www.w3.org/2000/svg';
  var rasi = ['เมษ', 'พฤษภ', 'เมถุน', 'กรกฎ', 'สิงห์', 'กันย์', 'ตุลย์', 'พิจิก', 'ธนู', 'มังกร', 'กุมภ์', 'มีน'];
  rasi.forEach(function (name, i) {
    var a = (i * 30 - 90) * Math.PI / 180, b = a + 15 * Math.PI / 180;
    var line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', 150 + 96 * Math.cos(a)); line.setAttribute('y1', 150 + 96 * Math.sin(a));
    line.setAttribute('x2', 150 + 140 * Math.cos(a)); line.setAttribute('y2', 150 + 140 * Math.sin(a));
    line.setAttribute('stroke-opacity', '.45');
    ring.appendChild(line);
    var t = document.createElementNS(NS, 'text'), x = 150 + 129 * Math.cos(b), y = 150 + 129 * Math.sin(b);
    t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('class', 'rasi-label');
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('transform', 'rotate(' + (i * 30 + 15) + ' ' + x + ' ' + y + ')');
    t.setAttribute('stroke', 'none');
    t.textContent = name;
    ring.appendChild(t);
  });

  /* ทักษา */
  MH.taksaWidget.mount(document.querySelector('[data-taksa]'));
})();
