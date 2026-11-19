/* รายการคอร์สหลังบ้าน: กรองตามสถานะ/ชื่อ (sync กับ URL) · ผู้เชี่ยวชาญเห็นเฉพาะคอร์สของตัวเอง */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.admin.allowed) return;
  var me = MH.admin.user, can = function (p) { return MH.admin.can(p); };

  var STATUSES = [['all', 'ทั้งหมด'], ['draft', 'ฉบับร่าง'], ['in_review', 'รอตรวจ'], ['published', 'เผยแพร่']];
  var experts = MH.store.all('experts');
  var myExpert = me.role === 'expert' ? experts.filter(function (e) { return e.user_id === me.id; })[0] || null : null;
  var onlyMine = me.role === 'expert';

  function expertOf(c) { return experts.filter(function (e) { return e.id === c.expert_id; })[0] || null; }
  function isOwner(c) { var e = expertOf(c); return !!e && e.user_id === me.id; }
  function canEdit(c) {
    if (can('courses.edit_any')) return true;
    return can('courses.edit_own') && isOwner(c) && c.status === 'draft';
  }

  var st = MH.util.param('status');
  var state = { status: STATUSES.some(function (s) { return s[0] === st; }) ? st : 'all', q: MH.util.param('q') || '' };

  var chipsEl = document.getElementById('status-chips'), qEl = document.getElementById('f-q'),
    listEl = document.getElementById('list'), metaEl = document.getElementById('list-meta');

  document.getElementById('head-sub').textContent = onlyMine
    ? 'คอร์สของคุณ — สร้าง แก้ไข และส่งตรวจให้บรรณาธิการเผยแพร่'
    : 'สร้างคอร์ส ส่งตรวจ และเผยแพร่คอร์สเรียนของผู้เชี่ยวชาญ';
  if (can('courses.create') && (!onlyMine || myExpert)) {
    document.getElementById('head-actions').innerHTML = '<a class="btn btn--primary" href="course-edit.html">สร้างคอร์สใหม่</a>';
  }
  chipsEl.innerHTML = STATUSES.map(function (s) {
    return '<button type="button" class="chip" data-status="' + s[0] + '" aria-pressed="false">' + h(s[1]) + ' <span class="n">0</span></button>';
  }).join('');
  qEl.value = state.q;

  function syncURL() {
    var p = [];
    if (state.status !== 'all') p.push('status=' + state.status);
    if (state.q) p.push('q=' + encodeURIComponent(state.q));
    try { history.replaceState(null, '', location.pathname.split('/').pop() + (p.length ? '?' + p.join('&') : '')); } catch (e) { /* เปิดจากไฟล์บางกรณีไม่ให้เปลี่ยน URL */ }
  }

  function counts(c) {
    var ens = MH.store.all('course_enrollments').filter(function (e) { return e.course_id === c.id && e.status === 'active'; });
    return { learners: ens.length, done: ens.filter(function (e) { return !!e.certificate_no; }).length };
  }

  function rowHtml(c) {
    var ex = expertOf(c), n = counts(c), ed = canEdit(c);
    return '<tr>' +
      '<td class="cell-title"><a href="course-edit.html?id=' + c.id + '">' + h(c.title) + '</a><span class="cell-sub">' + h(c.slug) + '</span></td>' +
      '<td data-label="ผู้สอน">' + (ex ? h(ex.display_name) : '<span class="muted">ยังไม่เลือก</span>') +
        (ex && ex.status !== 'active' ? '<span class="cell-sub">' + h(MH.labels.expertStatus[ex.status] || ex.status) + '</span>' : '') + '</td>' +
      '<td data-label="สถานะ">' + MH.admin.pill(c.status) + '</td>' +
      '<td data-label="ราคา" class="nowrap">' + h(MH.money(c.price)) + (c.included_in_premium ? '<span class="cell-sub">พรีเมียมเรียนฟรี</span>' : '') + '</td>' +
      '<td data-label="ผู้เรียน" class="num">' + n.learners + '</td>' +
      '<td data-label="จบแล้ว" class="num">' + n.done + '</td>' +
      '<td class="act-cell"><div class="cell-actions"><a class="btn btn--outline btn--sm" href="course-edit.html?id=' + c.id + '">' + (ed ? 'แก้ไข' : 'ดู') + '</a>' +
        '<a class="btn btn--outline btn--sm" href="../course.html?slug=' + encodeURIComponent(c.slug) + '&amp;preview=1" target="_blank" rel="noopener">ดูตัวอย่าง ↗</a></div></td></tr>';
  }

  function render() {
    var base = MH.store.all('courses').filter(function (c) {
      if (onlyMine && !(myExpert && c.expert_id === myExpert.id)) return false;
      if (state.q) {
        var ex = expertOf(c), s = state.q.toLowerCase();
        if (String(c.title).toLowerCase().indexOf(s) < 0 && String(ex ? ex.display_name : '').toLowerCase().indexOf(s) < 0) return false;
      }
      return true;
    });
    var cnt = { all: base.length };
    base.forEach(function (c) { cnt[c.status] = (cnt[c.status] || 0) + 1; });
    chipsEl.querySelectorAll('.chip').forEach(function (b) {
      var s = b.getAttribute('data-status');
      b.setAttribute('aria-pressed', String(s === state.status));
      b.querySelector('.n').textContent = cnt[s] || 0;
    });
    var rows = base.filter(function (c) { return state.status === 'all' || c.status === state.status; })
      .sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); });

    if (onlyMine && !myExpert) {
      listEl.innerHTML = MH.ui.empty('ยังไม่มีโปรไฟล์ผู้เชี่ยวชาญของคุณ', 'บัญชีนี้ยังไม่ได้ผูกกับโปรไฟล์ผู้เชี่ยวชาญ แจ้งผู้ดูแลระบบให้เพิ่มก่อนจึงจะสร้างคอร์สได้');
      metaEl.textContent = ''; return;
    }
    if (!rows.length) {
      var filtered = state.status !== 'all' || state.q;
      listEl.innerHTML = filtered
        ? MH.ui.empty('ไม่พบคอร์สตามตัวกรองนี้', 'ลองเลือกสถานะอื่น หรือล้างตัวกรองเพื่อดูทั้งหมด', '<button type="button" class="btn btn--outline" data-clear>ล้างตัวกรอง</button>')
        : MH.ui.empty('ยังไม่มีคอร์ส', 'เริ่มสร้างคอร์สแรกได้เลย', can('courses.create') ? '<a class="btn btn--primary" href="course-edit.html">สร้างคอร์สใหม่</a>' : '');
      metaEl.textContent = base.length ? 'แสดง 0 จาก ' + base.length + ' คอร์ส' : '';
      return;
    }
    metaEl.textContent = 'แสดง ' + rows.length + ' จาก ' + base.length + ' คอร์ส';
    listEl.innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">รายการคอร์สเรียน</caption><thead><tr>' +
      '<th scope="col">ชื่อคอร์ส</th><th scope="col">ผู้สอน</th><th scope="col">สถานะ</th><th scope="col">ราคา</th><th scope="col">ผู้เรียน</th><th scope="col">จบแล้ว</th><th scope="col">การกระทำ</th>' +
      '</tr></thead><tbody>' + rows.map(rowHtml).join('') + '</tbody></table></div>';
  }

  function update() { syncURL(); render(); }
  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-status]'); if (!b) return;
    state.status = b.getAttribute('data-status'); update();
  });
  qEl.addEventListener('input', function () { state.q = qEl.value.trim(); update(); });
  listEl.addEventListener('click', function (e) {
    if (!e.target.closest('[data-clear]')) return;
    state = { status: 'all', q: '' }; qEl.value = ''; update();
  });

  render();
})();
