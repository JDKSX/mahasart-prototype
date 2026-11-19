/* บันทึกการใช้งาน: สถานะห่วงโซ่ hash · กรองตามผู้ใช้/ตาราง/การกระทำ · ใหม่สุดก่อน · แบ่งหน้า 25 · อ่านอย่างเดียว */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var $ = function (id) { return document.getElementById(id); };
  var PER = 25;

  var all = MH.store.all('audit_logs').sort(function (a, b) { return b.id - a.id; });
  var state = { user: '', table: '', action: '', page: 1 };

  /* ---------- สถานะห่วงโซ่ ---------- */
  var bad = MH.store.verifyAudit();
  $('chain').innerHTML = bad === null
    ? '<div class="notice notice--ok" role="status"><div><b>ห่วงโซ่ครบ ' + all.length + ' รายการ</b><br>ไม่พบรายการที่ขาดหายหรือถูกแก้ลำดับ</div></div>'
    : '<div class="notice notice--danger" role="alert"><div><b>ห่วงโซ่ขาดที่รายการ #' + h(bad) + '</b><br>รายการนี้ไม่ต่อกับรายการก่อนหน้า อาจมีรายการถูกแก้หรือลบ ตรวจรายการตั้งแต่ #' + h(bad) + ' เป็นต้นไป</div></div>';

  /* ---------- ตัวกรอง ---------- */
  function distinct(key) {
    return all.map(function (l) { return l[key]; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  }
  var userIds = distinct('user_id');
  $('f-user').innerHTML = '<option value="">ผู้ใช้ทั้งหมด</option>' + userIds.map(function (id) {
    var v = id === null ? 'system' : String(id);
    return '<option value="' + v + '">' + h(id === null ? 'ระบบ' : MH.admin.userName(id)) + '</option>';
  }).join('');
  $('f-table').innerHTML = '<option value="">ทุกตาราง</option>' + distinct('subject_type').map(function (t) {
    return '<option value="' + h(t) + '">' + h(MH.labels.table[t] || t) + '</option>';
  }).join('');
  $('f-action').innerHTML = '<option value="">ทุกการกระทำ</option>' + distinct('action').map(function (a) {
    return '<option value="' + h(a) + '">' + h(MH.labels.action[a] || a) + '</option>';
  }).join('');

  /* ---------- ข้อความรายการ ---------- */
  function clip(s, n) { s = String(s).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '…' : s; }
  function fmt(v) {
    if (v === null || v === undefined || v === '') return '(ว่าง)';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  function changesHtml(ch) {
    var keys = Object.keys(ch || {});
    if (!keys.length) return '<span class="muted">-</span>';
    var lines = keys.slice(0, 6).map(function (k) {
      var v = ch[k];
      if (Array.isArray(v) && v.length === 2) {
        var o = fmt(v[0]), n = fmt(v[1]);
        return '<li title="' + h(k + ': ' + o + ' → ' + n) + '"><code>' + h(k) + '</code> <span class="old">' + h(clip(o, 60)) + '</span> → <span class="new">' + h(clip(n, 60)) + '</span></li>';
      }
      var s = fmt(v);
      return '<li title="' + h(k + ': ' + s) + '"><code>' + h(k) + '</code> <span class="new">' + h(clip(s, 60)) + '</span></li>';
    });
    if (keys.length > 6) lines.push('<li class="more">และอีก ' + (keys.length - 6) + ' ฟิลด์</li>');
    return '<ul class="audit-changes">' + lines.join('') + '</ul>';
  }
  function subjectCell(l) {
    var t = l.subject_type, label = MH.labels.table[t] || t, row = MH.store.find(t, l.subject_id), name = '', href = '';
    if (row) {
      if (t === 'articles') { name = row.title; href = 'article-edit.html?id=' + row.id; }
      else if (t === 'amulets') { name = row.code + ' ' + row.name; href = 'amulet-edit.html?id=' + row.id; }
      else if (t === 'article_sources') {
        var pa = MH.store.find('articles', row.article_id);
        name = row.title + (pa ? ' (ในบทความ “' + clip(pa.title, 30) + '”)' : '');
        if (pa) href = 'article-edit.html?id=' + pa.id;
      }
      else if (t === 'daily_horoscopes') {
        var rr = MH.store.all('rasi_ranges').filter(function (x) { return x.rasi === row.rasi; })[0];
        name = 'ราศี' + (rr ? rr.name : row.rasi) + ' · สัปดาห์ ' + MH.util.dateShort(row.period_start + 'T12:00:00');
        href = 'horoscopes.html?week=' + row.period_start;
      }
      else name = row.name || row.title || row.key || '';
    }
    var txt = h(clip(name, 70) || '#' + l.subject_id);
    return '<b>' + h(label) + '</b><span class="cell-sub">' + (href ? '<a href="' + h(href) + '">' + txt + '</a>' : txt) + '</span>';
  }

  /* ---------- วาดรายการ + แบ่งหน้า ---------- */
  function filtered() {
    return all.filter(function (l) {
      if (state.user && (state.user === 'system' ? l.user_id !== null : String(l.user_id) !== state.user)) return false;
      if (state.table && l.subject_type !== state.table) return false;
      if (state.action && l.action !== state.action) return false;
      return true;
    });
  }
  function pagerHtml(pages, cur) {
    var nums = [];
    for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - cur) <= 2) nums.push(i);
    var out = [], last = 0;
    nums.forEach(function (n) {
      if (last && n - last > 1) out.push('<span class="muted" aria-hidden="true">…</span>');
      out.push('<button type="button" data-page="' + n + '"' + (n === cur ? ' aria-current="page"' : '') + ' aria-label="หน้า ' + n + '">' + n + '</button>');
      last = n;
    });
    return out.join('');
  }
  function render() {
    var rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / PER));
    if (state.page > pages) state.page = pages;
    var from = (state.page - 1) * PER, slice = rows.slice(from, from + PER);
    $('list-meta').textContent = rows.length ? 'แสดง ' + (from + 1) + '–' + (from + slice.length) + ' จาก ' + rows.length + ' รายการ' : 'แสดง 0 จาก ' + all.length + ' รายการ';
    if (!rows.length) {
      $('list').innerHTML = MH.ui.empty('ไม่พบรายการตามตัวกรองนี้', 'ลองเลือกผู้ใช้ ตาราง หรือการกระทำอื่น', '<button type="button" class="btn btn--outline" data-clear>ล้างตัวกรอง</button>');
      $('pager').innerHTML = ''; return;
    }
    $('list').innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">บันทึกการใช้งาน เรียงจากใหม่ไปเก่า อ่านอย่างเดียว</caption><thead><tr>' +
      '<th scope="col">เวลา</th><th scope="col">ผู้ใช้</th><th scope="col">การกระทำ</th><th scope="col">รายการ</th><th scope="col">การเปลี่ยนแปลง</th></tr></thead><tbody>' +
      slice.map(function (l) {
        var u = l.user_id ? MH.store.find('users', l.user_id) : null;
        return '<tr><td class="nowrap" data-label="เวลา">' + h(MH.util.dateTime(l.created_at)) + '<span class="cell-sub">#' + l.id + '</span></td>' +
          '<td data-label="ผู้ใช้">' + (u ? h(u.name) + '<span class="cell-sub">' + h(MH.labels.role[u.role] || '') + '</span>' : 'ระบบ') + '</td>' +
          '<td data-label="การกระทำ">' + h(MH.labels.action[l.action] || l.action) + '</td>' +
          '<td data-label="รายการ">' + subjectCell(l) + '</td>' +
          '<td data-label="เปลี่ยน">' + changesHtml(l.changes) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    $('pager').innerHTML = pages > 1 ? pagerHtml(pages, state.page) : '';
  }

  function bind(id, key) { $(id).addEventListener('change', function () { state[key] = $(id).value; state.page = 1; render(); }); }
  bind('f-user', 'user'); bind('f-table', 'table'); bind('f-action', 'action');
  function clear() {
    state = { user: '', table: '', action: '', page: 1 };
    $('f-user').value = ''; $('f-table').value = ''; $('f-action').value = ''; render();
  }
  $('f-reset').addEventListener('click', clear);
  $('list').addEventListener('click', function (e) { if (e.target.closest('[data-clear]')) clear(); });
  $('pager').addEventListener('click', function (e) {
    var b = e.target.closest('[data-page]'); if (!b) return;
    state.page = Number(b.getAttribute('data-page')); render();
    var t = document.querySelector('.table-wrap'); if (t) t.scrollIntoView({ block: 'start' });
  });

  render();
})();
