/* แดชบอร์ดหลังบ้าน: การ์ดตัวเลข งานที่ต้องทำ ยอดดู/ยอดกดสอบถาม กิจกรรมล่าสุด — แสดงตามบทบาท */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var me = MH.admin.user, can = function (p, r) { return MH.auth.can(p, r); };

  /* ---------- วันที่ (ใช้เวลาท้องถิ่น ไม่ผ่าน UTC) ---------- */
  function parseISO(s) { var p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function isoOf(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDays(iso, n) { var d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); }
  function mondayOf(iso) { var d = parseISO(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); }

  var today = MH.util.todayISO();
  var nextMonday = addDays(mondayOf(today), 7);
  var astroCat = MH.q.categoryBySlug('article', 'thai-astrology');
  function isAstro(a) { return !!astroCat && a.category_id === astroCat.id; }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ---------- ข้อมูล ---------- */
  var arts = MH.store.all('articles');
  var inReview = arts.filter(function (a) { return a.status === 'in_review'; });
  var astroPending = inReview.filter(function (a) { return isAstro(a) && !a.astrologer_approved_at; });
  var scheduled = arts.filter(function (a) { return a.status === 'scheduled'; });
  var myDrafts = arts.filter(function (a) { return a.status === 'draft' && a.author_id === me.id; });

  function amuletIssues(m) {
    var out = [];
    if (m.status === 'draft') out.push('ยังเป็นฉบับร่าง');
    if (!m.provenance_type) out.push('ยังไม่ระบุประเภท');
    var gal = MH.q.media('amulets', m.id, 'gallery');
    if (!gal.length) out.push('ยังไม่มีรูป');
    else if (gal.some(function (g) { return !g.alt_text; })) out.push('มีรูปที่ยังไม่ใส่คำอธิบายรูป (alt)');
    return out;
  }
  var incomplete = can('amulets.edit') ? MH.store.all('amulets').map(function (m) { return { m: m, issues: amuletIssues(m) }; })
    .filter(function (x) { return x.issues.length; }) : [];

  var nextRows = MH.store.all('daily_horoscopes').filter(function (r) { return r.period_type === 'week' && r.period_start === nextMonday; });
  var nextMissing = Math.max(0, 12 - nextRows.length);
  var nextDrafts = nextRows.filter(function (r) { return r.status !== 'published'; });

  /* ---------- หัวหน้า ---------- */
  document.getElementById('dash-sub').textContent = me.name + ' · ' + MH.labels.role[me.role] + ' · วันนี้ ' + MH.util.dateLong(today, true);

  /* ---------- การ์ดตัวเลข ---------- */
  var kpis = [];
  function kpi(label, n, href, opts) {
    opts = opts || {};
    kpis.push('<a class="kpi' + (opts.warn && n > 0 ? ' warn' : '') + (opts.ok && n === 0 ? ' ok' : '') + '" href="' + h(href) + '"><b>' + n + '</b><span>' + h(label) + '</span>' +
      (opts.note ? '<span class="note">' + h(opts.note) + '</span>' : '') + '</a>');
  }
  if (can('articles.review')) kpi('รอตรวจ', inReview.length, 'articles.html?status=in_review', { warn: true, note: astroPending.length ? 'รอโหรอนุมัติ ' + astroPending.length + ' เรื่อง' : '' });
  else if (me.role === 'astrologer' && can('articles.review_astrology')) kpi('รอตรวจ', astroPending.length, 'articles.html?status=in_review&cat=thai-astrology', { warn: true, note: 'เฉพาะโหราศาสตร์ไทยที่ยังไม่อนุมัติ' });
  if (can('articles.publish')) kpi('ตั้งเวลาไว้', scheduled.length, 'articles.html?status=scheduled');
  if (can('articles.create')) kpi('ฉบับร่างของฉัน', myDrafts.length, 'articles.html?status=draft&mine=1');
  if (can('amulets.edit')) kpi('วัตถุมงคลข้อมูลไม่ครบ', incomplete.length, 'amulets.html?filter=incomplete', { warn: true, ok: true });
  if (can('horoscopes.view')) kpi('ดวงสัปดาห์หน้าที่ยังไม่เขียน', nextMissing, 'horoscopes.html?week=' + nextMonday, { warn: true, ok: true, note: 'สัปดาห์เริ่ม ' + MH.util.dateShort(nextMonday + 'T12:00:00') });
  document.getElementById('kpis').innerHTML = kpis.length ? kpis.join('') : '';

  /* ---------- งานที่ต้องทำของฉัน ---------- */
  var tasks = [];
  function task(title, meta, href) { tasks.push({ title: title, meta: meta, href: href }); }
  function artMeta(a) { var c = MH.q.category(a.category_id); return (c ? c.name : 'ยังไม่เลือกหมวด') + ' · ' + MH.admin.userName(a.author_id); }

  /* บทความของฉันที่ถูกตีกลับ และฉบับร่างอื่น */
  myDrafts.filter(function (a) { return a.return_note; }).forEach(function (a) {
    task('แก้ตามที่ตีกลับ: ' + a.title, 'หมายเหตุ: ' + clip(a.return_note, 80), 'article-edit.html?id=' + a.id);
  });
  myDrafts.filter(function (a) { return !a.return_note; }).forEach(function (a) {
    task('เขียนต่อ: ' + a.title, 'ฉบับร่าง · แก้ล่าสุด ' + MH.util.dateShort(a.updated_at), 'article-edit.html?id=' + a.id);
  });
  /* ตรวจบทความ */
  if (can('articles.review')) {
    inReview.forEach(function (a) {
      var wait = isAstro(a) && !a.astrologer_approved_at;
      task('ตรวจ: ' + a.title, artMeta(a) + (wait ? ' · รอโหรอนุมัติก่อนเผยแพร่' : ''), 'article-edit.html?id=' + a.id);
    });
  } else if (me.role === 'astrologer' && can('articles.review_astrology')) {
    astroPending.forEach(function (a) { task('อนุมัติด้านโหราศาสตร์: ' + a.title, artMeta(a), 'article-edit.html?id=' + a.id); });
  }
  /* ดวงสัปดาห์หน้า */
  if (can('horoscopes.view')) {
    if (nextMissing > 0 && can('horoscopes.create')) task('เขียนดวงสัปดาห์หน้า', 'ยังไม่เขียน ' + nextMissing + ' จาก 12 ราศี', 'horoscopes.html?week=' + nextMonday);
    else if (nextMissing === 0 && nextDrafts.length && can('horoscopes.publish')) task('ตรวจและเผยแพร่ดวงสัปดาห์หน้า', 'เขียนครบ 12 ราศีแล้ว ยังเป็นฉบับร่าง ' + nextDrafts.length + ' ราศี', 'horoscopes.html?week=' + nextMonday);
  }
  /* วัตถุมงคลข้อมูลไม่ครบ */
  incomplete.forEach(function (x) { task('เติมข้อมูล: ' + x.m.code + ' ' + x.m.name, x.issues.join(' · '), 'amulet-edit.html?id=' + x.m.id); });

  /* ---------- กิจกรรมล่าสุด (admin) ---------- */
  function subjectName(l) {
    var t = l.subject_type, row = (t === 'articles' || t === 'amulets' || t === 'daily_horoscopes' || t === 'users' || t === 'pages') ? MH.store.find(t, l.subject_id) : null;
    var label = MH.labels.table[t] || t;
    if (!row) return label + ' #' + l.subject_id;
    if (t === 'articles') return label + ' “' + clip(row.title, 40) + '”';
    if (t === 'amulets') return label + ' ' + row.code;
    if (t === 'daily_horoscopes') {
      var rr = MH.store.all('rasi_ranges').filter(function (x) { return x.rasi === row.rasi; })[0];
      return label + ' ราศี' + (rr ? rr.name : row.rasi);
    }
    return label + ' ' + clip(row.name || row.title || '', 30);
  }
  function subjectHref(l) {
    if (l.subject_type === 'articles' && MH.store.find('articles', l.subject_id)) return 'article-edit.html?id=' + l.subject_id;
    if (l.subject_type === 'amulets' && MH.store.find('amulets', l.subject_id)) return 'amulet-edit.html?id=' + l.subject_id;
    return '';
  }

  /* ---------- ยอดดู/ยอดกดสอบถาม ---------- */
  function statsPanel() {
    var rows = MH.store.all('amulet_daily_stats');
    var dates = rows.map(function (r) { return r.stat_date; }).filter(function (d, i, a) { return a.indexOf(d) === i; }).sort().reverse().slice(0, 7);
    var sec = '<section class="card panel--wide" aria-labelledby="p-stats"><h2 id="p-stats">ยอดดูและยอดกดสอบถาม 7 วัน</h2>';
    if (!dates.length) return sec + MH.ui.empty('ยังไม่มีสถิติ', 'เมื่อมีคนเปิดหน้าวัตถุมงคลหรือกดสอบถามทาง LINE ตัวเลขจะขึ้นที่นี่') + '</section>';
    var first = dates[dates.length - 1], last = dates[0];
    var byAmulet = {};
    rows.forEach(function (r) {
      if (dates.indexOf(r.stat_date) < 0) return;
      var o = byAmulet[r.amulet_id] || (byAmulet[r.amulet_id] = { id: r.amulet_id, views: 0, clicks: 0 });
      o.views += r.views || 0; o.clicks += r.line_clicks || 0;
    });
    var list = Object.keys(byAmulet).map(function (k) { return byAmulet[k]; }).sort(function (a, b) { return b.views - a.views; });
    var maxV = Math.max.apply(null, list.map(function (x) { return x.views; }).concat([1]));
    var maxC = Math.max.apply(null, list.map(function (x) { return x.clicks; }).concat([1]));
    var totV = list.reduce(function (s, x) { return s + x.views; }, 0), totC = list.reduce(function (s, x) { return s + x.clicks; }, 0);
    sec += '<p class="sec-note">ช่วง ' + h(MH.util.dateShort(first + 'T12:00:00')) + ' – ' + h(MH.util.dateShort(last + 'T12:00:00')) + ' · นับแบบไม่ระบุตัวบุคคล</p>' +
      '<p class="stat-sum"><span>ยอดดูรวม <b>' + totV + '</b></span><span>กดสอบถามรวม <b>' + totC + '</b></span></p>' +
      '<p class="stat-legend"><span><i></i>ยอดดู</span><span><i class="gold"></i>กดสอบถามทาง LINE</span></p>';
    list.forEach(function (x) {
      var m = MH.store.find('amulets', x.id);
      var name = m ? m.code + ' ' + m.name : 'วัตถุมงคล #' + x.id;
      sec += '<div class="stat-item"><div class="bar-row"><span title="' + h(name) + '">' + h(name) + '</span><div class="bar"><i data-w="' + Math.round(x.views / maxV * 100) + '"></i></div><span class="v">' + x.views + '</span></div>' +
        '<div class="bar-row sub"><span>กดสอบถาม</span><div class="bar gold"><i data-w="' + Math.round(x.clicks / maxC * 100) + '"></i></div><span class="v">' + x.clicks + '</span></div></div>';
    });
    return sec + '</section>';
  }

  /* ---------- วางแผง ---------- */
  var panels = [];
  var showActivity = can('audit.view'), showStats = can('stats.view');
  var tasksHtml = '<section class="card' + (showActivity ? '' : ' panel--wide') + '" aria-labelledby="p-tasks"><h2 id="p-tasks">งานที่ต้องทำของฉัน</h2>' +
    '<p class="sec-note">เรียงตามที่ควรทำก่อน กดเพื่อไปทำต่อ</p>' +
    (tasks.length ? '<ul class="task-list">' + tasks.slice(0, 8).map(function (t) {
      return '<li><a href="' + h(t.href) + '"><b>' + h(t.title) + '</b><span>' + h(t.meta) + '</span></a></li>';
    }).join('') + '</ul>' + (tasks.length > 8 ? '<p class="sec-note">และอีก ' + (tasks.length - 8) + ' งาน เปิดดูได้จากการ์ดด้านบน</p>' : '')
      : MH.ui.empty('ไม่มีงานค้าง', 'ตอนนี้ไม่มีอะไรรอคุณ')) + '</section>';
  panels.push(tasksHtml);

  if (showActivity) {
    var logs = MH.store.all('audit_logs').sort(function (a, b) { return b.id - a.id; }).slice(0, 8);
    panels.push('<section class="card" aria-labelledby="p-feed"><div class="sec-head"><h2 id="p-feed">กิจกรรมล่าสุด</h2><a href="audit.html">ดูทั้งหมด</a></div>' +
      (logs.length ? '<ul class="feed">' + logs.map(function (l) {
        var u = l.user_id ? MH.admin.userName(l.user_id) : 'ระบบ', href = subjectHref(l), subj = subjectName(l);
        return '<li><span class="when">' + h(MH.util.dateTime(l.created_at)) + '</span><b>' + h(u) + '</b> ' + h(MH.labels.action[l.action] || l.action) +
          (l.action === 'login' || l.action === 'logout' ? '' : ' ' + (href ? '<a href="' + h(href) + '">' + h(subj) + '</a>' : h(subj))) + '</li>';
      }).join('') + '</ul>' : MH.ui.empty('ยังไม่มีกิจกรรม', '')) + '</section>');
  }
  if (showStats) panels.push(statsPanel());
  document.getElementById('panels').innerHTML = panels.join('');

  /* ความกว้างแถบตั้งผ่าน JS (CSP: ไม่ใช้ style="") */
  document.querySelectorAll('.bar i[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
})();
