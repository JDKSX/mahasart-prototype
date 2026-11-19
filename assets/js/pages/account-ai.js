/* แท็บ "ประวัติ AI" ในหน้าบัญชี (account.html?tab=ai)
   รายการบทสนทนากับ Mahasart AI ของสมาชิก · เปิดต่อ (ai.html?c=<id>) · ลบ (ข้อความในบทสนทนาถูกลบด้วย) */
(function () {
  'use strict';
  var MH = window.MH;
  if (!MH || !MH.account) return;
  var h = MH.util.h, S = MH.store;

  function ensureCss() {
    if (document.querySelector('link[data-ai-css]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = MH.base + 'assets/css/ai.css'; l.setAttribute('data-ai-css', '');
    document.head.appendChild(l);
  }
  function convsOf(member) {
    return S.all('ai_conversations').filter(function (c) { return c.member_id === member.id; }).sort(function (a, b) {
      return String(b.last_message_at || b.updated_at || b.created_at).localeCompare(String(a.last_message_at || a.updated_at || a.created_at));
    });
  }
  function msgsOf(id) { return S.all('ai_messages').filter(function (m) { return m.conversation_id === Number(id); }); }

  MH.account.register({
    key: 'ai', label: 'ประวัติ AI', order: 6,
    render: function (host, member) {
      ensureCss();
      function draw() {
        var list = convsOf(member), q = MH.q.aiQuota(member), on = S.setting('ai_enabled') !== false;
        host.innerHTML = '<section class="ai-acc" aria-labelledby="ai-acc-h"><h2 id="ai-acc-h">ประวัติ Mahasart AI</h2>' +
          '<p class="sec-note">บทสนทนาของคุณเก็บไว้ในบัญชีนี้ ทีมงานเปิดอ่านได้เพื่อตรวจคุณภาพตามนโยบายความเป็นส่วนตัว ลบเมื่อไรก็ได้ · วันนี้เหลือ ' + q.left + '/' + q.limit + ' คำถาม</p>' +
          (on ? '' : '<div class="notice notice--warn" role="status"><div>Mahasart AI ปิดให้บริการชั่วคราว ดูประวัติและลบบทสนทนาได้ แต่ยังถามต่อไม่ได้</div></div>') +
          (list.length
            ? '<ul class="ai-acc-list">' + list.map(function (c) {
                var n = c.message_count != null ? c.message_count : msgsOf(c.id).length;
                return '<li><div class="t"><b>' + h(c.title) + '</b><span>' + h(MH.util.dateShort(c.last_message_at || c.created_at)) + ' · ' + n + ' ข้อความ · ' + (c.mode === 'explain' ? 'อธิบายผลดูดวง' : 'ถามตอบ') + '</span></div>' +
                  '<a class="btn btn--outline btn--sm" href="' + MH.base + 'ai.html?c=' + c.id + '">เปิดต่อ</a>' +
                  '<button type="button" class="btn btn--outline btn--sm" data-del="' + c.id + '" aria-label="ลบบทสนทนา ' + h(c.title) + '">ลบ</button></li>';
              }).join('') + '</ul><div class="btn-row"><a class="btn btn--primary" href="' + MH.base + 'ai.html">' + MH.ui.icon('i-ai') + 'ถามคำถามใหม่</a></div>'
            : MH.ui.empty('ยังไม่มีบทสนทนากับ AI', 'ถามเรื่องในคลังความรู้ หรือกด “ให้ AI อธิบายผลนี้” จากหน้าเครื่องมือดูดวง บทสนทนาจะมารวมอยู่ที่นี่',
                '<a class="btn btn--primary" href="' + MH.base + 'ai.html">เริ่มถาม Mahasart AI</a>')) +
          '</section>';
      }
      draw();
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-del]'); if (!b) return;
        var id = Number(b.getAttribute('data-del')), c = S.find('ai_conversations', id); if (!c) return;
        MH.ui.confirm({ title: 'ลบบทสนทนานี้?', body: '“' + c.title + '” และข้อความทั้งหมดในบทสนทนานี้จะถูกลบ ทีมงานจะไม่เห็นอีก · โควตาที่ใช้ไปแล้วไม่คืน', okLabel: 'ลบบทสนทนา', danger: true }).then(function (ok) {
          if (!ok) return;
          msgsOf(id).forEach(function (m) { S.remove('ai_messages', m.id); });
          S.remove('ai_conversations', id);
          MH.ui.toast('ลบบทสนทนาแล้ว');
          draw();
        });
      });
    }
  });
})();
