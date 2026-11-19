/* รายการบทความ: กรองตามสถานะ/หมวด/ชื่อ/ของฉัน (sync กับ URL) แล้วไปแก้ไขหรือดูตัวอย่าง */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var me = MH.admin.user, can = function (p, r) { return MH.auth.can(p, r); };

  var STATUSES = [['all', 'ทั้งหมด'], ['draft', 'ฉบับร่าง'], ['in_review', 'รอตรวจ'], ['scheduled', 'ตั้งเวลา'], ['published', 'เผยแพร่'], ['archived', 'เก็บ']];
  var astroCat = MH.q.categoryBySlug('article', 'thai-astrology');

  /* ผู้เขียนแก้ได้เฉพาะฉบับร่างของตัวเอง · บรรณาธิการ/ผู้ดูแลแก้ได้ทุกสถานะ */
  function canEdit(a) {
    if (!can('articles.edit', a)) return false;
    if (me.role === 'writer' && a.status !== 'draft') return false;
    return true;
  }
  function waitAstro(a) { return !!astroCat && a.category_id === astroCat.id && !a.astrologer_approved_at && (a.status === 'draft' || a.status === 'in_review'); }

  /* ---------- สถานะตัวกรอง (อ่านจาก URL) ---------- */
  var catsAll = MH.store.all('categories').filter(function (c) { return c.type === 'article'; }).sort(function (a, b) { return a.sort_order - b.sort_order; });
  function catFromParam(v) {
    if (!v) return '';
    var c = catsAll.filter(function (x) { return String(x.id) === v || x.slug === v; })[0];
    return c ? String(c.id) : '';
  }
  var st = MH.util.param('status');
  var state = {
    status: STATUSES.some(function (s) { return s[0] === st; }) ? st : 'all',
    cat: catFromParam(MH.util.param('cat')),
    q: MH.util.param('q') || '',
    mine: MH.util.param('mine') === '1'
  };

  var chipsEl = document.getElementById('status-chips'), catEl = document.getElementById('f-cat'),
    qEl = document.getElementById('f-q'), mineEl = document.getElementById('f-mine'),
    listEl = document.getElementById('list'), metaEl = document.getElementById('list-meta');

  /* ---------- วาดตัวควบคุมครั้งเดียว ---------- */
  if (can('articles.create')) {
    document.getElementById('head-actions').innerHTML = '<a class="btn btn--primary" href="article-edit.html">เขียนบทความใหม่</a>';
  }
  chipsEl.innerHTML = STATUSES.map(function (s) {
    return '<button type="button" class="chip" data-status="' + s[0] + '" aria-pressed="false">' + h(s[1]) + ' <span class="n">0</span></button>';
  }).join('');
  catEl.innerHTML = '<option value="">ทุกหมวด</option>' + catsAll.map(function (c) { return '<option value="' + c.id + '">' + h(c.name) + '</option>'; }).join('');
  catEl.value = state.cat; qEl.value = state.q; mineEl.checked = state.mine;

  function syncURL() {
    var p = [];
    if (state.status !== 'all') p.push('status=' + state.status);
    if (state.cat) { var c = MH.q.category(state.cat); p.push('cat=' + encodeURIComponent(c ? c.slug : state.cat)); }
    if (state.q) p.push('q=' + encodeURIComponent(state.q));
    if (state.mine) p.push('mine=1');
    try { history.replaceState(null, '', location.pathname.split('/').pop() + (p.length ? '?' + p.join('&') : '')); } catch (e) { /* เปิดจากไฟล์บางกรณีไม่ให้เปลี่ยน URL */ }
  }

  function matchesBase(a) {
    if (state.cat && String(a.category_id) !== state.cat) return false;
    if (state.mine && a.author_id !== me.id) return false;
    if (state.q && String(a.title || '').toLowerCase().indexOf(state.q.toLowerCase()) < 0) return false;
    return true;
  }

  function dateCell(a) {
    if (a.status === 'published') return 'เผยแพร่ ' + h(MH.util.dateShort(a.published_at));
    if (a.status === 'scheduled') {
      var past = a.published_at && new Date(a.published_at) <= new Date();
      return 'ตั้งเวลา ' + h(MH.util.dateTime(a.published_at)) + (past ? '<span class="cell-sub">ถึงเวลาแล้ว ขึ้นหน้าเว็บแล้ว</span>' : '');
    }
    return 'อัปเดต ' + h(MH.util.dateShort(a.updated_at));
  }

  function rowHtml(a) {
    var c = MH.q.category(a.category_id), ed = canEdit(a);
    return '<tr>' +
      '<td class="cell-title"><a href="article-edit.html?id=' + a.id + '">' + h(a.title) + '</a>' + (waitAstro(a) ? '<span class="tag tag--wait">รอโหร</span>' : '') +
        '<span class="cell-sub">' + h(a.slug) + '</span></td>' +
      '<td data-label="หมวด">' + (c ? h(c.name) : '<span class="muted">ยังไม่เลือก</span>') + '</td>' +
      '<td data-label="ผู้เขียน">' + h(MH.admin.userName(a.author_id)) + '</td>' +
      '<td data-label="สถานะ">' + MH.admin.pill(a.status) + '</td>' +
      '<td data-label="วันที่">' + dateCell(a) + '</td>' +
      '<td class="act-cell"><div class="cell-actions"><a class="btn btn--outline btn--sm" href="article-edit.html?id=' + a.id + '">' + (ed ? 'แก้ไข' : 'ดู') + '</a>' +
        '<a class="btn btn--outline btn--sm" href="../article.html?slug=' + encodeURIComponent(a.slug) + '&amp;preview=1" target="_blank" rel="noopener">ดูตัวอย่าง ↗</a></div></td>' +
      '</tr>';
  }

  function render() {
    var all = MH.store.all('articles').filter(matchesBase);
    var counts = { all: all.length };
    all.forEach(function (a) { counts[a.status] = (counts[a.status] || 0) + 1; });
    chipsEl.querySelectorAll('.chip').forEach(function (b) {
      var s = b.getAttribute('data-status');
      b.setAttribute('aria-pressed', String(s === state.status));
      b.querySelector('.n').textContent = counts[s] || 0;
    });
    var rows = all.filter(function (a) { return state.status === 'all' || a.status === state.status; })
      .sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); });
    var total = MH.store.all('articles').length;

    if (!rows.length) {
      var filtered = state.status !== 'all' || state.cat || state.q || state.mine;
      listEl.innerHTML = filtered
        ? MH.ui.empty('ไม่พบบทความตามตัวกรองนี้', 'ลองเลือกสถานะหรือหมวดอื่น หรือล้างตัวกรองเพื่อดูทั้งหมด', '<button type="button" class="btn btn--outline" data-clear>ล้างตัวกรอง</button>')
        : MH.ui.empty('ยังไม่มีบทความ', 'เริ่มเขียนบทความแรกของคลังความรู้ได้เลย', can('articles.create') ? '<a class="btn btn--primary" href="article-edit.html">เขียนบทความใหม่</a>' : '');
      metaEl.textContent = total ? 'แสดง 0 จาก ' + total + ' บทความ' : '';
      return;
    }
    metaEl.textContent = 'แสดง ' + rows.length + ' จาก ' + total + ' บทความ';
    listEl.innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายการบทความ</caption><thead><tr>' +
      '<th scope="col">ชื่อ</th><th scope="col">หมวด</th><th scope="col">ผู้เขียน</th><th scope="col">สถานะ</th><th scope="col">วันที่</th><th scope="col">การกระทำ</th>' +
      '</tr></thead><tbody>' + rows.map(rowHtml).join('') + '</tbody></table></div>';
  }

  function update() { syncURL(); render(); }

  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-status]'); if (!b) return;
    state.status = b.getAttribute('data-status'); update();
  });
  catEl.addEventListener('change', function () { state.cat = catEl.value; update(); });
  qEl.addEventListener('input', function () { state.q = qEl.value.trim(); update(); });
  mineEl.addEventListener('change', function () { state.mine = mineEl.checked; update(); });
  listEl.addEventListener('click', function (e) {
    if (!e.target.closest('[data-clear]')) return;
    state = { status: 'all', cat: '', q: '', mine: false };
    catEl.value = ''; qEl.value = ''; mineEl.checked = false; update();
  });

  render();
})();
