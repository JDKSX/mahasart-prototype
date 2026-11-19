/* โปรไฟล์ผู้เชี่ยวชาญ: ?slug= · ช่องทางและราคา · ปฏิทินคิวว่าง 14 วัน → booking.html?expert=&slot= · รีวิวที่เผยแพร่
   ผู้เชี่ยวชาญที่ยังไม่ active (pending / suspended) หรือไม่พบ → สถานะ "ไม่พบ" */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store;
  var root = document.getElementById('ex-root');
  var SPEC = { 'thai-astrology': 'โหราศาสตร์ไทย', 'auspicious-time': 'ฤกษ์มงคล', 'fengshui': 'ฮวงจุ้ย', 'numerology': 'เลขศาสตร์' };
  function specName(s) { var c = MH.q.categoryBySlug('article', s); return c ? c.name : (SPEC[s] || s); }
  function pad(n) { return ('0' + n).slice(-2); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function initial(name) { return String(name || '').replace(/^(อาจารย์|ครู|ดร\.|หมอ)\s*/, '').charAt(0) || '✦'; }
  function stars(avg) {
    var n = Math.round(avg), out = '';
    for (var i = 1; i <= 5; i++) out += '<i' + (i <= n ? ' class="on"' : '') + '>★</i>';
    return '<span class="stars" role="img" aria-label="คะแนน ' + avg + ' จาก 5">' + out + '</span>';
  }
  function crumbs(items) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span aria-hidden="true">›</span>' : '') + (it[0] && !last ? '<a href="' + it[0] + '">' + h(it[1]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + h(it[1]) + '</span>');
    }).join('') + '</nav>';
  }

  function notFound() {
    document.title = 'ไม่พบผู้เชี่ยวชาญ · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['experts.html', 'ผู้เชี่ยวชาญ'], [null, 'ไม่พบ']]) + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">?</p><h1>ไม่พบผู้เชี่ยวชาญท่านนี้</h1>' +
      '<p>ลิงก์อาจพิมพ์ผิด หรือผู้เชี่ยวชาญท่านนี้ยังไม่เปิดรับนัดในตอนนี้ ลองดูท่านอื่นที่เปิดรับนัดอยู่</p>' +
      '<div class="btn-row"><a class="btn btn--primary" href="experts.html">' + MH.ui.icon('i-back') + 'กลับไปดูผู้เชี่ยวชาญ</a></div></div>';
  }

  var slug = MH.util.param('slug');
  var e = slug ? MH.q.expert(slug) : null;
  if (!e || e.status !== 'active' || e.deleted_at) { notFound(); return; }

  document.title = e.display_name + ' · ผู้เชี่ยวชาญ · MAHASART';
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', e.display_name + ' ' + e.title + ' ประสบการณ์ ' + e.years_experience + ' ปี จองเวลาปรึกษาได้ที่ MAHASART');

  var member = MH.member.current(), disc = member ? (MH.member.plan(member).booking_discount || 0) : 0;
  var rating = MH.q.expertRating(e.id);
  var slots = MH.q.openSlots(e.id);

  /* ---------- ช่องทางและราคา ---------- */
  function channels() {
    var types = e.session_types || [];
    if (!types.length) return MH.ui.empty('ยังไม่ได้ตั้งช่องทางและราคา', 'ผู้เชี่ยวชาญท่านนี้ยังไม่เปิดให้จองในตอนนี้');
    return '<ul class="ch-list">' + types.map(function (t) {
      var d = Math.round(t.price * disc);
      return '<li><b>' + h(MH.labels.sessionType[t.type] || t.type) + '</b><span>' + Number(t.minutes) + ' นาที</span>' +
        '<span class="ch-price">' + MH.money(t.price) + (d ? '<small>พรีเมียม ' + MH.money(t.price - d) + '</small>' : '') + '</span></li>';
    }).join('') + '</ul>' +
      (disc ? '<p class="ex-note">ราคาสมาชิกพรีเมียมลด ' + Math.round(disc * 100) + '% แสดงให้เห็นแล้วเพราะคุณเป็นสมาชิกพรีเมียม</p>' : '<p class="ex-note">สมาชิกพรีเมียมลดค่าปรึกษา 10% ทุกครั้งที่จอง</p>');
  }

  /* ---------- ปฏิทินคิวว่าง 14 วัน ---------- */
  function calendar() {
    var byDay = {}, today = new Date(), total = 0;
    today.setHours(0, 0, 0, 0);
    var end = new Date(today); end.setDate(end.getDate() + 15);          // ถึงสิ้นวันที่ +14
    slots.forEach(function (s) { if (new Date(s.start_at) < end) { (byDay[dayKey(s.start_at)] = byDay[dayKey(s.start_at)] || []).push(s); total++; } });
    if (!total) return MH.ui.empty('ยังไม่มีคิวว่างใน 14 วันข้างหน้า', 'กลับมาดูใหม่ภายหลัง หรือเลือกผู้เชี่ยวชาญท่านอื่น', '<a class="btn btn--primary" href="experts.html">ดูผู้เชี่ยวชาญท่านอื่น</a>');
    var rows = [];
    for (var i = 0; i <= 14; i++) {
      var d = new Date(today); d.setDate(d.getDate() + i);
      var list = byDay[dayKey(d)] || [];
      if (i === 0 && !list.length) continue;
      var rel = i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : 'อีก ' + i + ' วัน';
      rows.push('<li class="cal-day"><div class="cal-date"><b>' + h(d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + '</b><span>' + rel + '</span></div>' +
        '<div class="cal-times">' + (list.length ? list.map(function (s) {
          return '<a class="slot-btn" href="booking.html?expert=' + encodeURIComponent(e.slug) + '&amp;slot=' + s.id + '" aria-label="จองเวลา ' + hm(s.start_at) + ' น. ' + h(MH.util.dateLong(s.start_at, true)) + '">' + hm(s.start_at) + '</a>';
        }).join('') : '<span class="cal-none">ไม่มีคิวว่าง</span>') + '</div></li>');
    }
    return '<p class="sec-note">มีคิวว่าง ' + total + ' ช่วง · กดเวลาที่ต้องการเพื่อไปหน้าจอง (ต้องเป็นสมาชิก) · เวลาเป็นเวลาประเทศไทย</p><ul class="cal">' + rows.join('') + '</ul>';
  }

  /* ---------- รีวิว ---------- */
  function reviews() {
    var list = S.all('expert_reviews').filter(function (r) { return r.expert_id === e.id && r.status === 'published'; })
      .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    if (!list.length) return MH.ui.empty('ยังไม่มีรีวิว', 'รีวิวเขียนได้หลังจบการปรึกษาเท่านั้น จึงมาจากผู้ใช้บริการจริง');
    return '<ul class="rv-list">' + list.map(function (r) {
      var m = S.find('members', r.member_id), who = m ? String(m.display_name).split(' ')[0] : 'สมาชิก';
      return '<li class="rv"><div class="rv-top">' + stars(r.rating) + '<b>' + h(who) + '</b><span>' + h(MH.util.dateShort(r.created_at)) + '</span></div>' +
        (r.comment ? '<p>' + h(r.comment) + '</p>' : '<p class="muted">ให้คะแนนอย่างเดียว</p>') + '</li>';
    }).join('') + '</ul>';
  }

  root.innerHTML =
    '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['experts.html', 'ผู้เชี่ยวชาญ'], [null, e.display_name]]) + '</div>' +
    '<section class="card ex-head" aria-labelledby="ex-name">' +
      '<span class="exp-av exp-av--lg" aria-hidden="true">' + h(initial(e.display_name)) + '</span>' +
      '<div><h1 id="ex-name">' + h(e.display_name) + '</h1><p class="ex-title">' + h(e.title) + '</p>' +
      '<div class="exp-tags">' + (e.specialties || []).map(function (s) { return '<span class="tag">' + h(specName(s)) + '</span>'; }).join('') + '</div>' +
      '<div class="ex-meta"><span>ประสบการณ์ <b>' + Number(e.years_experience || 0) + '</b> ปี</span>' +
        (rating.count ? '<span class="rating">' + stars(rating.avg) + '<b>' + rating.avg.toFixed(1) + '</b><span class="muted">(' + rating.count + ' รีวิว)</span></span>' : '<span class="muted">ยังไม่มีรีวิว</span>') +
        '<span class="st st--ok">ผ่านการตรวจคุณสมบัติ</span></div>' +
      '<p class="ex-bio">' + h(e.bio) + '</p>' +
      '<div class="ex-acts"><a class="btn btn--primary" href="#cal-h">' + MH.ui.icon('i-calendar') + 'เลือกเวลานัด</a>' + MH.ui.favButton('expert', e.id) + '</div></div>' +
    '</section>' +
    '<div class="notice ex-notice" role="note"><span>คำปรึกษาเป็นไปตามความเชื่อ ไม่รับประกันผล ผู้เชี่ยวชาญให้แนวทางประกอบการตัดสินใจ ไม่ใช่คำวินิจฉัยทางการแพทย์ กฎหมาย หรือการเงิน</span></div>' +
    '<section class="section" aria-labelledby="ch-h"><div class="sec-head"><h2 id="ch-h">ช่องทางและราคา</h2></div>' + channels() + '</section>' +
    '<section class="section scroll-mt" aria-labelledby="cal-h"><div class="sec-head"><h2 id="cal-h" tabindex="-1">คิวว่างใน 14 วันข้างหน้า</h2></div>' + calendar() + '</section>' +
    '<section class="section" aria-labelledby="rv-h"><div class="sec-head"><h2 id="rv-h">รีวิวจากผู้ใช้บริการ</h2></div>' + reviews() + '</section>' +
    '<p class="disclaimer">' + h(S.setting('disclaimer') || '') + '</p>';
})();
