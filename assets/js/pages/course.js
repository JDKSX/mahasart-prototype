/* หน้ารายละเอียดคอร์ส: ?slug=… (ดูตัวอย่างจากหลังบ้าน: &preview=1 เฉพาะทีมงานที่ล็อกอิน)
   ปุ่มหลักเปลี่ยนตามสถานะ: ไม่ล็อกอิน · ลงทะเบียนแล้ว (เรียนต่อ/จบแล้ว) · รอชำระ · พรีเมียม+ร่วมรายการ (ฟรี) · ซื้อคอร์ส */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('course-root');
  var ICON = { video: 'i-screen', reading: 'i-book', quiz: 'i-check' };

  function crumbs(items) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span aria-hidden="true">›</span>' : '') + (it[0] && !last ? '<a href="' + it[0] + '">' + h(it[1]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + h(it[1]) + '</span>');
    }).join('') + '</nav>';
  }
  function fmtMin(n) { n = Number(n) || 0; return n >= 60 ? Math.floor(n / 60) + ' ชม.' + (n % 60 ? ' ' + (n % 60) + ' นาที' : '') : n + ' นาที'; }
  function applyWidths(host) { host.querySelectorAll('[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; }); }

  function notFound() {
    document.title = 'ไม่พบคอร์ส · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['courses.html', 'คอร์สเรียน'], [null, 'ไม่พบคอร์ส']]) + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">?</p><h1>ไม่พบคอร์สนี้</h1>' +
      '<p>ลิงก์อาจพิมพ์ผิด หรือคอร์สนี้ยังไม่เปิดสอน ลองเลือกคอร์สจากรายการ</p>' +
      '<div class="btn-row"><a class="btn btn--primary" href="courses.html">' + MH.ui.icon('i-back') + 'กลับไปคอร์สเรียน</a></div></div>';
  }

  var slug = MH.util.param('slug');
  var c = slug ? MH.q.course(slug) : null;
  var live = !!c && c.status === 'published';
  var staffPreview = !!c && !live && MH.util.param('preview') === '1' && !!MH.auth.user();
  if (!c || (!live && !staffPreview)) { notFound(); return; }

  document.title = c.title + ' · MAHASART';
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', c.summary || c.title);

  function lessonUrl(l) { return 'lesson.html?course=' + encodeURIComponent(c.slug) + '&lesson=' + l.id + (staffPreview ? '&preview=1' : ''); }

  function render() {
    var member = MH.member.current();
    var premium = !!member && MH.member.isPremium(member);
    var lessons = MH.q.lessons(c.id);
    var minutes = lessons.reduce(function (s, l) { return s + (Number(l.minutes) || 0); }, 0);
    var ex = MH.store.find('experts', c.expert_id);
    var en = member ? MH.q.enrollment(member.id, c.id) : null;
    var active = !!en && en.status === 'active';
    var progress = active ? (en.progress || []) : [];
    var doneN = lessons.filter(function (l) { return progress.indexOf(l.id) >= 0; }).length;
    var pct = lessons.length ? Math.round(doneN / lessons.length * 100) : 0;
    var plan = MH.q.plan('premium');
    var freeForMe = premium && c.included_in_premium;

    /* บทที่ควรเรียนต่อ: บทแรกที่ยังไม่จบ ถ้าจบหมดแล้วกลับไปบทแรก */
    var resume = lessons.filter(function (l) { return progress.indexOf(l.id) < 0; })[0] || lessons[0];

    /* ---- ปุ่มตามสถานะ ---- */
    var cta = '', priceHtml;
    if (active) priceHtml = '<p class="crs-price"><small>ลงทะเบียนแล้ว</small></p>';
    else if (freeForMe) priceHtml = '<p class="crs-price"><small>ฟรีสำหรับพรีเมียม</small><s>' + h(MH.money(c.price)) + '</s></p>';
    else priceHtml = '<p class="crs-price">' + h(MH.money(c.price)) + '</p>';

    if (staffPreview) {
      cta = '<p class="notice notice--warn">ตัวอย่างสำหรับทีมงาน คอร์สนี้ยังไม่เปิดสอน จึงสั่งซื้อไม่ได้</p>' +
        (resume ? '<a class="btn btn--outline" href="' + h(lessonUrl(lessons[0])) + '">ดูบทแรกของคอร์ส</a>' : '');
    } else if (!member) {
      cta = '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบเพื่อเรียนคอร์สนี้</a>' +
        '<p class="crs-hint">ดูบทที่มีป้าย “ตัวอย่างฟรี” ได้โดยไม่ต้องเข้าสู่ระบบ</p>';
    } else if (active) {
      cta = '<div><p class="crs-progress-line"><span>ความคืบหน้า</span><span class="num">' + doneN + '/' + lessons.length + ' บท · ' + pct + '%</span></p>' +
        '<div class="crs-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="ความคืบหน้าของคอร์ส"><i data-w="' + pct + '"></i></div></div>';
      if (en.certificate_no) {
        cta += '<a class="btn btn--gold" href="certificate.html?no=' + encodeURIComponent(en.certificate_no) + '">' + MH.ui.icon('i-star') + 'ดูเกียรติบัตร</a>' +
          '<a class="btn btn--outline" href="' + h(lessonUrl(lessons[0])) + '">ทบทวนบทเรียน</a>';
      } else if (resume) {
        cta += '<a class="btn btn--primary" href="' + h(lessonUrl(resume)) + '">' + (doneN ? 'เรียนต่อ' : 'เริ่มเรียน') + MH.ui.icon('i-arrow') + '</a>';
      }
    } else {
      var pend = en && en.status === 'pending_payment' ? MH.pay.forPayable('enrollment', en.id).filter(function (p) { return p.status === 'pending'; })[0] : null;
      if (pend) {
        cta = '<p class="notice notice--warn">คุณสั่งซื้อคอร์สนี้ไว้แล้ว รอชำระเงินภายในเวลาที่กำหนด</p>' +
          '<a class="btn btn--primary" href="' + h(MH.pay.url(pend)) + '">ชำระเงินต่อ ' + h(MH.money(pend.amount)) + '</a>';
      } else if (freeForMe) {
        cta = '<button type="button" class="btn btn--primary" data-act="enroll">เริ่มเรียน (ฟรีสำหรับพรีเมียม)</button>';
      } else {
        cta = '<button type="button" class="btn btn--primary" data-act="enroll">ซื้อคอร์ส ' + h(MH.money(c.price)) + '</button>' +
          '<p class="crs-hint">ชำระด้วย PromptPay ภายใน ' + (MH.store.setting('payment_timeout_min') || 30) + ' นาที หลังชำระเริ่มเรียนได้ทันที</p>';
        if (c.included_in_premium && plan) cta += '<a class="btn btn--outline" href="pricing.html">หรือสมัครพรีเมียม ' + h(MH.money(plan.price_month)) + '/เดือน เรียนฟรี</a>';
      }
    }

    /* ---- สารบัญ ---- */
    var rows = lessons.map(function (l, i) {
      var done = progress.indexOf(l.id) >= 0;
      var open = l.is_preview || active || staffPreview;
      var typeLabel = MH.labels.lessonType[l.type] || l.type;
      var state = done ? '<span class="done">' + MH.ui.icon('i-check') + 'เรียนแล้ว</span>'
        : (l.is_preview && !active ? '<span class="tag tag--new">ตัวอย่างฟรี</span>' : (!open ? 'ลงทะเบียนเพื่อเรียน' : ''));
      var inner = '<span class="crs-ls-ico">' + MH.ui.icon(ICON[l.type] || 'i-book') + '</span>' +
        '<span class="crs-ls-t"><b>' + (i + 1) + '. ' + h(l.title) + '</b><small>' + h(typeLabel) + ' · ' + (Number(l.minutes) || 0) + ' นาที</small></span>' +
        '<span class="crs-ls-s">' + state + '</span>';
      return open ? '<li><a class="crs-ls" href="' + h(lessonUrl(l)) + '">' + inner + '</a></li>' : '<li><div class="crs-ls crs-ls--lock">' + inner + '</div></li>';
    }).join('');

    var instructor = ex
      ? '<section class="section" aria-labelledby="ins-h"><div class="sec-head"><h2 id="ins-h">ผู้สอน</h2></div>' +
        '<div class="card crs-instructor"><span class="crs-avatar" aria-hidden="true">' + MH.ui.icon('i-expert') + '</span><div>' +
        '<h3>' + (ex.status === 'active' ? '<a href="expert.html?slug=' + encodeURIComponent(ex.slug) + '">' + h(ex.display_name) + '</a>' : h(ex.display_name)) + '</h3>' +
        '<p>' + h(ex.title || '') + (ex.years_experience ? ' · ประสบการณ์ ' + ex.years_experience + ' ปี' : '') + '</p>' +
        '<p>' + h(ex.bio || '') + '</p></div></div></section>'
      : '';

    var tags = '<span class="tag">' + h(c.level || 'ทั่วไป') + '</span>' + (c.included_in_premium ? ' <span class="tag tag--cert">พรีเมียมเรียนฟรี</span>' : '');

    root.innerHTML =
      (staffPreview ? '<div class="notice notice--warn" role="status"><span>ตัวอย่างก่อนเผยแพร่ เห็นเฉพาะทีมงาน (สถานะ: <b>' + h(MH.labels.articleStatus[c.status] || c.status) + '</b>)</span></div>' : '') +
      '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['courses.html', 'คอร์สเรียน'], [null, c.title]]) +
        '<h1>' + h(c.title) + '</h1><p class="lede">' + h(c.summary || '') + '</p>' +
        '<p class="meta-row"><span>' + tags + '</span><span>ผู้สอน ' + (ex ? h(ex.display_name) : 'ทีมงาน MAHASART') + '</span><span>' + lessons.length + ' บท · ' + h(fmtMin(minutes)) + '</span></p></div>' +
      '<div class="crs-layout"><div>' +
        '<section aria-labelledby="syl-h"><div class="sec-head"><h2 id="syl-h">สารบัญบทเรียน</h2><span class="muted num">' + lessons.length + ' บท</span></div>' +
        (lessons.length ? '<ol class="crs-syllabus">' + rows + '</ol>' : MH.ui.empty('คอร์สนี้ยังไม่มีบทเรียน', 'ผู้สอนกำลังเพิ่มบทเรียน')) + '</section>' +
        instructor +
        '<p class="disclaimer">' + h(MH.store.setting('disclaimer') || '') + '</p>' +
      '</div>' +
      '<aside class="crs-aside card" aria-label="ลงทะเบียนเรียน">' + MH.ui.articleThumb(c) + priceHtml +
        '<dl class="crs-facts"><dt>ระดับ</dt><dd>' + h(c.level || '-') + '</dd><dt>บทเรียน</dt><dd>' + lessons.length + ' บท</dd><dt>เวลาเรียน</dt><dd>' + h(fmtMin(minutes)) + '</dd>' +
        '<dt>เมื่อเรียนจบ</dt><dd>รับเกียรติบัตร (ต้องผ่านแบบทดสอบ)</dd></dl>' +
        '<div class="crs-cta">' + cta + '</div>' +
        '<div>' + MH.ui.favButton('course', c.id, 'เก็บคอร์สนี้เป็นรายการโปรด') + '</div>' +
      '</aside></div>';
    applyWidths(root);
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act="enroll"]'); if (!b) return;
    var m = MH.member.current(); if (!m) { location.href = MH.member.loginUrl(); return; }
    var r = MH.commerce.enroll(c.id);
    if (r.error) { MH.ui.toast(r.error); return; }
    if (r.payment) { location.href = MH.pay.url(r.payment); return; }
    var first = MH.q.lessons(c.id)[0];
    MH.ui.toast('เริ่มเรียนได้เลย คอร์สนี้ฟรีสำหรับสมาชิกพรีเมียม');
    if (first) location.href = lessonUrl(first); else render();
  });

  render();
})();
