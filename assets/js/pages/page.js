/* หน้าคงที่: ?slug=about|privacy|terms|disclaimer … เนื้อหามาจากตาราง pages (แก้ได้ที่หลังบ้าน) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('page-root');
  var slug = MH.util.param('slug');
  var pg = slug ? MH.q.page(slug) : null;

  function crumbs(title) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า"><a href="index.html">หน้าแรก</a><span aria-hidden="true">›</span><span aria-current="page">' + h(title) + '</span></nav>';
  }

  if (!pg) {
    document.title = 'ไม่พบหน้านี้ · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs('ไม่พบหน้า') + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">?</p><h1>ไม่พบหน้านี้</h1>' +
      '<p>ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกนำออกแล้ว</p>' +
      '<div class="btn-row"><a class="btn btn--primary" href="index.html">' + MH.ui.icon('i-home') + 'กลับหน้าแรก</a><a class="btn btn--outline" href="search.html">ค้นหา</a></div></div>';
    return;
  }

  document.title = pg.title + ' · MAHASART';
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', pg.title + ' · MAHASART');
  root.innerHTML =
    '<div class="page-head">' + crumbs(pg.title) + '<h1>' + h(pg.title) + '</h1></div>' +
    '<div class="prose">' + MH.util.renderBody(pg.body) + '</div>' +
    '<p class="disclaimer">ปรับปรุงล่าสุด ' + h(MH.util.dateShort(pg.updated_at)) + '</p>';
})();
