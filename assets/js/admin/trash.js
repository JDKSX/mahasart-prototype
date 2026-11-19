/* ถังขยะ: รายการที่ถูกย้ายมา (บทความ วัตถุมงคล ดวง 12 ราศี) · กู้คืนตามสิทธิ์ของแต่ละตาราง · ลบถาวรเฉพาะผู้ดูแลระบบ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var can = function (p, r) { return MH.auth.can(p, r); };
  var $ = function (id) { return document.getElementById(id); };
  var KEEP_DAYS = 30, DAY = 86400000;

  function rasiName(key) {
    var r = MH.store.all('rasi_ranges').filter(function (x) { return x.rasi === key; })[0];
    return r ? r.name : key;
  }
  function weekText(iso) { return MH.util.dateShort(iso + 'T12:00:00'); }

  /* แต่ละตารางที่เข้าถังขยะ: ชื่อที่แสดง · สิทธิ์กู้คืน · เช็กว่ากู้คืนแล้วชนกับของที่ใช้อยู่ไหม */
  var SOURCES = [
    { table: 'articles', title: function (r) { return r.title; },
      canRestore: function (r) { return can('articles.edit', r); },
      conflict: function (r) {
        var o = MH.store.all('articles').filter(function (x) { return x.slug === r.slug && x.id !== r.id; })[0];
        return o ? 'slug “' + r.slug + '” ถูกบทความ “' + o.title + '” ใช้อยู่แล้ว ต้องเปลี่ยน slug ของบทความนั้นก่อน' : ''; } },
    { table: 'amulets', title: function (r) { return r.code + ' ' + r.name; },
      canRestore: function (r) { return can('amulets.edit', r); },
      conflict: function (r) {
        var o = MH.store.all('amulets').filter(function (x) { return (x.code === r.code || x.slug === r.slug) && x.id !== r.id; })[0];
        return o ? 'รหัสหรือ slug เดียวกันถูก ' + o.code + ' ใช้อยู่แล้ว' : ''; } },
    { table: 'daily_horoscopes', title: function (r) { return 'ดวงราศี' + rasiName(r.rasi) + ' · สัปดาห์ ' + weekText(r.period_start); },
      canRestore: function (r) { return can('horoscopes.edit', r); },
      conflict: function (r) {
        var o = MH.store.all('daily_horoscopes').filter(function (x) { return x.period_type === r.period_type && x.period_start === r.period_start && x.rasi === r.rasi && x.id !== r.id; })[0];
        return o ? 'ราศีนี้ในสัปดาห์นั้นมีดวงฉบับใหม่แล้ว กู้คืนซ้อนกันไม่ได้' : ''; } }
  ];

  function items() {
    var out = [];
    SOURCES.forEach(function (s) {
      MH.store.all(s.table, { onlyTrashed: true }).forEach(function (r) { out.push({ src: s, row: r }); });
    });
    return out.sort(function (a, b) { return String(b.row.deleted_at).localeCompare(String(a.row.deleted_at)); });
  }
  function daysLeft(row) { return Math.ceil((new Date(row.deleted_at).getTime() + KEEP_DAYS * DAY - Date.now()) / DAY); }

  function render() {
    var list = items();
    if (!list.length) {
      $('list').innerHTML = MH.ui.empty('ถังขยะว่าง', 'เมื่อย้ายบทความ วัตถุมงคล หรือดวงมาที่นี่ จะเห็นรายการที่กู้คืนได้ภายใน 30 วัน');
      return;
    }
    var isAdmin = can('trash.purge');
    $('list').innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายการในถังขยะ</caption><thead><tr>' +
      '<th scope="col">รายการ</th><th scope="col">ประเภท</th><th scope="col">ลบเมื่อ</th><th scope="col">ผู้ลบ</th><th scope="col">เวลาที่เหลือ</th><th scope="col">การกระทำ</th></tr></thead><tbody>' +
      list.map(function (x) {
        var r = x.row, left = daysLeft(r), ok = x.src.canRestore(r);
        return '<tr><td class="cell-title"><b>' + h(x.src.title(r)) + '</b></td>' +
          '<td data-label="ประเภท">' + h(MH.labels.table[x.src.table] || x.src.table) + '</td>' +
          '<td data-label="ลบเมื่อ">' + h(MH.util.dateTime(r.deleted_at)) + '</td>' +
          '<td data-label="ผู้ลบ">' + h(MH.admin.userName(r.updated_by)) + '</td>' +
          '<td data-label="เหลือ" class="left-days' + (left <= 7 ? ' low' : '') + '">' + (left > 0 ? 'เหลือ ' + left + ' วันก่อนลบถาวร' : 'ครบกำหนดลบถาวรแล้ว') + '</td>' +
          '<td class="act-cell"><div class="cell-actions">' +
            (ok ? '<button type="button" class="btn btn--outline btn--sm" data-restore="' + x.src.table + ':' + r.id + '">กู้คืน</button>' : '') +
            (isAdmin ? '<button type="button" class="btn btn--danger btn--sm" data-purge="' + x.src.table + ':' + r.id + '">ลบถาวร</button>' : '') +
            (!ok && !isAdmin ? '<span class="muted">ดูอย่างเดียว</span>' : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ลูกของแถวที่ลบถาวร ต้องลบตามด้วย ไม่เช่นนั้นรหัสที่ว่างจะถูกใช้ซ้ำแล้วไปติดแหล่งอ้างอิง/รูปของเก่า */
  function purgeChildren(table, id) {
    if (table === 'articles') {
      MH.store.all('article_sources', { withTrashed: true }).filter(function (s) { return s.article_id === id; })
        .forEach(function (s) { MH.store.purge('article_sources', s.id); });
    } else if (table === 'amulets') {
      MH.store.all('media', { withTrashed: true }).filter(function (m) { return m.owner_type === 'amulets' && m.owner_id === id; })
        .forEach(function (m) { MH.store.purge('media', m.id); });
    }
  }

  /* "articles:5" → { src, row } ของรายการที่ยังอยู่ในถังขยะ */
  function pick(key) {
    var p = key.split(':');
    return items().filter(function (x) { return x.src.table === p[0] && String(x.row.id) === p[1]; })[0] || null;
  }

  $('list').addEventListener('click', function (e) {
    var rb = e.target.closest('[data-restore]'), pb = e.target.closest('[data-purge]');
    if (rb) {
      var x = pick(rb.getAttribute('data-restore')); if (!x) return;
      if (!x.src.canRestore(x.row)) { MH.ui.toast('บทบาทของคุณกู้คืนรายการนี้ไม่ได้'); return; }
      var c = x.src.conflict(x.row);
      if (c) { MH.ui.toast('กู้คืนไม่ได้: ' + c); return; }
      MH.store.restore(x.src.table, x.row.id);
      MH.ui.toast('กู้คืนแล้ว: ' + x.src.title(x.row));
      render();
    } else if (pb) {
      var y = pick(pb.getAttribute('data-purge')); if (!y || !can('trash.purge')) return;
      MH.ui.confirm({ title: 'ลบถาวร', body: '“' + y.src.title(y.row) + '” จะถูกลบออกจากระบบจริง กู้คืนไม่ได้อีก', okLabel: 'ลบถาวร', danger: true }).then(function (ok) {
        if (!ok) return;
        purgeChildren(y.src.table, y.row.id);
        MH.store.purge(y.src.table, y.row.id);
        MH.ui.toast('ลบถาวรแล้ว');
        render();
      });
    }
  });

  render();
})();
