/* แก้ไข/สร้างคอร์ส: ฟอร์มข้อมูล + ตัวแก้บท (เพิ่ม/ลบ/เลื่อน, วิดีโอ/บทอ่าน/แบบทดสอบ) + วงจร ฉบับร่าง → ส่งตรวจ → เผยแพร่ / ตีกลับ
   สิทธิ์แก้: courses.edit_any (ทุกสถานะ) หรือ courses.edit_own + เป็นผู้สอน (เฉพาะฉบับร่าง) · เผยแพร่: courses.publish และผู้สอนต้อง active
   เงื่อนไขส่งตรวจ/เผยแพร่: ≥ 3 บท · มีแบบทดสอบ ≥ 1 บท (ทุกข้อครบ 4 ตัวเลือก มีเฉลย + คำอธิบาย) · ไม่มีคำต้องห้าม */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var me = MH.admin.user, can = function (p) { return MH.admin.can(p); };
  var $ = function (id) { return document.getElementById(id); };
  var form = $('course-form'), stateBox = $('state');

  var LEVELS = ['เริ่มต้น', 'ปานกลาง', 'ขั้นสูง'];
  var TYPES = [['video', 'วิดีโอ'], ['reading', 'บทอ่าน'], ['quiz', 'แบบทดสอบ']];
  var LETTER = ['ก', 'ข', 'ค', 'ง'];
  var SLUG_HINT = 'ใช้ a-z ตัวเลข และขีดกลางเท่านั้น ชื่อภาษาไทยให้กรอกเอง';

  var experts = MH.store.all('experts');
  var myExpert = me.role === 'expert' ? experts.filter(function (e) { return e.user_id === me.id; })[0] || null : null;
  var course = null;        /* แถวที่บันทึกแล้ว (null = กำลังสร้างใหม่) */
  var model = [], seq = 0, ro = false;

  /* ---------- สิทธิ์ ---------- */
  function expertOf(id) { return experts.filter(function (e) { return e.id === Number(id); })[0] || null; }
  function isOwner(c) { var e = c ? expertOf(c.expert_id) : null; return !!e && e.user_id === me.id; }
  function canEdit(c) {
    if (!c) return can('courses.create') && (me.role !== 'expert' || !!myExpert);
    if (can('courses.edit_any')) return true;
    return can('courses.edit_own') && isOwner(c) && c.status === 'draft';
  }
  function readOnlyReason(c) {
    if (!can('courses.edit_any') && !(can('courses.edit_own') && isOwner(c))) return 'คอร์สนี้ไม่ใช่ของคุณ ดูได้อย่างเดียว';
    if (c.status === 'in_review') return 'ส่งตรวจแล้ว ตอนนี้แก้ไม่ได้ จนกว่าบรรณาธิการจะตีกลับมาให้แก้';
    if (c.status === 'published') return 'คอร์สนี้เผยแพร่แล้ว ผู้สอนแก้เองไม่ได้ ถ้าต้องแก้ให้แจ้งบรรณาธิการ';
    return MH.labels.role[me.role] + 'ดูคอร์สได้อย่างเดียว';
  }

  /* ---------- หน้าสถานะ ---------- */
  function showState(title, text, actionHtml) {
    form.hidden = true; $('head-actions').innerHTML = '';
    $('page-title').textContent = title; $('page-sub').textContent = '';
    stateBox.innerHTML = MH.ui.empty(title, text, actionHtml || '<a class="btn btn--primary" href="courses.html">กลับรายการคอร์ส</a>');
  }
  var idParam = MH.util.param('id');
  if (idParam) {
    course = MH.store.find('courses', idParam);
    if (!course || course.deleted_at) { showState('ไม่พบคอร์สนี้', 'ลิงก์อาจผิด หรือคอร์สถูกลบไปแล้ว'); return; }
    if (me.role === 'expert' && !isOwner(course)) { showState('คอร์สนี้เป็นของผู้เชี่ยวชาญท่านอื่น', 'ผู้เชี่ยวชาญเปิดดูและแก้ได้เฉพาะคอร์สของตัวเอง'); return; }
  } else if (!canEdit(null)) {
    showState('สร้างคอร์สใหม่ไม่ได้', me.role === 'expert' ? 'บัญชีนี้ยังไม่ได้ผูกกับโปรไฟล์ผู้เชี่ยวชาญ แจ้งผู้ดูแลระบบให้เพิ่มก่อน' : MH.labels.role[me.role] + 'ดูและตรวจคอร์สได้ แต่สร้างคอร์สใหม่ไม่ได้ คอร์สสร้างโดยผู้เชี่ยวชาญหรือผู้ดูแลระบบ');
    return;
  }

  /* ---------- โมเดลบทเรียนในฟอร์ม ---------- */
  function fill4(arr) { var a = (arr || []).slice(0, 4); while (a.length < 4) a.push(''); return a; }
  function blankQ() { return { q: '', choices: ['', '', '', ''], answer: 0, explain: '' }; }
  function toModel(l) {
    return { key: 'k' + (++seq), id: l.id, type: l.type || 'reading', title: l.title || '', minutes: String(l.minutes == null ? 5 : l.minutes), is_preview: !!l.is_preview, content: l.content || '',
      pass_score: String(l.pass_score == null ? 1 : l.pass_score),
      questions: (l.questions || []).map(function (q) { return { q: q.q || '', choices: fill4(q.choices), answer: q.answer == null ? 0 : q.answer, explain: q.explain || '' }; }) };
  }
  function newLesson() { return { key: 'k' + (++seq), id: null, type: 'video', title: '', minutes: '5', is_preview: false, content: '', pass_score: '1', questions: [] }; }
  function byKey(k) { return model.filter(function (l) { return l.key === k; })[0]; }

  /* ---------- ส่วนประกอบฟอร์ม ---------- */
  var guard = MH.admin.dirtyGuard(form);
  MH.admin.counter($('f-summary'), 300);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  function fire(el) { el.dispatchEvent(new Event('input', { bubbles: true })); }

  function thumbFromInputs() { return { glyph: $('f-glyph').value.trim(), tone: $('f-tone').value }; }
  function updateThumb() { $('thumb-preview').innerHTML = MH.ui.articleThumb({ thumb: thumbFromInputs() }); }
  ['f-glyph', 'f-tone'].forEach(function (id) { $(id).addEventListener(id === 'f-glyph' ? 'input' : 'change', updateThumb); });

  $('btn-slug').addEventListener('click', function () {
    var s = MH.util.slugify($('f-title').value), hint = $('slug-hint');
    if (!s) { hint.textContent = 'ชื่อคอร์สนี้ไม่มีตัวอักษรอังกฤษหรือตัวเลขให้สร้าง slug อัตโนมัติ ให้กรอกเองเป็นอักษรอังกฤษ เช่น thai-astrology-101'; $('f-slug').focus(); return; }
    hint.textContent = SLUG_HINT; $('f-slug').value = s; fire($('f-slug'));
  });

  /* ---------- วาดตัวแก้บท ---------- */
  function typeSelect(L) {
    return '<select class="select" id="ls-' + L.key + '-type" data-k="' + L.key + '" data-f="type"' + (ro ? ' disabled' : '') + '>' +
      TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (L.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>';
  }
  function quizHtml(L) {
    var k = L.key, rd = ro ? ' readonly' : '', dis = ro ? ' disabled' : '';
    var out = '<div class="field"><label for="ls-' + k + '-pass">เกณฑ์ผ่าน (ต้องตอบถูกอย่างน้อยกี่ข้อ)</label>' +
      '<input class="input" type="number" min="1" max="' + Math.max(1, L.questions.length) + '" step="1" id="ls-' + k + '-pass" data-k="' + k + '" data-f="pass_score" value="' + h(L.pass_score) + '"' + rd + '>' +
      '<p class="hint">ตอนนี้มี ' + L.questions.length + ' ข้อ เกณฑ์ผ่านต้องไม่เกินจำนวนข้อ</p></div>';
    L.questions.forEach(function (q, qi) {
      var id = 'ls-' + k + '-q' + qi;
      out += '<fieldset class="crs-ed-q"><legend>ข้อ ' + (qi + 1) + '</legend>' +
        '<div class="field"><label for="' + id + '">คำถาม</label><input class="input" id="' + id + '" type="text" autocomplete="off" data-k="' + k + '" data-f="q" data-qi="' + qi + '" value="' + h(q.q) + '"' + rd + '></div>';
      q.choices.forEach(function (ch, ci) {
        out += '<div class="crs-ed-c"><label class="pick" for="' + id + '-a' + ci + '"><input type="radio" name="ans-' + k + '-' + qi + '" id="' + id + '-a' + ci + '" value="' + ci + '" data-k="' + k + '" data-f="answer" data-qi="' + qi + '"' + (q.answer === ci ? ' checked' : '') + dis + '>' +
          '<span class="sr-only">ข้อ ' + (qi + 1) + ' ตัวเลือก ' + LETTER[ci] + ' เป็นคำตอบที่ถูก</span><span aria-hidden="true">ข้อถูก</span></label>' +
          '<div class="field"><label class="sr-only" for="' + id + '-c' + ci + '">ข้อ ' + (qi + 1) + ' ตัวเลือก ' + LETTER[ci] + '</label>' +
          '<input class="input" id="' + id + '-c' + ci + '" type="text" autocomplete="off" placeholder="ตัวเลือก ' + LETTER[ci] + '" data-k="' + k + '" data-f="choice" data-qi="' + qi + '" data-ci="' + ci + '" value="' + h(ch) + '"' + rd + '></div></div>';
      });
      out += '<div class="field"><label for="' + id + '-e">คำอธิบายเฉลย (ขึ้นให้ผู้เรียนอ่านหลังส่งคำตอบ)</label><input class="input" id="' + id + '-e" type="text" autocomplete="off" data-k="' + k + '" data-f="explain" data-qi="' + qi + '" value="' + h(q.explain) + '"' + rd + '></div>' +
        (ro ? '' : '<div class="btn-row"><button type="button" class="btn btn--outline btn--sm" data-act="rmq" data-k="' + k + '" data-qi="' + qi + '">ลบข้อ ' + (qi + 1) + '</button></div>') + '</fieldset>';
    });
    if (!ro) out += '<div class="btn-row"><button type="button" class="btn btn--outline btn--sm" data-act="addq" data-k="' + k + '">+ เพิ่มข้อสอบ</button></div>';
    return out;
  }
  function lessonHtml(L, i) {
    var k = L.key, rd = ro ? ' readonly' : '', n = model.length;
    var typeLabel = (TYPES.filter(function (t) { return t[0] === L.type; })[0] || [0, L.type])[1];
    return '<li class="crs-ed-l" data-key="' + k + '"><div class="crs-ed-head"><b>บทที่ ' + (i + 1) + '</b><span class="tag">' + h(typeLabel) + '</span><span class="spacer"></span>' +
      (ro ? '' :
        '<button type="button" class="btn btn--outline btn--sm" data-act="up" data-k="' + k + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="เลื่อนบทที่ ' + (i + 1) + ' ขึ้น">เลื่อนขึ้น</button>' +
        '<button type="button" class="btn btn--outline btn--sm" data-act="down" data-k="' + k + '"' + (i === n - 1 ? ' disabled' : '') + ' aria-label="เลื่อนบทที่ ' + (i + 1) + ' ลง">เลื่อนลง</button>' +
        '<button type="button" class="btn btn--danger-o btn--sm" data-act="rm" data-k="' + k + '" aria-label="ลบบทที่ ' + (i + 1) + '">ลบบทนี้</button>') + '</div>' +
      '<div class="form-grid">' +
        '<div class="field full"><label for="ls-' + k + '-title">ชื่อบท</label><input class="input" id="ls-' + k + '-title" type="text" maxlength="160" autocomplete="off" data-k="' + k + '" data-f="title" value="' + h(L.title) + '"' + rd + '></div>' +
        '<div class="field"><label for="ls-' + k + '-type">ประเภท</label>' + typeSelect(L) + '</div>' +
        '<div class="field"><label for="ls-' + k + '-min">เวลาเรียน (นาที)</label><input class="input" id="ls-' + k + '-min" type="number" min="1" step="1" inputmode="numeric" data-k="' + k + '" data-f="minutes" value="' + h(L.minutes) + '"' + rd + '></div>' +
        '<div class="field full"><label for="ls-' + k + '-content">' + (L.type === 'quiz' ? 'คำชี้แจงก่อนทำแบบทดสอบ (ไม่บังคับ)' : (L.type === 'video' ? 'สรุปเนื้อหาในบท (ขึ้นใต้เครื่องเล่นวิดีโอ)' : 'เนื้อหาบทอ่าน')) + '</label>' +
          '<textarea class="textarea" id="ls-' + k + '-content" rows="' + (L.type === 'quiz' ? 2 : 6) + '" data-k="' + k + '" data-f="content"' + rd + '>' + h(L.content) + '</textarea></div>' +
        '<div class="field full"><label class="check" for="ls-' + k + '-prev"><input type="checkbox" id="ls-' + k + '-prev" data-k="' + k + '" data-f="is_preview"' + (L.is_preview ? ' checked' : '') + (ro ? ' disabled' : '') + '> เปิดให้ดูฟรีเป็นบทตัวอย่าง (ไม่ต้องลงทะเบียน)</label></div>' +
      '</div>' + (L.type === 'quiz' ? quizHtml(L) : '') + '</li>';
  }
  function renderLessons(focusId) {
    $('lesson-list').innerHTML = model.length ? model.map(lessonHtml).join('') : '<li class="muted">ยังไม่มีบทเรียน กด “เพิ่มบทเรียน” เพื่อเริ่ม</li>';
    $('btn-add-lesson').hidden = ro;
    if (focusId && $(focusId)) $(focusId).focus();
    scheduleCheck();
  }

  /* ---------- เหตุการณ์ในตัวแก้บท ---------- */
  function onField(e) {
    var t = e.target, k = t.getAttribute('data-k'); if (!k) return;
    var L = byKey(k); if (!L) return;
    var f = t.getAttribute('data-f'), qi = Number(t.getAttribute('data-qi')), ci = Number(t.getAttribute('data-ci'));
    if (f === 'type') {
      if (e.type !== 'change') return;
      L.type = t.value;
      if (L.type === 'quiz' && !L.questions.length) L.questions = [blankQ()];
      renderLessons('ls-' + k + '-type'); form.dispatchEvent(new Event('change'));
      return;
    }
    if (f === 'title' || f === 'content' || f === 'minutes' || f === 'pass_score') L[f] = t.value;
    else if (f === 'is_preview') L.is_preview = t.checked;
    else if (f === 'q') L.questions[qi].q = t.value;
    else if (f === 'choice') L.questions[qi].choices[ci] = t.value;
    else if (f === 'explain') L.questions[qi].explain = t.value;
    else if (f === 'answer') { if (t.checked) L.questions[qi].answer = Number(t.value); }
    scheduleCheck();
  }
  $('lesson-list').addEventListener('input', onField);
  $('lesson-list').addEventListener('change', onField);
  $('lesson-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-act'), k = b.getAttribute('data-k'), L = byKey(k), i = model.indexOf(L);
    var changed = function () { form.dispatchEvent(new Event('change')); };
    if (act === 'up' && i > 0) { model.splice(i - 1, 0, model.splice(i, 1)[0]); renderLessons(); changed(); var u = document.querySelector('[data-key="' + k + '"] [data-act="up"]'); (u && !u.disabled ? u : document.querySelector('[data-key="' + k + '"] [data-act="down"]')).focus(); }
    else if (act === 'down' && i < model.length - 1) { model.splice(i + 1, 0, model.splice(i, 1)[0]); renderLessons(); changed(); var d = document.querySelector('[data-key="' + k + '"] [data-act="down"]'); (d && !d.disabled ? d : document.querySelector('[data-key="' + k + '"] [data-act="up"]')).focus(); }
    else if (act === 'rm') {
      MH.ui.confirm({ title: 'ลบบทเรียน', body: 'ลบบทที่ ' + (i + 1) + ' “' + (L.title || 'ยังไม่ตั้งชื่อ') + '” ออกจากคอร์ส การลบมีผลเมื่อกดบันทึก', okLabel: 'ลบบทนี้', danger: true }).then(function (ok) {
        if (!ok) return;
        model.splice(model.indexOf(L), 1); renderLessons(model.length ? 'ls-' + model[Math.min(i, model.length - 1)].key + '-title' : 'btn-add-lesson'); changed();
      });
    } else if (act === 'addq') { L.questions.push(blankQ()); renderLessons('ls-' + k + '-q' + (L.questions.length - 1)); changed(); }
    else if (act === 'rmq') {
      var qi = Number(b.getAttribute('data-qi'));
      L.questions.splice(qi, 1); if (L.questions.length && Number(L.pass_score) > L.questions.length) L.pass_score = String(L.questions.length);
      renderLessons(L.questions.length ? 'ls-' + k + '-pass' : 'ls-' + k + '-type'); changed();
    }
  });
  $('btn-add-lesson').addEventListener('click', function () {
    var L = newLesson(); model.push(L); renderLessons('ls-' + L.key + '-title'); form.dispatchEvent(new Event('change'));
  });

  function applyReadOnly(on) {
    ro = on;
    ['f-title', 'f-slug', 'f-price', 'f-summary', 'f-glyph'].forEach(function (id) { $(id).readOnly = on; });
    ['f-expert', 'f-level', 'f-tone', 'f-premium'].forEach(function (id) { $(id).disabled = on; });
    if (me.role === 'expert') $('f-expert').disabled = true;
    $('btn-slug').hidden = on;
  }

  /* ---------- ตรวจข้อมูล ---------- */
  function merge(errs) {
    var out = [], idx = {};
    errs.forEach(function (e) {
      if (idx[e.field] === undefined) { idx[e.field] = out.length; out.push({ field: e.field, msg: e.msg }); } else out[idx[e.field]].msg += ' · ' + e.msg;
    });
    return out;
  }
  function show(errs) { return MH.admin.showErrors(form, merge(errs)); }
  function isInt(s) { return /^\d+$/.test(String(s).trim()); }

  function readValues() {
    var ex = $('f-expert').value;
    return { title: $('f-title').value.trim(), slug: $('f-slug').value.trim(), expert_id: ex ? Number(ex) : null, level: $('f-level').value,
      price_raw: $('f-price').value.trim(), included_in_premium: $('f-premium').checked, summary: $('f-summary').value.trim(), thumb: thumbFromInputs(), lessons: model };
  }

  function validateBasic(v) {
    var e = [];
    if (!v.title) e.push({ field: 'f-title', msg: 'ใส่ชื่อคอร์ส' });
    if (!v.slug) e.push({ field: 'f-slug', msg: 'ใส่ slug เป็นอักษรอังกฤษพิมพ์เล็ก เช่น thai-astrology-101 (ถ้าชื่อคอร์สเป็นภาษาอังกฤษ กด "สร้างจากชื่อ" ได้)' });
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug)) e.push({ field: 'f-slug', msg: 'slug ใช้ได้เฉพาะ a-z พิมพ์เล็ก ตัวเลข 0-9 และขีดกลาง (-) ห้ามเว้นวรรคหรือภาษาไทย' });
    else {
      var dup = MH.store.all('courses', { withTrashed: true }).filter(function (x) { return x.slug === v.slug && (!course || x.id !== course.id); })[0];
      if (dup) e.push({ field: 'f-slug', msg: 'slug นี้มีคอร์ส “' + dup.title + '” ใช้อยู่แล้ว' + (dup.deleted_at ? ' (อยู่ในถังขยะ)' : '') + ' เปลี่ยนเป็นค่าอื่น' });
    }
    if (!v.expert_id) e.push({ field: 'f-expert', msg: 'เลือกผู้สอนของคอร์ส' });
    if (!isInt(v.price_raw) || Number(v.price_raw) < 1) e.push({ field: 'f-price', msg: 'ราคาต้องเป็นจำนวนเต็มบาทตั้งแต่ 1 ขึ้นไป (คอร์สที่ให้พรีเมียมเรียนฟรี ให้ติ๊ก “ร่วมรายการพรีเมียม” แทนการตั้งราคา 0)' });
    if (v.summary.length > 300) e.push({ field: 'f-summary', msg: 'คำโปรยยาว ' + v.summary.length + ' ตัว ตัดให้ไม่เกิน 300 ตัว' });
    if (Array.from(v.thumb.glyph || '').length > 2) e.push({ field: 'f-glyph', msg: 'ตัวอักษรบนปกใส่ได้ไม่เกิน 2 ตัว' });
    v.lessons.forEach(function (L, i) {
      var k = L.key, no = 'บทที่ ' + (i + 1);
      if (!L.title.trim()) e.push({ field: 'ls-' + k + '-title', msg: no + ' ยังไม่มีชื่อบท' });
      if (!isInt(L.minutes) || Number(L.minutes) < 1) e.push({ field: 'ls-' + k + '-min', msg: no + ' ใส่เวลาเรียนเป็นนาที (จำนวนเต็มตั้งแต่ 1)' });
      if (L.type === 'quiz' && L.questions.length && (!isInt(L.pass_score) || Number(L.pass_score) < 1 || Number(L.pass_score) > L.questions.length)) {
        e.push({ field: 'ls-' + k + '-pass', msg: no + ' เกณฑ์ผ่านต้องอยู่ระหว่าง 1 ถึง ' + L.questions.length + ' (จำนวนข้อสอบ)' });
      }
    });
    return e;
  }
  /* เงื่อนไขเนื้อหาก่อนส่งตรวจ/เผยแพร่ */
  function validateContent(v) {
    var e = [];
    if (!v.summary) e.push({ field: 'f-summary', msg: 'ใส่คำโปรย (ไม่เกิน 300 ตัว) ที่ขึ้นบนการ์ดคอร์ส' });
    if (!v.thumb.glyph) e.push({ field: 'f-glyph', msg: 'ใส่ตัวอักษรบนปก 1–2 ตัว' });
    if (v.lessons.length < 3) e.push({ field: 'btn-add-lesson', msg: 'คอร์สต้องมีอย่างน้อย 3 บท ตอนนี้มี ' + v.lessons.length + ' บท' });
    if (!v.lessons.some(function (L) { return L.type === 'quiz'; })) e.push({ field: 'btn-add-lesson', msg: 'ต้องมีแบบทดสอบอย่างน้อย 1 บท' });
    var bad = function (field, label, text) {
      var w = MH.util.bannedIn(text);
      if (w.length) e.push({ field: field, msg: label + 'มีคำต้องห้าม ' + w.map(function (x) { return '“' + x + '”'; }).join(' ') + ' ลบหรือเปลี่ยนคำนี้ก่อน' });
    };
    bad('f-title', 'ชื่อคอร์ส', v.title); bad('f-summary', 'คำโปรย', v.summary);
    v.lessons.forEach(function (L, i) {
      var k = L.key, no = 'บทที่ ' + (i + 1);
      bad('ls-' + k + '-title', no + ' ชื่อบท', L.title);
      if (L.type !== 'quiz' && !L.content.trim()) e.push({ field: 'ls-' + k + '-content', msg: no + ' ยังไม่มีเนื้อหา' });
      bad('ls-' + k + '-content', no + ' เนื้อหา', L.content);
      if (L.type === 'quiz') {
        if (!L.questions.length) e.push({ field: 'ls-' + k + '-type', msg: no + ' เป็นแบบทดสอบแต่ยังไม่มีข้อสอบ กด “เพิ่มข้อสอบ”' });
        L.questions.forEach(function (q, qi) {
          var id = 'ls-' + k + '-q' + qi, qn = no + ' ข้อ ' + (qi + 1);
          if (!q.q.trim()) e.push({ field: id, msg: qn + ' ยังไม่มีคำถาม' });
          q.choices.forEach(function (c, ci) { if (!c.trim()) e.push({ field: id + '-c' + ci, msg: qn + ' ตัวเลือก ' + LETTER[ci] + ' ว่างอยู่ ต้องมีครบ 4 ตัวเลือก' }); });
          if (q.answer == null || q.answer < 0 || q.answer > 3) e.push({ field: id + '-a0', msg: qn + ' ยังไม่ได้เลือกข้อที่ถูก' });
          if (!q.explain.trim()) e.push({ field: id + '-e', msg: qn + ' ยังไม่มีคำอธิบายเฉลย' });
          bad(id, qn + ' คำถาม', q.q); bad(id + '-e', qn + ' คำอธิบาย', q.explain);
          q.choices.forEach(function (c, ci) { bad(id + '-c' + ci, qn + ' ตัวเลือก ' + LETTER[ci], c); });
        });
      }
    });
    return e;
  }
  function validateInstructor(v) {
    var ex = expertOf(v.expert_id);
    if (ex && ex.status === 'active') return [];
    return [{ field: 'f-expert', msg: ex ? 'ผู้สอน “' + ex.display_name + '” ยังไม่ผ่านการตรวจคุณสมบัติ (สถานะ: ' + (MH.labels.expertStatus[ex.status] || ex.status) + ') เผยแพร่คอร์สนี้ไม่ได้ จนกว่าผู้ดูแลระบบจะยืนยันคุณสมบัติที่หน้าผู้เชี่ยวชาญ' : 'ยังไม่ได้เลือกผู้สอน' }];
  }

  /* รายการเงื่อนไขก่อนเผยแพร่ (ตรวจสดจากฟอร์ม) */
  var checkTimer = null;
  function scheduleCheck() { clearTimeout(checkTimer); checkTimer = setTimeout(renderCheck, 150); }
  function renderCheck() {
    if (!$('check')) return;
    var v = readValues(), quizzes = v.lessons.filter(function (L) { return L.type === 'quiz'; });
    var quizOk = quizzes.some(function (L) {
      return L.questions.length && L.questions.every(function (q) { return q.q.trim() && q.choices.every(function (c) { return c.trim(); }) && q.explain.trim(); });
    });
    var texts = [v.title, v.summary];
    v.lessons.forEach(function (L) { texts.push(L.title, L.content); L.questions.forEach(function (q) { texts.push(q.q, q.explain); q.choices.forEach(function (c) { texts.push(c); }); }); });
    var banned = []; MH.util.bannedIn(texts.join('\n')).forEach(function (w) { if (banned.indexOf(w) < 0) banned.push(w); });
    var ex = expertOf(v.expert_id), exOk = !!ex && ex.status === 'active';
    var items = [
      [v.lessons.length >= 3, 'มีบทเรียนอย่างน้อย 3 บท (ตอนนี้ ' + v.lessons.length + ' บท)'],
      [quizOk, 'มีแบบทดสอบอย่างน้อย 1 บทที่ข้อสอบครบ (ตอนนี้มีแบบทดสอบ ' + quizzes.length + ' บท)'],
      [!banned.length, 'ไม่มีคำต้องห้ามในชื่อ คำโปรย และเนื้อหา' + (banned.length ? ' (พบ ' + banned.map(function (w) { return '“' + w + '”'; }).join(' ') + ')' : '')],
      [exOk, 'ผู้สอนผ่านการตรวจคุณสมบัติ' + (ex ? ' (' + ex.display_name + ' · ' + (MH.labels.expertStatus[ex.status] || ex.status) + ')' : ' (ยังไม่ได้เลือกผู้สอน)')]
    ];
    $('check').innerHTML = items.map(function (it) {
      return '<li class="' + (it[0] ? 'ok' : 'no') + '"><span class="mk" aria-hidden="true">' + (it[0] ? '✓' : '✗') + '</span><span><span class="sr-only">' + (it[0] ? 'ผ่าน: ' : 'ยังไม่ผ่าน: ') + '</span>' + h(it[1]) + '</span></li>';
    }).join('');
  }
  form.addEventListener('input', scheduleCheck);
  form.addEventListener('change', scheduleCheck);

  /* ---------- บันทึก ---------- */
  function coursePatch(v) {
    return { slug: v.slug, title: v.title, expert_id: v.expert_id, level: v.level, price: Number(v.price_raw), included_in_premium: v.included_in_premium, summary: v.summary, thumb: v.thumb };
  }
  function syncLessons(courseId, lessons) {
    var old = MH.q.lessons(courseId), oldBy = {}, keep = {};
    old.forEach(function (o) { oldBy[o.id] = o; });
    lessons.forEach(function (L, i) {
      var patch = { course_id: courseId, sort: i + 1, type: L.type, title: L.title.trim(), minutes: Number(L.minutes), is_preview: !!L.is_preview, content: L.content.replace(/\r\n/g, '\n').trim() };
      var prev = L.id ? oldBy[L.id] : null;
      if (L.type === 'quiz') {
        patch.pass_score = L.questions.length ? Number(L.pass_score) : 1;
        patch.questions = L.questions.map(function (q) { return { q: q.q.trim(), choices: q.choices.map(function (c) { return c.trim(); }), answer: q.answer, explain: q.explain.trim() }; });
      } else if (prev && (prev.questions || prev.pass_score != null)) { patch.pass_score = null; patch.questions = null; }
      if (prev) { MH.store.update('course_lessons', prev.id, patch, 'update'); keep[prev.id] = 1; }
      else { var rec = MH.store.insert('course_lessons', patch); L.id = rec.id; keep[rec.id] = 1; }
    });
    old.forEach(function (o) { if (!keep[o.id]) MH.store.purge('course_lessons', o.id); });
  }
  function persist(v) {
    var patch = coursePatch(v);
    if (!course) {
      course = MH.store.insert('courses', Object.assign({ status: 'draft', published_at: null, return_note: '' }, patch));
      try { history.replaceState(null, '', 'course-edit.html?id=' + course.id); } catch (e) { /* ไม่เป็นไร: อยู่หน้าเดิม */ }
    } else {
      MH.store.update('courses', course.id, patch, 'update');
    }
    syncLessons(course.id, v.lessons);
  }
  function reload() { course = MH.store.find('courses', course.id); render(); }

  function doSave() {
    if (!canEdit(course)) return;
    var v = readValues();
    var isNew = !course;
    var live = course && course.status === 'published';
    if (!show(validateBasic(v).concat(live ? validateContent(v) : []))) return;
    persist(v);
    MH.ui.toast(isNew ? 'สร้างคอร์สแล้ว เป็นฉบับร่าง' : 'บันทึกแล้ว');
    reload();
  }
  function doSubmit() {
    var v = readValues();
    if (!show(validateBasic(v).concat(validateContent(v)))) return;
    persist(v);
    MH.store.update('courses', course.id, { status: 'in_review', return_note: '' }, 'submit');
    MH.ui.toast('ส่งตรวจแล้ว บรรณาธิการจะเห็นในรายการรอตรวจ');
    reload();
  }
  function doPublish() {
    var v = readValues();
    if (!show(validateBasic(v).concat(validateContent(v)).concat(validateInstructor(v)))) return;
    persist(v);
    var now = new Date().toISOString();
    MH.store.update('courses', course.id, { status: 'published', published_at: now, reviewer_id: me.id, reviewed_at: now, return_note: '' }, 'publish');
    MH.ui.toast('เผยแพร่แล้ว คอร์สขึ้นหน้าเว็บทันที');
    reload();
  }
  function askNote() {
    return new Promise(function (resolve) {
      (function open(prev, err) {
        var ta;
        MH.ui.dialog({
          title: 'ตีกลับให้ผู้สอนแก้',
          html: '<p class="muted">คอร์สจะกลับเป็นฉบับร่าง และผู้สอนจะเห็นหมายเหตุนี้ที่หน้าแก้ไข</p>' +
            '<div class="field"><label for="ret-note">หมายเหตุถึงผู้สอน</label><textarea class="textarea" id="ret-note" rows="4" maxlength="500"></textarea>' +
            (err ? '<p class="err" role="alert">' + h(err) + '</p>' : '') + '</div>',
          actions: [{ label: 'ยกเลิก', cls: 'btn--outline', value: false }, { label: 'ตีกลับคอร์ส', cls: 'btn--primary', value: true }],
          onOpen: function (d) { ta = d.querySelector('#ret-note'); ta.value = prev; ta.focus(); }
        }).then(function (ok) {
          if (!ok) { resolve(null); return; }
          var note = ta.value.trim();
          if (!note) { open('', 'ต้องเขียนหมายเหตุว่าให้ผู้สอนแก้อะไร จึงจะตีกลับได้'); return; }
          resolve(note);
        });
      })('', '');
    });
  }
  function doReturn() {
    var v = readValues();
    if (guard.isDirty() && canEdit(course)) { if (!show(validateBasic(v))) return; }
    askNote().then(function (note) {
      if (note === null) return;
      if (guard.isDirty() && canEdit(course)) persist(v);
      MH.store.update('courses', course.id, { status: 'draft', return_note: note }, 'return');
      MH.ui.toast('ตีกลับให้ผู้สอนแก้แล้ว');
      reload();
    });
  }

  $('actions').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'save') doSave();
    else if (a === 'submit') doSubmit();
    else if (a === 'publish') doPublish();
    else if (a === 'return') doReturn();
  });

  /* ---------- วาดหน้า (เรียกซ้ำหลังบันทึกทุกครั้ง) ---------- */
  function metaHtml() {
    var rows = [];
    function row(k, v) { rows.push('<dt>' + h(k) + '</dt><dd>' + v + '</dd>'); }
    row('สถานะ', course ? MH.admin.pill(course.status) : '<span class="pill pill--draft">ใหม่ ยังไม่ได้บันทึก</span>');
    var ex = course ? expertOf(course.expert_id) : myExpert;
    row('ผู้สอน', ex ? h(ex.display_name) + (ex.status !== 'active' ? ' <span class="tag tag--wait">' + h(MH.labels.expertStatus[ex.status] || ex.status) + '</span>' : '') : '-');
    if (course) {
      var ens = MH.store.all('course_enrollments').filter(function (x) { return x.course_id === course.id && x.status === 'active'; });
      row('ผู้เรียน', ens.length + ' คน · เรียนจบ ' + ens.filter(function (x) { return !!x.certificate_no; }).length + ' คน');
      row('สร้างเมื่อ', h(MH.util.dateTime(course.created_at)));
      row('แก้ล่าสุด', h(MH.util.dateTime(course.updated_at)) + (course.updated_by ? ' โดย ' + h(MH.admin.userName(course.updated_by)) : ''));
      if (course.status === 'published') row('เผยแพร่เมื่อ', h(MH.util.dateTime(course.published_at)) + (course.reviewer_id ? ' โดย ' + h(MH.admin.userName(course.reviewer_id)) : ''));
    }
    return rows.join('');
  }

  function render() {
    var ed = canEdit(course), st = course ? course.status : 'new';
    $('page-title').textContent = !course ? 'สร้างคอร์สใหม่' : (ed ? 'แก้ไขคอร์ส' : 'ดูคอร์ส');
    $('page-sub').textContent = course ? course.title + ' · ' + MH.labels.articleStatus[course.status] : 'คอร์สใหม่เป็นฉบับร่างจนกว่าจะส่งตรวจ';
    document.title = (course ? course.title : 'สร้างคอร์สใหม่') + ' · MAHASART หลังบ้าน';
    stateBox.innerHTML = ''; form.hidden = false;
    MH.admin.clearErrors(form);
    experts = MH.store.all('experts');

    /* ช่องข้อมูล */
    var expOpts = me.role === 'expert' ? (myExpert ? [myExpert] : []) : experts;
    $('f-expert').innerHTML = (me.role === 'expert' ? '' : '<option value="">— เลือกผู้สอน —</option>') + expOpts.map(function (e) {
      return '<option value="' + e.id + '">' + h(e.display_name) + (e.status !== 'active' ? ' (' + h(MH.labels.expertStatus[e.status] || e.status) + ')' : '') + '</option>';
    }).join('');
    $('f-level').innerHTML = LEVELS.map(function (l) { return '<option value="' + h(l) + '">' + h(l) + '</option>'; }).join('') +
      (course && LEVELS.indexOf(course.level) < 0 && course.level ? '<option value="' + h(course.level) + '">' + h(course.level) + '</option>' : '');
    $('f-title').value = course ? course.title : '';
    $('f-slug').value = course ? course.slug : '';
    $('f-expert').value = course ? String(course.expert_id) : (myExpert ? String(myExpert.id) : '');
    $('f-level').value = course ? course.level : LEVELS[0];
    $('f-price').value = course ? String(course.price) : '';
    $('f-premium').checked = !!(course && course.included_in_premium);
    $('f-summary').value = course ? course.summary : ''; fire($('f-summary'));
    var th = (course && course.thumb) || { glyph: '', tone: 'violet' };
    $('f-glyph').value = th.glyph || ''; $('f-tone').value = th.tone === 'amber' ? 'amber' : 'violet';
    $('slug-hint').textContent = course && course.status === 'published' ? 'เผยแพร่แล้ว: ถ้าเปลี่ยน slug ลิงก์เดิมของคอร์สนี้จะใช้ไม่ได้' : SLUG_HINT;
    updateThumb();

    /* บทเรียน */
    model = course ? MH.q.lessons(course.id).map(toModel) : [];
    applyReadOnly(!ed);
    renderLessons();

    /* แถบแจ้ง */
    var notes = [];
    if (course && course.return_note) notes.push('<div class="notice notice--warn" role="status"><div><b>บรรณาธิการตีกลับให้แก้</b><br>' + h(course.return_note) + '</div></div>');
    if (!ed) notes.push('<div class="notice ro-note" role="status"><div><b>อ่านอย่างเดียว</b><br>' + h(readOnlyReason(course)) + '</div></div>');
    var ex = course ? expertOf(course.expert_id) : myExpert;
    if (ex && ex.status !== 'active') notes.push('<div class="notice notice--warn" role="status"><div><b>ผู้สอนยังไม่ผ่านการตรวจคุณสมบัติ</b><br>แก้คอร์สและส่งตรวจได้ แต่ทีมงานจะเผยแพร่คอร์สนี้ไม่ได้ จนกว่าผู้ดูแลระบบจะยืนยันคุณสมบัติของ ' + h(ex.display_name) + '</div></div>');
    $('notices').innerHTML = notes.join('');

    $('wf-meta').innerHTML = metaHtml();
    var wf = [];
    if (course && st === 'draft' && ed) wf.push('<div class="notice"><div>เขียนเสร็จแล้วกด "ส่งตรวจ" เพื่อให้บรรณาธิการตรวจก่อนเผยแพร่ ต้องผ่านเงื่อนไขด้านบนครบทุกข้อ</div></div>');
    if (course && st === 'in_review' && can('courses.publish')) wf.push('<div class="notice"><div>ตรวจเนื้อหาแล้วกด "เผยแพร่" หรือ "ตีกลับ" พร้อมหมายเหตุ</div></div>');
    $('wf-notes').innerHTML = wf.length ? '<div class="notice-stack">' + wf.join('') + '</div>' : '';
    renderCheck();

    /* ปุ่มตามสถานะและสิทธิ์ */
    var canSubmit = !!course && st === 'draft' && ed;
    var canPub = !!course && st === 'in_review' && can('courses.publish');
    var main = canPub ? 'publish' : canSubmit ? 'submit' : ed ? 'save' : '';
    var btns = [];
    function btn(act, label) { btns.push('<button type="button" class="btn ' + (main === act ? 'btn--primary' : 'btn--outline') + '" data-act="' + act + '">' + h(label) + '</button>'); }
    if (ed) btn('save', !course ? 'สร้างคอร์ส (เป็นฉบับร่าง)' : (st === 'draft' ? 'บันทึกฉบับร่าง' : 'บันทึกการแก้ไข'));
    if (canSubmit) btn('submit', 'ส่งตรวจ');
    if (canPub) { btn('publish', 'เผยแพร่'); btn('return', 'ตีกลับพร้อมหมายเหตุ'); }
    $('actions').innerHTML = btns.length ? btns.join('') : '<span class="muted">บทบาทและสถานะนี้ไม่มีปุ่มให้กด ดูข้อมูลด้านบนได้อย่างเดียว</span>';

    $('head-actions').innerHTML = course
      ? '<a class="btn btn--outline" href="../course.html?slug=' + encodeURIComponent(course.slug) + '&amp;preview=1" target="_blank" rel="noopener">ดูตัวอย่างบนหน้าเว็บ ↗</a>' : '';
    guard.clean();
  }

  render();
})();
