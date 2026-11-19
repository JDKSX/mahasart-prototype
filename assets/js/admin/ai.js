/* หลังบ้าน: Mahasart AI
   แท็บ "ภาพรวมและบทสนทนา" (ai.view): สถิติ · ตารางบทสนทนาล่าสุดกรองตาม guard · เปิดอ่านข้อความเต็ม (บันทึก audit view_ai_log) · ประมาณต้นทุน
   แท็บ "ตั้งค่า" (ai.settings — มีเฉพาะผู้ดูแลระบบ): เปิด/ปิด AI · โควตา · คำวิกฤต · คำเตือนรายหมวด */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store, A = MH.admin;
  if (!A.allowed) return;
  var AI = MH.ai, PER = 15;
  var canSettings = A.can('ai.settings');
  function $(id) { return document.getElementById(id); }
  function pad(n) { return ('0' + n).slice(-2); }
  function localDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayKeys(n) {
    var out = [], d = new Date();
    for (var i = 0; i < n; i++) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i); out.push(x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate())); }
    return out;
  }
  /* ชื่อย่อ: ชื่อต้น + อักษรแรกของนามสกุล (ไม่แสดงอีเมล/เบอร์ในหน้านี้) */
  function shortName(id) {
    var m = S.find('members', id);
    if (!m) return 'สมาชิกที่ลบแล้ว';
    var p = String(m.display_name || '').trim().split(/\s+/);
    return p.length > 1 ? p[0] + ' ' + Array.from(p[1])[0] + '.' : (p[0] || 'ไม่ระบุชื่อ');
  }
  function money(n) { return '฿' + (Math.round(n * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  var GUARD_ORDER = ['crisis', 'purchase', 'health', 'finance', 'legal'];
  function guardLabel(g) { return g ? AI.GUARDS[g].short : 'ตอบปกติ'; }

  /* ---------- ข้อมูล ---------- */
  function usageIn(keys) { return S.all('ai_usage_daily').filter(function (u) { return keys.indexOf(u.usage_date) >= 0; }); }
  function sumQ(rows) { return rows.reduce(function (s, u) { return s + (u.questions || 0); }, 0); }
  function liveConvs() {
    return S.all('ai_conversations').sort(function (a, b) {
      return String(b.last_message_at || b.updated_at || b.created_at).localeCompare(String(a.last_message_at || a.updated_at || a.created_at));
    });
  }
  function msgsOf(id) { return S.all('ai_messages').filter(function (m) { return m.conversation_id === Number(id); }).sort(function (a, b) { return a.id - b.id; }); }
  function convGuards(id) { return GUARD_ORDER.filter(function (g) { return msgsOf(id).some(function (m) { return m.role === 'assistant' && m.guard === g; }); }); }

  /* ---------- สถานะบนสุด + แท็บ ---------- */
  var tab = MH.util.param('tab') === 'settings' && canSettings ? 'settings' : 'overview';
  function renderStatus() {
    var on = S.setting('ai_enabled') !== false;
    $('ai-status').innerHTML = on ? '' : '<div class="notice notice--warn" role="status"><div><b>Mahasart AI ปิดให้บริการอยู่</b> ผู้ใช้เห็นข้อความ “ปิดให้บริการชั่วคราว” ที่หน้า AI · เปิดกลับได้ที่แท็บตั้งค่า</div></div>';
  }
  function renderTabs() {
    if (!canSettings) { $('ai-tabs').innerHTML = '<p class="muted ai-adm-card">การตั้งค่า AI ทำได้เฉพาะผู้ดูแลระบบ (สิทธิ์ ai.settings) · บทบาทนี้ดูสถิติและตรวจบทสนทนาได้</p>'; return; }
    $('ai-tabs').innerHTML = '<div class="tabs ai-adm-tabs" role="tablist" aria-label="ส่วนของหน้า">' +
      '<button type="button" role="tab" id="tab-overview" aria-controls="panel-overview" aria-selected="' + (tab === 'overview') + '" tabindex="' + (tab === 'overview' ? 0 : -1) + '" data-tab="overview">ภาพรวมและบทสนทนา</button>' +
      '<button type="button" role="tab" id="tab-settings" aria-controls="panel-settings" aria-selected="' + (tab === 'settings') + '" tabindex="' + (tab === 'settings' ? 0 : -1) + '" data-tab="settings">ตั้งค่า</button></div>';
    $('ai-tabs').querySelector('[role=tablist]').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) switchTab(b.getAttribute('data-tab'), true); });
    $('ai-tabs').querySelector('[role=tablist]').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); switchTab(tab === 'overview' ? 'settings' : 'overview', true);
    });
  }
  function switchTab(t, focus) {
    tab = t;
    $('panel-overview').hidden = t !== 'overview';
    $('panel-settings').hidden = t !== 'settings';
    ['overview', 'settings'].forEach(function (k) {
      var b = $('tab-' + k); if (!b) return;
      b.setAttribute('aria-selected', String(k === t)); b.tabIndex = k === t ? 0 : -1;
      if (focus && k === t) b.focus();
    });
    try { history.replaceState(null, '', t === 'settings' ? '?tab=settings' : 'ai.html'); } catch (e) {}
  }

  /* ---------- ภาพรวม ---------- */
  var f = { guard: '', page: 1 };
  function renderOverview() {
    var today = dayKeys(1), week = dayKeys(7), month = dayKeys(30);
    var qToday = sumQ(usageIn(today)), q7 = sumQ(usageIn(week)), q30 = sumQ(usageIn(month));
    var bot7 = S.all('ai_messages').filter(function (m) { return m.role === 'assistant' && week.indexOf(localDate(m.created_at)) >= 0; });
    var guarded = bot7.filter(function (m) { return m.guard; }).length;
    var pct = bot7.length ? Math.round(guarded / bot7.length * 100) : 0;

    /* สัดส่วน guard 7 วัน */
    var counts = { normal: bot7.length - guarded };
    GUARD_ORDER.forEach(function (g) { counts[g] = bot7.filter(function (m) { return m.guard === g; }).length; });
    var maxG = Math.max(1, counts.normal, counts.crisis, counts.purchase, counts.health, counts.finance, counts.legal);
    function gRow(label, n, cls) {
      return '<div class="bar-row"><span>' + h(label) + '</span><div class="bar' + (cls ? ' ' + cls : '') + '"><i data-w="' + Math.round(n / maxG * 100) + '"></i></div><span class="v">' + n + ' · ' + (bot7.length ? Math.round(n / bot7.length * 100) : 0) + '%</span></div>';
    }
    var guardBars = bot7.length
      ? gRow('ตอบปกติ', counts.normal, '') + gRow('ห่วงใย (วิกฤต)', counts.crisis, 'is-danger') + gRow('ไม่แนะนำสินค้า', counts.purchase, 'is-info') +
        gRow('สุขภาพ', counts.health, 'is-warn') + gRow('การเงิน', counts.finance, 'is-warn') + gRow('กฎหมาย', counts.legal, 'is-warn')
      : '<p class="muted">ยังไม่มีคำตอบของ AI ใน 7 วันที่ผ่านมา</p>';

    /* สมาชิกที่ใช้มากสุด 7 วัน */
    var byMember = {};
    usageIn(week).forEach(function (u) { byMember[u.member_id] = (byMember[u.member_id] || 0) + u.questions; });
    var top = Object.keys(byMember).map(function (id) { return { id: id, n: byMember[id] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    var topBars = top.length ? top.map(function (t) {
      return '<div class="bar-row"><span>' + h(shortName(t.id)) + '</span><div class="bar"><i data-w="' + Math.round(t.n / top[0].n * 100) + '"></i></div><span class="v">' + t.n + ' คำถาม</span></div>';
    }).join('') : '<p class="muted">ยังไม่มีสมาชิกที่ใช้ AI ใน 7 วันที่ผ่านมา</p>';

    /* ต้นทุน */
    var cost = Number(S.setting('ai_cost_per_question'));
    if (!(cost >= 0) || S.setting('ai_cost_per_question') === null) cost = 0.15;

    $('panel-overview').innerHTML =
      '<div class="kpis">' +
        '<div class="kpi"><span>คำถามวันนี้</span><b>' + qToday + '</b><span class="note">ที่นับโควตา (ไม่รวมข้อความวิกฤต)</span></div>' +
        '<div class="kpi"><span>คำถาม 7 วัน</span><b>' + q7 + '</b><span class="note">เฉลี่ย ' + (Math.round(q7 / 7 * 10) / 10) + ' ต่อวัน</span></div>' +
        '<div class="kpi' + (guarded ? ' warn' : '') + '"><span>คำตอบที่ติด guard (7 วัน)</span><b>' + guarded + '</b><span class="note">' + pct + '% ของคำตอบทั้งหมด ' + bot7.length + ' ข้อ</span></div>' +
        '<div class="kpi"><span>บทสนทนาที่เก็บอยู่</span><b>' + liveConvs().length + '</b><span class="note">ลบโดยสมาชิกแล้วไม่นับ</span></div>' +
      '</div>' +
      '<div class="ai-grid"><section class="card" aria-labelledby="g-h"><h2 id="g-h">สัดส่วน guard ใน 7 วัน</h2><p class="sec-note">นับจากคำตอบของ AI แยกตามเหตุผลที่ guardrail ทำงาน</p>' + guardBars + '</section>' +
      '<section class="card" aria-labelledby="m-h"><h2 id="m-h">สมาชิกที่ใช้มากสุดใน 7 วัน</h2><p class="sec-note">แสดงชื่อย่อเท่านั้น ไม่แสดงอีเมลหรือเบอร์โทร</p>' + topBars + '</section></div>' +

      '<section class="card ai-adm-card" aria-labelledby="c-h"><h2 id="c-h">ประมาณต้นทุนต่อเดือน</h2>' +
        '<p class="sec-note">เป็นค่าประมาณเพื่อวางงบเท่านั้น ไม่ใช่ยอดจริงจากผู้ให้บริการโมเดล ต้นแบบนี้ใช้ตัวตอบจำลองจึงยังไม่มีต้นทุนจริง</p>' +
        '<div class="ai-cost"><div class="field"><label for="cost-q">บาทต่อคำถาม</label><input class="input num" id="cost-q" type="number" min="0" max="100" step="0.01" value="' + h(cost) + '" inputmode="decimal" aria-describedby="cost-hint">' +
        '<p class="hint" id="cost-hint">' + (canSettings ? 'ค่าเริ่มต้น 0.15 · แก้แล้วระบบจำค่านี้ไว้ให้' : 'บทบาทนี้ลองกรอกเพื่อคำนวณได้ แต่ระบบไม่บันทึกค่า') + '</p></div>' +
        '<div class="ai-cost-out" id="cost-out" aria-live="polite"></div></div></section>' +

      '<section class="card ai-adm-card" aria-labelledby="l-h"><h2 id="l-h">บทสนทนาล่าสุด</h2>' +
        '<p class="sec-note">ทีมงานเปิดอ่านข้อความเต็มได้เพื่อตรวจคุณภาพตามนโยบายความเป็นส่วนตัว การเปิดอ่านทุกครั้งถูกบันทึกใน “บันทึกการใช้งาน” (view_ai_log)</p>' +
        '<div class="toolbar"><label class="sr-only" for="f-guard">กรองตาม guard</label><select class="select" id="f-guard"></select>' +
        '<button type="button" class="btn btn--outline btn--sm" id="f-reset">ล้างตัวกรอง</button></div>' +
        '<p class="list-meta" id="list-meta" aria-live="polite"></p><div id="list"></div><nav class="pager" id="pager" aria-label="แบ่งหน้า"></nav></section>';

    $('panel-overview').querySelectorAll('[data-w]').forEach(function (e) { e.style.width = e.getAttribute('data-w') + '%'; });

    var q30n = q30;
    function drawCost() {
      var c = Number($('cost-q').value);
      if (!(c >= 0)) { $('cost-out').innerHTML = '<p class="muted">กรอกเป็นตัวเลขตั้งแต่ 0 ขึ้นไป</p>'; return; }
      var members = S.all('members').filter(function (m) { return m.status === 'active'; });
      var cap = members.reduce(function (s, m) { return s + (MH.member.plan(m).ai_daily_quota || 0); }, 0) * 30;
      $('cost-out').innerHTML = '<p>คำถาม 30 วันที่ผ่านมา: <b>' + q30n + '</b> ข้อ × ' + money(c) + '</p>' +
        '<p>ประมาณการรายเดือน ≈ <b>' + money(q30n * c) + '</b></p>' +
        '<p class="muted">เพดานสูงสุดถ้าสมาชิกที่ใช้งานอยู่ ' + members.length + ' คนใช้เต็มโควตาทุกวัน ≈ ' + money(cap * c) + ' ต่อเดือน (' + cap.toLocaleString('th-TH') + ' คำถาม)</p>';
    }
    drawCost();
    $('cost-q').addEventListener('input', drawCost);
    $('cost-q').addEventListener('change', function () {
      var c = Number($('cost-q').value);
      if (!canSettings || !(c >= 0) || c > 100) return;
      if (S.setting('ai_cost_per_question') !== c) { S.setSetting('ai_cost_per_question', c); MH.ui.toast('จำค่าบาทต่อคำถามแล้ว'); }
    });

    $('f-guard').innerHTML = '<option value="">ทุกบทสนทนา</option><option value="none">ไม่ติด guard</option>' + GUARD_ORDER.map(function (g) { return '<option value="' + g + '">' + h(AI.GUARDS[g].short) + '</option>'; }).join('');
    $('f-guard').value = f.guard;
    $('f-guard').addEventListener('change', function () { f.guard = $('f-guard').value; f.page = 1; renderList(); });
    $('f-reset').addEventListener('click', function () { f = { guard: '', page: 1 }; $('f-guard').value = ''; renderList(); });
    $('list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-read]'); if (b) readConv(Number(b.getAttribute('data-read')), b);
      if (e.target.closest('[data-clear]')) { f = { guard: '', page: 1 }; $('f-guard').value = ''; renderList(); }
    });
    $('pager').addEventListener('click', function (e) {
      var b = e.target.closest('[data-page]'); if (!b) return;
      f.page = Number(b.getAttribute('data-page')); renderList();
      var t = document.querySelector('#list .table-wrap'); if (t) t.scrollIntoView({ block: 'start' });
    });
    renderList();
  }

  function filtered() {
    return liveConvs().filter(function (c) {
      var gs = convGuards(c.id);
      if (f.guard === 'none') return !gs.length;
      if (f.guard) return gs.indexOf(f.guard) >= 0;
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
  function renderList() {
    var rows = filtered(), total = liveConvs().length, pages = Math.max(1, Math.ceil(rows.length / PER));
    if (f.page > pages) f.page = pages;
    var from = (f.page - 1) * PER, slice = rows.slice(from, from + PER);
    $('list-meta').textContent = rows.length ? 'แสดง ' + (from + 1) + '–' + (from + slice.length) + ' จาก ' + rows.length + ' บทสนทนา' : 'แสดง 0 จาก ' + total + ' บทสนทนา';
    if (!rows.length) {
      $('list').innerHTML = total
        ? MH.ui.empty('ไม่พบบทสนทนาตามตัวกรองนี้', 'ลองเลือก guard อื่น หรือดูทุกบทสนทนา', '<button type="button" class="btn btn--outline" data-clear>ล้างตัวกรอง</button>')
        : MH.ui.empty('ยังไม่มีบทสนทนา', 'เมื่อสมาชิกเริ่มถาม Mahasart AI บทสนทนาจะแสดงที่นี่');
      $('pager').innerHTML = ''; return;
    }
    $('list').innerHTML = '<div class="table-wrap"><table class="table table--stack"><caption class="sr-only">บทสนทนา AI ล่าสุด เรียงจากใหม่ไปเก่า</caption><thead><tr>' +
      '<th scope="col">เวลา</th><th scope="col">สมาชิก</th><th scope="col">หัวข้อ</th><th scope="col">ชนิด</th><th scope="col">ข้อความ</th><th scope="col">guard</th><th scope="col"><span class="sr-only">เปิดอ่าน</span></th></tr></thead><tbody>' +
      slice.map(function (c) {
        var gs = convGuards(c.id), n = c.message_count != null ? c.message_count : msgsOf(c.id).length;
        return '<tr><td class="nowrap" data-label="เวลา">' + h(MH.util.dateTime(c.last_message_at || c.updated_at || c.created_at)) + '</td>' +
          '<td data-label="สมาชิก">' + h(shortName(c.member_id)) + '</td>' +
          '<td class="cell-title" data-label="หัวข้อ">' + h(c.title) + (c.last_reviewed_at ? '<span class="cell-sub">ทีมงานเปิดอ่านล่าสุด ' + h(MH.util.dateShort(c.last_reviewed_at)) + '</span>' : '') + '</td>' +
          '<td data-label="ชนิด">' + (c.mode === 'explain' ? 'อธิบายผล' : 'ถามตอบ') + '</td>' +
          '<td class="num" data-label="ข้อความ">' + n + '</td>' +
          '<td data-label="guard">' + (gs.length ? '<span class="ai-guards">' + gs.map(function (g) { return '<span class="tag ' + AI.GUARDS[g].cls + '">' + h(AI.GUARDS[g].short) + '</span>'; }).join('') + '</span>' : '<span class="muted">ไม่มี</span>') + '</td>' +
          '<td class="act-cell" data-label=""><button type="button" class="btn btn--outline btn--sm" data-read="' + c.id + '" aria-label="เปิดอ่านบทสนทนา ' + h(c.title) + '">เปิดอ่าน</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    $('pager').innerHTML = pages > 1 ? pagerHtml(pages, f.page) : '';
  }

  /* เปิดอ่านข้อความเต็ม — บันทึก audit "view_ai_log" (ผ่าน MH.store.update ที่เรียก log ให้และบันทึกลง localStorage ด้วย) */
  function readConv(id, btn) {
    var c = S.find('ai_conversations', id); if (!c) return;
    S.update('ai_conversations', id, { last_reviewed_at: new Date().toISOString(), last_reviewed_by: A.user.id }, 'view_ai_log');
    var list = msgsOf(id);
    var html = '<div class="notice" role="note"><div>ทีมงานเปิดอ่านบทสนทนาเพื่อตรวจคุณภาพได้ตามนโยบายความเป็นส่วนตัว การเปิดอ่านครั้งนี้ถูกบันทึกใน “บันทึกการใช้งาน” (view_ai_log) ใช้เพื่อตรวจคุณภาพเท่านั้น ห้ามนำไปใช้อย่างอื่น</div></div>' +
      '<p class="meta-line">สมาชิก: ' + h(shortName(c.member_id)) + ' · เริ่ม ' + h(MH.util.dateTime(c.created_at)) + ' · ' + (c.mode === 'explain' ? 'อธิบายผล' : 'ถามตอบ') + '</p>' +
      '<div class="ai-review">' + list.map(function (m) {
        var g = m.guard ? AI.GUARDS[m.guard] : null;
        var srcs = (m.sources || []).map(function (a) { var r = S.find('articles', a); return r ? r.title : '#' + a; });
        return '<div class="ai-review-msg' + (m.role === 'assistant' ? ' is-bot' : '') + '"><div class="who"><span>' + (m.role === 'assistant' ? 'Mahasart AI' : 'สมาชิก') + '</span><span>' + h(MH.util.dateTime(m.created_at)) + '</span>' +
          (g ? '<span class="tag ' + g.cls + '">' + h(g.label) + '</span>' : '') + '</div><div class="body">' + h(m.content) + '</div>' +
          (srcs.length ? '<div class="muted">อ้างอิง: ' + h(srcs.join(' · ')) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    MH.ui.dialog({ title: c.title, html: html, actions: [{ label: 'ปิด', cls: 'btn--primary', value: null }], onOpen: function (d) { d.classList.add('ai-dialog'); } })
      .then(function () { renderList(); if (btn && document.body.contains(btn)) btn.focus(); });
  }

  /* ---------- ตั้งค่า ---------- */
  var words = {}, setForm, setGuard;
  var GROUPS = [
    { key: 'crisis', label: 'คำวิกฤต', hint: 'พบคำเหล่านี้ AI หยุดตอบเรื่องดวงทันที แสดงสายด่วนสุขภาพจิต 1323 และ 1669 และไม่นับโควตา · ต้องมีอย่างน้อย 1 คำ', required: true },
    { key: 'health', label: 'คำเตือนเรื่องสุขภาพ', hint: 'AI ขึ้นต้นด้วยคำเตือนให้ปรึกษาแพทย์ และตอบเฉพาะมุมความเชื่อ' },
    { key: 'finance', label: 'คำเตือนเรื่องการเงิน', hint: 'AI เตือนให้ปรึกษาผู้เชี่ยวชาญการเงิน ไม่ทำนายเลขหวยหรือราคาหุ้น' },
    { key: 'legal', label: 'คำเตือนเรื่องกฎหมาย', hint: 'AI เตือนให้ปรึกษาทนายความ และตอบเฉพาะมุมความเชื่อ' }
  ];
  function loadWords() {
    var c = S.setting('ai_caution_words') || {};
    words = { crisis: (S.setting('ai_crisis_words') || []).slice(), health: (c.health || []).slice(), finance: (c.finance || []).slice(), legal: (c.legal || []).slice() };
  }
  function planQ(key) { var p = MH.q.plan(key); return p ? p.ai_daily_quota : 0; }
  function renderSettings() {
    loadWords();
    var on = S.setting('ai_enabled') !== false;
    function qf(id, label, val, hint) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input num" id="' + id + '" type="number" min="0" max="200" step="1" value="' + val + '" inputmode="numeric"><p class="hint">' + hint + '</p></div>';
    }
    $('panel-settings').innerHTML = '<form id="set-form" novalidate>' +
      '<section class="form-section" aria-labelledby="s-on"><h2 id="s-on">เปิด/ปิดบริการ</h2><p class="hint">ปิดแล้วผู้ใช้เห็น “ปิดให้บริการชั่วคราว” ที่หน้า AI ข้อมูลบทสนทนาเดิมยังอยู่</p>' +
        '<label class="ai-switch" for="f-on"><input type="checkbox" id="f-on"' + (on ? ' checked' : '') + '><span>เปิดให้บริการ Mahasart AI</span></label></section>' +
      '<section class="form-section" aria-labelledby="s-q"><h2 id="s-q">โควตาคำถามต่อวัน</h2><p class="hint">ตัวเลข 0–200 · นับเมื่อส่งคำถามสำเร็จ (ข้อความวิกฤตไม่นับ) · สมาชิกทั่วไปและพรีเมียมเขียนลงแพ็กเกจที่หน้าเว็บใช้จริงด้วย</p>' +
        '<div class="ai-quota-grid">' + qf('q-guest', 'ผู้ไม่ล็อกอิน', S.setting('ai_quota_guest') || 0, 'ต้นแบบนี้ผู้ไม่ล็อกอินยังถามไม่ได้ ต้องสมัครสมาชิกฟรีก่อน') +
        qf('q-free', 'สมาชิกทั่วไป', planQ('free'), 'ค่าเริ่มต้น 3') + qf('q-premium', 'พรีเมียม', planQ('premium'), 'ค่าเริ่มต้น 30') + '</div></section>' +
      GROUPS.map(function (g) {
        return '<section class="form-section" aria-labelledby="s-' + g.key + '"><h2 id="s-' + g.key + '">' + g.label + '</h2><p class="hint">' + g.hint + '</p>' +
          '<div class="field"><label for="w-' + g.key + '">เพิ่มคำ</label><div class="ai-add"><input class="input" id="w-' + g.key + '" autocomplete="off" placeholder="พิมพ์คำหรือวลีสั้น ๆ">' +
          '<button type="button" class="btn btn--outline" data-add="' + g.key + '">เพิ่มคำ</button></div></div><ul class="ai-words" id="l-' + g.key + '" aria-label="' + g.label + 'ทั้งหมด"></ul></section>';
      }).join('') +
      '<div class="notice" role="note"><div>นอกจากคำที่ตั้งไว้ ระบบมีคำพื้นฐานที่ปิดไม่ได้เสมอ เช่น เลขเด็ด สลาก งวดนี้ (การเงิน) · คิดสั้น ฆ่าตัวเอง (วิกฤต) · อาการ พบแพทย์ (สุขภาพ) เพื่อความปลอดภัย ส่วนคำที่มีคำอื่นซ้อนอยู่ เช่น “อยาก” “พยากรณ์” ระบบแยกออกให้ ไม่นับเป็นเรื่องสุขภาพ</div></div>' +
      '<div class="form-actions"><button type="submit" class="btn btn--primary">บันทึกการตั้งค่า</button><button type="button" class="btn btn--outline" id="set-reset">ยกเลิกการแก้ไข</button></div></form>';
    setForm = $('set-form');
    GROUPS.forEach(function (g) { drawWords(g.key); });
    setGuard = A.dirtyGuard(setForm);
    setForm.addEventListener('submit', function (e) { e.preventDefault(); saveSettings(); });
    setForm.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]'), r = e.target.closest('[data-rm]');
      if (a) addWord(a.getAttribute('data-add'));
      if (r) { var p = r.getAttribute('data-rm').split(':'); removeWord(p[0], Number(p[1])); }
    });
    setForm.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.id && e.target.id.indexOf('w-') === 0) { e.preventDefault(); addWord(e.target.id.slice(2)); }
    });
    $('set-reset').addEventListener('click', function () {
      if (!setGuard.isDirty()) { MH.ui.toast('ยังไม่มีอะไรเปลี่ยน'); return; }
      MH.ui.confirm({ title: 'ยกเลิกการแก้ไข', body: 'ค่าที่แก้ไว้แต่ยังไม่บันทึกจะหายไป', okLabel: 'ยกเลิกการแก้ไข', danger: true }).then(function (ok) { if (ok) { setGuard.clean(); renderSettings(); } });
    });
  }
  function drawWords(key) {
    $('l-' + key).innerHTML = words[key].length ? words[key].map(function (w, i) {
      return '<li class="ai-word"><span>' + h(w) + '</span><button type="button" data-rm="' + key + ':' + i + '" aria-label="เอาคำ ' + h(w) + ' ออก">×</button></li>';
    }).join('') : '<li class="muted">ยังไม่มีคำในหมวดนี้ (ระบบยังใช้คำพื้นฐานที่ปิดไม่ได้)</li>';
  }
  function markDirty() { setForm.dispatchEvent(new Event('change', { bubbles: true })); }
  function addWord(key) {
    var inp = $('w-' + key), w = inp.value.trim(), msg = '';
    if (!w) msg = 'พิมพ์คำที่จะเพิ่ม';
    else if (w.length > 30) msg = 'คำยาวเกิน 30 ตัวอักษร ใส่เฉพาะคำหรือวลีสั้น ๆ';
    else if (words[key].some(function (x) { return x.replace(/\s+/g, '') === w.replace(/\s+/g, ''); })) msg = 'มีคำว่า “' + w + '” อยู่แล้ว';
    if (!A.showErrors(setForm, msg ? [{ field: 'w-' + key, msg: msg }] : [])) return;
    words[key].push(w); drawWords(key); inp.value = ''; inp.focus(); markDirty();
    MH.ui.toast('เพิ่มคำว่า “' + w + '” แล้ว กด “บันทึกการตั้งค่า” เพื่อยืนยัน');
  }
  function removeWord(key, i) {
    var g = GROUPS.filter(function (x) { return x.key === key; })[0], w = words[key][i];
    if (g.required && words[key].length <= 1) {
      A.showErrors(setForm, [{ field: 'w-' + key, msg: 'ต้องเหลือคำวิกฤตอย่างน้อย 1 คำ เพื่อให้ระบบแสดงสายด่วนได้' }]); $('w-' + key).focus(); return;
    }
    A.clearErrors(setForm);
    words[key].splice(i, 1); drawWords(key);
    var next = $('l-' + key).querySelectorAll('[data-rm]');
    (next[Math.min(i, next.length - 1)] || $('w-' + key)).focus();
    markDirty();
    MH.ui.toast('เอา “' + w + '” ออกแล้ว กด “บันทึกการตั้งค่า” เพื่อยืนยัน');
  }
  function saveSettings() {
    var errs = [], v = {};
    [['q-guest', 'ผู้ไม่ล็อกอิน'], ['q-free', 'สมาชิกทั่วไป'], ['q-premium', 'พรีเมียม']].forEach(function (p) {
      var raw = $(p[0]).value.trim(), n = Number(raw);
      if (raw === '' || isNaN(n)) errs.push({ field: p[0], msg: 'กรอกโควตาของ' + p[1] + ' เป็นตัวเลข 0–200' });
      else if (Math.floor(n) !== n) errs.push({ field: p[0], msg: 'โควตาของ' + p[1] + ' ต้องเป็นจำนวนเต็ม' });
      else if (n < 0 || n > 200) errs.push({ field: p[0], msg: 'โควตาของ' + p[1] + ' ต้องอยู่ระหว่าง 0 ถึง 200 (ตอนนี้ ' + n + ')' });
      else v[p[0]] = n;
    });
    if (!words.crisis.length) errs.push({ field: 'w-crisis', msg: 'ต้องมีคำวิกฤตอย่างน้อย 1 คำ เพื่อให้ระบบแสดงสายด่วนได้' });
    if (!A.showErrors(setForm, errs)) return;

    var changed = 0;
    function put(key, val) { if (JSON.stringify(S.setting(key)) !== JSON.stringify(val)) changed++; S.setSetting(key, val); }
    put('ai_enabled', $('f-on').checked);
    put('ai_quota_guest', v['q-guest']); put('ai_quota_free', v['q-free']); put('ai_quota_premium', v['q-premium']);
    put('ai_crisis_words', words.crisis.slice());
    put('ai_caution_words', { health: words.health.slice(), finance: words.finance.slice(), legal: words.legal.slice() });
    /* MH.q.aiQuota อ่านโควตาสมาชิกจากแพ็กเกจ (plans.ai_daily_quota) จึงอัปเดตด้วย */
    [['free', v['q-free']], ['premium', v['q-premium']]].forEach(function (p) {
      var plan = MH.q.plan(p[0]);
      if (plan && plan.ai_daily_quota !== p[1]) { S.update('plans', plan.id, { ai_daily_quota: p[1] }); changed++; }
    });
    setGuard.clean();
    MH.ui.toast(changed ? 'บันทึกการตั้งค่า AI แล้ว' : 'ยังไม่มีอะไรเปลี่ยน');
    renderStatus(); renderSettings(); renderOverview();
  }

  renderStatus();
  renderTabs();
  renderOverview();
  if (canSettings) renderSettings();
  switchTab(tab, false);
})();
