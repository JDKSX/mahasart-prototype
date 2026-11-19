/* แท็บ "คอร์สของฉัน" ในหน้าบัญชี (account.html?tab=courses): คอร์สที่ลงทะเบียน + ความคืบหน้า + เกียรติบัตร
   โหลดหลัง assets/js/account-tabs.js · ถ้าหน้าบัญชียังไม่โหลด courses.css ไฟล์นี้โหลดให้เอง */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.account) return;

  function ensureCss() {
    if (document.querySelector('link[href$="courses.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = (MH.base || '') + 'assets/css/courses.css';
    document.head.appendChild(l);
  }
  function applyWidths(host) { host.querySelectorAll('[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; }); }

  function render(host, member) {
    ensureCss();
    member = MH.member.current() || member;
    var rows = MH.store.all('course_enrollments').filter(function (e) { return e.member_id === member.id && e.status !== 'cancelled'; })
      .sort(function (a, b) { return String(b.enrolled_at || b.created_at).localeCompare(String(a.enrolled_at || a.created_at)); });

    var items = rows.map(function (en) {
      var c = MH.store.find('courses', en.course_id); if (!c || c.deleted_at) return '';
      var lessons = MH.q.lessons(c.id), doneN = lessons.filter(function (l) { return (en.progress || []).indexOf(l.id) >= 0; }).length;
      var pct = lessons.length ? Math.round(doneN / lessons.length * 100) : 0;
      var url = MH.base + 'course.html?slug=' + encodeURIComponent(c.slug);
      var resume = lessons.filter(function (l) { return (en.progress || []).indexOf(l.id) < 0; })[0] || lessons[0];
      var acts = '', info;
      if (en.status === 'pending_payment') {
        var pend = MH.pay.forPayable('enrollment', en.id).filter(function (p) { return p.status === 'pending'; })[0];
        info = '<span class="tag tag--stone">' + h(MH.labels.enrollmentStatus.pending_payment) + '</span>';
        acts = pend ? '<a class="btn btn--primary btn--sm" href="' + h(MH.pay.url(pend)) + '">ชำระเงินต่อ ' + h(MH.money(pend.amount)) + '</a>' : '<a class="btn btn--primary btn--sm" href="' + h(url) + '">ซื้ออีกครั้ง</a>';
      } else {
        info = (en.certificate_no ? '<span class="tag tag--cert">เรียนจบแล้ว</span>' : '<span class="tag">กำลังเรียน</span>') +
          (en.source === 'premium' ? ' <span class="tag tag--new">เรียนฟรีกับพรีเมียม</span>' : '');
        acts = (en.certificate_no
          ? '<a class="btn btn--gold btn--sm" href="' + h(MH.base + 'certificate.html?no=' + encodeURIComponent(en.certificate_no)) + '">ดูเกียรติบัตร</a><a class="btn btn--outline btn--sm" href="' + h(MH.base + 'lesson.html?course=' + encodeURIComponent(c.slug) + '&lesson=' + (lessons[0] ? lessons[0].id : '')) + '">ทบทวน</a>'
          : (resume ? '<a class="btn btn--primary btn--sm" href="' + h(MH.base + 'lesson.html?course=' + encodeURIComponent(c.slug) + '&lesson=' + resume.id) + '">' + (doneN ? 'เรียนต่อ' : 'เริ่มเรียน') + '</a>' : '')) +
          '<a class="btn btn--outline btn--sm" href="' + h(url) + '">รายละเอียดคอร์ส</a>';
      }
      return '<li>' + MH.ui.articleThumb(c) + '<div><h3><a href="' + h(url) + '">' + h(c.title) + '</a></h3>' +
        '<p class="crs-meta">' + info + '</p>' +
        (en.status === 'active' ? '<p class="crs-progress-line"><span>ความคืบหน้า</span><span class="num">' + doneN + '/' + lessons.length + ' บท · ' + pct + '%</span></p>' +
          '<div class="crs-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="ความคืบหน้า ' + h(c.title) + '"><i data-w="' + pct + '"></i></div>' : '') +
        '<div class="btn-row">' + acts + '</div></div></li>';
    }).filter(Boolean);

    host.innerHTML = '<div class="sec-head"><h2>คอร์สของฉัน</h2><a href="' + h(MH.base + 'courses.html') + '">ดูคอร์สทั้งหมด</a></div>' +
      (items.length ? '<ul class="crs-mine">' + items.join('') + '</ul>'
        : MH.ui.empty('ยังไม่ได้ลงทะเบียนคอร์สไหน', 'เลือกคอร์สที่สนใจ ดูบทตัวอย่างฟรีก่อนตัดสินใจได้ สมาชิกพรีเมียมเรียนคอร์สที่ร่วมรายการได้ฟรี', '<a class="btn btn--primary" href="' + h(MH.base + 'courses.html') + '">ดูคอร์สเรียน</a>'));
    applyWidths(host);
  }

  MH.account.register({ key: 'courses', label: 'คอร์สของฉัน', order: 8, render: render });
})();
