/* หน้าเรียน: ?course=<slug>&lesson=<id> (ทีมงานดูตัวอย่าง: &preview=1)
   ต้องลงทะเบียนแล้วจึงเรียนได้ (ยกเว้นบทตัวอย่าง is_preview) · วิดีโอเป็นเครื่องเล่นจำลอง · แบบทดสอบให้คะแนน + เฉลย
   บันทึกความคืบหน้าผ่าน MH.commerce.completeLesson เท่านั้น (ครบทุกบทและผ่านแบบทดสอบ → ออกเลขที่เกียรติบัตร) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('lesson-root');
  var ICON = { video: 'i-screen', reading: 'i-book', quiz: 'i-check' };
  var LETTER = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];
  var timer = null;

  function crumbs(items) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span aria-hidden="true">›</span>' : '') + (it[0] && !last ? '<a href="' + it[0] + '">' + h(it[1]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + h(it[1]) + '</span>');
    }).join('') + '</nav>';
  }
  function applyWidths(host) { host.querySelectorAll('[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function clock(s) { return Math.floor(s / 60) + ':' + pad(s % 60); }

  function stateBox(title, text, actions, big) {
    document.title = title + ' · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['courses.html', 'คอร์สเรียน'], [null, title]]) + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">' + (big || '?') + '</p><h1>' + h(title) + '</h1><p>' + h(text) + '</p><div class="btn-row">' + (actions || '') + '</div></div>';
  }

  var slug = MH.util.param('course');
  var c = slug ? MH.q.course(slug) : null;
  var staffView = MH.util.param('preview') === '1' && !!MH.auth.user();
  if (!c || (c.status !== 'published' && !staffView)) {
    stateBox('ไม่พบคอร์สนี้', 'ลิงก์อาจพิมพ์ผิด หรือคอร์สนี้ยังไม่เปิดสอน', '<a class="btn btn--primary" href="courses.html">' + MH.ui.icon('i-back') + 'กลับไปคอร์สเรียน</a>');
    return;
  }
  var lessons = MH.q.lessons(c.id);
  var lid = MH.util.param('lesson');
  var lesson = lid ? lessons.filter(function (l) { return String(l.id) === String(lid); })[0] : null;
  var courseUrl = 'course.html?slug=' + encodeURIComponent(c.slug) + (staffView && c.status !== 'published' ? '&preview=1' : '');
  function lessonUrl(l) { return 'lesson.html?course=' + encodeURIComponent(c.slug) + '&lesson=' + l.id + (staffView ? '&preview=1' : ''); }

  if (lid && !lesson) {
    stateBox('ไม่พบบทเรียนนี้', 'บทที่ระบุในลิงก์ไม่อยู่ในคอร์ส “' + c.title + '” ลองเลือกจากสารบัญของคอร์ส', '<a class="btn btn--primary" href="' + h(courseUrl) + '">ดูสารบัญคอร์ส</a>');
    return;
  }
  if (!lessons.length) {
    stateBox('คอร์สนี้ยังไม่มีบทเรียน', 'ผู้สอนกำลังเพิ่มบทเรียน กลับมาดูใหม่ภายหลัง', '<a class="btn btn--primary" href="' + h(courseUrl) + '">กลับหน้าคอร์ส</a>');
    return;
  }

  /* ---------- สถานะของผู้เรียน ---------- */
  var member, en, active, progress;
  function loadState() {
    member = MH.member.current();
    en = member ? MH.q.enrollment(member.id, c.id) : null;
    active = !!en && en.status === 'active';
    progress = active ? (en.progress || []) : [];
  }
  loadState();
  if (!lesson) lesson = lessons.filter(function (l) { return progress.indexOf(l.id) < 0; })[0] || lessons[0];

  function canOpen(l) { return l.is_preview || active || staffView; }

  /* ---------- ปิดทางเข้า ---------- */
  if (!canOpen(lesson)) {
    if (!member) {
      stateBox('เข้าสู่ระบบก่อนเรียน', 'บทนี้สำหรับผู้ลงทะเบียนคอร์ส “' + c.title + '” เข้าสู่ระบบเพื่อเรียนต่อ หรือดูบทที่มีป้ายตัวอย่างฟรีได้โดยไม่ต้องเข้าสู่ระบบ',
        '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบ</a><a class="btn btn--outline" href="' + h(courseUrl) + '">ดูรายละเอียดคอร์ส</a>', '!');
    } else {
      var pend = en && en.status === 'pending_payment' ? MH.pay.forPayable('enrollment', en.id).filter(function (p) { return p.status === 'pending'; })[0] : null;
      stateBox('ลงทะเบียนคอร์สก่อนจึงจะเรียนบทนี้ได้', pend ? 'คุณสั่งซื้อคอร์สนี้ไว้แล้ว ชำระเงินให้เสร็จเพื่อเริ่มเรียน' : 'บทนี้สำหรับผู้ลงทะเบียนคอร์ส “' + c.title + '” ดูรายละเอียดและลงทะเบียนได้ที่หน้าคอร์ส',
        (pend ? '<a class="btn btn--primary" href="' + h(MH.pay.url(pend)) + '">ชำระเงินต่อ ' + h(MH.money(pend.amount)) + '</a>' : '<a class="btn btn--primary" href="' + h(courseUrl) + '">ดูรายละเอียดและลงทะเบียน</a>') +
        '<a class="btn btn--outline" href="courses.html">คอร์สทั้งหมด</a>', '!');
    }
    return;
  }

  /* ---------- ส่วนประกอบหน้า ---------- */
  var tocOpen = window.innerWidth >= 900;

  function tocHtml() {
    var doneN = lessons.filter(function (l) { return progress.indexOf(l.id) >= 0; }).length;
    var pct = lessons.length ? Math.round(doneN / lessons.length * 100) : 0;
    return '<aside class="lsn-toc-wrap" aria-label="สารบัญบทเรียน"><details class="lsn-toc" id="toc"' + (tocOpen ? ' open' : '') + '>' +
      '<summary><span>สารบัญ</span><span class="muted num">' + (active ? doneN + '/' : '') + lessons.length + ' บท</span></summary>' +
      (active ? '<div class="crs-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="ความคืบหน้าของคอร์ส"><i data-w="' + pct + '"></i></div>' : '') +
      '<ol>' + lessons.map(function (l, i) {
        var done = progress.indexOf(l.id) >= 0, cur = l.id === lesson.id;
        var mark = '<span class="st' + (done ? ' on' : '') + '">' + (done ? MH.ui.icon('i-check') : (i + 1)) + '</span>';
        var label = '<span>' + h(l.title) + '<small>' + h(MH.labels.lessonType[l.type] || l.type) + ' · ' + (Number(l.minutes) || 0) + ' นาที' + (done ? ' · เรียนแล้ว' : '') + (l.is_preview && !active ? ' · ตัวอย่างฟรี' : '') + '</small></span>';
        return canOpen(l)
          ? '<li><a href="' + h(lessonUrl(l)) + '"' + (cur ? ' aria-current="page"' : '') + '>' + mark + label + '</a></li>'
          : '<li><span title="ลงทะเบียนเพื่อเรียนบทนี้">' + mark + label + '</span></li>';
      }).join('') + '</ol></details></aside>';
  }

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  window.addEventListener('pagehide', stopTimer);

  /* ---------- วิดีโอจำลอง ---------- */
  function videoHtml() {
    var total = (Number(lesson.minutes) || 1) * 60;
    return '<div class="lsn-player" role="group" aria-label="เครื่องเล่นวิดีโอจำลอง">' +
      '<div class="lsn-screen"><strong>' + h(lesson.title) + '</strong><span id="v-status">กดเล่นเพื่อเริ่มดู</span></div>' +
      '<div class="lsn-ctrl"><button type="button" class="btn btn--gold btn--sm" id="v-play">' + MH.ui.icon('i-play') + '<span>เล่น</span></button>' +
      '<label class="sr-only" for="v-seek">เลื่อนตำแหน่งวิดีโอ</label><input type="range" id="v-seek" min="0" max="' + total + '" value="0" step="1">' +
      '<output id="v-time" for="v-seek">0:00 / ' + clock(total) + '</output></div></div>' +
      '<p class="lsn-fine">ต้นแบบนี้ใช้เครื่องเล่นจำลอง (เล่นเร็ว 60 เท่าให้เห็นแถบเวลาเดิน) ระบบจริงใช้วิดีโอสตรีมที่ป้องกันการดาวน์โหลด ไม่มีลิงก์ไฟล์วิดีโอให้ดึงออกไปเผยแพร่ต่อ</p>';
  }
  function wireVideo() {
    var total = (Number(lesson.minutes) || 1) * 60, pos = 0;
    var play = document.getElementById('v-play'), seek = document.getElementById('v-seek'), time = document.getElementById('v-time'), status = document.getElementById('v-status');
    if (!play) return;
    function sync() {
      seek.value = String(pos); time.textContent = clock(pos) + ' / ' + clock(total);
      play.querySelector('span').textContent = timer ? 'หยุดชั่วคราว' : (pos >= total ? 'เล่นซ้ำ' : (pos > 0 ? 'เล่นต่อ' : 'เล่น'));
      status.textContent = timer ? 'กำลังเล่น…' : (pos >= total ? 'เล่นจบแล้ว' : (pos > 0 ? 'หยุดอยู่ที่ ' + clock(pos) : 'กดเล่นเพื่อเริ่มดู'));
    }
    play.addEventListener('click', function () {
      if (timer) { stopTimer(); sync(); return; }
      if (pos >= total) pos = 0;
      timer = setInterval(function () {
        pos = Math.min(total, pos + 15);
        if (pos >= total) stopTimer();
        sync();
      }, 250);
      sync();
    });
    seek.addEventListener('input', function () { pos = Number(seek.value); sync(); });
  }

  /* ---------- แบบทดสอบ ---------- */
  var quizState = { phase: 'form', answers: [], score: 0 };
  function quizFormHtml() {
    var qs = lesson.questions || [];
    return '<p class="lsn-quiz-info">ตอบให้ครบทุกข้อ เกณฑ์ผ่าน: ถูกอย่างน้อย <b>' + (lesson.pass_score || 0) + '</b> จาก ' + qs.length + ' ข้อ · ทำใหม่ได้ไม่จำกัดครั้ง</p>' +
      '<form id="quiz-form" novalidate><div id="quiz-err"></div><ol class="lsn-qs">' + qs.map(function (q, i) {
        return '<li class="lsn-q"><fieldset><legend>ข้อ ' + (i + 1) + '. ' + h(q.q) + '</legend>' + (q.choices || []).map(function (ch, j) {
          return '<label class="lsn-opt" for="q' + i + 'c' + j + '"><input type="radio" name="q' + i + '" id="q' + i + 'c' + j + '" value="' + j + '"' + (quizState.answers[i] === j ? ' checked' : '') + '><span>' + h(ch) + '</span></label>';
        }).join('') + '</fieldset></li>';
      }).join('') + '</ol><div class="btn-row"><button type="submit" class="btn btn--primary">ส่งคำตอบ</button></div></form>';
  }
  function quizReviewHtml() {
    var qs = lesson.questions || [], pass = quizState.score >= (lesson.pass_score || 0);
    return '<div class="lsn-result ' + (pass ? 'lsn-result--ok' : 'lsn-result--no') + '" id="quiz-result" role="status" tabindex="-1"><h2>' + (pass ? 'ผ่านแบบทดสอบ' : 'ยังไม่ผ่าน') + '</h2>' +
      '<p>คุณได้ <b>' + quizState.score + '</b> จาก ' + qs.length + ' คะแนน (เกณฑ์ผ่าน ' + (lesson.pass_score || 0) + ' คะแนน)' +
      (pass ? '' : ' · อ่านเฉลยด้านล่างแล้วกด “ทำแบบทดสอบใหม่” ได้เลย') + '</p></div>' +
      '<ol class="lsn-qs">' + qs.map(function (q, i) {
        var mine = quizState.answers[i];
        return '<li class="lsn-q"><fieldset><legend>ข้อ ' + (i + 1) + '. ' + h(q.q) + '</legend>' + (q.choices || []).map(function (ch, j) {
          var right = j === q.answer, wrong = j === mine && !right;
          return '<div class="lsn-opt' + (right ? ' is-right' : '') + (wrong ? ' is-wrong' : '') + '"><span>' + h(ch) + '</span><span class="mark">' + (right ? (j === mine ? 'คำตอบของคุณ ✓ ถูก' : '✓ เฉลย') : (wrong ? 'คำตอบของคุณ ✗ ผิด' : '')) + '</span></div>';
        }).join('') + (q.explain ? '<p class="lsn-explain"><b>คำอธิบาย:</b> ' + h(q.explain) + '</p>' : '') + '</fieldset></li>';
      }).join('') + '</ol>';
  }

  /* ---------- วาดหน้า ---------- */
  function render() {
    stopTimer();
    var idx = lessons.indexOf(lessons.filter(function (l) { return l.id === lesson.id; })[0]);
    var prev = lessons[idx - 1] || null, next = lessons[idx + 1] || null;
    var done = progress.indexOf(lesson.id) >= 0;
    var canRecord = active;
    var typeLabel = MH.labels.lessonType[lesson.type] || lesson.type;
    var wasOpen = document.getElementById('toc'); if (wasOpen) tocOpen = wasOpen.open;

    document.title = lesson.title + ' · ' + c.title + ' · MAHASART';
    var notices = '';
    if (staffView && !active) notices += '<div class="notice notice--warn" role="status"><span>ดูตัวอย่างสำหรับทีมงาน ไม่บันทึกความคืบหน้าและไม่ให้คะแนนจริง</span></div>';
    else if (!active) {
      notices += '<div class="notice" role="status"><span>นี่คือบทตัวอย่างฟรี ลงทะเบียนคอร์สเพื่อเรียนครบทุกบท บันทึกความคืบหน้า และรับเกียรติบัตร</span>' +
        '<a class="btn btn--primary btn--sm" href="' + h(courseUrl) + '">ดูรายละเอียดคอร์ส</a></div>';
    }
    if (active && en.certificate_no) {
      notices += '<div class="notice notice--ok" role="status"><span><b>ยินดีด้วย คุณเรียนจบคอร์สนี้แล้ว</b> เกียรติบัตรเลขที่ ' + h(en.certificate_no) + ' พร้อมให้ดูและพิมพ์</span>' +
        '<a class="btn btn--gold btn--sm" href="certificate.html?no=' + encodeURIComponent(en.certificate_no) + '">ดูเกียรติบัตร</a></div>';
    }

    var body = '';
    if (lesson.type === 'video') {
      body = videoHtml() + (lesson.content ? '<section class="lsn-body" aria-labelledby="sum-h"><h2 id="sum-h">สรุปเนื้อหาในบท</h2><div class="prose">' + MH.util.renderBody(lesson.content) + '</div></section>' : '');
    } else if (lesson.type === 'reading') {
      body = '<div class="prose">' + MH.util.renderBody(lesson.content) + '</div>';
    } else {
      body = (lesson.content ? '<div class="prose">' + MH.util.renderBody(lesson.content) + '</div>' : '') +
        (done && quizState.phase === 'form' ? '<p class="notice notice--ok">คุณผ่านบทนี้แล้ว (คะแนนที่บันทึกไว้ ' + ((en.quiz_scores || {})[lesson.id] != null ? en.quiz_scores[lesson.id] : '-') + ' จาก ' + (lesson.questions || []).length + ') ทำซ้ำเพื่อทบทวนได้</p>' : '') +
        (!canRecord && quizState.phase === 'form' ? '<p class="notice">บทตัวอย่างไม่บันทึกคะแนน</p>' : '') +
        '<div id="quiz-box">' + (quizState.phase === 'form' ? quizFormHtml() : quizReviewHtml()) + '</div>';
    }

    /* ปุ่มท้ายบท */
    var foot = '';
    if (prev && canOpen(prev)) foot += '<a class="btn btn--outline" href="' + h(lessonUrl(prev)) + '">' + MH.ui.icon('i-back') + 'บทก่อนหน้า</a>';
    foot += '<span class="spacer"></span>';
    var nextLink = next && canOpen(next) ? '<a class="btn btn--primary" href="' + h(lessonUrl(next)) + '">บทถัดไป: ' + h(next.title) + MH.ui.icon('i-arrow') + '</a>' : '';
    if (lesson.type === 'quiz') {
      if (quizState.phase === 'review') {
        var pass = quizState.score >= (lesson.pass_score || 0);
        if (!pass) foot += '<button type="button" class="btn btn--primary" data-act="retry">ทำแบบทดสอบใหม่</button>';
        else if (nextLink) foot += nextLink;
        else if (canRecord && en.certificate_no) foot += '<a class="btn btn--gold" href="certificate.html?no=' + encodeURIComponent(en.certificate_no) + '">ดูเกียรติบัตร</a>';
        else if (canRecord) foot += '<a class="btn btn--outline" href="' + h(courseUrl) + '">กลับหน้าคอร์ส</a>';
        else foot += '<a class="btn btn--primary" href="' + h(courseUrl) + '">ดูรายละเอียดคอร์ส</a>';
      } else if (done && nextLink) foot += nextLink;
    } else if (canRecord) {
      if (!done) foot += '<button type="button" class="btn btn--primary" data-act="done">' + (next ? 'เรียนบทนี้จบแล้ว ไปบทถัดไป' : 'เรียนบทนี้จบแล้ว') + '</button>';
      else {
        foot += '<span class="tag tag--cert">เรียนบทนี้แล้ว</span>';
        if (nextLink) foot += nextLink;
        else if (en.certificate_no) foot += '<a class="btn btn--gold" href="certificate.html?no=' + encodeURIComponent(en.certificate_no) + '">ดูเกียรติบัตร</a>';
        else foot += '<a class="btn btn--outline" href="' + h(courseUrl) + '">กลับหน้าคอร์ส</a>';
      }
    } else {
      foot += nextLink || '<a class="btn btn--primary" href="' + h(courseUrl) + '">ดูรายละเอียดคอร์ส</a>';
    }

    root.innerHTML =
      '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['courses.html', 'คอร์สเรียน'], [courseUrl, c.title], [null, lesson.title]]) + '</div>' +
      '<div class="lsn-layout">' + tocHtml() +
        '<div class="lsn-main">' + notices +
          '<p class="lsn-kicker">บทที่ ' + (idx + 1) + ' จาก ' + lessons.length + ' · ' + h(typeLabel) + ' · ' + (Number(lesson.minutes) || 0) + ' นาที' + (lesson.is_preview ? ' · บทตัวอย่างฟรี' : '') + '</p>' +
          '<h1>' + h(lesson.title) + '</h1>' + body +
          '<div class="lsn-foot">' + foot + '</div>' +
        '</div></div>';
    applyWidths(root);
    if (lesson.type === 'video') wireVideo();
  }

  /* ---------- เหตุการณ์ ---------- */
  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'quiz-form') return;
    e.preventDefault();
    var qs = lesson.questions || [], answers = [], missing = [];
    qs.forEach(function (q, i) {
      var r = document.querySelector('input[name="q' + i + '"]:checked');
      answers[i] = r ? Number(r.value) : null;
      if (!r) missing.push(i + 1);
    });
    if (missing.length) {
      document.getElementById('quiz-err').innerHTML = '<div class="notice notice--danger" role="alert"><span>ตอบให้ครบทุกข้อก่อนส่ง · ยังไม่ได้ตอบข้อ ' + missing.join(', ') + '</span></div>';
      var first = document.querySelector('input[name="q' + (missing[0] - 1) + '"]'); if (first) first.focus();
      return;
    }
    var score = 0;
    qs.forEach(function (q, i) { if (answers[i] === q.answer) score++; });
    quizState = { phase: 'review', answers: answers, score: score };
    var pass = score >= (lesson.pass_score || 0);
    if (pass && active) {
      var prevScore = (en.quiz_scores || {})[lesson.id];
      MH.commerce.completeLesson(en.id, lesson.id, Math.max(score, prevScore || 0));
      loadState();
      MH.ui.toast(en.certificate_no ? 'ผ่านแบบทดสอบ และเรียนจบคอร์สแล้ว' : 'ผ่านแบบทดสอบ บันทึกความคืบหน้าแล้ว');
    }
    render();
    var res = document.getElementById('quiz-result'); if (res) { res.scrollIntoView({ block: 'center' }); res.focus({ preventScroll: true }); }
  });

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'retry') {
      quizState = { phase: 'form', answers: [], score: 0 }; render();
      var f = document.querySelector('#quiz-form input'); if (f) f.focus();
    }
    if (act === 'done') {
      if (!active) return;
      var upd = MH.commerce.completeLesson(en.id, lesson.id);
      if (!upd) { MH.ui.toast('บันทึกไม่สำเร็จ ลองรีเฟรชหน้าแล้วกดอีกครั้ง'); return; }
      loadState();
      var idx = lessons.map(function (l) { return l.id; }).indexOf(lesson.id), next = lessons[idx + 1];
      MH.ui.toast(en.certificate_no ? 'เรียนจบคอร์สแล้ว รับเกียรติบัตรได้เลย' : 'บันทึกแล้ว: เรียนบทนี้จบ');
      if (next) { location.href = lessonUrl(next); return; }
      render();
    }
  });

  render();
})();
