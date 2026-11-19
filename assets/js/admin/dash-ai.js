/* ส่วนเพิ่มบนแดชบอร์ดหลังบ้าน: Mahasart AI (ต้องมีสิทธิ์ ai.view)
   คำถามวันนี้ · guard ที่เกิดใน 7 วัน · ลิงก์ไป ai.html (ใช้เฉพาะคลาสที่มีใน admin.css / admin-pages.css) */
(function () {
  'use strict';
  var MH = window.MH;
  if (!MH || !MH.admin || !MH.admin.allowed || !MH.admin.can('ai.view')) return;
  var host = document.getElementById('dash-extra');
  if (!host) return;
  var h = MH.util.h, S = MH.store;

  function pad(n) { return ('0' + n).slice(-2); }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayKeys(n) { var out = [], t = new Date(); for (var i = 0; i < n; i++) out.push(key(new Date(t.getFullYear(), t.getMonth(), t.getDate() - i))); return out; }
  var week = dayKeys(7), today = dayKeys(1);
  function q(keys) { return S.all('ai_usage_daily').filter(function (u) { return keys.indexOf(u.usage_date) >= 0; }).reduce(function (s, u) { return s + (u.questions || 0); }, 0); }

  var bot = S.all('ai_messages').filter(function (m) { return m.role === 'assistant' && week.indexOf(key(new Date(m.created_at))) >= 0; });
  var G = [['crisis', 'ห่วงใย (วิกฤต)'], ['purchase', 'ไม่แนะนำสินค้า'], ['health', 'สุขภาพ'], ['finance', 'การเงิน'], ['legal', 'กฎหมาย']];
  var rows = G.map(function (g) { return { label: g[1], n: bot.filter(function (m) { return m.guard === g[0]; }).length }; });
  var max = Math.max(1, rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0));
  var guarded = rows.reduce(function (s, r) { return s + r.n; }, 0);
  var on = S.setting('ai_enabled') !== false;

  var sec = document.createElement('section');
  sec.className = 'card';
  sec.setAttribute('aria-labelledby', 'dash-ai-h');
  sec.innerHTML = '<h2 id="dash-ai-h">Mahasart AI ' + (on ? '' : '<span class="pill pill--danger">ปิดให้บริการอยู่</span>') + '</h2>' +
    '<p class="sec-note">การใช้งานตัวตอบจำลองของต้นแบบ</p>' +
    '<p class="stat-sum"><span>คำถามวันนี้ <b>' + q(today) + '</b></span><span>7 วัน <b>' + q(week) + '</b></span><span>คำตอบที่ติด guard (7 วัน) <b>' + guarded + '</b></span></p>' +
    (guarded
      ? '<div class="stat-item">' + rows.map(function (r) {
          return '<div class="bar-row"><span>' + h(r.label) + '</span><div class="bar"><i data-w="' + Math.round(r.n / max * 100) + '"></i></div><span class="v">' + r.n + '</span></div>';
        }).join('') + '</div>'
      : '<p class="muted">ยังไม่มีคำตอบที่ติด guard ใน 7 วันที่ผ่านมา</p>') +
    '<div class="btn-row"><a class="btn btn--outline btn--sm" href="ai.html">ดูบทสนทนาและสถิติ AI</a></div>';
  sec.querySelectorAll('[data-w]').forEach(function (e) { e.style.width = e.getAttribute('data-w') + '%'; });
  host.appendChild(sec);
})();
