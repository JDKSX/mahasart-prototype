/* ห้องปรึกษา: ?booking=<id>
   เข้าได้เฉพาะสมาชิกเจ้าของนัด หรือทีมงานที่เป็นผู้เชี่ยวชาญของนัดนั้น
   ก่อนเวลานัด 10 นาที = นับถอยหลัง (ต้นแบบมีปุ่มจำลองว่าถึงเวลาแล้ว) · ในห้อง: แชต หรือกล่องจำลองวิดีโอ/โทรศัพท์
   ผู้เชี่ยวชาญกด "จบการปรึกษา" → completed · หลังจบ สมาชิกรีวิวได้ครั้งเดียวต่อนัด */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store;
  var root = document.getElementById('ss-root');
  var C = MH.chat, follow = null, drawer = null;
  function leaveApp() { C.appMode(false); root.classList.remove('cx-root'); }
  function initial(name) { return String(name || '').replace(/^(อาจารย์|ครู|ดร\.|หมอ)\s*/, '').charAt(0) || '✦'; }
  var OPEN_BEFORE_MIN = 10, SIMKEY = 'mahasart-session-sim';
  var timers = [], inCall = false, callStart = 0, replyPending = false;

  function pad(n) { return ('0' + n).slice(-2); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function crumbs(items) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span aria-hidden="true">›</span>' : '') + (it[0] && !last ? '<a href="' + it[0] + '">' + h(it[1]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + h(it[1]) + '</span>');
    }).join('') + '</nav>';
  }
  function stars(n) {
    var out = '';
    for (var i = 1; i <= 5; i++) out += '<i' + (i <= n ? ' class="on"' : '') + '>★</i>';
    return '<span class="stars" role="img" aria-label="' + n + ' ดาวจาก 5">' + out + '</span>';
  }
  function clearTimers() { timers.forEach(clearInterval); timers = []; }
  function simGet(id) { try { return !!(JSON.parse(localStorage.getItem(SIMKEY)) || {})[id]; } catch (e) { return false; } }
  function simSet(id) { try { var m = JSON.parse(localStorage.getItem(SIMKEY)) || {}; m[id] = 1; localStorage.setItem(SIMKEY, JSON.stringify(m)); } catch (e) {} }

  function state(title, text, btns, mark) {
    clearTimers(); leaveApp();
    document.title = title + ' · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['experts.html', 'ผู้เชี่ยวชาญ'], [null, 'ห้องปรึกษา']]) + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">' + (mark || '?') + '</p><h1>' + h(title) + '</h1><p>' + h(text) + '</p><div class="btn-row">' + (btns || '') + '</div></div>';
  }

  /* ---------- ตรวจสิทธิ์ ---------- */
  var id = MH.util.param('booking');
  var b = id ? S.find('expert_bookings', id) : null;
  if (b && b.deleted_at) b = null;
  if (!b) { state('ไม่พบนัดนี้', 'ลิงก์อาจพิมพ์ผิด ดูนัดของคุณได้ที่หน้าบัญชี', '<a class="btn btn--primary" href="account.html?tab=bookings">ไปที่นัดของฉัน</a><a class="btn btn--outline" href="experts.html">ดูผู้เชี่ยวชาญ</a>'); return; }

  var expert = S.find('experts', b.expert_id), mem = S.find('members', b.member_id);
  var member = MH.member.current(), staff = MH.auth.user(), role = null;
  if (member && b.member_id === member.id) role = 'member';
  else if (staff && expert && expert.user_id === staff.id) role = 'expert';
  if (!role) {
    if (!member && !staff) state('เข้าสู่ระบบก่อนเข้าห้อง', 'ห้องปรึกษาเปิดให้เฉพาะสมาชิกที่จองนัดนี้ เข้าสู่ระบบแล้วจะพากลับมาที่หน้านี้', '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบ</a>', '✦');
    else state('คุณไม่มีสิทธิ์เข้าห้องนี้', 'ห้องนี้เปิดให้เฉพาะสมาชิกที่จองนัด และผู้เชี่ยวชาญเจ้าของนัดเท่านั้น', '<a class="btn btn--primary" href="index.html">กลับหน้าแรก</a>', '⚿');
    return;
  }
  var backUrl = role === 'member' ? 'account.html?tab=bookings' : 'admin/bookings.html';
  var backLabel = role === 'member' ? 'กลับไปนัดของฉัน' : 'กลับไปรายการนัด';
  var expertName = expert ? expert.display_name : 'ผู้เชี่ยวชาญ';
  var memberName = mem ? mem.display_name : 'สมาชิก';

  /* ---------- ส่วนประกอบ ---------- */
  var otherName = role === 'member' ? expertName : memberName;
  var QUICK = role === 'member'
    ? ['สวัสดีครับ/ค่ะ', 'ขอเล่ารายละเอียดเพิ่มเติมนะครับ/คะ', 'ขอบคุณมากครับ/ค่ะ']
    : ['สวัสดีครับ ยินดีให้คำปรึกษาครับ', 'เล่าเรื่องที่อยากปรึกษาได้เลยครับ', 'ขอบคุณที่ใช้บริการครับ'];
  function fresh() { b = S.find('expert_bookings', b.id) || b; }
  function messages() {
    return S.all('expert_messages').filter(function (m) { return m.booking_id === b.id; })
      .sort(function (x, y) { return String(x.created_at).localeCompare(String(y.created_at)) || x.id - y.id; });
  }
  function typeLine() { return (MH.labels.sessionType[b.session_type] || b.session_type) + ' · ' + b.minutes + ' นาที'; }
  function statusTag() {
    var map = { confirmed: 'st--info', completed: 'st--ok', cancelled: 'st--bad', no_show: 'st--bad', pending_payment: 'st--warn' };
    return '<span class="st ' + (map[b.status] || '') + '">' + h(MH.labels.bookingStatus[b.status] || b.status) + '</span>';
  }
  function head(extraTag) {
    return '<section class="card rm-head" aria-labelledby="rm-h"><div><h1 id="rm-h">ห้องปรึกษา ' + h(b.booking_no) + '</h1><p>' +
      (role === 'member' ? 'กับ ' + h(expertName) : 'ผู้ขอรับคำปรึกษา: ' + h(memberName)) + '</p><p>' + (extraTag || statusTag()) + '</p></div>' +
      '<dl class="rm-meta"><dt>วัน-เวลานัด</dt><dd>' + h(MH.util.dateLong(b.start_at, true)) + ' เวลา ' + hm(b.start_at) + ' น.</dd>' +
      '<dt>ช่องทาง</dt><dd>' + h(typeLine()) + '</dd><dt>เรื่องที่ปรึกษา</dt><dd>' + h(b.topic || '-') + '</dd></dl></section>';
  }
  function shell(inner) {
    leaveApp();
    document.title = 'ห้องปรึกษา ' + b.booking_no + ' · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['experts.html', 'ผู้เชี่ยวชาญ'], [null, 'ห้องปรึกษา']]) + '</div>' + inner +
      '<p class="disclaimer">' + h(S.setting('disclaimer') || '') + '</p>';
  }

  /* ---------- ห้องแบบแอปแชต: หัวห้อง (ชื่อคู่สนทนา + เวลาที่เหลือ) · ข้อความ · กล่องพิมพ์ · แผงรายละเอียดด้านขวา ---------- */
  function endAt() { return new Date(new Date(b.start_at).getTime() + b.minutes * 60000); }
  function subLine(done) {
    if (done) return 'การปรึกษาจบแล้ว · ' + h(typeLine());
    var now = Date.now(), start = new Date(b.start_at).getTime();
    if (now < start) return '<span class="live-dot"></span>ห้องเปิดแล้ว · เริ่มนัด ' + hm(b.start_at) + ' น.';
    var left = Math.ceil((endAt() - now) / 60000);
    if (left > 0) return '<span class="live-dot"></span>กำลังปรึกษา · เหลือ ' + (left >= 60 ? Math.floor(left / 60) + ' ชม. ' + (left % 60) + ' นาที' : left + ' นาที');
    return '<span class="live-dot"></span>เลยเวลานัดแล้ว · ' + (role === 'expert' ? 'กดจบการปรึกษาเมื่อเสร็จ' : 'รอผู้เชี่ยวชาญจบการปรึกษา');
  }
  function metaCard() {
    return '<section class="card"><h2>รายละเอียดนัด</h2><dl class="rm-meta"><dt>เลขนัด</dt><dd>' + h(b.booking_no) + '</dd>' +
      '<dt>' + (role === 'member' ? 'ผู้เชี่ยวชาญ' : 'สมาชิก') + '</dt><dd>' + h(otherName) + '</dd>' +
      '<dt>วัน-เวลา</dt><dd>' + h(MH.util.dateLong(b.start_at, true)) + ' ' + hm(b.start_at) + '–' + hm(endAt()) + ' น.</dd>' +
      '<dt>ช่องทาง</dt><dd>' + h(typeLine()) + '</dd><dt>เรื่อง</dt><dd>' + h(b.topic || '-') + '</dd><dt>สถานะ</dt><dd>' + statusTag() + '</dd></dl></section>';
  }
  function noteCard() {
    return '<section class="card"><h2>ข้อควรรู้</h2><p>คำปรึกษาเป็นไปตามความเชื่อ ไม่รับประกันผล ไม่ใช่คำวินิจฉัยทางการแพทย์ กฎหมาย หรือการเงิน</p>' +
      '<p>ข้อความในห้องเห็นเฉพาะคุณกับ' + (role === 'member' ? 'ผู้เชี่ยวชาญ' : 'สมาชิก') + ' อย่าส่งรหัสผ่าน เลขบัญชี หรือเลขบัตรประชาชนในแชต</p></section>';
  }
  function appShell(main, side, done) {
    clearTimers();
    document.title = 'ห้องปรึกษา ' + b.booking_no + ' · MAHASART';
    root.classList.add('cx-root'); C.appMode(true);
    var I = MH.ui.icon;
    root.innerHTML = '<div class="cx cx--room" id="rm-shell">' +
      '<section class="cx-main" aria-labelledby="rm-h">' +
        '<header class="cx-head"><a class="icon-btn" href="' + h(backUrl) + '" aria-label="' + h(backLabel) + '" title="' + h(backLabel) + '">' + I('i-back') + '</a>' +
          '<span class="cx-avatar' + (role === 'member' ? ' cx-avatar--gold' : '') + '" aria-hidden="true">' + h(initial(otherName)) + '</span>' +
          '<div class="cx-who"><h1 id="rm-h">' + h(otherName) + '</h1><span class="cx-sub" id="rm-sub">' + subLine(done) + '</span></div>' +
          (role === 'expert' && !done ? '<button type="button" class="btn btn--primary btn--sm cx-wide" data-act="finish">จบการปรึกษา</button>' : '') +
          '<button type="button" class="icon-btn cx-narrow" id="rm-info" aria-expanded="false" aria-controls="rm-side" aria-label="รายละเอียดนัด">' + I('i-info') + '</button>' +
        '</header>' + main + '</section>' +
      '<aside class="cx-side" id="rm-side" aria-label="รายละเอียดนัด">' +
        '<div class="rm-side-top"><b>ห้องปรึกษา ' + h(b.booking_no) + '</b><button type="button" class="icon-btn" id="rm-side-close" aria-label="ปิดรายละเอียด">' + I('i-close') + '</button></div>' +
        side + '</aside></div>';
    var shellEl = document.getElementById('rm-shell');
    drawer = C.drawer(shellEl, document.getElementById('rm-side'), [document.getElementById('rm-info')]);
    document.getElementById('rm-side-close').addEventListener('click', function () { drawer.close(); });
    var jump = shellEl.querySelector('.cx-jump'), log = document.getElementById('rm-log');
    follow = jump && log ? C.follow(log, jump) : null;
    if (!done) timers.push(setInterval(function () { var el = document.getElementById('rm-sub'); if (el) el.innerHTML = subLine(false); }, 30000));
  }

  /** ฟองข้อความ: รวมกลุ่มข้อความติดกันของคนเดียวกัน (ห่างไม่เกิน 5 นาที) · ตัวคั่นวัน · "อ่านแล้ว" เมื่ออีกฝั่งตอบหลังจากนั้น */
  function bubblesHtml(list) {
    var html = '', lastDay = '', prev = null, lastOther = -1;
    list.forEach(function (m, i) { if (m.sender !== role) lastOther = i; });
    list.forEach(function (m, i) {
      var k = C.dayKey(m.created_at);
      if (k !== lastDay) { html += C.daySep(m.created_at); lastDay = k; prev = null; }
      var me = m.sender === role, name = m.sender === 'expert' ? expertName : memberName;
      var first = !prev || prev.sender !== m.sender || (new Date(m.created_at) - new Date(prev.created_at)) > 300000;
      var status = me ? (i < lastOther ? '<span class="read">อ่านแล้ว</span>' : '<span>ส่งแล้ว</span>') : '';
      html += '<div class="cx-msg' + (me ? ' cx-msg--me' : '') + (first ? ' is-first' : '') + '">' +
        (me ? '' : '<span class="cx-avatar cx-av' + (m.sender === 'expert' ? ' cx-avatar--gold' : '') + '" aria-hidden="true">' + h(initial(name)) + '</span>') +
        '<div class="cx-stack">' + (!me && first ? '<span class="cx-name" aria-hidden="true">' + h(name) + '</span>' : '') +
        '<div class="cx-line"><div class="cx-bubble"><span class="sr-only">' + h(me ? 'คุณ' : name) + ': </span>' + h(m.content) + '</div>' +
        '<span class="cx-meta">' + status + '<time datetime="' + h(m.created_at) + '">' + hm(m.created_at) + '</time></span></div>' +
        (m.simulated ? '<span class="cx-sim">ข้อความตอบกลับจำลองของต้นแบบ ระบบจริงเป็นข้อความจากผู้เชี่ยวชาญ</span>' : '') +
        '</div></div>';
      prev = m;
    });
    return html;
  }
  function emptyHtml(readOnly) {
    return '<div class="cx-empty"><span class="cx-avatar' + (role === 'member' ? ' cx-avatar--gold' : '') + '" aria-hidden="true">' + h(initial(otherName)) + '</span>' +
      '<h2>' + (readOnly ? 'ไม่มีข้อความในห้องนี้' : 'เริ่มทักทาย' + h(otherName) + 'ได้เลย') + '</h2>' +
      '<p>' + (readOnly ? 'นัดนี้คุยผ่าน' + h(MH.labels.sessionType[b.session_type] || '') + 'ตามเวลานัด จึงไม่มีบันทึกข้อความ'
        : (role === 'member' ? 'เล่าเรื่องที่อยากปรึกษาได้เลย' : 'ทักทายสมาชิกแล้วเริ่มให้คำปรึกษาได้เลย') + ' ข้อความเก็บไว้ให้ดูย้อนหลังได้หลังจบนัด') + '</p></div>';
  }
  function typingRow() {
    var n = role === 'member' ? expertName : memberName;
    return '<div class="cx-msg is-first cx-typing" id="rm-typing"><span class="cx-avatar cx-av' + (role === 'member' ? ' cx-avatar--gold' : '') + '" aria-hidden="true">' + h(initial(n)) + '</span>' +
      '<div class="cx-stack"><div class="cx-bubble"><span class="cx-dots" role="status" aria-label="' + h(n) + ' กำลังพิมพ์"><i></i><i></i><i></i></span></div></div></div>';
  }
  function paintLog(readOnly) {
    var col = document.getElementById('rm-col'); if (!col) return;
    var list = messages(), wasNear = follow ? follow.near() : true;
    col.innerHTML = list.length ? bubblesHtml(list) : emptyHtml(readOnly);
    if (replyPending) col.insertAdjacentHTML('beforeend', typingRow());
    var quick = document.getElementById('rm-quick');
    if (quick) quick.hidden = list.some(function (m) { return m.sender === role; });
    return wasNear;
  }
  function logArea() {
    return '<div class="cx-logwrap"><div class="cx-log" id="rm-log" role="log" aria-live="polite" aria-label="ข้อความในห้อง" tabindex="0"><div class="cx-col" id="rm-col"></div></div>' + C.jumpBtn() + '</div>';
  }
  function composer() {
    return '<div class="cx-foot"><div class="cx-quick" id="rm-quick" role="group" aria-label="ข้อความด่วน">' + QUICK.map(function (q) {
        return '<button type="button" class="chip" data-quick="' + h(q) + '">' + h(q) + '</button>';
      }).join('') + '</div>' +
      '<form class="cx-composer" id="chat-form" novalidate><label class="sr-only" for="chat-text">พิมพ์ข้อความถึง ' + h(otherName) + '</label>' +
      '<textarea class="cx-input" id="chat-text" rows="1" maxlength="500" autocomplete="off" placeholder="พิมพ์ข้อความถึง ' + h(otherName) + '"></textarea>' +
      '<button type="submit" class="cx-send" aria-label="ส่งข้อความ">' + MH.ui.icon('i-send') + '</button></form>' +
      '<div class="cx-under"><p>อย่าส่งรหัสผ่าน เลขบัญชี หรือเลขบัตรประชาชนในแชต</p><span>' + h(C.keyHint()) + '</span></div></div>';
  }

  function callBox() { return '<div class="rm-stage"><div class="vid" id="vid"></div></div>'; }
  function paintCall() {
    var el = document.getElementById('vid'); if (!el) return;
    var phone = b.session_type === 'phone';
    var ph = String((mem && mem.phone) || '').replace(/\D/g, '');
    if (!inCall) {
      el.innerHTML = '<b>' + (phone ? 'ห้องโทรศัพท์ (จำลอง)' : 'ห้องวิดีโอคอล (จำลอง)') + '</b>' +
        '<p>' + (phone
          ? (role === 'member' ? 'ระบบจริงจะให้ผู้เชี่ยวชาญโทรหาเบอร์ในบัญชีของคุณ' + (ph ? ' (ลงท้าย ' + h(ph.slice(-4)) + ')' : ' ซึ่งต้องกรอกเบอร์ในหน้าบัญชีก่อน') + ' ต้นแบบนี้เป็นเพียงกล่องจำลอง' : 'ระบบจริงจะแสดงเบอร์ติดต่อสมาชิกให้เฉพาะช่วงนัดนี้ ต้นแบบนี้เป็นเพียงกล่องจำลอง')
          : 'ระบบจริงจะเปิดวิดีโอคอลในเบราว์เซอร์ ไม่ต้องติดตั้งแอป ต้นแบบนี้เป็นเพียงกล่องจำลอง ไม่ได้เปิดกล้องหรือไมค์ของคุณ') + '</p>' +
        '<button type="button" class="btn btn--gold" data-act="join">' + (phone ? 'เริ่มโทร (จำลอง)' : 'เข้าร่วมห้อง (จำลอง)') + '</button>';
    } else {
      el.innerHTML = '<b>' + (phone ? 'กำลังสนทนาทางโทรศัพท์ (จำลอง)' : 'กำลังคุยในห้องวิดีโอ (จำลอง)') + '</b><div class="vid-live" id="call-clock" role="timer">00:00</div>' +
        '<p>ไม่มีการเปิดกล้องหรือไมค์จริง นี่คือภาพจำลองให้เห็นขั้นตอน</p><button type="button" class="btn btn--outline" data-act="leave">ออกจากห้อง</button>';
    }
  }

  /* ---------- มุมมองต่าง ๆ ---------- */
  function viewPending() {
    var pay = MH.pay.forPayable('booking', b.id).filter(function (p) { return p.status === 'pending'; })[0];
    state('นัดนี้ยังไม่ได้ชำระเงิน', role === 'member' ? 'ชำระเงินผ่าน PromptPay ให้เสร็จก่อน ห้องจึงจะเปิดตามเวลานัด' : 'นัดนี้ยังรอสมาชิกชำระเงิน ห้องจะเปิดเมื่อชำระแล้วและถึงเวลา',
      (role === 'member' && pay ? '<a class="btn btn--primary" href="' + h(MH.pay.url(pay)) + '">ไปชำระเงิน</a>' : '') + '<a class="btn btn--outline" href="' + h(backUrl) + '">' + h(backLabel) + '</a>', '⌛');
  }
  function viewClosed() {
    var why = b.status === 'cancelled' ? 'นัดนี้ถูกยกเลิก' + (b.cancelled_reason ? ' (' + b.cancelled_reason + ')' : '') : 'นัดนี้ถูกทำเครื่องหมายว่าไม่มาตามนัด';
    state(b.status === 'cancelled' ? 'นัดนี้ถูกยกเลิกแล้ว' : 'นัดนี้ไม่มาตามนัด', why + ' จึงไม่เปิดห้อง', '<a class="btn btn--primary" href="' + h(backUrl) + '">' + h(backLabel) + '</a>', '✕');
  }

  function viewCountdown() {
    clearTimers();
    var opensAt = new Date(new Date(b.start_at).getTime() - OPEN_BEFORE_MIN * 60000);
    shell(head() + '<div class="cd" role="timer" aria-label="นับถอยหลังถึงเวลาเปิดห้อง"><p>ห้องจะเปิดก่อนเวลานัด ' + OPEN_BEFORE_MIN + ' นาที (เวลา ' + hm(opensAt) + ' น.)</p>' +
      '<p>ห้องจะเปิดในอีก</p><div class="cd-time" id="cd-time">--:--:--</div>' +
      '<div class="btn-row"><button type="button" class="btn btn--gold" data-act="sim">จำลองว่าถึงเวลาแล้ว</button><a class="btn btn--outline" href="' + h(backUrl) + '">' + h(backLabel) + '</a></div>' +
      '<p class="ex-note">ปุ่ม "จำลองว่าถึงเวลาแล้ว" มีเฉพาะในต้นแบบ ระบบจริงห้องจะเปิดเองตามเวลา</p></div>');
    var el = document.getElementById('cd-time');
    function tick() {
      var ms = opensAt - new Date();
      if (ms <= 0) { render(); return; }
      var s = Math.floor(ms / 1000), d = Math.floor(s / 86400); s -= d * 86400;
      el.textContent = (d ? d + ' วัน ' : '') + pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
    }
    tick(); timers.push(setInterval(tick, 1000));
  }

  function viewRoom() {
    var isChat = b.session_type === 'chat';
    var side = metaCard() +
      '<section class="card"><h2>เวลาและขั้นตอน</h2><p>นัดเริ่ม ' + hm(b.start_at) + ' น. ความยาว ' + b.minutes + ' นาที</p>' +
        (role === 'expert'
          ? '<p>เมื่อให้คำปรึกษาเสร็จ กด "จบการปรึกษา" นัดจะเปลี่ยนเป็นเสร็จสิ้นและสมาชิกจะเขียนรีวิวได้</p><button type="button" class="btn btn--primary" data-act="finish">จบการปรึกษา</button>'
          : '<p>ผู้เชี่ยวชาญจะเป็นผู้กด "จบการปรึกษา" เมื่อเสร็จ จากนั้นคุณเขียนรีวิวได้ที่ห้องนี้</p><a class="btn btn--outline" href="' + h(backUrl) + '">' + h(backLabel) + '</a>') + '</section>' +
      noteCard();
    appShell(isChat ? logArea() + composer() : callBox(), side, false);
    if (isChat) {
      paintLog(false); if (follow) follow.toBottom();
      var t = document.getElementById('chat-text'); if (t && !C.touch) t.focus({ preventScroll: true });
    } else paintCall();
  }

  function reviewOf() { return S.all('expert_reviews').filter(function (r) { return r.booking_id === b.id; })[0] || null; }
  function viewDone() {
    var rv = reviewOf(), side = '', list = messages();
    if (role === 'member') {
      if (rv) {
        side += '<section class="card" id="review"><h2>รีวิวของคุณ</h2><p>' + stars(rv.rating) + '</p><p>' + (rv.comment ? h(rv.comment) : 'ให้คะแนนอย่างเดียว') + '</p>' +
          (rv.status === 'hidden' ? '<p class="st st--warn">ทีมงานซ่อนรีวิวนี้จากหน้าสาธารณะ</p>' : '<p class="st st--ok">แสดงบนโปรไฟล์ผู้เชี่ยวชาญแล้ว</p>') +
          (expert ? '<p><a href="expert.html?slug=' + encodeURIComponent(expert.slug) + '">ดูโปรไฟล์ผู้เชี่ยวชาญ</a></p>' : '') + '</section>';
      } else {
        side += '<form class="card" id="rv-form" novalidate><h2 id="review">ให้คะแนนการปรึกษา</h2>' +
          '<fieldset class="fs"><legend>คะแนน (บังคับ)</legend><div class="star-pick" id="rv-stars">' + [1, 2, 3, 4, 5].map(function (n) {
            return '<label><input type="radio" name="rv-rate" value="' + n + '"><span aria-hidden="true">★</span><span class="sr-only">' + n + ' ดาว</span></label>';
          }).join('') + '</div></fieldset>' +
          '<div class="field"><label for="rv-text">ความเห็น (ไม่บังคับ)</label><textarea class="textarea" id="rv-text" rows="4" maxlength="500" placeholder="เล่าให้คนอื่นรู้ว่าการปรึกษาเป็นอย่างไร"></textarea><span class="hint">รีวิวเขียนได้ครั้งเดียวต่อนัด แก้ไขไม่ได้ภายหลัง</span></div>' +
          '<div class="btn-row"><button type="submit" class="btn btn--primary">ส่งรีวิว</button></div></form>';
      }
    } else {
      side += '<section class="card"><h2>รีวิวจากสมาชิก</h2>' + (rv ? '<p>' + stars(rv.rating) + '</p><p>' + (rv.comment ? h(rv.comment) : 'ให้คะแนนอย่างเดียว') + '</p>' + (rv.status === 'hidden' ? '<p class="st st--warn">ทีมงานซ่อนรีวิวนี้แล้ว</p>' : '') : '<p>สมาชิกยังไม่ได้เขียนรีวิว</p>') + '</section>';
    }
    side += metaCard() + noteCard();
    var needReview = role === 'member' && !rv;
    var foot = '<div class="cx-foot"><div class="cx-ended" role="status"><span>' + MH.ui.icon('i-check') + ' การปรึกษานี้จบแล้ว' + (b.completed_at ? ' เมื่อ ' + h(MH.util.dateTime(b.completed_at)) + ' น.' : '') + ' · ข้อความอ่านได้อย่างเดียว</span>' +
      (needReview ? '<button type="button" class="btn btn--gold btn--sm rm-rate-btn" data-act="rate">ให้คะแนน</button>' : '') + '</div></div>';
    appShell(logArea() + foot, side, true);
    paintLog(true); if (follow) follow.toBottom();
    if (!list.length) { var col = document.getElementById('rm-col'); if (col) col.innerHTML = emptyHtml(true); }
  }

  function render() {
    clearTimers();
    fresh();
    if (b.status === 'pending_payment') return viewPending();
    if (b.status === 'cancelled' || b.status === 'no_show') return viewClosed();
    if (b.status === 'completed') return viewDone();
    var opened = simGet(b.id) || !b.start_at || (new Date(b.start_at).getTime() - OPEN_BEFORE_MIN * 60000) <= Date.now();
    if (opened) viewRoom(); else viewCountdown();
  }

  /* ---------- เหตุการณ์ (ผูกครั้งเดียวที่ root) ---------- */
  root.addEventListener('click', function (e) {
    var qk = e.target.closest('[data-quick]');
    if (qk) { sendChat(qk.getAttribute('data-quick')); return; }
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.getAttribute('data-act');
    if (act === 'rate') { if (drawer) drawer.open(); var r = document.querySelector('input[name="rv-rate"]'); if (r) r.focus(); return; }
    if (act === 'sim') { simSet(b.id); MH.ui.toast('จำลองว่าถึงเวลาแล้ว ห้องเปิดแล้ว'); render(); }
    else if (act === 'join') {
      inCall = true; callStart = Date.now(); paintCall();
      timers.push(setInterval(function () { var c = document.getElementById('call-clock'); if (!c) return; var s = Math.floor((Date.now() - callStart) / 1000); c.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60); }, 1000));
    }
    else if (act === 'leave') { inCall = false; clearTimers(); paintCall(); MH.ui.toast('ออกจากห้องจำลองแล้ว เข้าร่วมใหม่ได้ตลอดจนกว่าผู้เชี่ยวชาญจะจบการปรึกษา'); }
    else if (act === 'finish') {
      MH.ui.confirm({ title: 'จบการปรึกษานี้', body: 'ยืนยันว่าการปรึกษากับ ' + memberName + ' เสร็จแล้ว? นัดจะเปลี่ยนเป็น "ปรึกษาเสร็จแล้ว" นับเป็นรายได้ และสมาชิกจะเขียนรีวิวได้', okLabel: 'จบการปรึกษา' }).then(function (ok) {
        if (!ok) return;
        fresh();
        if (b.status !== 'confirmed') { MH.ui.toast('นัดนี้ไม่ได้อยู่ในสถานะที่จบได้แล้ว'); render(); return; }
        S.update('expert_bookings', b.id, { status: 'completed', completed_at: new Date().toISOString() }, 'complete');
        inCall = false; MH.ui.toast('จบการปรึกษาแล้ว'); render();
      });
    }
  });

  function sendChat(raw) {
    var text = String(raw || '').trim(); if (!text) return;
    fresh(); if (b.status !== 'confirmed') { render(); return; }
    S.insert('expert_messages', { booking_id: b.id, sender: role, content: text.slice(0, 500), created_at: new Date().toISOString() });
    var inp = document.getElementById('chat-text');
    if (inp) { inp.value = ''; C.autosize(inp); if (!C.touch) inp.focus(); }
    paintLog(false); if (follow) follow.toBottom();
    /* ตอบกลับจำลองจากผู้เชี่ยวชาญ 1 ข้อความ (เฉพาะเมื่อสมาชิกส่งและยังไม่มีข้อความจากผู้เชี่ยวชาญ) */
    if (role === 'member' && !replyPending && !messages().some(function (m) { return m.sender === 'expert'; })) {
      replyPending = true;
      setTimeout(function () { var near = paintLog(false); if (follow) follow.arrived(near); }, 500);
      setTimeout(function () {
        replyPending = false;
        S.insert('expert_messages', { booking_id: b.id, sender: 'expert', simulated: true, created_at: new Date().toISOString(),
          content: 'ได้รับเรื่องที่คุณเล่าแล้ว ขอเวลาอ่านรายละเอียดสักครู่ แล้วจะอธิบายเป็นข้อ ๆ ให้เข้าใจง่าย' });
        var near = paintLog(false); if (follow) follow.arrived(near);
      }, 1900);
    }
  }
  root.addEventListener('keydown', function (e) {
    if (e.target.id === 'chat-text' && C.enterSends(e)) { e.preventDefault(); sendChat(e.target.value); }
  });
  root.addEventListener('input', function (e) { if (e.target.id === 'chat-text') C.autosize(e.target, 160); });

  root.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'chat-form') {
      e.preventDefault();
      var inp = document.getElementById('chat-text');
      if (!inp.value.trim()) { inp.focus(); return; }
      sendChat(inp.value);
    }
    if (f.id === 'rv-form') {
      e.preventDefault();
      f.querySelectorAll('.err').forEach(function (n) { n.remove(); });
      var picked = f.querySelector('input[name="rv-rate"]:checked'), comment = f.querySelector('#rv-text').value.trim();
      if (!picked) {
        var p = document.createElement('p'); p.className = 'err'; p.id = 'rv-rate-err'; p.setAttribute('role', 'alert'); p.textContent = 'เลือกคะแนน 1–5 ดาวก่อนส่งรีวิว';
        f.querySelector('.fs').appendChild(p); f.querySelector('input[name="rv-rate"]').focus(); return;
      }
      if (comment.length > 500) { var q = document.createElement('p'); q.className = 'err'; q.textContent = 'ความเห็นยาวเกิน 500 ตัวอักษร'; f.querySelector('.field').appendChild(q); return; }
      fresh();
      if (b.status !== 'completed' || (member && b.member_id !== member.id)) { MH.ui.toast('รีวิวได้เฉพาะนัดที่จบแล้วของคุณ'); render(); return; }
      if (reviewOf()) { MH.ui.toast('นัดนี้รีวิวไปแล้ว'); render(); return; }
      S.insert('expert_reviews', { booking_id: b.id, expert_id: b.expert_id, member_id: b.member_id, rating: Number(picked.value), comment: comment, status: 'published' });
      MH.ui.toast('ขอบคุณสำหรับรีวิว'); render();
      var rvEl = document.getElementById('review'); if (rvEl) rvEl.scrollIntoView({ block: 'center' });
    }
  });
  root.addEventListener('change', function (e) {
    if (e.target.name === 'rv-rate') {
      var n = Number(e.target.value);
      root.querySelectorAll('#rv-stars label').forEach(function (l, i) { l.classList.toggle('on', i < n); });
    }
  });

  render();
})();
