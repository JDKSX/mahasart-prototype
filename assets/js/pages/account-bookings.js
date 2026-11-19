/* แท็บ "นัดผู้เชี่ยวชาญ" ในหน้าบัญชี (account.html?tab=bookings)
   นัดที่จะถึง/ที่ผ่านมา · สถานะ · เข้าห้อง · ไปชำระ · ยกเลิก (บอกก่อนว่าคืนเงินหรือไม่) · เขียนรีวิว */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, S = MH.store;
  if (!MH.account || !MH.account.register) return;
  var OPEN_BEFORE_MIN = 10;

  /* หน้าบัญชีไม่ได้โหลด experts.css ให้ จึงโหลดเองครั้งเดียว (ไฟล์ CSS ไม่ใช่ inline style) */
  function ensureCss() {
    if (document.querySelector('link[data-experts-css]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = (MH.base || '') + 'assets/css/experts.css'; l.setAttribute('data-experts-css', '');
    document.head.appendChild(l);
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var ST = { pending_payment: 'st--warn', confirmed: 'st--info', completed: 'st--ok', cancelled: 'st--bad', no_show: 'st--bad' };

  function payments(b) { return MH.pay.forPayable('booking', b.id); }
  function reviewOf(b) { return S.all('expert_reviews').filter(function (r) { return r.booking_id === b.id; })[0] || null; }
  function isNear(b) { return b.start_at && new Date(b.start_at).getTime() - OPEN_BEFORE_MIN * 60000 <= Date.now(); }
  function canCancel(b) { return (b.status === 'pending_payment' || b.status === 'confirmed') && (!b.start_at || new Date(b.start_at) > new Date()); }

  function moneyNote(b) {
    var ps = payments(b), refunded = ps.filter(function (p) { return p.status === 'refunded'; })[0], paid = ps.filter(function (p) { return p.status === 'paid'; })[0];
    if (b.status === 'cancelled') {
      if (refunded) return 'คืนเงินแล้ว ' + MH.money(refunded.amount);
      if (paid) return 'ชำระแล้ว ' + MH.money(paid.amount) + ' · ยกเลิกใกล้เวลานัด จึงไม่คืนเงินตามนโยบาย';
      return 'ไม่มีการเรียกเก็บเงิน';
    }
    if (b.status === 'pending_payment') {
      var pend = ps.filter(function (p) { return p.status === 'pending'; })[0];
      return 'ยอดชำระ ' + MH.money(b.total) + (pend ? ' · ชำระภายใน ' + hm(pend.expires_at) + ' น.' : '');
    }
    return 'ชำระแล้ว ' + MH.money(b.total) + (b.discount ? ' (รวมส่วนลดพรีเมียม ' + MH.money(b.discount) + ')' : '');
  }

  function card(b) {
    var e = S.find('experts', b.expert_id), name = e ? e.display_name : 'ผู้เชี่ยวชาญ';
    var nameHtml = e && e.status === 'active' ? '<a href="' + MH.base + 'expert.html?slug=' + encodeURIComponent(e.slug) + '">' + h(name) + '</a>' : h(name);
    var acts = '', pay = payments(b).filter(function (p) { return p.status === 'pending'; })[0];
    var room = MH.base + 'session.html?booking=' + b.id;
    if (b.status === 'pending_payment' && pay) acts += '<a class="btn btn--gold btn--sm" href="' + h(MH.pay.url(pay)) + '">ไปชำระเงิน</a>';
    if (b.status === 'confirmed') acts += '<a class="btn ' + (isNear(b) ? 'btn--primary' : 'btn--outline') + ' btn--sm" href="' + room + '">' + (isNear(b) ? 'เข้าห้อง' : 'ดูห้อง (ยังไม่เปิด)') + '</a>';
    if (b.status === 'completed') {
      var rv = reviewOf(b);
      acts += '<a class="btn btn--outline btn--sm" href="' + room + '">ดูห้องและข้อความ</a>';
      acts += rv ? '<span class="rating">รีวิวของคุณ <span class="stars" role="img" aria-label="' + rv.rating + ' ดาว">' + [1, 2, 3, 4, 5].map(function (n) { return '<i' + (n <= rv.rating ? ' class="on"' : '') + '>★</i>'; }).join('') + '</span></span>'
        : '<a class="btn btn--gold btn--sm" href="' + room + '#review">เขียนรีวิว</a>';
    }
    if (canCancel(b)) acts += '<button type="button" class="btn btn--outline btn--sm" data-bk-cancel="' + b.id + '">ยกเลิกนัด</button>';
    return '<li class="bk-card" data-bk="' + b.id + '">' +
      '<div class="bk-row"><h3>' + nameHtml + '</h3><span class="st ' + (ST[b.status] || '') + '">' + h(MH.labels.bookingStatus[b.status] || b.status) + '</span></div>' +
      '<div class="bk-no">' + h(b.booking_no) + '</div>' +
      '<p class="bk-info"><span>นัด:</span> ' + (b.start_at ? h(MH.util.dateLong(b.start_at, true)) + ' เวลา ' + hm(b.start_at) + ' น.' : 'ยังไม่ระบุเวลา') + ' · ' + h(MH.labels.sessionType[b.session_type] || b.session_type) + ' ' + b.minutes + ' นาที</p>' +
      '<p class="bk-info"><span>' + h(moneyNote(b)) + '</span></p>' +
      (b.topic ? '<p class="bk-topic">เรื่องที่ปรึกษา: ' + h(b.topic) + '</p>' : '') +
      (b.status === 'cancelled' && b.cancelled_reason ? '<p class="bk-topic">เหตุผลที่ยกเลิก: ' + h(b.cancelled_reason) + '</p>' : '') +
      (acts ? '<div class="btn-row">' + acts + '</div>' : '') + '</li>';
  }

  function render(host, member) {
    ensureCss();
    var mine = S.all('expert_bookings').filter(function (b) { return b.member_id === member.id; });
    var up = mine.filter(function (b) { return b.status === 'pending_payment' || b.status === 'confirmed'; })
      .sort(function (a, b) { return String(a.start_at || '9').localeCompare(String(b.start_at || '9')); });
    var past = mine.filter(function (b) { return up.indexOf(b) < 0 && !up.some(function (u) { return u.id === b.id; }); })
      .sort(function (a, b) { return String(b.start_at || b.created_at).localeCompare(String(a.start_at || a.created_at)); });
    if (!mine.length) {
      host.innerHTML = MH.ui.empty('ยังไม่มีนัดผู้เชี่ยวชาญ', 'เลือกผู้เชี่ยวชาญ ดูเวลาว่าง แล้วจองได้ในไม่กี่ขั้นตอน', '<a class="btn btn--primary" href="' + MH.base + 'experts.html">ดูผู้เชี่ยวชาญ</a>');
      return;
    }
    host.innerHTML = '<div class="bk-sec">' +
      '<h3>นัดที่จะถึง (' + up.length + ')</h3>' + (up.length ? '<ul class="bk-list">' + up.map(card).join('') + '</ul>' : '<p class="muted">ไม่มีนัดที่รออยู่ <a href="' + MH.base + 'experts.html">จองนัดใหม่</a></p>') +
      '<h3>นัดที่ผ่านมา (' + past.length + ')</h3>' + (past.length ? '<ul class="bk-list">' + past.map(card).join('') + '</ul>' : '<p class="muted">ยังไม่มีนัดที่ผ่านมา</p>') +
      '<p class="ex-note">ยกเลิกก่อนเวลานัดอย่างน้อย ' + (S.setting('booking_cancel_hours') || 24) + ' ชั่วโมง คืนเงินเต็มจำนวน หลังจากนั้นไม่คืนเงิน</p></div>';
  }

  function cancelFlow(host, id) {
    var member = MH.member.current(), b = S.find('expert_bookings', id);
    if (!member || !b || b.member_id !== member.id || !canCancel(b)) { MH.ui.toast('นัดนี้ยกเลิกไม่ได้แล้ว'); if (member) render(host, member); return; }
    var hrs = S.setting('booking_cancel_hours') || 24, paid = payments(b).some(function (p) { return p.status === 'paid'; });
    var early = b.start_at && (new Date(b.start_at) - new Date()) / 36e5 >= hrs;
    var body = !paid ? 'นัดนี้ยังไม่ได้ชำระเงิน จึงไม่มีการเรียกเก็บ และคิวจะถูกปล่อยให้คนอื่นจองได้'
      : early ? 'เวลานัดเหลือมากกว่า ' + hrs + ' ชั่วโมง จึงคืนเงินเต็มจำนวน ' + MH.money(b.total) + ' คิวจะถูกปล่อยให้คนอื่นจองได้'
      : 'เวลานัดเหลือน้อยกว่า ' + hrs + ' ชั่วโมง ตามนโยบายจะไม่คืนเงิน ' + MH.money(b.total) + ' ถ้ายืนยัน นัดจะถูกยกเลิกทันที';
    MH.ui.confirm({ title: 'ยกเลิกนัด ' + b.booking_no + '?', body: body, okLabel: 'ยืนยันยกเลิกนัด', danger: true }).then(function (ok) {
      if (!ok) return;
      var r = MH.commerce.cancelBooking(b.id, 'สมาชิกยกเลิกนัด');
      if (!r.ok) { MH.ui.toast('ยกเลิกไม่สำเร็จ นัดนี้เปลี่ยนสถานะไปแล้ว'); render(host, member); return; }
      /* นัดที่ยังรอชำระ: ปิดรายการชำระเงินที่ค้างด้วย จะได้ไม่มีใครจ่ายนัดที่ยกเลิกไปแล้ว */
      payments(b).filter(function (p) { return p.status === 'pending'; }).forEach(function (p) { MH.pay.expire(p.id); });
      MH.ui.toast(!paid ? 'ยกเลิกนัดแล้ว ไม่มีการเรียกเก็บเงิน' : r.refunded ? 'ยกเลิกนัดแล้ว คืนเงิน ' + MH.money(b.total) : 'ยกเลิกนัดแล้ว (ไม่คืนเงินตามนโยบาย)');
      render(host, member);
    });
  }

  MH.account.register({
    key: 'bookings', label: 'นัดผู้เชี่ยวชาญ', order: 7,
    render: function (host, member) {
      render(host, member);
      if (!host.__bkBound) {
        host.__bkBound = true;
        host.addEventListener('click', function (ev) {
          var c = ev.target.closest('[data-bk-cancel]'); if (!c) return;
          cancelFlow(host, Number(c.getAttribute('data-bk-cancel')));
        });
      }
    }
  });
})();
