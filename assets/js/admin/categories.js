/* หลังบ้าน: หมวดหมู่ของบทความและวัตถุมงคล (เพิ่ม แก้ เปิด/ปิดใช้ เรียงลำดับ ลบเมื่อไม่มีรายการใช้) */
(function () {
  'use strict';
  var MH = window.MH; if (!MH.admin.allowed) return;
  var h = MH.util.h, A = MH.admin, S = MH.store;
  function $(id) { return document.getElementById(id); }

  var TYPES = {
    article: { label: 'บทความ', table: 'articles', add: 'เพิ่มหมวดบทความ' },
    amulet: { label: 'วัตถุมงคล', table: 'amulets', add: 'เพิ่มหมวดวัตถุมงคล' }
  };
  var LOCKED_SLUG = 'thai-astrology'; /* ระบบใช้ slug นี้ตรวจเงื่อนไขโหรอนุมัติ (สัญญาข้อ 6) */
  var SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var type = MH.util.param('type') === 'amulet' ? 'amulet' : 'article';
  var panel = $('panel'), addBtn = $('add-cat');

  function list(t) {
    return S.all('categories').filter(function (c) { return c.type === t; })
      .sort(function (a, b) { return a.sort_order - b.sort_order || a.id - b.id; });
  }
  function usage(c) {
    var rows = S.all(TYPES[c.type].table, { withTrashed: true }).filter(function (r) { return r.category_id === c.id; });
    var trashed = rows.filter(function (r) { return r.deleted_at; }).length;
    return { total: rows.length, live: rows.length - trashed, trashed: trashed };
  }

  /* ---------- วาด ---------- */
  function render(focusSel) {
    document.querySelectorAll('.tabs [role="tab"]').forEach(function (t) {
      var on = t.getAttribute('data-type') === type;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'tab-' + type);
    addBtn.textContent = TYPES[type].add;

    var items = list(type);
    if (!items.length) {
      panel.innerHTML = MH.ui.empty('ยังไม่มีหมวด' + TYPES[type].label, 'เพิ่มหมวดแรกเพื่อจัดกลุ่มรายการ', '<button type="button" class="btn btn--primary" data-add>' + TYPES[type].add + '</button>');
      return;
    }
    panel.innerHTML = '<div class="table-wrap"><table class="table table--stack">' +
      '<caption class="sr-only">หมวดหมู่' + h(TYPES[type].label) + '</caption>' +
      '<thead><tr><th scope="col">ชื่อหมวด</th><th scope="col">slug</th><th scope="col">ใช้อยู่</th><th scope="col">เปิดใช้</th><th scope="col">ลำดับ</th><th scope="col"><span class="sr-only">การกระทำ</span></th></tr></thead><tbody>' +
      items.map(function (c, i) { return row(c, i, items.length); }).join('') + '</tbody></table></div>' +
      '<p class="muted foot-note">ลำดับในตารางคือลำดับที่แสดงในตัวกรองบนเว็บ · หมวดที่ปิดใช้จะเลือกกับรายการใหม่ไม่ได้ แต่รายการเดิมยังอยู่</p>';
    if (focusSel) {
      var el = panel.querySelector(focusSel + ':not(:disabled)');
      if (el) el.focus();
    }
  }

  function row(c, i, n) {
    var u = usage(c), locked = c.slug === LOCKED_SLUG, canDelete = u.total === 0 && !locked, why = '';
    var uText = u.live + (u.trashed ? ' <span class="muted">(+' + u.trashed + ' ในถังขยะ)</span>' : '');
    if (u.total > 0) why = 'ใช้อยู่ ' + u.total + ' รายการ ลบไม่ได้ ให้ปิดใช้แทน';
    else if (locked) why = 'ระบบใช้หมวดนี้ตรวจเงื่อนไขโหรอนุมัติ ลบไม่ได้';
    return '<tr>' +
      '<td data-label="" class="nm"><b>' + h(c.name) + '</b>' + (c.is_active ? '' : ' <span class="muted">(ปิดใช้งาน)</span>') + '</td>' +
      '<td data-label="slug"><code>' + h(c.slug) + '</code></td>' +
      '<td data-label="ใช้อยู่" class="num">' + uText + '</td>' +
      '<td data-label="เปิดใช้"><label class="switch-wrap"><input type="checkbox" role="switch" class="switch" data-toggle="' + c.id + '" aria-label="เปิดใช้หมวด ' + h(c.name) + '"' + (c.is_active ? ' checked' : '') + '><span>เปิดใช้</span></label></td>' +
      '<td data-label="ลำดับ"><div class="btn-row">' +
        '<button type="button" class="icon-btn icon-btn--sm rot-up" data-move="up" data-id="' + c.id + '" aria-label="เลื่อน ' + h(c.name) + ' ขึ้น"' + (i === 0 ? ' disabled' : '') + '>' + MH.ui.icon('i-arrow') + '</button>' +
        '<button type="button" class="icon-btn icon-btn--sm rot-down" data-move="down" data-id="' + c.id + '" aria-label="เลื่อน ' + h(c.name) + ' ลง"' + (i === n - 1 ? ' disabled' : '') + '>' + MH.ui.icon('i-arrow') + '</button>' +
      '</div></td>' +
      '<td data-label="" class="acts"><div class="btn-row">' +
        '<button type="button" class="btn btn--outline btn--sm" data-edit="' + c.id + '" aria-label="แก้ไขหมวด ' + h(c.name) + '">แก้ไข</button>' +
        '<button type="button" class="btn btn--danger-o btn--sm" data-del="' + c.id + '" aria-label="ลบหมวด ' + h(c.name) + '"' + (canDelete ? '' : ' disabled aria-describedby="why-' + c.id + '" title="' + h(why) + '"') + '>ลบ</button>' +
        '</div>' + (why ? '<p class="why" id="why-' + c.id + '">' + h(why) + '</p>' : '') + '</td></tr>';
  }

  /* ---------- กล่องเพิ่ม/แก้ ---------- */
  function catDialog(cat) {
    return new Promise(function (resolve) {
      var isEdit = !!cat, lock = isEdit && cat.slug === LOCKED_SLUG, done = false;
      var d = document.createElement('dialog'); d.className = 'dialog dialog--wide';
      d.setAttribute('aria-labelledby', 'cd-title');
      d.innerHTML = '<form id="cat-form" novalidate><div class="d-body"><h2 id="cd-title">' + h(isEdit ? 'แก้หมวด “' + cat.name + '”' : TYPES[type].add) + '</h2>' +
        '<div class="field"><label for="cd-name">ชื่อหมวด</label><input class="input" id="cd-name" value="' + h(isEdit ? cat.name : '') + '" autocomplete="off"></div>' +
        '<div class="field"><label for="cd-slug">slug (ส่วนท้ายของลิงก์)</label><input class="input" id="cd-slug" value="' + h(isEdit ? cat.slug : '') + '" autocomplete="off"' + (lock ? ' readonly' : '') + '>' +
        '<p class="hint">' + (lock ? 'slug นี้ระบบใช้ตรวจเงื่อนไขโหรอนุมัติของบทความโหราศาสตร์ไทย จึงแก้ไม่ได้'
          : 'ใช้ a-z 0-9 และขีดกลาง ห้ามซ้ำในประเภทเดียวกัน เช่น thai-astrology' + (isEdit ? ' · ถ้าเปลี่ยน ลิงก์เดิมที่ใช้ slug นี้จะใช้ไม่ได้' : '')) + '</p></div>' +
        '</div><div class="d-foot"><button type="button" class="btn btn--outline" data-cancel>ยกเลิก</button><button type="submit" class="btn btn--primary">' + (isEdit ? 'บันทึก' : 'เพิ่มหมวด') + '</button></div></form>';
      document.body.appendChild(d);
      var f = d.querySelector('#cat-form');
      function finish(v) { if (done) return; done = true; resolve(v); }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('cd-name').value.trim(), slug = $('cd-slug').value.trim(), errs = [];
        var peers = S.all('categories', { withTrashed: true }).filter(function (c) { return c.type === type && (!isEdit || c.id !== cat.id); });
        if (!name) errs.push({ field: 'cd-name', msg: 'กรอกชื่อหมวด' });
        else if (name.length > 60) errs.push({ field: 'cd-name', msg: 'ชื่อหมวดยาวเกิน 60 ตัวอักษร (ตอนนี้ ' + name.length + ')' });
        else if (peers.some(function (c) { return !c.deleted_at && c.name === name; })) errs.push({ field: 'cd-name', msg: 'มีหมวดชื่อนี้ใน' + TYPES[type].label + 'แล้ว ใช้ชื่ออื่น' });
        if (!slug) errs.push({ field: 'cd-slug', msg: 'กรอก slug ใช้ a-z 0-9 และขีดกลาง เช่น thai-astrology' });
        else if (!SLUG_RE.test(slug)) errs.push({ field: 'cd-slug', msg: 'slug ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง (-) ห้ามเว้นวรรค ห้ามขึ้นต้นหรือลงท้ายด้วยขีดกลาง' });
        else {
          var dup = peers.filter(function (c) { return c.slug === slug; })[0];
          if (dup) errs.push({ field: 'cd-slug', msg: 'slug นี้ถูกใช้แล้วโดยหมวด “' + dup.name + '”' + (dup.deleted_at ? ' (อยู่ในถังขยะ)' : '') + ' ใช้ค่าอื่น' });
        }
        if (!A.showErrors(f, errs)) return;
        finish({ name: name, slug: slug });
        d.close();
      });
      d.querySelector('[data-cancel]').addEventListener('click', function () { finish(null); d.close(); });
      d.addEventListener('cancel', function () { finish(null); });
      d.addEventListener('close', function () { finish(null); setTimeout(function () { d.remove(); }, 0); });
      d.showModal();
      $('cd-name').focus();
    });
  }

  function addCat() {
    catDialog(null).then(function (res) {
      if (!res) return;
      var max = list(type).reduce(function (m, c) { return Math.max(m, c.sort_order || 0); }, 0);
      S.insert('categories', { type: type, name: res.name, slug: res.slug, sort_order: max + 1, is_active: true });
      MH.ui.toast('เพิ่มหมวด “' + res.name + '” แล้ว');
      render();
      addBtn.focus();
    });
  }
  function editCat(id) {
    var cat = S.find('categories', id); if (!cat) return;
    catDialog(cat).then(function (res) {
      if (!res) return;
      S.update('categories', cat.id, { name: res.name, slug: res.slug });
      MH.ui.toast('บันทึกหมวด “' + res.name + '” แล้ว');
      render('[data-edit="' + cat.id + '"]');
    });
  }
  function delCat(id) {
    var cat = S.find('categories', id); if (!cat) return;
    var u = usage(cat);
    if (u.total > 0 || cat.slug === LOCKED_SLUG) { MH.ui.toast('หมวดนี้ลบไม่ได้ ให้ปิดใช้แทน'); return; }
    MH.ui.confirm({ title: 'ลบหมวด “' + cat.name + '”', body: 'ไม่มีรายการใช้หมวดนี้อยู่ หมวดจะถูกย้ายไปถังขยะ กู้คืนได้ภายหลัง', okLabel: 'ลบหมวด', danger: true }).then(function (ok) {
      if (!ok) return;
      S.remove('categories', cat.id);
      MH.ui.toast('ลบหมวด “' + cat.name + '” แล้ว');
      render();
      addBtn.focus();
    });
  }
  function move(id, dir) {
    var items = list(type), i = -1;
    items.forEach(function (c, n) { if (String(c.id) === String(id)) i = n; });
    var j = i + (dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= items.length) return;
    var t = items[i]; items[i] = items[j]; items[j] = t;
    items.forEach(function (c, n) { if (c.sort_order !== n + 1) S.update('categories', c.id, { sort_order: n + 1 }); });
    render('[data-move="' + dir + '"][data-id="' + id + '"]');
    if (!panel.querySelector('[data-move="' + dir + '"][data-id="' + id + '"]:not(:disabled)')) {
      var other = panel.querySelector('[data-move][data-id="' + id + '"]:not(:disabled)'); if (other) other.focus();
    }
  }

  /* ---------- เหตุการณ์ ---------- */
  function setType(t, focusTab) {
    type = t;
    try { history.replaceState(null, '', location.pathname + (t === 'amulet' ? '?type=amulet' : '')); } catch (e) { /* ไม่เป็นไร */ }
    render();
    if (focusTab) $('tab-' + t).focus();
  }
  document.querySelector('.tabs').addEventListener('click', function (e) {
    var t = e.target.closest('[role="tab"]'); if (t) setType(t.getAttribute('data-type'), false);
  });
  document.querySelector('.tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    setType(e.key === 'Home' ? 'article' : e.key === 'End' ? 'amulet' : (type === 'article' ? 'amulet' : 'article'), true);
  });
  addBtn.addEventListener('click', addCat);
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-add')) return addCat();
    if (b.getAttribute('data-edit')) return editCat(b.getAttribute('data-edit'));
    if (b.getAttribute('data-del')) return delCat(b.getAttribute('data-del'));
    if (b.getAttribute('data-move')) return move(b.getAttribute('data-id'), b.getAttribute('data-move'));
  });
  panel.addEventListener('change', function (e) {
    var t = e.target.getAttribute && e.target.getAttribute('data-toggle'); if (!t) return;
    var cat = S.find('categories', t); if (!cat) return;
    S.update('categories', cat.id, { is_active: e.target.checked });
    var u = usage(cat);
    MH.ui.toast(e.target.checked ? 'เปิดใช้หมวด “' + cat.name + '” แล้ว'
      : 'ปิดใช้หมวด “' + cat.name + '” แล้ว' + (u.live ? ' รายการเดิม ' + u.live + ' รายการยังอยู่ แต่เลือกหมวดนี้กับรายการใหม่ไม่ได้' : ''));
    render('[data-toggle="' + cat.id + '"]');
  });

  render();
})();
