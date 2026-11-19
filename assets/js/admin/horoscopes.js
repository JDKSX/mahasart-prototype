/* ดวง 12 ราศีรายสัปดาห์: เลือกสัปดาห์ (เริ่มวันจันทร์) → กดราศีเพื่อเขียน/แก้ → บันทึกฉบับร่าง/เผยแพร่/ลบ · เผยแพร่ทั้งสัปดาห์เมื่อครบ 12 */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var me = MH.admin.user, can = function (p, r) { return MH.auth.can(p, r); };
  var $ = function (id) { return document.getElementById(id); };
  var MAX = 400;

  /* ---------- วันที่ (เวลาท้องถิ่น) ---------- */
  function parseISO(s) { var p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function isoOf(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDays(iso, n) { var d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); }
  function mondayOf(iso) { var d = parseISO(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); }
  var dm = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });
  /* 26 ต.ค. – 1 พ.ย. 2569 */
  function rangeText(weekISO) {
    var s = parseISO(weekISO), e = parseISO(addDays(weekISO, 6));
    return dm.format(s) + (s.getFullYear() !== e.getFullYear() ? ' ' + (s.getFullYear() + 543) : '') + ' – ' + dm.format(e) + ' ' + (e.getFullYear() + 543);
  }

  var today = MH.util.todayISO(), thisMonday = mondayOf(today);
  var week = (function () {
    var p = MH.util.param('week');
    return p && /^\d{4}-\d{2}-\d{2}$/.test(p) && !isNaN(parseISO(p).getTime()) ? mondayOf(p) : thisMonday;
  })();

  /* ราศีทั้ง 12 จาก rasi_ranges (ตัดซ้ำตามรหัสราศี) */
  var RASI = [];
  MH.store.all('rasi_ranges').sort(function (a, b) { return a.id - b.id; }).forEach(function (r) {
    if (!RASI.some(function (x) { return x.rasi === r.rasi; })) RASI.push({ rasi: r.rasi, name: r.name });
  });
  function rasiName(key) { var r = RASI.filter(function (x) { return x.rasi === key; })[0]; return r ? r.name : key; }

  /* ---------- สิทธิ์ ---------- */
  /* ผู้เขียน/โหรแก้ได้เฉพาะของตัวเอง และเฉพาะฉบับร่าง · บรรณาธิการ/ผู้ดูแลแก้ได้ทุกสถานะ */
  function canEditRow(row) {
    if (!can('horoscopes.edit', row)) return false;
    return row.status !== 'published' || can('horoscopes.publish');
  }
  function weekRows() {
    return MH.store.all('daily_horoscopes').filter(function (r) { return r.period_type === 'week' && r.period_start === week; });
  }
  function rowOf(key, rows) { return (rows || weekRows()).filter(function (r) { return r.rasi === key; })[0] || null; }

  /* ---------- วาดหน้า ---------- */
  function render() {
    var rows = weekRows();
    $('wk-range').textContent = rangeText(week);
    var tag = $('wk-tag');
    if (week === thisMonday) { tag.textContent = 'สัปดาห์นี้'; tag.hidden = false; }
    else if (week === addDays(thisMonday, 7)) { tag.textContent = 'สัปดาห์หน้า'; tag.hidden = false; }
    else tag.hidden = true;
    $('wk-today').disabled = week === thisMonday;
    try { history.replaceState(null, '', 'horoscopes.html?week=' + week); } catch (e) { /* ไม่เป็นไร */ }

    var pub = 0, draft = 0;
    rows.forEach(function (r) { if (r.status === 'published') pub++; else draft++; });
    var missing = RASI.length - rows.length;
    var sum = '<span>เผยแพร่แล้ว <b>' + pub + '</b></span><span>ฉบับร่าง <b>' + draft + '</b></span><span>ยังไม่เขียน <b>' + missing + '</b> จาก ' + RASI.length + ' ราศี</span>';
    var head = '';
    if (can('horoscopes.publish')) {
      var allIn = missing === 0, allPub = allIn && draft === 0;
      head = '<button type="button" class="btn btn--primary" id="btn-pub-week"' + (!allIn || allPub ? ' disabled' : '') + '>เผยแพร่ทั้งสัปดาห์</button>';
      if (!allIn) sum += '<span class="hint">ต้องเขียนให้ครบ ' + RASI.length + ' ราศีก่อน (ขาดอีก ' + missing + ') จึงเผยแพร่ทั้งสัปดาห์ได้</span>';
      else if (allPub) sum += '<span class="hint">เผยแพร่ครบทุกราศีแล้ว</span>';
    }
    $('head-actions').innerHTML = head;
    $('wk-summary').innerHTML = sum;
    $('wk-errors').innerHTML = '';

    $('rasi-grid').innerHTML = RASI.map(function (r) {
      var row = rowOf(r.rasi, rows);
      var cls = 'rasi-cell' + (!row ? ' is-empty' : row.status === 'published' ? ' is-published' : '');
      var pill = !row ? '<span class="pill pill--archived">ยังไม่เขียน</span>' : MH.admin.pill(row.status);
      var snip = row ? h(row.body.length > 90 ? row.body.slice(0, 90) + '…' : row.body) : 'ยังไม่มีคำพยากรณ์ของราศีนี้';
      var by = row ? 'โดย ' + h(MH.admin.userName(row.author_id)) : '';
      return '<li><button type="button" class="' + cls + '" data-rasi="' + h(r.rasi) + '"><h3>ราศี' + h(r.name) + '</h3>' + pill +
        '<span class="snip">' + snip + '</span><span class="by">' + by + '</span></button></li>';
    }).join('');
  }

  /* ---------- กล่องเขียน/แก้ของแต่ละราศี ---------- */
  function trashRow(row) {
    return MH.store.update('daily_horoscopes', row.id, { deleted_at: new Date().toISOString(), updated_by: me.id }, 'delete');
  }

  function openEditor(key) {
    var row = rowOf(key), name = rasiName(key);
    var ed = row ? canEditRow(row) : can('horoscopes.create');
    var isPub = !!row && row.status === 'published';
    var d = document.createElement('dialog');
    d.className = 'dialog dialog--wide'; d.setAttribute('aria-labelledby', 'hs-title');
    var meta = row
      ? 'เขียนโดย ' + h(MH.admin.userName(row.author_id)) + ' · แก้ล่าสุด ' + h(MH.util.dateTime(row.updated_at)) + (isPub ? ' · เผยแพร่ ' + h(MH.util.dateTime(row.published_at)) : '')
      : 'ยังไม่เคยเขียนราศีนี้ในสัปดาห์นี้';
    d.innerHTML = '<form class="d-body" id="hs-form" novalidate>' +
      '<h2 id="hs-title">ราศี' + h(name) + ' · ' + h(rangeText(week)) + '</h2>' +
      '<p class="meta-line">' + (row ? MH.admin.pill(row.status) + ' ' : '') + meta + '</p>' +
      (ed ? '' : '<p class="notice">' + (row && row.status === 'published' && !can('horoscopes.publish') ? 'ดวงนี้เผยแพร่แล้ว บทบาทของคุณแก้เองไม่ได้ ถ้าต้องแก้ให้แจ้งบรรณาธิการ' : row ? 'ดวงนี้เป็นของ ' + h(MH.admin.userName(row.author_id)) + ' คุณดูได้อย่างเดียว' : 'บทบาทของคุณเขียนดวงใหม่ไม่ได้') + '</p>') +
      '<div class="field"><label for="hs-body">คำพยากรณ์ประจำสัปดาห์</label><textarea class="textarea" id="hs-body" rows="8"></textarea></div>' +
      '</form><div class="d-foot" id="hs-foot"></div>';
    document.body.appendChild(d);

    var form = d.querySelector('#hs-form'), ta = d.querySelector('#hs-body'), foot = d.querySelector('#hs-foot');
    ta.value = row ? row.body : ''; ta.readOnly = !ed;
    MH.admin.counter(ta, MAX);
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    function add(label, cls, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.textContent = label;
      b.addEventListener('click', fn); foot.appendChild(b); return b;
    }
    function check(forPublish) {
      var text = ta.value.trim(), errs = [];
      if (!text) errs.push({ field: 'hs-body', msg: 'ใส่คำพยากรณ์ของราศี' + name + ' ก่อน' });
      else if (text.length > MAX) errs.push({ field: 'hs-body', msg: 'คำพยากรณ์ยาว ' + text.length + ' ตัว ตัดให้ไม่เกิน ' + MAX + ' ตัว' });
      if (text && (forPublish || isPub)) {
        var w = MH.util.bannedIn(text);
        if (w.length) errs.push({ field: 'hs-body', msg: 'มีคำต้องห้าม ' + w.map(function (k) { return '“' + k + '”'; }).join(' ') + ' ลบหรือเปลี่ยนคำนี้ก่อนเผยแพร่' });
      }
      return MH.admin.showErrors(form, errs) ? text : null;
    }
    function done(msg) { d.close(); MH.ui.toast(msg); render(); }

    add('ปิด', 'btn--outline', function () { d.close(); });
    if (ed && row) {
      add('ย้ายไปถังขยะ', 'btn--outline', function () {
        MH.ui.confirm({ title: 'ย้ายไปถังขยะ', body: 'ดวงราศี' + name + ' สัปดาห์ ' + rangeText(week) + ' จะหายจากรายการ เก็บไว้ในถังขยะ 30 วัน บรรณาธิการหรือผู้ดูแลระบบกู้คืนได้', okLabel: 'ย้ายไปถังขยะ', danger: true })
          .then(function (ok) { if (!ok) return; trashRow(row); done('ย้ายไปถังขยะแล้ว'); });
      });
    }
    if (ed) {
      add(isPub ? 'บันทึกการแก้ไข' : 'บันทึกฉบับร่าง', can('horoscopes.publish') && !isPub ? 'btn--outline' : 'btn--primary', function () {
        var text = check(false); if (text === null) return;
        if (row) { MH.store.update('daily_horoscopes', row.id, { body: text }, 'update'); }
        else MH.store.insert('daily_horoscopes', { period_type: 'week', period_start: week, rasi: key, body: text, status: 'draft', published_at: null, author_id: me.id });
        done(isPub ? 'บันทึกแล้ว' : 'บันทึกฉบับร่างแล้ว');
      });
    }
    if (ed && !isPub && can('horoscopes.publish')) {
      add('เผยแพร่', 'btn--primary', function () {
        var text = check(true); if (text === null) return;
        var now = new Date().toISOString();
        if (row) MH.store.update('daily_horoscopes', row.id, { body: text, status: 'published', published_at: now }, 'publish');
        else MH.store.insert('daily_horoscopes', { period_type: 'week', period_start: week, rasi: key, body: text, status: 'published', published_at: now, author_id: me.id });
        done('เผยแพร่ดวงราศี' + name + ' แล้ว');
      });
    }
    d.addEventListener('close', function () { setTimeout(function () { d.remove(); }, 0); });
    d.showModal();
    ta.focus();
  }

  /* ---------- เผยแพร่ทั้งสัปดาห์ ---------- */
  function publishWeek() {
    var rows = weekRows();
    if (rows.length < RASI.length) { MH.ui.toast('ต้องเขียนให้ครบ ' + RASI.length + ' ราศีก่อน'); return; }
    var bad = rows.filter(function (r) { return MH.util.bannedIn(r.body).length; });
    if (bad.length) {
      $('wk-errors').innerHTML = '<div class="err-summary" role="alert" tabindex="-1"><h2>ยังเผยแพร่ทั้งสัปดาห์ไม่ได้ มี ' + bad.length + ' ราศีที่มีคำต้องห้าม</h2><ul>' +
        bad.map(function (r) {
          var w = MH.util.bannedIn(r.body).map(function (k) { return '“' + k + '”'; }).join(' ');
          return '<li><button type="button" data-open="' + h(r.rasi) + '">ราศี' + h(rasiName(r.rasi)) + ': พบคำ ' + h(w) + ' แก้คำนี้ก่อน</button></li>';
        }).join('') + '</ul></div>';
      $('wk-errors').querySelector('.err-summary').focus();
      return;
    }
    var pending = rows.filter(function (r) { return r.status !== 'published'; });
    if (!pending.length) { MH.ui.toast('เผยแพร่ครบทุกราศีแล้ว'); return; }
    MH.ui.confirm({ title: 'เผยแพร่ดวงทั้งสัปดาห์', body: 'ดวง ' + RASI.length + ' ราศีของสัปดาห์ ' + rangeText(week) + ' จะขึ้นหน้าเว็บทันที (ที่ยังเป็นฉบับร่าง ' + pending.length + ' ราศี)', okLabel: 'เผยแพร่ทั้งสัปดาห์' })
      .then(function (ok) {
        if (!ok) return;
        var now = new Date().toISOString();
        pending.forEach(function (r) { MH.store.update('daily_horoscopes', r.id, { status: 'published', published_at: now }, 'publish'); });
        MH.ui.toast('เผยแพร่ดวงสัปดาห์ ' + rangeText(week) + ' แล้ว');
        render();
      });
  }

  /* ---------- เหตุการณ์ ---------- */
  function go(w) { week = w; render(); }
  $('wk-prev').addEventListener('click', function () { go(addDays(week, -7)); });
  $('wk-next').addEventListener('click', function () { go(addDays(week, 7)); });
  $('wk-today').addEventListener('click', function () { go(thisMonday); });
  $('rasi-grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rasi]'); if (b) openEditor(b.getAttribute('data-rasi'));
  });
  $('head-actions').addEventListener('click', function (e) { if (e.target.closest('#btn-pub-week')) publishWeek(); });
  $('wk-errors').addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]'); if (b) openEditor(b.getAttribute('data-open'));
  });

  render();
})();
