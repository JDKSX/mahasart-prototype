/* รายการคอร์สเรียน: การ์ดคอร์สที่เผยแพร่ · กรอง "พรีเมียมเรียนฟรี" (?filter=premium) · แถบชวนสมัครพรีเมียม
   สถานะของสมาชิกที่ล็อกอิน (กำลังเรียน / จบแล้ว / รอชำระ) แสดงบนการ์ดด้วย */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var member = MH.member.current();
  var premium = !!member && MH.member.isPremium(member);
  var plan = MH.q.plan('premium');

  var bannerEl = document.getElementById('crs-banner'), chipsEl = document.getElementById('crs-chips'),
    countEl = document.getElementById('crs-count'), listEl = document.getElementById('crs-list'), emptyEl = document.getElementById('crs-empty');

  var FILTERS = [['all', 'ทั้งหมด'], ['premium', 'พรีเมียมเรียนฟรี']];
  var f = MH.util.param('filter');
  var state = { filter: FILTERS.some(function (x) { return x[0] === f; }) ? f : 'all' };

  function fmtMin(n) { n = Number(n) || 0; return n >= 60 ? Math.floor(n / 60) + ' ชม.' + (n % 60 ? ' ' + (n % 60) + ' นาที' : '') : n + ' นาที'; }
  function stats(courseId) {
    var ls = MH.q.lessons(courseId);
    return { lessons: ls, count: ls.length, minutes: ls.reduce(function (s, l) { return s + (Number(l.minutes) || 0); }, 0) };
  }
  function pct(en, lessons) {
    if (!lessons.length) return 0;
    var done = lessons.filter(function (l) { return (en.progress || []).indexOf(l.id) >= 0; }).length;
    return Math.round(done / lessons.length * 100);
  }

  /* แถบชวนสมัครพรีเมียม */
  (function () {
    var price = plan ? MH.money(plan.price_month) : '';
    if (premium) {
      bannerEl.innerHTML = '<div class="crs-banner"><p><b>คุณเป็นสมาชิกพรีเมียม</b><span>คอร์สที่มีป้าย “พรีเมียมเรียนฟรี” กดเริ่มเรียนได้ทันที ไม่ต้องจ่ายเพิ่ม</span></p>' +
        '<a class="btn btn--outline" href="account.html?tab=plan">ดูแพ็กเกจของฉัน</a></div>';
    } else {
      bannerEl.innerHTML = '<div class="crs-banner"><p><b>สมัครพรีเมียม ' + h(price) + ' ต่อเดือน เรียนคอร์สที่ร่วมรายการได้ฟรี</b>' +
        '<span>ชำระด้วย PromptPay ยกเลิกได้ทุกเมื่อ ใช้สิทธิ์ได้ถึงวันครบรอบบิล</span></p>' +
        '<a class="btn btn--gold" href="pricing.html">ดูแพ็กเกจพรีเมียม' + MH.ui.icon('i-arrow') + '</a></div>';
    }
  })();

  chipsEl.innerHTML = FILTERS.map(function (x) {
    return '<button type="button" class="chip" data-filter="' + x[0] + '" aria-pressed="false">' + h(x[1]) + '</button>';
  }).join('');

  function card(c) {
    var st = stats(c.id), ex = MH.store.find('experts', c.expert_id);
    var en = member ? MH.q.enrollment(member.id, c.id) : null;
    var active = !!en && en.status === 'active';
    var tags = '<span class="tag">' + h(c.level || 'ทั่วไป') + '</span>' +
      (c.included_in_premium ? '<span class="tag tag--cert">พรีเมียมเรียนฟรี</span>' : '');
    var price;
    if (active) {
      var p = pct(en, st.lessons);
      price = en.certificate_no ? '<span class="crs-price"><small>เรียนจบแล้ว</small></span>' : '<span class="crs-price"><small>กำลังเรียน ' + p + '%</small></span>';
    } else if (en && en.status === 'pending_payment') {
      price = '<span class="crs-price"><small>รอชำระเงิน</small></span>';
    } else if (premium && c.included_in_premium) {
      price = '<span class="crs-price"><small>ฟรีสำหรับคุณ</small><s>' + h(MH.money(c.price)) + '</s></span>';
    } else {
      price = '<span class="crs-price">' + h(MH.money(c.price)) + '</span>';
    }
    return '<li><a class="crs-card" href="course.html?slug=' + encodeURIComponent(c.slug) + '">' + MH.ui.articleThumb(c) +
      '<span class="b"><span class="crs-tags">' + tags + '</span>' +
      '<h3>' + h(c.title) + '</h3>' +
      '<p>' + h(c.summary || '') + '</p>' +
      '<span class="crs-meta">ผู้สอน ' + h(ex ? ex.display_name : 'ทีมงาน MAHASART') + '</span>' +
      '<span class="crs-meta">' + st.count + ' บท · ' + h(fmtMin(st.minutes)) + '</span>' +
      '<span class="crs-foot">' + price + '</span></span></a></li>';
  }

  function syncURL() {
    var file = location.pathname.split('/').pop() || 'courses.html';
    try { history.replaceState(null, '', file + (state.filter !== 'all' ? '?filter=' + state.filter : '')); } catch (e) { /* เปิดจากไฟล์บางกรณีเปลี่ยน URL ไม่ได้ */ }
  }

  function render() {
    var all = MH.q.courses().filter(function (c) { return state.filter === 'all' || c.included_in_premium; })
      .sort(function (a, b) { return String(b.published_at).localeCompare(String(a.published_at)); });
    chipsEl.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === state.filter)); });
    countEl.innerHTML = 'พบ <b class="num">' + all.length + '</b> คอร์ส' + (state.filter === 'premium' ? ' ที่พรีเมียมเรียนฟรี' : '');
    if (!all.length) {
      listEl.hidden = true; listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.innerHTML = state.filter === 'premium'
        ? MH.ui.empty('ยังไม่มีคอร์สที่พรีเมียมเรียนฟรี', 'คอร์สที่ร่วมรายการจะขึ้นที่นี่เมื่อเผยแพร่ ระหว่างนี้ดูคอร์สทั้งหมดก่อนได้', '<button type="button" class="btn btn--primary" data-all>ดูคอร์สทั้งหมด</button>')
        : MH.ui.empty('ยังไม่มีคอร์สที่เปิดสอน', 'ผู้เชี่ยวชาญกำลังเตรียมคอร์สอยู่ ระหว่างนี้อ่านบทความในคลังความรู้ไปก่อนได้', '<a class="btn btn--primary" href="articles.html">ไปคลังความรู้</a>');
    } else {
      emptyEl.hidden = true; emptyEl.innerHTML = '';
      listEl.hidden = false;
      listEl.innerHTML = all.map(card).join('');
    }
    syncURL();
  }

  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]'); if (!b) return;
    state.filter = b.getAttribute('data-filter'); render();
  });
  emptyEl.addEventListener('click', function (e) {
    if (!e.target.closest('[data-all]')) return;
    state.filter = 'all'; render();
  });

  render();
})();
