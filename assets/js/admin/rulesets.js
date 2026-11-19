/* หลังบ้าน: ตำราและค่าคำนวณ — โหรแก้สีประจำวัน ช่วงราศี ค่าตัวอักษร ความหมายเลข แล้วอนุมัติตำรา
   แก้ค่าหลังอนุมัติ = ล้างการอนุมัติ (เตือนก่อน) · หลังบันทึกรันชุดทดสอบสูตรถ้ามี MH.astroTests */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, A = MH.admin, S = MH.store;
  function $(id) { return document.getElementById(id); }

  var root = $('root');
  var canEdit = MH.auth.can('rulesets.edit'), canApprove = MH.auth.can('rulesets.approve');
  var rs = MH.astro.ruleset();
  if (!rs) {
    root.innerHTML = MH.ui.empty('ยังไม่มีตำราที่เปิดใช้งาน', 'ต้องมีตำราอย่างน้อย 1 ชุดที่เปิดใช้งาน หน้าดูดวงจึงจะคำนวณได้');
    return;
  }

  var TABS = [
    { k: 'colors', t: 'สีประจำวัน' }, { k: 'rasi', t: 'ช่วงราศี' },
    { k: 'letters', t: 'ค่าตัวอักษร' }, { k: 'meanings', t: 'ความหมายเลข 1–9' }
  ];
  var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var MONTHS_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; /* ปีไม่อธิกสุรทิน ตรงกับ astro.js */
  var tab = TABS.some(function (t) { return t.k === MH.util.param('tab'); }) ? MH.util.param('tab') : 'colors';
  var guards = {};
  var LS = []; /* ค่าตัวอักษรที่กำลังแก้ [{letter, value}] */

  function rows(table) { return S.all(table).filter(function (r) { return r.ruleset_id === rs.id; }).sort(function (a, b) { return a.id - b.id; }); }
  function anyDirty() { return Object.keys(guards).some(function (k) { return guards[k] && guards[k].isDirty(); }); }
  function actions(k) {
    return canEdit ? '<div class="form-actions"><button type="submit" class="btn btn--primary">บันทึก' + (k === 'meta' ? 'ข้อมูลตำรา' : 'แท็บนี้') + '</button>' +
      '<button type="button" class="btn btn--outline" data-reset="' + k + '">ยกเลิกการแก้ไข</button></div>' : '';
  }

  /* ---------- โครงหน้า ---------- */
  root.innerHTML =
    (canEdit ? '' : '<div class="notice" role="note">' + h(MH.labels.role[A.user.role]) + ' ดูตำราได้อย่างเดียว ต้องมีสิทธิ์แก้ตำราจึงจะแก้ค่าได้</div>') +
    '<section class="form-section" id="meta-card" aria-labelledby="meta-h"></section>' +
    '<div id="test-result" role="status" hidden></div>' +
    '<div class="tabs" role="tablist" aria-label="ค่าในตำรา">' + TABS.map(function (t) {
      return '<button type="button" role="tab" id="tab-' + t.k + '" data-tab="' + t.k + '" aria-controls="panel-' + t.k + '" aria-selected="' + (t.k === tab) + '"' + (t.k === tab ? '' : ' tabindex="-1"') + '>' + t.t + '</button>';
    }).join('') + '</div>' +
    TABS.map(function (t) { return '<div id="panel-' + t.k + '" role="tabpanel" aria-labelledby="tab-' + t.k + '"' + (t.k === tab ? '' : ' hidden') + '></div>'; }).join('');

  /* ---------- ข้อมูลตำรา + อนุมัติ ---------- */
  function renderMeta() {
    rs = S.find('rulesets', rs.id);
    var approved = !!rs.approved_at, ro = canEdit ? '' : ' disabled';
    $('meta-card').innerHTML = '<h2 id="meta-h">ตำราที่ใช้ตอนนี้</h2>' + (rs.note ? '<p class="hint">' + h(rs.note) + '</p>' : '') +
      '<form id="meta-form" novalidate' + (canEdit ? '' : ' class="is-ro"') + '><div class="form-grid">' +
      '<div class="field"><label for="rs-name">ชื่อชุดค่า</label><input class="input" id="rs-name" value="' + h(rs.name) + '" autocomplete="off"' + ro + '><p class="hint">แสดงบนหน้าดูดวงทุกหน้า</p></div>' +
      '<div class="field"><label for="rs-source">แหล่งอ้างอิง (ตำรา / ผู้ตรวจ)</label><input class="input" id="rs-source" value="' + h(rs.source_book) + '" autocomplete="off"' + ro + '><p class="hint">ระบุให้ตรวจย้อนได้ เช่น ชื่อตำราและชื่อโหรผู้ตรวจ</p></div>' +
      '</div>' +
      (approved
        ? '<div class="notice notice--ok"><span><b>อนุมัติแล้ว</b> โดย ' + h(A.userName(rs.approved_by)) + ' เมื่อ ' + h(MH.util.dateTime(rs.approved_at)) + ' · ถ้ามีใครแก้ค่าใด ๆ การอนุมัติจะถูกล้าง</span></div>'
        : '<div class="notice notice--warn"><span><b>ยังไม่ได้รับการอนุมัติ</b> ค่าทั้งหมดเป็นค่าตัวอย่าง รอโหรที่ปรึกษาตรวจและอนุมัติก่อนใช้จริง</span></div>') +
      '<div class="form-actions form-actions--flat">' +
      (canEdit ? '<button type="submit" class="btn btn--primary">บันทึกข้อมูลตำรา</button>' : '') +
      (canApprove && !approved ? '<button type="button" class="btn btn--gold" id="approve-btn">อนุมัติตำรานี้</button>' : '') +
      (MH.astroTests && typeof MH.astroTests.run === 'function' ? '<button type="button" class="btn btn--outline" id="run-tests">ทดสอบสูตรตอนนี้</button>' : '') +
      '</div></form>';
    var f = $('meta-form');
    guards.meta = A.dirtyGuard(f);
    f.addEventListener('submit', function (e) { e.preventDefault(); saveMeta(f); });
    if ($('approve-btn')) $('approve-btn').addEventListener('click', approve);
    if ($('run-tests')) $('run-tests').addEventListener('click', function () { showTests(true); });
  }

  function saveMeta(f) {
    if (!canEdit) return;
    var name = $('rs-name').value.trim(), src = $('rs-source').value.trim(), errs = [];
    if (!name) errs.push({ field: 'rs-name', msg: 'กรอกชื่อชุดค่า' });
    else if (name.length > 80) errs.push({ field: 'rs-name', msg: 'ชื่อชุดค่ายาวเกิน 80 ตัวอักษร (ตอนนี้ ' + name.length + ')' });
    if (!src) errs.push({ field: 'rs-source', msg: 'ระบุแหล่งอ้างอิง เช่น ชื่อตำราและผู้ตรวจ เพื่อให้ตรวจย้อนได้' });
    else if (src.length > 200) errs.push({ field: 'rs-source', msg: 'แหล่งอ้างอิงยาวเกิน 200 ตัวอักษร (ตอนนี้ ' + src.length + ')' });
    if (!A.showErrors(f, errs)) return;
    var ops = [];
    if (name !== rs.name || src !== rs.source_book) ops.push(function () { S.update('rulesets', rs.id, { name: name, source_book: src }); });
    commit(ops, function () { guards.meta.clean(); });
  }

  function approve() {
    if (anyDirty()) { MH.ui.toast('มีการแก้ไขที่ยังไม่บันทึก บันทึกก่อนแล้วค่อยอนุมัติ'); return; }
    MH.ui.confirm({
      title: 'อนุมัติตำรานี้',
      body: 'ยืนยันว่าตรวจสีประจำวัน ช่วงราศี ค่าตัวอักษร และความหมายเลขครบแล้ว หลังอนุมัติ ถ้ามีใครแก้ค่าใด ๆ การอนุมัติจะถูกล้างและต้องอนุมัติใหม่',
      okLabel: 'อนุมัติ'
    }).then(function (ok) {
      if (!ok) return;
      S.update('rulesets', rs.id, { approved_by: A.user.id, approved_at: new Date().toISOString() }, 'approve');
      MH.ui.toast('อนุมัติตำรานี้แล้ว');
      renderMeta();
    });
  }

  /** เขียนการแก้ไขทั้งชุด · ถ้าตำราอนุมัติแล้วต้องยืนยันก่อน แล้วล้างการอนุมัติ */
  function commit(ops, after) {
    if (!ops.length) { MH.ui.toast('ยังไม่มีอะไรเปลี่ยนในส่วนนี้'); return; }
    var ask = rs.approved_at
      ? MH.ui.confirm({
        title: 'แก้ค่านี้จะล้างการอนุมัติ',
        body: 'ตำรานี้ ' + A.userName(rs.approved_by) + ' อนุมัติไว้เมื่อ ' + MH.util.dateTime(rs.approved_at) + ' ถ้าบันทึก สถานะจะกลับเป็น “ยังไม่ได้รับการอนุมัติ” จนกว่าโหรจะอนุมัติอีกครั้ง',
        okLabel: 'บันทึกและล้างการอนุมัติ', danger: true
      })
      : Promise.resolve(true);
    ask.then(function (ok) {
      if (!ok) return;
      ops.forEach(function (fn) { fn(); });
      var cleared = !!rs.approved_at;
      if (cleared) S.update('rulesets', rs.id, { approved_by: null, approved_at: null }, 'update');
      after();
      renderMeta();
      showTests(false);
      MH.ui.toast('บันทึกแล้ว' + (cleared ? ' และล้างการอนุมัติ ต้องให้โหรอนุมัติใหม่' : ''));
    });
  }

  function showTests(announce) {
    var box = $('test-result');
    if (!MH.astroTests || typeof MH.astroTests.run !== 'function') { box.hidden = true; return; }
    var r;
    try { r = MH.astroTests.run(); } catch (e) {
      box.className = 'notice notice--danger'; box.hidden = false;
      box.innerHTML = '<span>รันชุดทดสอบสูตรไม่ได้: ' + h(e.message) + '</span>';
      return;
    }
    box.className = 'notice ' + (r.fail ? 'notice--danger' : 'notice--ok'); box.hidden = false;
    box.innerHTML = '<span>ผลทดสอบสูตร: ผ่าน <b>' + r.pass + '</b> · ล้ม <b>' + r.fail + '</b> · <a href="../tests.html">ดูรายละเอียด</a></span>';
    if (announce) MH.ui.toast('ทดสอบสูตรแล้ว: ผ่าน ' + r.pass + ' · ล้ม ' + r.fail);
  }

  /* ---------- แท็บ: สีประจำวัน ---------- */
  function renderColors() {
    var list = rows('day_colors'), p = $('panel-colors');
    p.innerHTML = '<form id="colors-form" novalidate' + (canEdit ? '' : ' class="is-ro"') + '><p class="hint">สีที่หน้าทักษาและสีประจำวันใช้ แก้ชื่อสีและเลือกสีใหม่ได้ ดาวราหูใช้แทนวันพุธกลางคืน</p><ul class="rs-list">' +
      list.map(function (r) {
        var dn = h(r.day_name);
        return '<li class="rs-row rs-row--color"><span class="rs-day"><b>' + dn + '</b></span>' +
          '<div class="field"><label for="dc-name-' + r.id + '">ชื่อสี<span class="sr-only"> ของวัน' + dn + '</span></label><input class="input" id="dc-name-' + r.id + '" value="' + h(r.color_name) + '" autocomplete="off"></div>' +
          '<div class="field"><label for="dc-hex-' + r.id + '">เลือกสี<span class="sr-only"> ของวัน' + dn + '</span></label><input class="color-in" type="color" id="dc-hex-' + r.id + '" value="' + h(r.hex.toLowerCase()) + '"></div>' +
          '<div class="rs-prev"><span class="sw sw--lg" data-sw="' + r.id + '" aria-hidden="true"></span><code class="hex-val" data-hexv="' + r.id + '">' + h(r.hex.toUpperCase()) + '</code></div></li>';
      }).join('') + '</ul>' + actions('colors') + '</form>';
    list.forEach(function (r) { paintSwatch(r.id, r.hex); });
    var f = $('colors-form');
    guards.colors = A.dirtyGuard(f);
    f.addEventListener('input', function (e) {
      var m = /^dc-hex-(\d+)$/.exec(e.target.id); if (m) paintSwatch(m[1], e.target.value);
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!canEdit) return;
      var errs = [], ops = [];
      list.forEach(function (r) {
        var nm = $('dc-name-' + r.id).value.trim(), hx = $('dc-hex-' + r.id).value.toUpperCase();
        if (!nm) errs.push({ field: 'dc-name-' + r.id, msg: 'ใส่ชื่อสีของวัน' + r.day_name });
        else if (nm.length > 20) errs.push({ field: 'dc-name-' + r.id, msg: 'ชื่อสีของวัน' + r.day_name + 'ยาวเกิน 20 ตัวอักษร' });
        if (nm !== r.color_name || hx !== r.hex.toUpperCase()) ops.push(function () { S.update('day_colors', r.id, { color_name: nm, hex: hx }); });
      });
      if (!A.showErrors(f, errs)) return;
      commit(ops, function () { guards.colors.clean(); renderColors(); });
    });
  }
  function paintSwatch(id, hex) {
    var sw = document.querySelector('[data-sw="' + id + '"]'), v = document.querySelector('[data-hexv="' + id + '"]');
    if (sw) sw.style.background = hex;
    if (v) v.textContent = String(hex).toUpperCase();
  }

  /* ---------- แท็บ: ช่วงราศี ---------- */
  function doy(m, d) { var n = 0; for (var i = 0; i < m - 1; i++) n += DAYS_IN[i]; return n + d - 1; }
  function mod365(x) { return ((x % 365) + 365) % 365; }

  function readRasi() {
    return rows('rasi_ranges').map(function (r) {
      return { id: r.id, name: r.name, row: r, sm: Number($('rr-sm-' + r.id).value), sd: Number($('rr-sd-' + r.id).value), em: Number($('rr-em-' + r.id).value), ed: Number($('rr-ed-' + r.id).value) };
    });
  }
  /** ตรวจว่า 12 ราศีต่อกันเป็นวงครบ 365 วัน ไม่เว้นไม่ทับ · คืนรายการข้อผิดพลาด (ว่าง = ผ่าน) */
  function validateRasi(a) {
    var errs = [], total = 0;
    a.forEach(function (r) {
      if (r.sd > DAYS_IN[r.sm - 1]) errs.push({ field: 'rr-sd-' + r.id, msg: 'ราศี' + r.name + ': เดือน' + MONTHS[r.sm - 1] + 'มีแค่ ' + DAYS_IN[r.sm - 1] + ' วัน เลือกวันเริ่มใหม่' });
      if (r.ed > DAYS_IN[r.em - 1]) errs.push({ field: 'rr-ed-' + r.id, msg: 'ราศี' + r.name + ': เดือน' + MONTHS[r.em - 1] + 'มีแค่ ' + DAYS_IN[r.em - 1] + ' วัน เลือกวันสิ้นสุดใหม่' });
    });
    if (errs.length) return errs;
    a.forEach(function (r, i) {
      var nx = a[(i + 1) % a.length], e = doy(r.em, r.ed), s2 = doy(nx.sm, nx.sd);
      r.len = mod365(e - doy(r.sm, r.sd)) + 1; total += r.len;
      var g = mod365(s2 - e - 1);
      if (g === 0) return;
      var head = 'ราศี' + r.name + 'สิ้นสุด ' + r.ed + ' ' + MONTHS_S[r.em - 1] + ' แต่ราศี' + nx.name + 'เริ่ม ' + nx.sd + ' ' + MONTHS_S[nx.sm - 1];
      errs.push({ field: 'rr-sd-' + nx.id, msg: g <= 182 ? head + ' เว้นไป ' + g + ' วันที่ไม่อยู่ในราศีใด' : head + ' ทับกัน ' + (365 - g) + ' วัน' });
    });
    if (!errs.length && total !== 365) errs.push({ field: 'rr-sd-' + a[0].id, msg: 'รวมช่วงทั้ง 12 ราศีได้ ' + total + ' วัน ต้องครบ 365 วันพอดี' });
    return errs;
  }
  function liveRasi() {
    var a = readRasi(), errs = validateRasi(a), box = $('rasi-live');
    a.forEach(function (r) { var el = $('rr-len-' + r.id); if (el) el.textContent = r.len ? r.len + ' วัน' : ''; });
    if (!errs.length) {
      box.className = 'notice notice--ok'; box.innerHTML = '<span>ช่วงทั้ง 12 ราศีต่อกันครบ 365 วัน ไม่เว้นวันและไม่ทับกัน</span>';
    } else {
      box.className = 'notice notice--danger';
      box.innerHTML = '<div><b>ช่วงราศียังไม่ถูกต้อง (' + errs.length + ' จุด) บันทึกไม่ได้จนกว่าจะแก้</b><ul class="live-list">' + errs.map(function (e) { return '<li>' + h(e.msg) + '</li>'; }).join('') + '</ul></div>';
    }
    return errs;
  }
  function renderRasi() {
    var list = rows('rasi_ranges'), p = $('panel-rasi');
    function mo(sel) { return MONTHS.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (sel === i + 1 ? ' selected' : '') + '>' + m + '</option>'; }).join(''); }
    function dy(sel) { var o = ''; for (var d = 1; d <= 31; d++) o += '<option value="' + d + '"' + (sel === d ? ' selected' : '') + '>' + d + '</option>'; return o; }
    function range(pre, lab, r, m, d) {
      return '<div class="rs-range"><span class="rs-lab">' + lab + '</span>' +
        '<div class="field"><label class="sr-only" for="rr-' + pre + 'd-' + r.id + '">' + lab + ' วันที่ ของราศี' + h(r.name) + '</label><select class="select" id="rr-' + pre + 'd-' + r.id + '">' + dy(d) + '</select></div>' +
        '<div class="field"><label class="sr-only" for="rr-' + pre + 'm-' + r.id + '">' + lab + ' เดือน ของราศี' + h(r.name) + '</label><select class="select" id="rr-' + pre + 'm-' + r.id + '">' + mo(m) + '</select></div></div>';
    }
    p.innerHTML = '<form id="rasi-form" novalidate' + (canEdit ? '' : ' class="is-ro"') + '><p class="hint">วันเริ่มและวันสิ้นสุดของแต่ละราศีไทย ต้องต่อกันเป็นวงครบปี ไม่เว้นวันและไม่ทับกัน (ใช้ปี 365 วัน)</p>' +
      '<div id="rasi-live" role="status"></div><ul class="rs-list">' + list.map(function (r) {
        return '<li class="rs-row rs-row--rasi"><span class="rs-day"><b>ราศี' + h(r.name) + '</b><span class="rs-len muted" id="rr-len-' + r.id + '"></span></span>' +
          range('s', 'เริ่ม', r, r.start_month, r.start_day) + range('e', 'สิ้นสุด', r, r.end_month, r.end_day) + '</li>';
      }).join('') + '</ul>' + actions('rasi') + '</form>';
    var f = $('rasi-form');
    guards.rasi = A.dirtyGuard(f);
    liveRasi();
    f.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') { A.clearErrors(f); liveRasi(); } });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!canEdit) return;
      var a = readRasi(), errs = validateRasi(a);
      if (!A.showErrors(f, errs)) return;
      var ops = [];
      a.forEach(function (r) {
        var o = r.row;
        if (o.start_month !== r.sm || o.start_day !== r.sd || o.end_month !== r.em || o.end_day !== r.ed) {
          ops.push(function () { S.update('rasi_ranges', r.id, { start_month: r.sm, start_day: r.sd, end_month: r.em, end_day: r.ed }); });
        }
      });
      commit(ops, function () { guards.rasi.clean(); renderRasi(); });
    });
  }

  /* ---------- แท็บ: ค่าตัวอักษร ---------- */
  function displayLetter(ch) { return /\p{M}/u.test(ch) ? '◌' + ch : ch; }
  function findSelect(letter) {
    var out = null;
    document.querySelectorAll('#ltr-groups .ltr-sel').forEach(function (el) { if (el.getAttribute('data-letter') === letter) out = el; });
    return out;
  }
  function drawGroups(focusLetter) {
    var html = '';
    for (var v = 1; v <= 9; v++) {
      var mine = LS.filter(function (l) { return l.value === v; });
      html += '<section class="ltr-group" aria-labelledby="lg-' + v + '"><h3 id="lg-' + v + '">ค่า ' + v + ' <span class="muted">(' + mine.length + ' ตัว)</span></h3>' +
        (mine.length ? '<ul class="ltr-list">' + mine.map(function (l) {
          var opts = ''; for (var n = 1; n <= 9; n++) opts += '<option value="' + n + '"' + (n === l.value ? ' selected' : '') + '>' + n + '</option>';
          return '<li class="ltr"><span class="ltr-ch" aria-hidden="true">' + h(displayLetter(l.letter)) + '</span>' +
            '<select class="ltr-sel" data-letter="' + h(l.letter) + '" aria-label="ค่าของตัวอักษร ' + h(l.letter) + '"' + (canEdit ? '' : ' disabled') + '>' + opts + '</select>' +
            (canEdit ? '<button type="button" class="ltr-x" data-del-letter="' + h(l.letter) + '" aria-label="เอาตัวอักษร ' + h(l.letter) + ' ออก">×</button>' : '') + '</li>';
        }).join('') + '</ul>' : '<p class="muted ltr-none">ยังไม่มีตัวอักษรในค่านี้</p>') + '</section>';
    }
    $('ltr-groups').innerHTML = html;
    if (focusLetter) { var el = findSelect(focusLetter); if (el) el.focus(); }
  }
  function renderLetters() {
    var p = $('panel-letters');
    LS = rows('numerology_letter_values').map(function (r) { return { letter: r.letter, value: r.value }; });
    var vOpts = ''; for (var n = 1; n <= 9; n++) vOpts += '<option value="' + n + '">' + n + '</option>';
    p.innerHTML = '<form id="letters-form" novalidate' + (canEdit ? '' : ' class="is-ro"') + '><p class="hint">ตัวอักษรไทยแต่ละตัวมีค่า 1–9 ที่หน้าเลขศาสตร์ใช้รวมเป็นผลรวม ตัวที่ไม่อยู่ในตารางจะไม่ถูกนับ (เครื่องหมาย ◌ คือสระหรือวรรณยุกต์ที่ต้องมีพยัญชนะนำ)</p>' +
      (canEdit ? '<div class="ltr-add"><div class="field"><label for="ltr-new">ตัวอักษรที่จะเพิ่ม</label><input class="input" id="ltr-new" autocomplete="off" placeholder="เช่น ฅ"></div>' +
        '<div class="field"><label for="ltr-new-val">ค่า</label><select class="select" id="ltr-new-val">' + vOpts + '</select></div>' +
        '<button type="button" class="btn btn--outline" id="ltr-add-btn">เพิ่มตัวอักษร</button></div>' : '') +
      '<div id="ltr-groups"></div>' + actions('letters') + '</form>';
    drawGroups();
    var f = $('letters-form');
    guards.letters = A.dirtyGuard(f);
    if (!canEdit) return;
    f.addEventListener('change', function (e) {
      var l = e.target.getAttribute && e.target.getAttribute('data-letter'); if (!l) return;
      LS.forEach(function (x) { if (x.letter === l) x.value = Number(e.target.value); });
      drawGroups(l);
    });
    f.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del-letter]');
      if (b) {
        var l = b.getAttribute('data-del-letter'), at = -1;
        LS.forEach(function (x, i) { if (x.letter === l) at = i; });
        LS = LS.filter(function (x) { return x.letter !== l; });
        drawGroups();
        var next = document.querySelectorAll('#ltr-groups .ltr-x');
        (next[0] || $('ltr-new')).focus();
        f.dispatchEvent(new Event('change', { bubbles: true }));
        MH.ui.toast('เอา “' + l + '” ออกแล้ว กด “บันทึก” เพื่อยืนยัน');
        return;
      }
      if (e.target.closest('#ltr-add-btn')) addLetter(f);
    });
    $('ltr-new').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addLetter(f); } });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!LS.length) { A.showErrors(f, [{ field: 'ltr-new', msg: 'ต้องมีตัวอักษรอย่างน้อย 1 ตัว' }]); return; }
      A.clearErrors(f);
      var stored = rows('numerology_letter_values'), by = {}, ops = [];
      stored.forEach(function (r) { by[r.letter] = r; });
      LS.forEach(function (l) {
        var r = by[l.letter];
        if (!r) ops.push(function () { S.insert('numerology_letter_values', { ruleset_id: rs.id, letter: l.letter, value: l.value }); });
        else if (r.value !== l.value) ops.push(function () { S.update('numerology_letter_values', r.id, { value: l.value }); });
      });
      stored.forEach(function (r) {
        if (!LS.some(function (l) { return l.letter === r.letter; })) ops.push(function () { S.purge('numerology_letter_values', r.id); });
      });
      commit(ops, function () { guards.letters.clean(); renderLetters(); });
    });
  }
  function addLetter(f) {
    var raw = $('ltr-new').value.trim(), chars = Array.from(raw), val = Number($('ltr-new-val').value), msg = '';
    if (!raw) msg = 'พิมพ์ตัวอักษรที่จะเพิ่ม 1 ตัว';
    else if (chars.length !== 1) msg = 'เพิ่มได้ครั้งละ 1 ตัวอักษร (พิมพ์มา ' + chars.length + ' ตัว)';
    else if (!/^[ก-๛]$|^[A-Za-z]$/.test(chars[0])) msg = 'เพิ่มได้เฉพาะตัวอักษรไทยหรืออังกฤษ';
    else {
      var ex = LS.filter(function (l) { return l.letter === chars[0]; })[0];
      if (ex) msg = '“' + chars[0] + '” มีอยู่แล้วที่ค่า ' + ex.value + ' ให้เปลี่ยนค่าที่ตัวเดิมแทน';
    }
    if (!A.showErrors(f, msg ? [{ field: 'ltr-new', msg: msg }] : [])) return;
    LS.push({ letter: chars[0], value: val });
    LS.sort(function (a, b) { return a.value - b.value; });
    $('ltr-new').value = '';
    drawGroups(chars[0]);
    f.dispatchEvent(new Event('change', { bubbles: true }));
    MH.ui.toast('เพิ่ม “' + chars[0] + '” ที่ค่า ' + val + ' แล้ว กด “บันทึก” เพื่อยืนยัน');
  }

  /* ---------- แท็บ: ความหมายเลข ---------- */
  function renderMeanings() {
    var list = rows('numerology_meanings').sort(function (a, b) { return a.total - b.total; }), p = $('panel-meanings');
    p.innerHTML = '<form id="mean-form" novalidate' + (canEdit ? '' : ' class="is-ro"') + '><p class="hint">คำอธิบายเลขโดด 1–9 ที่หน้าเลขศาสตร์แสดงหลังรวมค่าตัวอักษร เขียนเป็นความเชื่อ ไม่ฟันธง และห้ามมีคำต้องห้าม</p><ul class="rs-list">' +
      list.map(function (r) {
        return '<li class="rs-row rs-row--mean"><span class="rs-day"><b>เลข ' + r.total + '</b></span>' +
          '<div class="field"><label for="nm-title-' + r.id + '">ชื่อประจำเลข ' + r.total + '</label><input class="input" id="nm-title-' + r.id + '" value="' + h(r.title) + '" autocomplete="off"></div>' +
          '<div class="field"><label for="nm-text-' + r.id + '">ความหมายของเลข ' + r.total + '</label><textarea class="textarea textarea--short" id="nm-text-' + r.id + '">' + h(r.meaning) + '</textarea></div></li>';
      }).join('') + '</ul>' + actions('meanings') + '</form>';
    list.forEach(function (r) { A.counter($('nm-title-' + r.id), 30); A.counter($('nm-text-' + r.id), 200); });
    var f = $('mean-form');
    guards.meanings = A.dirtyGuard(f);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!canEdit) return;
      var errs = [], ops = [];
      list.forEach(function (r) {
        var t = $('nm-title-' + r.id).value.trim(), m = $('nm-text-' + r.id).value.trim();
        if (!t) errs.push({ field: 'nm-title-' + r.id, msg: 'ใส่ชื่อประจำเลข ' + r.total });
        else if (t.length > 30) errs.push({ field: 'nm-title-' + r.id, msg: 'ชื่อประจำเลข ' + r.total + ' ยาวเกิน 30 ตัวอักษร' });
        if (!m) errs.push({ field: 'nm-text-' + r.id, msg: 'ใส่ความหมายของเลข ' + r.total });
        else if (m.length > 200) errs.push({ field: 'nm-text-' + r.id, msg: 'ความหมายของเลข ' + r.total + ' ยาวเกิน 200 ตัวอักษร (ตอนนี้ ' + m.length + ')' });
        else {
          var bad = MH.util.bannedIn(m);
          if (bad.length) errs.push({ field: 'nm-text-' + r.id, msg: 'ความหมายของเลข ' + r.total + ' มีคำต้องห้าม ' + bad.map(function (w) { return '“' + w + '”'; }).join(' ') + ' ให้ตัดหรือเปลี่ยนคำ' });
        }
        if (t !== r.title || m !== r.meaning) ops.push(function () { S.update('numerology_meanings', r.id, { title: t, meaning: m }); });
      });
      if (!A.showErrors(f, errs)) return;
      commit(ops, function () { guards.meanings.clean(); renderMeanings(); });
    });
  }

  /* ---------- แท็บ + เหตุการณ์ ---------- */
  var RENDER = { colors: renderColors, rasi: renderRasi, letters: renderLetters, meanings: renderMeanings };
  function setTab(k, focus) {
    tab = k;
    TABS.forEach(function (t) {
      var on = t.k === k, b = $('tab-' + t.k);
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      $('panel-' + t.k).hidden = !on;
    });
    try { history.replaceState(null, '', location.pathname + (k === 'colors' ? '' : '?tab=' + k)); } catch (e) { /* ไม่เป็นไร */ }
    if (focus) $('tab-' + k).focus();
  }
  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (b) setTab(b.getAttribute('data-tab'), false);
  });
  document.querySelector('.tabs').addEventListener('keydown', function (e) {
    var i = TABS.map(function (t) { return t.k; }).indexOf(tab), n = TABS.length;
    if (e.key === 'ArrowRight') i = (i + 1) % n;
    else if (e.key === 'ArrowLeft') i = (i - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else return;
    e.preventDefault(); setTab(TABS[i].k, true);
  });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-reset]'); if (!b) return;
    var k = b.getAttribute('data-reset'), g = guards[k];
    function reset() { if (g) g.clean(); if (k === 'meta') renderMeta(); else RENDER[k](); MH.ui.toast('คืนค่าที่บันทึกไว้แล้ว'); }
    if (g && g.isDirty()) {
      MH.ui.confirm({ title: 'ยกเลิกการแก้ไข', body: 'ค่าที่แก้ไว้แต่ยังไม่บันทึกในแท็บนี้จะหายไป', okLabel: 'ยกเลิกการแก้ไข', danger: true }).then(function (ok) { if (ok) reset(); });
    } else { MH.ui.toast('ยังไม่มีอะไรเปลี่ยน'); }
  });

  renderMeta();
  Object.keys(RENDER).forEach(function (k) { RENDER[k](); });
})();
