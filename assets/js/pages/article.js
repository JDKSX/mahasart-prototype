/* หน้าบทความ: ?slug=… · ผู้เขียน/ผู้ตรวจ/โหรยืนยัน · แหล่งอ้างอิง · บทความหมวดเดียวกัน
   ดูตัวอย่างจากหลังบ้าน: ?slug=…&preview=1 (เฉพาะทีมงานที่ล็อกอิน) — MH.q.article คืนทุกสถานะ จึงเช็ก isLive เอง */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('article-root');

  function crumbs(items, linkLast) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า">' + items.map(function (it, i) {
      var last = i === items.length - 1 && !linkLast;
      return (i ? '<span aria-hidden="true">›</span>' : '') + (it[0] && !last ? '<a href="' + it[0] + '">' + h(it[1]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + h(it[1]) + '</span>');
    }).join('') + '</nav>';
  }
  /* ลิงก์แหล่งอ้างอิง: ยอมเฉพาะ http(s) หรือพาธในเว็บนี้ ไม่ยอม javascript: data: */
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u || /^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:/i.test(u)) return '';
    return u;
  }

  /* archived = บทความเคยเผยแพร่แล้วถูกเก็บ: บอกตรง ๆ แทน "ไม่พบ" เพื่อให้คนที่ถือลิงก์เก่าเข้าใจ */
  function notFound(archived) {
    document.title = (archived ? 'บทความนี้ถูกเก็บแล้ว' : 'ไม่พบบทความ') + ' · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['articles.html', 'คลังความรู้'], [null, archived ? 'บทความที่ถูกเก็บ' : 'ไม่พบบทความ']]) + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">?</p><h1>' + (archived ? 'บทความนี้ถูกเก็บแล้ว' : 'ไม่พบบทความนี้') + '</h1>' +
      '<p>' + (archived ? 'ทีมงานนำบทความนี้ออกจากคลังความรู้แล้ว เพราะเนื้อหาเก่าหรือกำลังปรับปรุง ลองอ่านเรื่องอื่นในหมวดเดียวกัน' : 'ลิงก์อาจพิมพ์ผิด หรือบทความนี้ยังไม่เผยแพร่ ลองค้นหาหรือเลือกอ่านเรื่องอื่นจากคลังความรู้') + '</p>' +
      '<div class="btn-row"><a class="btn btn--primary" href="articles.html">' + MH.ui.icon('i-back') + 'กลับคลังความรู้</a><a class="btn btn--outline" href="search.html">ค้นหา</a></div></div>';
  }

  var slug = MH.util.param('slug');
  var a = slug ? MH.q.article(slug) : null;
  var live = MH.q.isLive(a);
  var preview = !!a && !live && MH.util.param('preview') === '1' && !!MH.auth.user();
  if (!a || (!live && !preview)) { notFound(!!a && a.status === 'archived' && !a.deleted_at); return; }

  document.title = a.title + ' · MAHASART';
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', a.excerpt || a.title);

  var cat = MH.q.category(a.category_id);
  var author = MH.q.author(a.author_id), reviewer = MH.q.author(a.reviewer_id);
  var astro = a.astrologer_approved_by ? MH.q.author(a.astrologer_approved_by) : null;

  var meta = [];
  if (cat) meta.push('<span>หมวด <a href="articles.html?cat=' + encodeURIComponent(cat.slug) + '">' + h(cat.name) + '</a></span>');
  meta.push('<span>' + (a.published_at ? '<time datetime="' + h(a.published_at) + '">' + h(MH.util.dateLong(a.published_at)) + '</time>' : 'ยังไม่กำหนดวันเผยแพร่') + '</span>');
  meta.push('<span>เขียนโดย ' + h(author ? author.name : 'ทีมงาน MAHASART') + '</span>');
  if (reviewer) meta.push('<span>ตรวจโดย ' + h(reviewer.name) + '</span>');
  if (a.astrologer_approved_by) {
    meta.push('<span class="badge-astro">' + MH.ui.icon('i-shield') + 'โหรที่ปรึกษายืนยัน' + (astro ? ' · ' + h(astro.name) : '') + '</span>');
  }

  /* แหล่งอ้างอิง */
  var src = MH.q.sources(a.id);
  var srcHtml = src.length
    ? '<section class="section sources" aria-labelledby="src-h"><div class="sec-head"><h2 id="src-h">แหล่งอ้างอิง</h2></div><ol>' + src.map(function (s) {
        var u = safeUrl(s.url), ext = /^https?:/i.test(u);
        return '<li>' + (u ? '<a href="' + h(u) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + h(s.title) + '</a>' : h(s.title)) +
          (s.note ? ' <span class="note">· ' + h(s.note) + '</span>' : '') + '</li>';
      }).join('') + '</ol></section>'
    : '';

  /* บทความหมวดเดียวกัน 3 เรื่อง */
  var related = a.category_id ? MH.q.articles({ categoryId: a.category_id }).filter(function (x) { return x.id !== a.id; }).slice(0, 3) : [];
  var relHtml = related.length
    ? '<section class="section" aria-labelledby="rel-h"><div class="sec-head"><h2 id="rel-h">บทความหมวดเดียวกัน</h2>' +
      (cat ? '<a href="articles.html?cat=' + encodeURIComponent(cat.slug) + '">ดูทั้งหมดในหมวด</a>' : '') + '</div>' +
      '<ul class="art-grid">' + related.map(MH.ui.articleCard).join('') + '</ul></section>'
    : '';

  /* บทความข่าวไม่ต้องมีคำชี้แจงเรื่องความเชื่อ */
  var showDisclaimer = !cat || cat.slug !== 'news';

  root.innerHTML =
    (preview ? '<div class="notice notice--warn article-notice" role="status"><span>ตัวอย่างก่อนเผยแพร่ เห็นเฉพาะทีมงาน (สถานะ: <b>' + h(MH.labels.articleStatus[a.status] || a.status) + '</b>)</span></div>' : '') +
    '<div class="reader"><div class="page-head">' +
      crumbs([['index.html', 'หน้าแรก'], ['articles.html', 'คลังความรู้']].concat(cat ? [['articles.html?cat=' + encodeURIComponent(cat.slug), cat.name]] : []), true) +
      '<h1>' + h(a.title) + '</h1>' +
      '<p class="lede">' + h(a.excerpt) + '</p>' +
      '<p class="meta-row">' + meta.join('') + '</p>' +
      (live ? '<div class="meta-row">' + MH.ui.favButton('article', a.id) + '</div>' : '') +
    '</div>' +
    '<article>' +
      MH.ui.articleThumb(a, 'art-hero') +
      '<div class="prose">' + MH.util.renderBody(a.body) + '</div>' +
      srcHtml +
      (showDisclaimer ? '<p class="disclaimer">' + h(MH.store.setting('disclaimer') || '') + '</p>' : '') +
    '</article></div>' +
    relHtml;
})();
