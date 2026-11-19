/* แก้ไข/สร้างบทความ: ฟอร์ม + วงจร ฉบับร่าง → ส่งตรวจ → (โหรอนุมัติ) → เผยแพร่/ตั้งเวลา/ตีกลับ → เก็บ/ถังขยะ
   เงื่อนไขเผยแพร่ตามสัญญาข้อ 6 ใน PROTOTYPE_NOTES.md · ทุกการเปลี่ยนสถานะเรียก MH.store.update(..., action) ให้ audit ตรงชื่อ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var me = MH.admin.user, can = function (p, r) { return MH.auth.can(p, r); };
  var $ = function (id) { return document.getElementById(id); };
  var form = $('art-form'), stateBox = $('state');
  var astroCat = MH.q.categoryBySlug('article', 'thai-astrology');
  var ART_OPTS = [['a-somdej', 'พระเครื่อง'], ['a-coin', 'เหรียญ'], ['a-beads', 'ลูกปัด กำไล'], ['a-statue', 'องค์บูชา'], ['a-pidta', 'พระปิดตา'], ['a-crystal', 'หินมงคล'], ['a-scroll', 'ใบรับรอง ยันต์']];
  var SLUG_HINT = 'ใช้ a-z ตัวเลข และขีดกลางเท่านั้น ปุ่ม "สร้างจากชื่อ" ใช้ได้กับชื่อภาษาอังกฤษ ชื่อภาษาไทยให้กรอกเอง';
  var art = null;      /* บันทึกปัจจุบันในร้านข้อมูล (null = กำลังสร้างใหม่ ยังไม่บันทึก) */
  var srcSeq = 0, roNow = false;

  /* ---------- หน้าสถานะ: ไม่พบ / ไม่มีสิทธิ์ ---------- */
  function showState(title, text, actionHtml) {
    form.hidden = true; $('head-actions').innerHTML = '';
    $('page-title').textContent = title; $('page-sub').textContent = '';
    stateBox.innerHTML = MH.ui.empty(title, text, actionHtml || '<a class="btn btn--primary" href="articles.html">กลับรายการบทความ</a>');
  }
  var idParam = MH.util.param('id');
  if (idParam) {
    art = MH.store.find('articles', idParam);
    if (!art) { showState('ไม่พบบทความนี้', 'ลิงก์อาจผิด หรือบทความถูกลบถาวรไปแล้ว'); return; }
    if (art.deleted_at) {
      showState('บทความนี้อยู่ในถังขยะ', 'กู้คืนก่อนจึงจะเปิดแก้ได้',
        can('trash.view') ? '<a class="btn btn--primary" href="trash.html">ไปที่ถังขยะ</a>' : '<a class="btn btn--outline" href="articles.html">กลับรายการบทความ</a>');
      return;
    }
  } else if (!can('articles.create')) {
    showState('บทบาทนี้เขียนบทความใหม่ไม่ได้', MH.labels.role[me.role] + ' เปิดดูและตรวจบทความที่มีอยู่ได้ แต่สร้างบทความใหม่ไม่ได้');
    return;
  }

  /* ---------- สิทธิ์ตามสถานะ ---------- */
  function isAstro(catId) { return !!astroCat && Number(catId) === astroCat.id; }
  /* ผู้เขียนแก้ได้เฉพาะฉบับร่างของตัวเอง · บรรณาธิการ/ผู้ดูแลแก้ได้ทุกสถานะ · โหรแก้ไม่ได้ (ตรวจและอนุมัติอย่างเดียว) */
  function canEdit(a) {
    if (!a) return can('articles.create');
    if (!can('articles.edit', a)) return false;
    if (me.role === 'writer' && a.status !== 'draft') return false;
    return true;
  }
  function canFeature() { return can('articles.publish'); }
  function readOnlyReason(a) {
    if (!can('articles.edit', a)) {
      if (me.role === 'writer') return 'บทความนี้เป็นของ ' + MH.admin.userName(a.author_id) + ' คุณดูได้อย่างเดียว';
      if (me.role === 'astrologer') return 'โหรที่ปรึกษาตรวจและอนุมัติบทความโหราศาสตร์ไทยได้ แต่แก้เนื้อหาไม่ได้';
      return MH.labels.role[me.role] + 'ดูบทความได้อย่างเดียว';
    }
    if (a.status === 'in_review') return 'ส่งตรวจแล้ว ตอนนี้แก้ไม่ได้ จนกว่าบรรณาธิการจะตีกลับมาให้แก้';
    return 'บทความนี้' + MH.labels.articleStatus[a.status] + ' ผู้เขียนแก้เองไม่ได้ ถ้าต้องแก้ให้แจ้งบรรณาธิการ';
  }

  /* ---------- ส่วนประกอบฟอร์ม ---------- */
  var guard = MH.admin.dirtyGuard(form);
  MH.admin.counter($('f-excerpt'), 300);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  function fire(el) { el.dispatchEvent(new Event('input', { bubbles: true })); }
  function localInput(d) {
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function thumbFromInputs() {
    var a = $('f-art').value, tone = $('f-tone').value;
    return a ? { art: a, tone: tone } : { glyph: $('f-glyph').value.trim(), tone: tone };
  }
  function updateThumb() { $('thumb-preview').innerHTML = MH.ui.articleThumb({ thumb: thumbFromInputs() }); }
  ['f-glyph', 'f-art', 'f-tone'].forEach(function (id) { $(id).addEventListener(id === 'f-glyph' ? 'input' : 'change', updateThumb); });

  /* แท็บ เขียน / ดูผล */
  function setTab(name) {
    var w = name === 'write';
    $('tab-write').setAttribute('aria-selected', String(w)); $('tab-write').tabIndex = w ? 0 : -1;
    $('tab-preview').setAttribute('aria-selected', String(!w)); $('tab-preview').tabIndex = w ? -1 : 0;
    $('pane-write').hidden = !w; $('pane-preview').hidden = w;
    if (!w) $('body-preview').innerHTML = MH.util.renderBody($('f-body').value) || '<p class="muted">ยังไม่มีเนื้อหาให้แสดง</p>';
  }
  ['write', 'preview'].forEach(function (n) {
    var t = $('tab-' + n);
    t.addEventListener('click', function () { setTab(n); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); var to = n === 'write' ? 'preview' : 'write'; setTab(to); $('tab-' + to).focus();
    });
  });

  /* slug จากชื่อ */
  $('btn-slug').addEventListener('click', function () {
    var s = MH.util.slugify($('f-title').value), hint = $('slug-hint');
    if (!s) {
      hint.textContent = 'ชื่อเรื่องนี้ไม่มีตัวอักษรอังกฤษหรือตัวเลขให้สร้าง slug อัตโนมัติ ให้กรอกเองเป็นอักษรอังกฤษ เช่น what-is-taksa';
      $('f-slug').focus(); return;
    }
    hint.textContent = SLUG_HINT; $('f-slug').value = s; fire($('f-slug'));
  });

  /* แหล่งอ้างอิง */
  function renderSources(rows) {
    srcSeq = 0;
    var list = $('src-list');
    list.innerHTML = rows.map(function () {
      var n = ++srcSeq;
      return '<li class="src-row" data-n="' + n + '">' +
        '<div class="field"><label for="src-title-' + n + '">ชื่อแหล่งที่ ' + n + '</label><input class="input" id="src-title-' + n + '" type="text" autocomplete="off"></div>' +
        '<div class="field"><label for="src-url-' + n + '">ลิงก์ (ถ้ามี)</label><input class="input" id="src-url-' + n + '" type="text" inputmode="url" autocomplete="off"></div>' +
        '<div class="field"><label for="src-note-' + n + '">หมายเหตุ</label><input class="input" id="src-note-' + n + '" type="text" autocomplete="off"></div>' +
        '<button type="button" class="btn btn--outline btn--sm rm" data-rm="' + n + '" aria-label="ลบแหล่งที่ ' + n + '">ลบ</button></li>';
    }).join('');
    rows.forEach(function (r, i) {
      $('src-title-' + (i + 1)).value = r.title || ''; $('src-url-' + (i + 1)).value = r.url || ''; $('src-note-' + (i + 1)).value = r.note || '';
    });
    applyReadOnly(roNow);
  }
  function readSources() {
    return Array.prototype.map.call($('src-list').children, function (li) {
      var n = li.getAttribute('data-n');
      return { n: Number(n), title: $('src-title-' + n).value.trim(), url: $('src-url-' + n).value.trim(), note: $('src-note-' + n).value.trim() };
    });
  }
  $('btn-add-src').addEventListener('click', function () {
    var rows = readSources(); rows.push({ title: '', url: '', note: '' }); renderSources(rows);
    $('src-title-' + rows.length).focus(); form.dispatchEvent(new Event('change'));
  });
  $('src-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    var rows = readSources(); rows.splice(Number(b.getAttribute('data-rm')) - 1, 1); renderSources(rows);
    form.dispatchEvent(new Event('change'));
    var first = $('src-title-1'); (first || $('btn-add-src')).focus();
  });

  function applyReadOnly(ro) {
    roNow = ro;
    form.querySelectorAll('input, textarea, select').forEach(function (el) {
      if (el.id === 'f-schedule' || el.id === 'f-featured') return;
      if (el.tagName === 'SELECT' || el.type === 'checkbox') el.disabled = ro; else el.readOnly = ro;
    });
    $('btn-slug').hidden = ro; $('btn-add-src').hidden = ro;
    form.querySelectorAll('[data-rm]').forEach(function (b) { b.hidden = ro; });
  }

  /* ---------- ตรวจข้อมูล ---------- */
  function merge(errs) {
    var out = [], idx = {};
    errs.forEach(function (e) {
      if (idx[e.field] === undefined) { idx[e.field] = out.length; out.push({ field: e.field, msg: e.msg }); } else out[idx[e.field]].msg += ' · ' + e.msg;
    });
    return out;
  }
  function show(errs) {
    errs = merge(errs);
    if (errs.some(function (e) { return e.field === 'f-body'; })) setTab('write');
    return MH.admin.showErrors(form, errs);
  }
  function thumbOk(t) { return !!(t && (t.art || (t.glyph && t.glyph.length))); }

  /* ตรวจที่ต้องผ่านทุกครั้งที่บันทึก */
  function validateBasic(v) {
    var e = [];
    if (!v.title) e.push({ field: 'f-title', msg: 'ใส่ชื่อเรื่อง' });
    if (!v.slug) e.push({ field: 'f-slug', msg: 'ใส่ slug เป็นอักษรอังกฤษพิมพ์เล็ก เช่น what-is-taksa (ถ้าชื่อเรื่องเป็นภาษาอังกฤษ กด "สร้างจากชื่อ" ได้)' });
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug)) e.push({ field: 'f-slug', msg: 'slug ใช้ได้เฉพาะ a-z พิมพ์เล็ก ตัวเลข 0-9 และขีดกลาง (-) ห้ามเว้นวรรคหรือภาษาไทย เช่น what-is-taksa' });
    else {
      var dup = MH.store.all('articles', { withTrashed: true }).filter(function (x) { return x.slug === v.slug && (!art || x.id !== art.id); })[0];
      if (dup) e.push({ field: 'f-slug', msg: 'slug นี้มีบทความ “' + dup.title + '” ใช้อยู่แล้ว' + (dup.deleted_at ? ' (อยู่ในถังขยะ)' : '') + ' เปลี่ยนเป็นค่าอื่น' });
    }
    if (v.excerpt.length > 300) e.push({ field: 'f-excerpt', msg: 'คำโปรยยาว ' + v.excerpt.length + ' ตัว ตัดให้ไม่เกิน 300 ตัว' });
    if (!v.thumb.art && Array.from(v.thumb.glyph || '').length > 2) e.push({ field: 'f-glyph', msg: 'ตัวอักษรบนปกใส่ได้ไม่เกิน 2 ตัว' });
    v.sources.forEach(function (r, i) {
      if (!r.title && !r.url && !r.note) return;
      if (!r.title) e.push({ field: 'src-title-' + r.n, msg: 'แหล่งที่ ' + (i + 1) + ' ยังไม่มีชื่อ ใส่ชื่อแหล่งอ้างอิง หรือลบแถวนี้' });
      if (r.url && !(/^https?:\/\/\S+$/i.test(r.url) || /^[A-Za-z0-9_\/.\-]+(\?\S*)?$/.test(r.url))) {
        e.push({ field: 'src-url-' + r.n, msg: 'ลิงก์ของแหล่งที่ ' + (i + 1) + ' ต้องขึ้นต้นด้วย https:// หรือ http:// (หรือเป็นลิงก์ภายในเว็บ เช่น page.html?slug=disclaimer)' });
      }
    });
    return e;
  }
  /* เงื่อนไขเนื้อหาก่อนส่งตรวจ/เผยแพร่ (สัญญาข้อ 6) */
  function validateContent(v) {
    var e = [];
    if (!v.category_id) e.push({ field: 'f-category', msg: 'เลือกหมวดของบทความ' });
    if (!v.excerpt) e.push({ field: 'f-excerpt', msg: 'ใส่คำโปรย (ไม่เกิน 300 ตัว) ข้อความสั้น ๆ ที่ขึ้นบนการ์ดบทความ' });
    if (!thumbOk(v.thumb)) e.push({ field: 'f-glyph', msg: 'ใส่ตัวอักษรบนปก 1–2 ตัว หรือเลือกภาพประกอบ' });
    if (!v.body) e.push({ field: 'f-body', msg: 'เนื้อหายังว่าง เขียนเนื้อหาก่อน' });
    [['f-title', 'ชื่อเรื่อง', v.title], ['f-excerpt', 'คำโปรย', v.excerpt], ['f-body', 'เนื้อหา', v.body]].forEach(function (x) {
      var w = MH.util.bannedIn(x[2]);
      if (w.length) e.push({ field: x[0], msg: x[1] + 'มีคำต้องห้าม ' + w.map(function (k) { return '“' + k + '”'; }).join(' ') + ' ลบหรือเปลี่ยนคำนี้ก่อน' });
    });
    return e;
  }
  function contentChanged(v) {
    return !art || v.title !== art.title || v.excerpt !== art.excerpt || v.body !== art.body || v.category_id !== art.category_id;
  }
  /* เงื่อนไขเผยแพร่/ตั้งเวลา: เนื้อหา + ผู้เผยแพร่ ≠ ผู้เขียน + โหรอนุมัติ (หมวดโหราศาสตร์ไทย) */
  function validatePublish(v) {
    var e = validateBasic(v).concat(validateContent(v));
    if (art && art.author_id === me.id) e.push({ field: 'wf-meta', msg: 'คุณเป็นผู้เขียนบทความนี้ จึงเผยแพร่เองไม่ได้ ให้บรรณาธิการหรือผู้ดูแลระบบอีกคนเป็นผู้เผยแพร่' });
    if (isAstro(v.category_id)) {
      if (!art || !art.astrologer_approved_at) e.push({ field: 'wf-meta', msg: 'หมวดโหราศาสตร์ไทยต้องให้โหรที่ปรึกษาอนุมัติก่อน ตอนนี้ยังไม่มีการอนุมัติ' });
      else if (contentChanged(v)) e.push({ field: 'wf-meta', msg: 'แก้เนื้อหาหลังโหรอนุมัติแล้ว ต้องบันทึกแล้วให้โหรอนุมัติใหม่ก่อนเผยแพร่' });
    }
    return e;
  }

  /* ---------- อ่านค่า / บันทึก ---------- */
  function readValues() {
    var cat = $('f-category').value;
    return {
      title: $('f-title').value.trim(),
      slug: $('f-slug').value.trim(),
      category_id: cat ? Number(cat) : null,
      excerpt: $('f-excerpt').value.trim(),
      body: $('f-body').value.replace(/\r\n/g, '\n').trim(),
      thumb: thumbFromInputs(),
      is_featured: $('f-featured').checked,
      sources: readSources()
    };
  }
  function formPatch(v) {
    var p = { title: v.title, slug: v.slug, category_id: v.category_id, excerpt: v.excerpt, body: v.body, thumb: v.thumb };
    if (canFeature()) p.is_featured = v.is_featured;
    /* แก้เนื้อหาหลังโหรอนุมัติ = การอนุมัติเดิมใช้ไม่ได้ ต้องให้โหรดูใหม่ */
    if (art && art.astrologer_approved_at && contentChanged(v)) { p.astrologer_approved_by = null; p.astrologer_approved_at = null; }
    return p;
  }
  function syncSources(articleId, rows) {
    var keep = rows.filter(function (r) { return r.title; });
    var old = MH.q.sources(articleId);
    keep.forEach(function (r, i) {
      var patch = { title: r.title, url: r.url, note: r.note, sort_order: i + 1 };
      if (old[i]) MH.store.update('article_sources', old[i].id, patch, 'update');
      else MH.store.insert('article_sources', Object.assign({ article_id: articleId }, patch));
    });
    old.slice(keep.length).forEach(function (o) { MH.store.remove('article_sources', o.id); });
  }
  function reload() { art = MH.store.find('articles', art.id); render(); }

  /* ถ้าฟอร์มมีการแก้ที่ยังไม่บันทึกตอนกดปุ่มอื่น (ตีกลับ/เก็บ) ให้บันทึกไปพร้อมกัน */
  function dirtyPatch() {
    if (!guard.isDirty() || !canEdit(art)) return { patch: {}, sources: null };
    var v = readValues();
    if (!show(validateBasic(v))) return { error: true };
    return { patch: formPatch(v), sources: v.sources };
  }

  function doSave() {
    if (!canEdit(art)) return;
    var v = readValues();
    var live = art && (art.status === 'published' || art.status === 'scheduled');
    if (!show(validateBasic(v).concat(live ? validateContent(v) : []))) return;
    if (!art) {
      var rec = MH.store.insert('articles', Object.assign({
        status: 'draft', published_at: null, author_id: me.id, reviewer_id: null, reviewed_at: null,
        is_featured: false, return_note: '', astrologer_approved_by: null, astrologer_approved_at: null
      }, formPatch(v)));
      syncSources(rec.id, v.sources);
      art = rec;
      try { history.replaceState(null, '', 'article-edit.html?id=' + rec.id); } catch (e) { /* ไม่เป็นไร: อยู่หน้าเดิม */ }
      MH.ui.toast('สร้างบทความแล้ว เป็นฉบับร่าง');
      render();
      return;
    }
    var reset = art.astrologer_approved_at && contentChanged(v);
    if (!MH.store.update('articles', art.id, formPatch(v), 'update')) { MH.ui.toast('ไม่พบบทความนี้แล้ว'); return; }
    syncSources(art.id, v.sources);
    MH.ui.toast('บันทึกแล้ว' + (reset ? ' · แก้เนื้อหาหลังโหรอนุมัติ ต้องให้โหรอนุมัติใหม่' : ''));
    reload();
  }

  function doSubmit() {
    var v = readValues();
    if (!show(validateBasic(v).concat(validateContent(v)))) return;
    var patch = formPatch(v); patch.status = 'in_review'; if (art.return_note) patch.return_note = '';
    MH.store.update('articles', art.id, patch, 'submit');
    syncSources(art.id, v.sources);
    MH.ui.toast('ส่งตรวจแล้ว บรรณาธิการจะเห็นในรายการรอตรวจ');
    reload();
  }

  function doApprove() {
    MH.store.update('articles', art.id, { astrologer_approved_by: me.id, astrologer_approved_at: new Date().toISOString() }, 'approve');
    MH.ui.toast('อนุมัติด้านโหราศาสตร์แล้ว บรรณาธิการเผยแพร่ได้');
    reload();
  }

  function doPublish(kind) {
    var v = readValues(), errs = validatePublish(v), when = null;
    if (kind === 'schedule') {
      var raw = $('f-schedule').value;
      if (!raw) errs.push({ field: 'f-schedule', msg: 'เลือกวันและเวลาที่จะเผยแพร่' });
      else {
        when = new Date(raw);
        if (isNaN(when.getTime()) || when.getTime() <= Date.now()) errs.push({ field: 'f-schedule', msg: 'เวลาที่ตั้งต้องเป็นอนาคต เลือกวันและเวลาหลังจากนี้' });
      }
    }
    if (!show(errs)) return;
    var now = new Date().toISOString(), patch = formPatch(v);
    patch.status = kind === 'publish' ? 'published' : 'scheduled';
    patch.published_at = kind === 'publish' ? now : when.toISOString();
    patch.reviewer_id = me.id; patch.reviewed_at = now;
    if (art.return_note) patch.return_note = '';
    MH.store.update('articles', art.id, patch, kind);
    syncSources(art.id, v.sources);
    MH.ui.toast(kind === 'publish' ? 'เผยแพร่แล้ว ขึ้นหน้าเว็บทันที' : 'ตั้งเวลาแล้ว จะขึ้นหน้าเว็บ ' + MH.util.dateTime(when.toISOString()));
    reload();
  }

  /* กล่องตีกลับ: บังคับกรอกหมายเหตุ (ไม่กรอก = เปิดกล่องใหม่พร้อมข้อความเตือน) */
  function askNote() {
    return new Promise(function (resolve) {
      (function open(prev, err) {
        var ta;
        MH.ui.dialog({
          title: 'ตีกลับให้ผู้เขียนแก้',
          html: '<p class="muted">บทความจะกลับเป็นฉบับร่าง และผู้เขียนจะเห็นหมายเหตุนี้ที่หน้าแก้ไข</p>' +
            '<div class="field"><label for="ret-note">หมายเหตุถึงผู้เขียน</label><textarea class="textarea" id="ret-note" rows="4" maxlength="500"></textarea>' +
            (err ? '<p class="err" role="alert">' + h(err) + '</p>' : '') + '</div>',
          actions: [{ label: 'ยกเลิก', cls: 'btn--outline', value: false }, { label: 'ตีกลับบทความ', cls: 'btn--primary', value: true }],
          onOpen: function (d) { ta = d.querySelector('#ret-note'); ta.value = prev; ta.focus(); }
        }).then(function (ok) {
          if (!ok) { resolve(null); return; }
          var note = ta.value.trim();
          if (!note) { open('', 'ต้องเขียนหมายเหตุว่าให้ผู้เขียนแก้อะไร จึงจะตีกลับได้'); return; }
          resolve(note);
        });
      })('', '');
    });
  }
  function doReturn() {
    var dp = dirtyPatch(); if (dp.error) return;
    askNote().then(function (note) {
      if (note === null) return;
      MH.store.update('articles', art.id, Object.assign({}, dp.patch, { status: 'draft', return_note: note }), 'return');
      if (dp.sources) syncSources(art.id, dp.sources);
      MH.ui.toast('ตีกลับให้ผู้เขียนแก้แล้ว');
      reload();
    });
  }

  function doArchive() {
    var dp = dirtyPatch(); if (dp.error) return;
    MH.ui.confirm({ title: 'เก็บบทความ', body: '“' + art.title + '” จะไม่แสดงบนหน้าเว็บอีก แต่ยังอยู่ในรายการบทความหลังบ้าน', okLabel: 'เก็บบทความ' }).then(function (ok) {
      if (!ok) return;
      MH.store.update('articles', art.id, Object.assign({}, dp.patch, { status: 'archived' }), 'archive');
      if (dp.sources) syncSources(art.id, dp.sources);
      MH.ui.toast('เก็บบทความแล้ว');
      reload();
    });
  }

  /* ยกเลิกตั้งเวลา → กลับไปรอตรวจ · นำบทความที่เก็บกลับเป็นฉบับร่าง (ต้องตรวจใหม่ก่อนเผยแพร่) */
  function doUnschedule() {
    MH.ui.confirm({ title: 'ยกเลิกตั้งเวลา', body: '“' + art.title + '” จะไม่เผยแพร่ตามเวลาที่ตั้งไว้ และกลับไปอยู่ในสถานะรอตรวจ', okLabel: 'ยกเลิกตั้งเวลา' }).then(function (ok) {
      if (!ok) return;
      MH.store.update('articles', art.id, { status: 'in_review', published_at: null }, 'unschedule');
      MH.ui.toast('ยกเลิกตั้งเวลาแล้ว บทความกลับไปรอตรวจ');
      reload();
    });
  }
  function doUnarchive() {
    MH.ui.confirm({ title: 'นำกลับเป็นฉบับร่าง', body: '“' + art.title + '” จะกลับเป็นฉบับร่าง ต้องส่งตรวจและเผยแพร่ใหม่จึงจะขึ้นหน้าเว็บ', okLabel: 'นำกลับเป็นฉบับร่าง' }).then(function (ok) {
      if (!ok) return;
      MH.store.update('articles', art.id, { status: 'draft', published_at: null, reviewer_id: null, reviewed_at: null, astrologer_approved_by: null, astrologer_approved_at: null }, 'unarchive');
      MH.ui.toast('นำกลับเป็นฉบับร่างแล้ว');
      reload();
    });
  }

  function doTrash() {
    MH.ui.confirm({ title: 'ย้ายไปถังขยะ', body: '“' + art.title + '” จะหายจากรายการและหน้าเว็บ เก็บไว้ในถังขยะ 30 วันก่อนลบถาวร', okLabel: 'ย้ายไปถังขยะ', danger: true }).then(function (ok) {
      if (!ok) return;
      MH.store.remove('articles', art.id);
      guard.clean();
      MH.ui.toast('ย้ายไปถังขยะแล้ว');
      setTimeout(function () { location.href = 'articles.html'; }, 700);
    });
  }

  $('actions').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'save') doSave();
    else if (a === 'submit') doSubmit();
    else if (a === 'approve') doApprove();
    else if (a === 'publish' || a === 'schedule') doPublish(a);
    else if (a === 'return') doReturn();
    else if (a === 'archive') doArchive();
    else if (a === 'unschedule') doUnschedule();
    else if (a === 'unarchive') doUnarchive();
    else if (a === 'trash') doTrash();
  });

  /* ---------- วาดหน้า (เรียกซ้ำหลังบันทึกทุกครั้ง) ---------- */
  function metaHtml() {
    var rows = [];
    function row(k, v) { rows.push('<dt>' + h(k) + '</dt><dd>' + v + '</dd>'); }
    row('สถานะ', art ? MH.admin.pill(art.status) : '<span class="pill pill--draft">ใหม่ ยังไม่ได้บันทึก</span>');
    row('ผู้เขียน', h(art ? MH.admin.userName(art.author_id) : me.name));
    if (art) {
      row('สร้างเมื่อ', h(MH.util.dateTime(art.created_at)));
      row('แก้ล่าสุด', h(MH.util.dateTime(art.updated_at)) + (art.updated_by ? ' โดย ' + h(MH.admin.userName(art.updated_by)) : ''));
      if (art.status === 'published') row('เผยแพร่เมื่อ', h(MH.util.dateTime(art.published_at)));
      if (art.status === 'scheduled') row('ตั้งเวลาเผยแพร่', h(MH.util.dateTime(art.published_at)) + (new Date(art.published_at) <= new Date() ? ' (ถึงเวลาแล้ว ขึ้นหน้าเว็บแล้ว)' : ''));
      if (art.reviewer_id) row('ผู้ตรวจและเผยแพร่', h(MH.admin.userName(art.reviewer_id)) + (art.reviewed_at ? ' เมื่อ ' + h(MH.util.dateTime(art.reviewed_at)) : ''));
      if (isAstro(art.category_id)) {
        if (art.astrologer_approved_at) row('โหรอนุมัติ', 'อนุมัติแล้วโดย ' + h(MH.admin.userName(art.astrologer_approved_by)) + ' เมื่อ ' + h(MH.util.dateTime(art.astrologer_approved_at)));
        else if (art.status === 'draft' || art.status === 'in_review') row('โหรอนุมัติ', 'ยังไม่ได้อนุมัติ (ต้องมีก่อนเผยแพร่)');
      }
    }
    return rows.join('');
  }

  function render() {
    var ed = canEdit(art);
    var st = art ? art.status : 'new';
    var name = art ? art.title : 'เขียนบทความใหม่';
    $('page-title').textContent = !art ? 'เขียนบทความใหม่' : (ed ? 'แก้ไขบทความ' : 'ดูบทความ');
    $('page-sub').textContent = art ? name + ' · ' + MH.labels.articleStatus[art.status] : 'บทความใหม่เป็นฉบับร่างจนกว่าจะส่งตรวจ';
    document.title = name + ' · MAHASART หลังบ้าน';
    stateBox.innerHTML = ''; form.hidden = false;
    MH.admin.clearErrors(form);

    /* ช่องข้อมูล */
    var cats = MH.store.all('categories').filter(function (c) { return c.type === 'article' && (c.is_active || (art && c.id === art.category_id)); })
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    $('f-category').innerHTML = '<option value="">— เลือกหมวด —</option>' + cats.map(function (c) { return '<option value="' + c.id + '">' + h(c.name) + '</option>'; }).join('');
    var th = (art && art.thumb) || { glyph: '', tone: 'violet' };
    var artOpts = ART_OPTS.slice();
    if (th.art && !artOpts.some(function (o) { return o[0] === th.art; })) artOpts.push([th.art, 'ภาพ ' + th.art]);
    $('f-art').innerHTML = '<option value="">ไม่ใช้ภาพ (ใช้ตัวอักษรแทน)</option>' + artOpts.map(function (o) { return '<option value="' + h(o[0]) + '">' + h(o[1]) + '</option>'; }).join('');

    $('f-title').value = art ? art.title : '';
    $('f-slug').value = art ? art.slug : '';
    $('f-category').value = art && art.category_id ? String(art.category_id) : '';
    $('f-excerpt').value = art ? art.excerpt : ''; fire($('f-excerpt'));
    $('f-glyph').value = th.glyph || ''; $('f-art').value = th.art || ''; $('f-tone').value = th.tone === 'amber' ? 'amber' : 'violet';
    $('f-body').value = art ? art.body : '';
    $('slug-hint').textContent = (art && (st === 'published' || st === 'scheduled')) ? 'เผยแพร่แล้ว: ถ้าเปลี่ยน slug ลิงก์เดิมของบทความนี้จะใช้ไม่ได้' : SLUG_HINT;
    updateThumb(); setTab('write');
    renderSources(art ? MH.q.sources(art.id) : []);
    applyReadOnly(!ed);

    /* ช่องที่เฉพาะผู้มีสิทธิ์ */
    $('wf-feature').hidden = !(canFeature() && ed);
    $('f-featured').checked = !!(art && art.is_featured);
    var canPub = !!art && st === 'in_review' && can('articles.publish');
    $('wf-schedule').hidden = !canPub;
    $('f-schedule').value = ''; $('f-schedule').min = localInput(new Date());

    /* แถบแจ้ง */
    var notes = [];
    if (art && art.return_note) notes.push('<div class="notice notice--warn" role="status"><div><b>บรรณาธิการตีกลับให้แก้</b><br>' + h(art.return_note) + '</div></div>');
    if (!ed) notes.push('<div class="notice ro-note" role="status"><div><b>อ่านอย่างเดียว</b><br>' + h(readOnlyReason(art)) + '</div></div>');
    $('notices').innerHTML = notes.join('');

    $('wf-meta').innerHTML = metaHtml();
    var wf = [];
    if (art && st === 'in_review') {
      if (isAstro(art.category_id) && !art.astrologer_approved_at) wf.push('<div class="notice notice--warn"><div>บทความหมวดโหราศาสตร์ไทยต้องให้โหรที่ปรึกษาอนุมัติก่อน บรรณาธิการจึงจะเผยแพร่ได้</div></div>');
      if (me.role === 'astrologer' && !isAstro(art.category_id)) wf.push('<div class="notice"><div>บทความนี้ไม่ใช่หมวดโหราศาสตร์ไทย โหรที่ปรึกษาจึงอนุมัติไม่ได้ ให้บรรณาธิการตรวจและเผยแพร่</div></div>');
      if (can('articles.publish') && art.author_id === me.id) wf.push('<div class="notice notice--warn"><div>คุณเป็นผู้เขียนบทความนี้ จึงเผยแพร่เองไม่ได้ ให้บรรณาธิการหรือผู้ดูแลระบบอีกคนเป็นผู้เผยแพร่</div></div>');
    }
    if (art && st === 'draft' && art.author_id === me.id && ed) wf.push('<div class="notice"><div>เขียนเสร็จแล้วกด "ส่งตรวจ" เพื่อให้บรรณาธิการตรวจก่อนเผยแพร่</div></div>');
    $('wf-notes').innerHTML = wf.length ? '<div class="notice-stack">' + wf.join('') + '</div>' : '';

    /* ปุ่มตามสถานะและสิทธิ์ (แสดงเฉพาะที่ทำได้) */
    var canSubmit = !!art && st === 'draft' && art.author_id === me.id && (can('articles.submit') || can('articles.publish'));
    var canApprove = !!art && st === 'in_review' && me.role === 'astrologer' && can('articles.review_astrology') && isAstro(art.category_id) && !art.astrologer_approved_at;
    var canRet = !!art && st === 'in_review' && can('articles.review');
    var canArch = !!art && st === 'published' && can('articles.archive');
    var canUnsched = !!art && st === 'scheduled' && new Date(art.published_at) > new Date() && can('articles.publish');
    var canUnarch = !!art && st === 'archived' && can('articles.archive');
    var main = canSubmit ? 'submit' : canApprove ? 'approve' : canPub ? 'publish' : ed ? 'save' : '';
    var btns = [];
    function btn(act, label) { btns.push('<button type="button" class="btn ' + (main === act ? 'btn--primary' : 'btn--outline') + '" data-act="' + act + '">' + h(label) + '</button>'); }
    if (ed) btn('save', st === 'new' || st === 'draft' ? 'บันทึกฉบับร่าง' : 'บันทึกการแก้ไข');
    if (canSubmit) btn('submit', 'ส่งตรวจ');
    if (canApprove) btn('approve', 'อนุมัติด้านโหราศาสตร์');
    if (canPub) { btn('publish', 'เผยแพร่ทันที'); btn('schedule', 'ตั้งเวลาเผยแพร่'); }
    if (canRet) btn('return', 'ตีกลับพร้อมหมายเหตุ');
    if (canArch) btn('archive', 'เก็บบทความ');
    if (canUnsched) btn('unschedule', 'ยกเลิกตั้งเวลา');
    if (canUnarch) btn('unarchive', 'นำกลับเป็นฉบับร่าง');
    if (art && ed) btns.push('<span class="spacer"></span><button type="button" class="btn btn--danger" data-act="trash">ย้ายไปถังขยะ</button>');
    $('actions').innerHTML = btns.length ? btns.join('') : '<span class="muted">บทบาทและสถานะนี้ไม่มีปุ่มให้กด ดูข้อมูลด้านบนได้อย่างเดียว</span>';

    $('head-actions').innerHTML = art
      ? '<a class="btn btn--outline" href="../article.html?slug=' + encodeURIComponent(art.slug) + '&amp;preview=1" target="_blank" rel="noopener">ดูตัวอย่างบนหน้าเว็บ ↗</a>' : '';
    guard.clean();
  }

  render();
})();
