/* Mahasart AI: หน้าแชต
   ผู้ไม่ล็อกอิน → อธิบายว่าต้องเป็นสมาชิก (ฟรี) + ตัวอย่างบทสนทนา · สมาชิก → แชตเต็มจอ โควตารายวัน เก็บประวัติ ลบได้
   ตัวตอบ = MH.ai.answer (ตัวตอบจำลอง) · ?c=<id> เปิดบทสนทนาเดิม · ?explain=… เปิดบทสนทนาใหม่แล้วถามอัตโนมัติ (นับโควตา) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, AI = MH.ai, S = MH.store;
  var root = document.getElementById('ai-root');
  var fineWrap = document.getElementById('ai-fine-wrap');
  var TYPING_MS = 600, MAX = AI.MAX_LEN;

  var enabled = S.setting('ai_enabled') !== false;
  var member = MH.member.current();
  var explain = AI.parseExplain(location.search);

  function $(id) { return document.getElementById(id); }
  function planQuota(key) { var p = MH.q.plan(key); return p ? p.ai_daily_quota : 0; }
  function timeOf(iso) { try { return iso ? new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''; } catch (e) { return ''; } }
  function timeTag(iso) { return iso ? '<time class="ai-time" datetime="' + h(iso) + '">' + h(timeOf(iso)) + '</time>' : ''; }
  function clipTitle(t) { t = String(t).replace(/\s+/g, ' ').trim(); return t.length > 40 ? t.slice(0, 40) + '…' : t; }

  /* ---------- ส่วนประกอบข้อความ (ใช้ทั้งหน้าแชตและตัวอย่างของผู้ไม่ล็อกอิน) ---------- */
  function srcHtml(ids) {
    var items = (ids || []).map(function (id) { return S.find('articles', id); }).filter(Boolean);
    if (!items.length) return '';
    return '<div class="ai-src"><b>แหล่งอ้างอิง</b><ul>' + items.map(function (a) {
      return MH.q.isLive(a)
        ? '<li><a href="article.html?slug=' + encodeURIComponent(a.slug) + '">' + h(a.title) + '</a></li>'
        : '<li class="muted">' + h(a.title) + ' (บทความนี้ไม่ได้เผยแพร่แล้ว)</li>';
    }).join('') + '</ul></div>';
  }
  function userHtml(m, fresh) {
    return '<article class="ai-msg ai-msg--user' + (fresh ? ' cx-pop' : '') + '" aria-label="คุณ"><div class="ai-bubble">' + h(m.content) + '</div>' + timeTag(m.created_at) + '</article>';
  }
  /** opts.followups = แสดงปุ่มคำถามต่อเนื่องหรือไม่ · opts.locked = ปิดปุ่ม (โควตาหมด) */
  function botHtml(m, opts) {
    opts = opts || {};
    var g = m.guard ? AI.GUARDS[m.guard] : null;
    var fu = opts.followups && m.followups && m.followups.length
      ? '<div class="ai-fu" role="group" aria-label="คำถามต่อเนื่อง">' + m.followups.map(function (q) {
          return '<button type="button" class="chip" data-q="' + h(q) + '"' + (opts.locked ? ' disabled' : '') + '>' + h(q) + '</button>';
        }).join('') + '</div>' : '';
    var help = m.guard === 'crisis'
      ? '<div class="ai-help"><a class="btn btn--danger" href="tel:1323">โทร 1323 สายด่วนสุขภาพจิต (24 ชม.)</a><a class="btn btn--outline" href="tel:1669">โทร 1669 ฉุกเฉิน</a></div>' : '';
    var acts = opts.actions && m.id
      ? '<div class="ai-acts"><button type="button" class="ai-act" data-copy="' + m.id + '">' + MH.ui.icon('i-copy') + 'คัดลอก</button>' + timeTag(m.created_at) + '</div>'
      : timeTag(m.created_at);
    return '<article class="ai-msg ai-msg--bot' + (opts.fresh ? ' cx-pop' : '') + '" aria-label="Mahasart AI"><span class="ai-avatar" aria-hidden="true">' + MH.ui.icon('i-ai') + '</span>' +
      '<div class="ai-turn"><div class="ai-bubble' + (m.guard === 'crisis' ? ' ai-bubble--crisis' : '') + '">' +
      (g ? '<p class="ai-guard"><span class="tag ' + g.cls + '">' + h(g.label) + '</span></p>' : '') +
      '<div class="ai-body">' + MH.util.renderBody(m.content) + '</div>' + help + srcHtml(m.sources) + '</div>' + acts + fu + '</div></article>';
  }
  function typingHtml() {
    return '<article class="ai-msg ai-msg--bot ai-typing" aria-label="AI กำลังพิมพ์"><span class="ai-avatar" aria-hidden="true">' + MH.ui.icon('i-ai') + '</span>' +
      '<div class="ai-bubble"><span class="ai-dots" role="status" aria-label="AI กำลังพิมพ์"><i></i><i></i><i></i></span></div></article>';
  }

  /* ---------- สถานะ: ปิดให้บริการ / ผู้ไม่ล็อกอิน ---------- */
  function renderDisabled() {
    root.innerHTML = '<div class="notice notice--warn" role="status"><div><b>Mahasart AI ปิดให้บริการชั่วคราว</b><br>ทีมงานปิดไว้ชั่วคราว ระหว่างนี้ยังอ่านคลังความรู้และใช้เครื่องมือดูดวงได้ตามปกติ กลับมาใหม่เมื่อเปิดให้บริการอีกครั้ง</div></div>' +
      '<div class="btn-row ai-alt"><a class="btn btn--primary" href="articles.html">เปิดคลังความรู้</a><a class="btn btn--outline" href="horoscope.html">ไปเครื่องมือดูดวง</a></div>';
  }

  function renderGuest() {
    var next = encodeURIComponent('ai.html' + location.search);
    var free = planQuota('free'), prem = planQuota('premium');
    var demoQs = ['ทักษาคืออะไร', 'ปวดหัวบ่อย ดวงไม่ดีหรือเปล่า'];
    var demo = demoQs.map(function (q) {
      var r = AI.answer({ text: q, mode: 'ask' });
      return userHtml({ content: q }) + botHtml({ content: r.content, guard: r.guard, sources: r.sources, followups: [] }, {});
    }).join('');
    root.innerHTML =
      (explain && !explain.error ? '<div class="notice" role="note"><div><b>คุณกดมาจากผลดูดวง</b><br>เข้าสู่ระบบแล้วจะกลับมาหน้านี้ และ AI จะอธิบายผลให้ทันที (นับเป็น 1 คำถามของวันนี้)</div></div>' : '') +
      '<div class="ai-guest">' +
      '<section class="card ai-join" aria-labelledby="join-h"><h2 id="join-h">ใช้ Mahasart AI ได้เมื่อเป็นสมาชิก (ฟรี)</h2>' +
        '<p>สมัครสมาชิกฟรีก็ถามได้ทันที ไม่ต้องจ่ายเงิน เราขอให้เข้าสู่ระบบก่อนเพื่อเก็บประวัติบทสนทนาไว้ให้คุณ และนับโควตาให้ถูกคน</p>' +
        '<ul class="ai-points"><li>สมาชิกทั่วไปถามได้วันละ ' + free + ' คำถาม · พรีเมียมวันละ ' + prem + ' คำถาม</li>' +
        '<li>ให้ AI อธิบายผลทักษา ราศี และเลขศาสตร์ที่ระบบคำนวณแล้วเป็นภาษาคน</li>' +
        '<li>ถามเรื่องในคลังความรู้ พร้อมลิงก์ไปอ่านบทความต้นทาง</li>' +
        '<li>AI ไม่แนะนำวัตถุมงคล ไม่ทำนายเลขหวยหรือราคาหุ้น และไม่ให้คำแนะนำทางการแพทย์ การเงิน หรือกฎหมาย</li></ul>' +
        '<div class="btn-row"><a class="btn btn--primary" href="login.html?next=' + next + '">เข้าสู่ระบบ</a>' +
        '<a class="btn btn--outline" href="register.html?next=' + next + '">สมัครสมาชิกฟรี</a></div></section>' +
      '<section class="card ai-demo" aria-labelledby="demo-h"><h2 id="demo-h">ตัวอย่างบทสนทนา</h2>' +
        '<p class="ai-demo-tag">ตัวอย่างจากตัวตอบจำลองของต้นแบบ · ดูแล้วลองถามเองได้หลังเข้าสู่ระบบ</p><div class="ai-log">' + demo + '</div></section></div>';
  }

  /* ---------- สถานะ: สมาชิก (หน้าแชตแบบแอป: รายการบทสนทนาด้านซ้าย ห้องแชตเต็มความสูงจอ) ---------- */
  var cur = { id: null }, busy = false;
  var el = {}, follow = null, drawer = null;
  var C = MH.chat;

  function convsOf() {
    return S.all('ai_conversations').filter(function (c) { return c.member_id === member.id; }).sort(function (a, b) {
      return String(b.last_message_at || b.updated_at || b.created_at).localeCompare(String(a.last_message_at || a.updated_at || a.created_at));
    });
  }
  function msgsOf(id) {
    return S.all('ai_messages').filter(function (m) { return m.conversation_id === Number(id); }).sort(function (a, b) { return a.id - b.id; });
  }
  function plain(t) { return String(t || '').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim(); }

  function buildApp() {
    var head = document.querySelector('.ai-head'); if (head) head.hidden = true;
    root.classList.add('cx-root');
    C.appMode(true);
    var I = MH.ui.icon;
    root.innerHTML =
      '<div class="cx" id="ai-shell">' +
      '<aside class="cx-side ai-side" id="ai-side" aria-label="บทสนทนาของคุณ">' +
        '<div class="ai-side-top"><span class="cx-avatar" aria-hidden="true">' + I('i-ai') + '</span>' +
          '<div class="cx-who"><b>Mahasart AI</b><span class="cx-sub">ตอบจากคลังความรู้</span></div>' +
          '<button type="button" class="icon-btn cx-narrow" id="ai-side-close" aria-label="ปิดรายการบทสนทนา">' + I('i-close') + '</button></div>' +
        '<button type="button" class="btn btn--primary ai-new" id="ai-new">' + I('i-plus') + 'แชตใหม่</button>' +
        '<div class="ai-search">' + I('i-search') + '<label class="sr-only" for="ai-q">ค้นหาบทสนทนา</label>' +
          '<input class="input" id="ai-q" type="search" placeholder="ค้นหาบทสนทนา" autocomplete="off"></div>' +
        '<nav class="ai-convs" id="ai-convs" aria-label="ประวัติบทสนทนา"></nav>' +
        '<div class="ai-quota-card" id="ai-quota-card"></div>' +
      '</aside>' +
      '<section class="cx-main" aria-labelledby="ai-title">' +
        '<header class="cx-head">' +
          '<a class="icon-btn cx-narrow" href="index.html" aria-label="กลับหน้าแรก">' + I('i-back') + '</a>' +
          '<button type="button" class="icon-btn cx-narrow" id="ai-toggle" aria-expanded="false" aria-controls="ai-side" aria-label="เปิดรายการบทสนทนา">' + I('i-menu') + '</button>' +
          '<div class="cx-who"><h1 id="ai-title">บทสนทนาใหม่</h1><span class="cx-sub" id="ai-sub">Mahasart AI</span></div>' +
          '<span class="ai-quota" id="ai-quota" role="status"></span>' +
          '<button type="button" class="icon-btn" id="ai-del" aria-label="ลบบทสนทนานี้" title="ลบบทสนทนานี้" hidden>' + I('i-trash') + '</button>' +
          '<button type="button" class="icon-btn cx-narrow" id="ai-new2" aria-label="เริ่มแชตใหม่">' + I('i-plus') + '</button>' +
        '</header>' +
        '<div class="ai-notice" id="ai-notice"></div>' +
        '<div class="cx-logwrap"><div class="cx-log" id="ai-log" role="log" aria-live="polite" aria-label="บทสนทนากับ Mahasart AI" tabindex="0"><div class="cx-col" id="ai-col"></div></div>' + C.jumpBtn() + '</div>' +
        '<div class="cx-foot" id="ai-foot"><div class="ai-block" id="ai-block" hidden></div>' +
          '<form class="cx-composer" id="ai-form" novalidate>' +
            '<label class="sr-only" for="ai-input">พิมพ์คำถามถึง Mahasart AI</label>' +
            '<textarea class="cx-input" id="ai-input" rows="1" maxlength="' + MAX + '" placeholder="ถาม Mahasart AI เช่น ทักษาคืออะไร" autocomplete="off"></textarea>' +
            '<button type="submit" class="cx-send" id="ai-send" aria-label="ส่งคำถาม">' + I('i-send') + '</button></form>' +
          '<p class="ai-err" id="ai-err" role="alert" hidden></p>' +
          '<div class="cx-under"><div class="ai-fines" id="ai-fines"><p class="ai-privacy">อย่าพิมพ์ชื่อหรือข้อมูลส่วนตัว ทีมงานเปิดอ่านเพื่อตรวจคุณภาพได้</p></div>' +
          '<span id="ai-count" aria-live="off"></span></div>' +
        '</div></section></div>';
    ['ai-shell', 'ai-side', 'ai-side-close', 'ai-convs', 'ai-new', 'ai-new2', 'ai-q', 'ai-quota-card', 'ai-toggle', 'ai-title', 'ai-sub', 'ai-quota', 'ai-del', 'ai-notice', 'ai-log', 'ai-col', 'ai-foot', 'ai-block', 'ai-form', 'ai-input', 'ai-send', 'ai-err', 'ai-count', 'ai-fines'].forEach(function (id) { el[id] = $(id); });
    el['ai-fines'].insertBefore(fineWrap, el['ai-fines'].firstChild); /* คำเตือนถาวรอยู่ใต้กล่องพิมพ์เสมอ */
    follow = C.follow(el['ai-log'], el['ai-shell'].querySelector('.cx-jump'));
    drawer = C.drawer(el['ai-shell'], el['ai-side'], [el['ai-toggle']]);
    wire();
  }

  function renderSide() {
    var q = (el['ai-q'].value || '').trim().toLowerCase();
    var list = convsOf().filter(function (c) {
      if (!q) return true;
      return String(c.title).toLowerCase().indexOf(q) >= 0 || msgsOf(c.id).some(function (m) { return String(m.content).toLowerCase().indexOf(q) >= 0; });
    });
    if (!list.length) {
      el['ai-convs'].innerHTML = '<p class="ai-side-empty">' + (q ? 'ไม่พบบทสนทนาที่มีคำว่า “' + h(q) + '”' : 'ยังไม่มีบทสนทนา เริ่มถามข้อแรกได้เลย') + '</p>';
      return;
    }
    var groups = [], by = {};
    list.forEach(function (c) {
      var g = C.ageGroup(c.last_message_at || c.created_at);
      if (!by[g]) { by[g] = []; groups.push(g); }
      by[g].push(c);
    });
    el['ai-convs'].innerHTML = groups.map(function (g) {
      return '<h2 class="ai-group">' + h(g) + '</h2><ul>' + by[g].map(function (c) {
        var ms = msgsOf(c.id), last = ms[ms.length - 1];
        var pv = last ? plain(last.content) : 'ยังไม่มีข้อความ';
        return '<li class="ai-conv"' + (c.id === cur.id ? ' aria-current="true"' : '') + '><button type="button" class="ai-conv-open" data-open="' + c.id + '"><b>' + h(c.title) + '</b>' +
          '<span>' + h(pv.length > 64 ? pv.slice(0, 64) + '…' : pv) + '</span></button>' +
          '<button type="button" class="ai-conv-del" data-del="' + c.id + '" aria-label="ลบบทสนทนา “' + h(c.title) + '”" title="ลบ">' + MH.ui.icon('i-trash') + '</button></li>';
      }).join('') + '</ul>';
    }).join('');
  }
  function renderTitle() {
    var c = cur.id ? S.find('ai_conversations', cur.id) : null;
    el['ai-title'].textContent = c ? c.title : 'บทสนทนาใหม่';
    el['ai-sub'].textContent = c ? 'Mahasart AI · เริ่ม ' + MH.util.dateShort(c.created_at) : 'Mahasart AI · ตอบจากคลังความรู้';
    el['ai-del'].hidden = !c;
  }
  function quotaNow() { return MH.q.aiQuota(member); }
  function renderQuota() {
    var q = quotaNow(), prem = MH.member.isPremium(member);
    el['ai-quota'].textContent = 'เหลือ ' + q.left + '/' + q.limit;
    el['ai-quota'].title = 'วันนี้ถามได้อีก ' + q.left + ' จาก ' + q.limit + ' คำถาม';
    el['ai-quota'].setAttribute('aria-label', el['ai-quota'].title);
    el['ai-quota'].className = 'ai-quota' + (q.left <= 0 ? ' is-out' : (q.left <= 1 && q.limit > 1 ? ' is-low' : ''));
    el['ai-quota-card'].innerHTML = '<p><b>วันนี้ถามได้อีก ' + q.left + ' ข้อ</b> จาก ' + q.limit + ' ข้อ</p>' +
      '<div class="bar" aria-hidden="true"><i></i></div>' +
      '<p class="muted">' + (prem ? 'แพ็กเกจพรีเมียม · เริ่มนับใหม่ทุกวัน' : 'สมาชิกทั่วไป · <a href="pricing.html">พรีเมียมถามได้วันละ ' + planQuota('premium') + ' ข้อ</a>') + '</p>';
    var bar = el['ai-quota-card'].querySelector('.bar i');
    bar.style.width = (q.limit ? Math.round(q.left / q.limit * 100) : 0) + '%';
    var out = q.left <= 0;
    el['ai-input'].disabled = out;
    el['ai-send'].disabled = out || busy;
    el['ai-input'].placeholder = out ? 'ใช้โควตาวันนี้ครบแล้ว' : 'ถาม Mahasart AI เช่น ทักษาคืออะไร';
    if (out) {
      el['ai-block'].hidden = false;
      el['ai-block'].innerHTML = '<div class="notice notice--warn" role="status"><div><b>ใช้ครบ ' + q.limit + ' คำถามของวันนี้แล้ว</b> โควตาเริ่มนับใหม่พรุ่งนี้ ' +
        (prem ? 'ดูรายละเอียดได้ที่ ' : 'ถ้าอยากถามมากขึ้น ดูแพ็กเกจพรีเมียม (วันละ ' + planQuota('premium') + ' คำถาม) ที่ ') +
        '<a href="pricing.html">หน้าแพ็กเกจ</a></div></div>';
    } else { el['ai-block'].hidden = true; el['ai-block'].innerHTML = ''; }
    return q;
  }
  function welcomeHtml(q) {
    return '<div class="ai-welcome"><span class="cx-avatar" aria-hidden="true">' + MH.ui.icon('i-ai') + '</span>' +
      '<h2>สวัสดีคุณ' + h(String(member.display_name).split(' ')[0]) + ' วันนี้อยากรู้เรื่องอะไร</h2>' +
      '<p>AI ตอบโดยอ้างบทความที่เผยแพร่แล้ว และอธิบายผลดูดวงที่ระบบคำนวณให้ ถ้าไม่มีข้อมูล จะบอกตรง ๆ ว่าไม่มี</p>' +
      '<div class="ai-suggest" role="group" aria-label="คำถามตัวอย่าง">' + AI.suggestions().map(function (s) {
        return '<button type="button" class="ai-sug" data-q="' + h(s) + '"' + (q.left <= 0 ? ' disabled' : '') + '>' + MH.ui.icon('i-sparkle') + '<span>' + h(s) + '</span></button>';
      }).join('') + '</div></div>';
  }
  /** ใส่ตัวคั่นวันที่ระหว่างข้อความที่อยู่คนละวัน (แบบแอปแชต) */
  function withDays(list, render) {
    var last = '';
    return list.map(function (m, i) {
      var k = m.created_at ? C.dayKey(m.created_at) : last, sep = '';
      if (m.created_at && k !== last) { sep = C.daySep(m.created_at); last = k; }
      return sep + render(m, i);
    }).join('');
  }
  function renderLog() {
    var q = quotaNow();
    var list = cur.id ? msgsOf(cur.id) : [];
    if (!list.length) { el['ai-col'].innerHTML = welcomeHtml(q); follow.sync(); return; }
    var lastBot = -1;
    list.forEach(function (m, i) { if (m.role === 'assistant') lastBot = i; });
    el['ai-col'].innerHTML = withDays(list, function (m, i) {
      return m.role === 'user' ? userHtml(m) : botHtml(m, { followups: i === lastBot, locked: q.left <= 0, actions: true });
    });
    follow.toBottom();
  }
  function refreshAll() { renderSide(); renderTitle(); renderQuota(); renderLog(); }

  function showErr(msg) {
    el['ai-err'].hidden = !msg;
    el['ai-err'].textContent = msg || '';
  }
  function showNotice(html, cls) {
    el['ai-notice'].innerHTML = html ? '<div class="notice' + (cls ? ' notice--' + cls : '') + '" role="status"><div>' + html + '</div></div>' : '';
  }

  function openConv(id) {
    cur.id = Number(id);
    showNotice('');
    refreshAll();
    try { history.replaceState(null, '', 'ai.html?c=' + cur.id); } catch (e) {}
  }
  function newConv() {
    cur.id = null;
    refreshAll();
    try { history.replaceState(null, '', 'ai.html'); } catch (e) {}
  }

  /* ---------- ส่งคำถาม ---------- */
  function ensureConv(text, o) {
    if (cur.id) return S.find('ai_conversations', cur.id);
    var c = S.insert('ai_conversations', { member_id: member.id, title: clipTitle(o.title || text), mode: o.mode === 'explain' ? 'explain' : 'ask', message_count: 0, last_message_at: null });
    cur.id = c.id;
    try { history.replaceState(null, '', 'ai.html?c=' + c.id); } catch (e) {}
    return c;
  }
  /** o = { mode, explain, title } */
  function send(raw, o) {
    o = o || {};
    if (busy) return false;
    var text = String(raw || '').trim();
    if (!text) { showErr('พิมพ์คำถามก่อนกดส่ง'); el['ai-input'].focus(); return false; }
    if (text.length > MAX) { showErr('คำถามยาวเกิน ' + MAX + ' ตัวอักษร (ตอนนี้ ' + text.length + ') ตัดให้สั้นลงแล้วส่งใหม่'); return false; }
    showErr('');
    var past = cur.id ? msgsOf(cur.id).map(function (m) { return { role: m.role, content: m.content, guard: m.guard, sources: m.sources || [] }; }) : [];
    var res = AI.answer({ text: text, mode: o.mode || 'ask', explain: o.explain, history: past });
    var q = quotaNow();
    /* คำถามที่โดน guard วิกฤตไม่นับโควตา และตอบได้เสมอ */
    if (res.guard !== 'crisis' && q.left <= 0) { renderQuota(); return false; }

    var conv = ensureConv(text, o);
    var u = S.insert('ai_messages', { conversation_id: conv.id, role: 'user', content: text, guard: null, sources: [] });
    var a = S.insert('ai_messages', { conversation_id: conv.id, role: 'assistant', content: res.content, guard: res.guard, sources: res.sources, followups: res.followups });
    if (res.guard !== 'crisis') MH.q.useAiQuota(member.id);
    S.update('ai_conversations', conv.id, { message_count: msgsOf(conv.id).length, last_message_at: a.created_at });

    /* วาดข้อความผู้ใช้ทันที แล้วแสดงจุด … ก่อนตอบ */
    var col = el['ai-col'];
    if (col.querySelector('.ai-welcome')) col.innerHTML = '';
    col.querySelectorAll('.ai-fu').forEach(function (n) { n.remove(); });
    var needDay = !col.querySelector('.cx-day[data-day="' + C.dayKey(u.created_at) + '"]');
    col.insertAdjacentHTML('beforeend', (needDay ? C.daySep(u.created_at) : '') + userHtml(u, true) + typingHtml());
    follow.toBottom();
    el['ai-input'].value = ''; C.autosize(el['ai-input']); updateCount();
    busy = true; renderQuota(); renderSide(); renderTitle();
    var id = conv.id;
    setTimeout(function () {
      busy = false;
      var qn = renderQuota();
      if (cur.id !== id) return; /* ผู้ใช้เปิดบทสนทนาอื่นระหว่างรอ — ข้อความบันทึกไว้แล้ว */
      var wasNear = follow.near();
      var t = col.querySelector('.ai-typing');
      var html = botHtml(a, { followups: true, locked: qn.left <= 0, actions: true, fresh: true });
      if (t) t.outerHTML = html; else col.insertAdjacentHTML('beforeend', html);
      /* คำตอบยาว: เลื่อนให้เห็นต้นคำตอบก่อน ไม่ใช่ท้ายคำตอบ */
      var bots = col.querySelectorAll('.ai-msg--bot'), last = bots[bots.length - 1];
      if (wasNear && last && last.offsetHeight > el['ai-log'].clientHeight * 0.6) {
        el['ai-log'].scrollTop += last.getBoundingClientRect().top - el['ai-log'].getBoundingClientRect().top - 8;
        follow.sync();
      } else follow.arrived(wasNear);
      renderSide();
      if (!el['ai-input'].disabled && !C.touch) el['ai-input'].focus({ preventScroll: true });
    }, TYPING_MS);
    return true;
  }

  function deleteConv(id) {
    var c = S.find('ai_conversations', id); if (!c) return;
    MH.ui.confirm({ title: 'ลบบทสนทนานี้?', body: '“' + c.title + '” และข้อความทั้งหมดในบทสนทนานี้จะถูกลบ ทีมงานจะไม่เห็นอีก · โควตาที่ใช้ไปแล้ววันนี้ไม่คืน', okLabel: 'ลบบทสนทนา', danger: true }).then(function (ok) {
      if (!ok) return;
      msgsOf(id).forEach(function (m) { S.remove('ai_messages', m.id); });
      S.remove('ai_conversations', id);
      MH.ui.toast('ลบบทสนทนาแล้ว');
      if (cur.id === Number(id)) newConv(); else refreshAll();
      el['ai-new'].focus({ preventScroll: true });
    });
  }

  /* ---------- กล่องพิมพ์ ---------- */
  function updateCount() {
    var n = el['ai-input'].value.length, near = n >= MAX - 100;
    el['ai-count'].textContent = near ? n + '/' + MAX + ' ตัวอักษร' : C.keyHint();
    el['ai-count'].className = near ? 'is-near' : '';
  }

  function startNew() {
    newConv(); drawer.close();
    if (!el['ai-input'].disabled) el['ai-input'].focus({ preventScroll: true });
  }
  function wire() {
    el['ai-form'].addEventListener('submit', function (e) { e.preventDefault(); send(el['ai-input'].value); });
    el['ai-input'].addEventListener('keydown', function (e) {
      if (C.enterSends(e)) { e.preventDefault(); send(el['ai-input'].value); }
    });
    el['ai-input'].addEventListener('input', function () { C.autosize(el['ai-input']); updateCount(); if (el['ai-err'].textContent) showErr(''); });
    el['ai-new'].addEventListener('click', startNew);
    el['ai-new2'].addEventListener('click', startNew);
    el['ai-side-close'].addEventListener('click', function () { drawer.close(); el['ai-toggle'].focus(); });
    el['ai-q'].addEventListener('input', renderSide);
    el['ai-del'].addEventListener('click', function () { if (cur.id) deleteConv(cur.id); });
    el['ai-convs'].addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
      if (o) { openConv(o.getAttribute('data-open')); drawer.close(); }
      else if (d) deleteConv(Number(d.getAttribute('data-del')));
    });
    el['ai-log'].addEventListener('click', function (e) {
      var cp = e.target.closest('[data-copy]');
      if (cp) { var m = S.find('ai_messages', cp.getAttribute('data-copy')); if (m) C.copy(String(m.content).replace(/[#*_`]/g, '').trim()); return; }
      var b = e.target.closest('[data-q]'); if (!b || b.disabled) return;
      send(b.getAttribute('data-q'));
    });
    updateCount();
  }

  function startApp() {
    buildApp();
    var cid = MH.util.param('c');
    if (cid) {
      var c = S.find('ai_conversations', cid);
      if (c && !c.deleted_at && c.member_id === member.id) { openConv(c.id); return; }
      newConv();
      showNotice('ไม่พบบทสนทนานี้ อาจถูกลบไปแล้ว หรือไม่ใช่ของบัญชีนี้ · เริ่มบทสนทนาใหม่ได้เลย', 'warn');
      return;
    }
    newConv();
    if (explain) {
      if (explain.error) { showNotice('ลิงก์อธิบายผลนี้ใช้ไม่ได้ (' + h(explain.error) + ') ลองกลับไปที่เครื่องมือแล้วกด “ให้ AI อธิบายผลนี้” อีกครั้ง หรือพิมพ์ถามได้เลย', 'warn'); return; }
      if (quotaNow().left <= 0) { showNotice('ใช้โควตาวันนี้ครบแล้ว จึงยังไม่ได้ให้ AI อธิบายผลนี้ เปิดลิงก์เดิมอีกครั้งพรุ่งนี้ หรือดูแพ็กเกจที่ <a href="pricing.html">หน้าแพ็กเกจ</a>', 'warn'); return; }
      send(AI.explainQuestion(explain), { mode: 'explain', explain: explain, title: AI.explainTitle(explain) });
    } else {
      el['ai-input'].focus({ preventScroll: true });
    }
  }

  if (!enabled) { renderDisabled(); return; }
  if (!member) { renderGuest(); return; }
  startApp();
})();
