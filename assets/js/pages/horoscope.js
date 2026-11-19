/* ศูนย์รวมเครื่องมือดูดวง: ชื่อตำรา · บทความแนะนำหมวดโหราศาสตร์ไทย · disclaimer */
(function () {
  'use strict';
  var MH = window.MH;

  var rs = MH.astro.ruleset();
  document.querySelectorAll('[data-ruleset]').forEach(function (el) { el.textContent = rs ? rs.name : 'ยังไม่ได้เลือกตำรา'; });
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });

  var host = document.getElementById('hot-articles');
  var cat = MH.q.categoryBySlug('article', 'thai-astrology');
  var list = cat ? MH.q.articles({ categoryId: cat.id, limit: 3 }) : [];
  host.innerHTML = list.length
    ? list.map(MH.ui.articleCard).join('')
    : '<li class="full">' + MH.ui.empty('ยังไม่มีบทความโหราศาสตร์ไทย', 'บทความแรกจะขึ้นที่นี่เมื่อเผยแพร่') + '</li>';
})();
