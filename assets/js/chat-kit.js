/* ชุดเครื่องมือหน้าแชต (ai.html · session.html) — ยืมข้อดีของแอปแชต
   - โหมดแอป: หน้าสูงเท่าจอ กล่องพิมพ์ติดล่าง ไม่มีท้ายเว็บ · มือถือซ่อนหัวเว็บ ใช้หัวห้องแชตแทน
   - ความสูงตามคีย์บอร์ดมือถือ (visualViewport) · ตัวคั่นวันที่ · ปุ่มเลื่อนลงล่างพร้อมป้าย "ข้อความใหม่"
   - กล่องพิมพ์ยืดตามข้อความ · Enter ส่งบนคอมพิวเตอร์ (มือถือ Enter = ขึ้นบรรทัดใหม่ แบบแอปแชต) · คัดลอกข้อความ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  var root = document.documentElement;

  function syncHeight() {
    var vv = window.visualViewport;
    root.style.setProperty('--app-h', Math.round(vv ? vv.height : window.innerHeight) + 'px');
  }
  function appMode(on) {
    document.body.classList.toggle('chat-app', !!on);
    if (on) { syncHeight(); window.scrollTo(0, 0); } else root.style.removeProperty('--app-h');
  }
  function onResize() { if (document.body.classList.contains('chat-app')) { syncHeight(); window.scrollTo(0, 0); } }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  window.addEventListener('resize', onResize);

  /* ---------- วันที่ ---------- */
  function dayKey(iso) { var d = new Date(iso); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function dayLabel(iso) {
    var d = new Date(iso), now = new Date(), y = new Date(now.getTime() - 86400000);
    if (dayKey(d) === dayKey(now)) return 'วันนี้';
    if (dayKey(d) === dayKey(y)) return 'เมื่อวาน';
    return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function daySep(iso) { return '<div class="cx-day" role="separator" data-day="' + dayKey(iso) + '"><span>' + h(dayLabel(iso)) + '</span></div>'; }
  function hm(iso) { try { return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  /** กลุ่มรายการบทสนทนาตามช่วงเวลา (แบบแถบประวัติของแอปแชต) */
  function ageGroup(iso) {
    var d = new Date(iso), now = new Date();
    var days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    if (days <= 0) return 'วันนี้';
    if (days === 1) return 'เมื่อวาน';
    if (days <= 7) return '7 วันที่ผ่านมา';
    if (days <= 30) return '30 วันที่ผ่านมา';
    return 'ก่อนหน้านั้น';
  }

  /* ---------- กล่องพิมพ์ ---------- */
  function autosize(t, max) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, max || 180) + 'px';
  }
  function enterSends(e) { return e.key === 'Enter' && !e.shiftKey && !e.isComposing && !touch; }
  function keyHint() { return touch ? 'แตะปุ่มส่ง · Enter ขึ้นบรรทัดใหม่' : 'Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่'; }

  /* ---------- เลื่อนอัตโนมัติ + ปุ่มลงล่าง ----------
     ติดท้ายอยู่ → ข้อความใหม่เลื่อนตาม · เลื่อนขึ้นไปอ่านของเก่า → ไม่ดึงลง แต่โชว์ปุ่ม "ข้อความใหม่" */
  function follow(log, btn) {
    var badge = btn.querySelector('.cx-jump-new');
    function near() { return log.scrollHeight - log.scrollTop - log.clientHeight < 80; }
    function sync() { var n = near(); btn.hidden = n; if (n && badge) badge.hidden = true; }
    function toBottom() { log.scrollTop = log.scrollHeight; sync(); }
    log.addEventListener('scroll', sync, { passive: true });
    btn.addEventListener('click', function () { log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' }); });
    return {
      near: near, toBottom: toBottom, sync: sync,
      /** เรียกเมื่อมีข้อความใหม่ · wasNear = สถานะก่อนเพิ่มข้อความ */
      arrived: function (wasNear) { if (wasNear) toBottom(); else { btn.hidden = false; if (badge) badge.hidden = false; } }
    };
  }
  function jumpBtn() {
    return '<button type="button" class="cx-jump" hidden aria-label="เลื่อนไปข้อความล่าสุด">' + MH.ui.icon('i-down') + '<span class="cx-jump-new" hidden>ข้อความใหม่</span></button>';
  }

  /* ---------- คัดลอก ---------- */
  function copy(text) {
    function done() { MH.ui.toast('คัดลอกข้อความแล้ว'); }
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.className = 'sr-only';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { MH.ui.toast('คัดลอกไม่ได้ ลองเลือกข้อความแล้วกดคัดลอกเอง'); }
      t.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }

  /* ---------- แผงข้าง (ลิ้นชักบนจอแคบ) ---------- */
  function drawer(shell, side, toggles) {
    var scrim = document.createElement('div'); scrim.className = 'cx-scrim'; shell.appendChild(scrim);
    function set(open) {
      shell.classList.toggle('side-open', open);
      toggles.forEach(function (b) { if (b) b.setAttribute('aria-expanded', String(open)); });
      if (open) { var f = side.querySelector('input,button,a'); if (f) f.focus({ preventScroll: true }); }
    }
    scrim.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && shell.classList.contains('side-open')) { set(false); if (toggles[0]) toggles[0].focus(); } });
    toggles.forEach(function (b) { if (b) b.addEventListener('click', function () { set(!shell.classList.contains('side-open')); }); });
    return { open: function () { set(true); }, close: function () { set(false); } };
  }

  MH.chat = { touch: touch, appMode: appMode, dayKey: dayKey, dayLabel: dayLabel, daySep: daySep, hm: hm, ageGroup: ageGroup,
    autosize: autosize, enterSends: enterSends, keyHint: keyHint, follow: follow, jumpBtn: jumpBtn, copy: copy, drawer: drawer };
})();
