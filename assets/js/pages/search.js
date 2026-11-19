/* ค้นหา: ?q=… · ผลแยกกลุ่มบทความ / วัตถุมงคล · คำแนะนำเมื่อยังไม่พิมพ์ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var SUGGEST = ['ทักษา', 'พระ', 'ฮวงจุ้ย', 'ราศี'];

  var q = (MH.util.param('q') || '').trim();
  var input = document.getElementById('q'), body = document.getElementById('search-body'), form = document.getElementById('search-page-form');
  input.value = q;
  document.title = (q ? 'ค้นหา “' + q + '”' : 'ค้นหา') + ' · MAHASART';

  form.addEventListener('submit', function (e) {
    if (!input.value.trim()) { e.preventDefault(); input.focus(); }
  });

  function chips() {
    return '<div class="chips">' + SUGGEST.map(function (w) {
      return '<a class="chip" href="search.html?q=' + encodeURIComponent(w) + '">' + h(w) + '</a>';
    }).join('') + '</div>';
  }

  if (!q) {
    body.innerHTML =
      '<section class="section"><div class="sec-head"><h2>ลองค้นหาคำเหล่านี้</h2></div>' +
      '<p class="sec-note">พิมพ์ชื่อบทความ ชื่อวัตถุมงคล หรือรหัสสินค้า เช่น MH-0001 ก็ได้</p>' + chips() + '</section>';
    return;
  }

  var r = MH.q.search(q);
  if (!r.articles.length && !r.amulets.length) {
    body.innerHTML = '<section class="section">' +
      MH.ui.empty('ไม่พบผลที่ตรงกับ “' + q + '”', 'ลองใช้คำที่สั้นลง เปลี่ยนคำ หรือดูคำที่คนค้นบ่อย',
        '<a class="btn btn--primary" href="articles.html">เปิดคลังความรู้</a><a class="btn btn--outline" href="amulets.html">ดูวัตถุมงคล</a>') +
      '<div class="sec-head"><h2>คำที่คนค้นบ่อย</h2></div>' + chips() + '</section>';
    return;
  }

  body.innerHTML =
    '<p class="result-line">ผลค้นหา “<b>' + h(q) + '</b>” พบบทความ <b class="num">' + r.articles.length + '</b> เรื่อง · วัตถุมงคล <b class="num">' + r.amulets.length + '</b> ชิ้น</p>' +
    '<section class="section" aria-labelledby="res-ar"><div class="sec-head"><h2 id="res-ar">บทความ (' + r.articles.length + ')</h2></div>' +
      (r.articles.length ? '<ul class="art-grid">' + r.articles.map(MH.ui.articleCard).join('') + '</ul>' : '<p class="muted">ไม่พบบทความที่ตรงกับคำนี้</p>') + '</section>' +
    '<section class="section" aria-labelledby="res-am"><div class="sec-head"><h2 id="res-am">วัตถุมงคล (' + r.amulets.length + ')</h2></div>' +
      (r.amulets.length ? '<ul class="amulets amulets--4">' + r.amulets.map(MH.ui.amuletCard).join('') + '</ul>' : '<p class="muted">ไม่พบวัตถุมงคลที่ตรงกับคำนี้</p>') + '</section>';
})();
