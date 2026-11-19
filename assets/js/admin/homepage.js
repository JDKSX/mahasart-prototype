/* หลังบ้าน: จัดหน้าแรก — ข้อความส่วนบน 2 ชุด และวัตถุมงคลแนะนำ (สูงสุด 6 ชิ้น) */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, A = MH.admin, S = MH.store;
  function $(id) { return document.getElementById(id); }
  var MAX = 6;
  var root = $('root');
  var sel, form, guard;

  var HEROES = [
    { key: 'hero_fortune', p: 'hf', title: 'ส่วนบนด้านพยากรณ์', hint: 'ข้อความที่ผู้เข้าชมเห็นก่อนในส่วนพยากรณ์ออนไลน์ของหน้าแรก' },
    { key: 'hero_amulet', p: 'ha', title: 'ส่วนบนด้านวัตถุมงคล', hint: 'ข้อความของส่วนวัตถุมงคลบนหน้าแรก ควรบอกเรื่องป้ายประเภทและที่มาให้ชัด' }
  ];
  var LIM = { eyebrow: 60, title: 40, lede: 200 };

  function init() {
    sel = (S.setting('featured_amulets') || []).slice();
    render();
  }

  function render() {
    root.innerHTML = '<form id="home-form" novalidate>' +
      HEROES.map(function (hero) {
        var v = S.setting(hero.key) || {};
        return '<section class="form-section" aria-labelledby="' + hero.p + '-h"><h2 id="' + hero.p + '-h">' + hero.title + '</h2><p class="hint">' + hero.hint + '</p>' +
          '<div class="form-grid">' +
          '<div class="field"><label for="' + hero.p + '-eyebrow">ข้อความเล็กเหนือหัวข้อ</label><input class="input" id="' + hero.p + '-eyebrow" value="' + h(v.eyebrow || '') + '" autocomplete="off"></div>' +
          '<div class="field"><label for="' + hero.p + '-title">หัวข้อ <span class="req" aria-hidden="true">*</span></label><input class="input" id="' + hero.p + '-title" value="' + h(v.title || '') + '" autocomplete="off"></div>' +
          '<div class="field full"><label for="' + hero.p + '-lede">คำอธิบาย <span class="req" aria-hidden="true">*</span></label><textarea class="textarea textarea--short" id="' + hero.p + '-lede">' + h(v.lede || '') + '</textarea></div>' +
          '</div></section>';
      }).join('') +

      '<section class="form-section" aria-labelledby="sel-title"><h2 id="sel-title" tabindex="-1">วัตถุมงคลแนะนำบนหน้าแรก</h2>' +
      '<p class="hint">เลือกได้สูงสุด ' + MAX + ' ชิ้น ลำดับในรายการคือลำดับบนหน้าแรก แสดงเฉพาะชิ้นที่เผยแพร่แล้ว</p>' +
      '<div id="feat-msg"></div>' +
      '<h3 class="sub-h" id="sel-h">ที่เลือกอยู่</h3><ol class="pick-list" id="sel-list" aria-labelledby="sel-h"></ol>' +
      '<h3 class="sub-h" id="avail-h">เพิ่มได้ <span class="muted">(เฉพาะที่เผยแพร่แล้ว)</span></h3><ul class="pick-list" id="avail-list" aria-labelledby="avail-h"></ul>' +
      '</section>' +

      '<div class="form-actions"><button type="submit" class="btn btn--primary">บันทึกหน้าแรก</button>' +
      '<button type="button" class="btn btn--outline" id="reset-btn">ยกเลิกการแก้ไข</button></div></form>';

    form = $('home-form');
    HEROES.forEach(function (hero) {
      A.counter($(hero.p + '-eyebrow'), LIM.eyebrow);
      A.counter($(hero.p + '-title'), LIM.title);
      A.counter($(hero.p + '-lede'), LIM.lede);
    });
    renderPicks();
    guard = A.dirtyGuard(form);
    form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    form.addEventListener('click', onClick);
    $('reset-btn').addEventListener('click', function () {
      if (!guard.isDirty()) { MH.ui.toast('ยังไม่มีอะไรเปลี่ยน'); return; }
      MH.ui.confirm({ title: 'ยกเลิกการแก้ไข', body: 'ข้อความและรายการที่แก้ไว้แต่ยังไม่บันทึกจะหายไป', okLabel: 'ยกเลิกการแก้ไข', danger: true }).then(function (ok) {
        if (!ok) return; guard.clean(); init();
      });
    });
  }

  /* ---------- รายการเลือก ---------- */
  function artThumb(m) {
    return '<span class="thumb m-thumb' + (m.tone === 'violet' ? ' thumb--violet' : '') + '" aria-hidden="true">' + MH.ui.art(m.art) + '</span>';
  }
  function renderPicks(focus) {
    var all = {}; S.all('amulets').forEach(function (m) { all[m.id] = m; });
    var liveIds = {}; MH.q.amulets().forEach(function (m) { liveIds[m.id] = true; });
    var full = sel.length >= MAX, notLive = sel.filter(function (id) { return !liveIds[id]; }).length;

    var msg = '';
    if (full) msg = '<div class="notice notice--ok" role="status">เลือกครบ ' + MAX + ' ชิ้นแล้ว ถ้าจะเพิ่มชิ้นใหม่ ให้เอาชิ้นเดิมออกก่อน</div>';
    else msg = '<div class="notice notice--warn" role="status">เลือกไว้ ' + sel.length + ' จาก ' + MAX + ' ชิ้น หน้าแรกจะแสดงเท่าที่เลือก (บันทึกได้ แต่แนะนำให้เลือกให้ครบ)</div>';
    if (notLive) msg += '<div class="notice notice--warn" role="status">มี ' + notLive + ' ชิ้นในรายการที่ยังไม่เผยแพร่หรือหาไม่พบ หน้าแรกจะไม่แสดงชิ้นเหล่านี้</div>';
    $('feat-msg').innerHTML = msg;

    $('sel-list').innerHTML = sel.length ? sel.map(function (id, i) {
      var m = all[id];
      if (!m) {
        return '<li class="pick-row pick-row--bad"><span class="pick-n">' + (i + 1) + '</span><span class="pick-main"><b>ไม่พบรายการ #' + id + '</b> <span class="muted">ถูกลบไปแล้ว</span></span>' +
          '<span class="pick-btns">' + btn('del', id, 'เอารายการ #' + id + ' ออก', 'i-close', false, 'icon-btn--danger') + '</span></li>';
      }
      var warn = liveIds[id] ? '' : ' <span class="pill pill--danger">' + h(MH.labels.articleStatus[m.status] || m.status) + ' · ไม่แสดงบนหน้าแรก</span>';
      return '<li class="pick-row"><span class="pick-n">' + (i + 1) + '</span>' + artThumb(m) +
        '<span class="pick-main"><b>' + h(m.name) + '</b> <span class="muted">' + h(m.code) + '</span><br>' + MH.ui.provenanceTag(m.provenance_type) + warn + '</span>' +
        '<span class="pick-btns">' + btn('up', id, 'เลื่อน ' + m.name + ' ขึ้น', 'i-arrow', i === 0, 'rot-up') + btn('down', id, 'เลื่อน ' + m.name + ' ลง', 'i-arrow', i === sel.length - 1, 'rot-down') +
        btn('del', id, 'เอา ' + m.name + ' ออก', 'i-close', false, 'icon-btn--danger') + '</span></li>';
    }).join('') : '<li class="pick-empty">ยังไม่ได้เลือกชิ้นไหน เลือกจากรายการด้านล่าง</li>';

    var avail = MH.q.amulets().filter(function (m) { return sel.indexOf(m.id) < 0; });
    $('avail-list').innerHTML = avail.length ? avail.map(function (m) {
      return '<li class="pick-row">' + artThumb(m) + '<span class="pick-main"><b>' + h(m.name) + '</b> <span class="muted">' + h(m.code) + '</span><br>' + MH.ui.provenanceTag(m.provenance_type) + '</span>' +
        '<span class="pick-btns"><button type="button" class="btn btn--outline btn--sm" data-pick="add" data-id="' + m.id + '" aria-label="เพิ่ม ' + h(m.name) + '"' + (full ? ' disabled title="เลือกครบ ' + MAX + ' ชิ้นแล้ว"' : '') + '>เพิ่ม</button></span></li>';
    }).join('') : '<li class="pick-empty">ไม่มีชิ้นที่เผยแพร่แล้วเหลือให้เพิ่ม</li>';

    if (focus) {
      var el = focus.sel ? document.querySelector(focus.sel + ':not(:disabled)') : null;
      if (!el && focus.alt) el = document.querySelector(focus.alt + ':not(:disabled)');
      (el || $('sel-title')).focus();
    }
  }
  function btn(act, id, label, icon, disabled, cls) {
    return '<button type="button" class="icon-btn icon-btn--sm ' + (cls || '') + '" data-pick="' + act + '" data-id="' + id + '" aria-label="' + h(label) + '"' + (disabled ? ' disabled' : '') + '>' + MH.ui.icon(icon) + '</button>';
  }
  function markDirty() { form.dispatchEvent(new Event('change', { bubbles: true })); }

  function onClick(e) {
    var b = e.target.closest('[data-pick]'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-pick'), id = Number(b.getAttribute('data-id')), i = sel.indexOf(id);
    if (act === 'add') {
      if (i >= 0 || sel.length >= MAX) return;
      sel.push(id);
      renderPicks({ sel: '#avail-list [data-pick="add"]', alt: '#sel-list li:last-child [data-pick="del"]' });
    } else if (act === 'del') {
      if (i < 0) return;
      sel.splice(i, 1);
      var next = sel[i] != null ? sel[i] : sel[i - 1];
      renderPicks({ sel: next != null ? '#sel-list [data-pick="del"][data-id="' + next + '"]' : null });
    } else {
      var j = i + (act === 'up' ? -1 : 1); if (i < 0 || j < 0 || j >= sel.length) return;
      var t = sel[i]; sel[i] = sel[j]; sel[j] = t;
      renderPicks({ sel: '#sel-list [data-pick="' + act + '"][data-id="' + id + '"]', alt: '#sel-list [data-pick][data-id="' + id + '"]' });
    }
    markDirty();
  }

  /* ---------- บันทึก ---------- */
  function save() {
    var errs = [], vals = {};
    HEROES.forEach(function (hero) {
      var v = { eyebrow: $(hero.p + '-eyebrow').value.trim(), title: $(hero.p + '-title').value.trim(), lede: $(hero.p + '-lede').value.trim() };
      vals[hero.key] = v;
      var name = hero.title;
      if (!v.title) errs.push({ field: hero.p + '-title', msg: name + ': กรอกหัวข้อ' });
      if (!v.lede) errs.push({ field: hero.p + '-lede', msg: name + ': กรอกคำอธิบาย' });
      ['eyebrow', 'title', 'lede'].forEach(function (k) {
        var label = k === 'eyebrow' ? 'ข้อความเล็ก' : k === 'title' ? 'หัวข้อ' : 'คำอธิบาย';
        if (v[k].length > LIM[k]) errs.push({ field: hero.p + '-' + k, msg: name + ': ' + label + 'ยาวเกิน ' + LIM[k] + ' ตัวอักษร (ตอนนี้ ' + v[k].length + ')' });
        var bad = MH.util.bannedIn(v[k]);
        if (bad.length) errs.push({ field: hero.p + '-' + k, msg: name + ': ' + label + 'มีคำต้องห้าม ' + bad.map(function (w) { return '“' + w + '”'; }).join(' ') + ' ให้ตัดหรือเปลี่ยนคำ' });
      });
    });
    /* เก็บข้อผิดพลาดเดียวต่อช่อง (showErrors ผูกข้อความกับ id ช่อง) */
    var seen = {}; errs = errs.filter(function (e) { if (seen[e.field]) return false; seen[e.field] = 1; return true; });
    if (!A.showErrors(form, errs)) return;

    HEROES.forEach(function (hero) {
      S.setSetting(hero.key, Object.assign({}, S.setting(hero.key) || {}, vals[hero.key]));
    });
    S.setSetting('featured_amulets', sel.slice());
    /* ให้ข้อมูลในตาราง amulets ตรงกับรายการแนะนำ (MH.q.amulets เรียงตาม featured_order) */
    S.all('amulets').forEach(function (m) {
      var pos = sel.indexOf(m.id) + 1;
      S.update('amulets', m.id, { is_featured: pos > 0, featured_order: pos > 0 ? pos : null });
    });
    guard.clean();
    MH.ui.toast(sel.length < MAX ? 'บันทึกแล้ว (เลือกไว้ ' + sel.length + ' จาก ' + MAX + ' ชิ้น)' : 'บันทึกหน้าแรกแล้ว');
    init();
  }

  init();
})();
