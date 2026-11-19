/* แพ็กเกจสมาชิก: เปรียบเทียบสมาชิกทั่วไปกับพรีเมียม (ข้อมูลจาก MH.q.plans() แก้ได้ที่หลังบ้าน) · สมัครพรีเมียม → MH.commerce.subscribe → หน้าชำระเงิน PromptPay
   สถานะ: ไม่ล็อกอิน · ฟรี · พรีเมียม (บอกวันต่ออายุ) · ยกเลิกต่ออายุแล้ว (ใช้ได้ถึงวันครบรอบ) · รอชำระ */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('pricing-root');

  function pendingSub(m) {
    var s = MH.store.all('subscriptions').filter(function (x) { return x.member_id === m.id && x.status === 'pending_payment'; }).sort(function (a, b) { return b.id - a.id; })[0];
    if (!s) return null;
    var p = MH.pay.forPayable('subscription', s.id).filter(function (x) { return x.status === 'pending'; })[0];
    return p ? { sub: s, payment: p } : null;
  }

  function render() {
    var member = MH.member.current();
    var plans = MH.q.plans().sort(function (a, b) { return a.price_month - b.price_month; });
    var cur = member ? MH.q.activeSubscription(member.id) : null;
    var premium = !!member && MH.member.isPremium(member);
    var pend = member ? pendingSub(member) : null;
    var premiumPlan = MH.q.plan('premium');
    var included = MH.q.courses().filter(function (c) { return c.included_in_premium; });

    function stateFor(p) {
      var isFree = !p.price_month;
      if (isFree) {
        if (!member) return '<a class="btn btn--outline" href="' + h(MH.member.loginUrl()) + '">สมัครสมาชิกฟรี / เข้าสู่ระบบ</a>';
        return premium ? '<p class="plan-state">คุณใช้แพ็กเกจพรีเมียมอยู่ ถ้ายกเลิกต่ออายุ จะกลับมาเป็นสมาชิกทั่วไปหลังวันครบรอบบิล</p>'
          : '<p class="plan-state"><b>แพ็กเกจปัจจุบันของคุณ</b></p>';
      }
      /* พรีเมียม */
      if (!member) return '<a class="btn btn--primary" href="' + h(MH.member.loginUrl()) + '">เข้าสู่ระบบเพื่อสมัครพรีเมียม</a>';
      if (cur && cur.status === 'active') {
        return '<p class="plan-state"><b>แพ็กเกจปัจจุบันของคุณ</b> · ครบรอบบิลและต่ออายุวันที่ ' + h(MH.util.dateLong(cur.renews_at)) +
          '<br>ระบบจะแจ้งเตือนก่อนครบ 3 วัน เพื่อให้คุณกดชำระรอบถัดไปด้วย PromptPay</p>' +
          '<a class="btn btn--outline" href="account.html?tab=plan">จัดการแพ็กเกจในหน้าบัญชี</a>';
      }
      if (pend) {
        return '<p class="plan-state">คุณกดสมัครไว้แล้ว รอชำระเงิน ' + h(MH.money(pend.payment.amount)) + ' ภายในเวลาที่กำหนด</p>' +
          '<a class="btn btn--primary" href="' + h(MH.pay.url(pend.payment)) + '">ชำระเงินต่อ</a>';
      }
      if (cur && cur.status === 'cancelled') {
        return '<p class="plan-state">คุณยกเลิกต่ออายุแล้ว <b>ใช้สิทธิ์พรีเมียมได้ถึง ' + h(MH.util.dateLong(cur.renews_at)) + '</b></p>' +
          '<button type="button" class="btn btn--primary" data-act="subscribe">สมัครต่ออายุ ' + h(MH.money(p.price_month)) + '</button>' +
          '<p class="crs-hint">ต่ออายุตอนนี้ รอบบิลใหม่จะเริ่มนับจากวันที่ชำระ</p>';
      }
      return '<button type="button" class="btn btn--gold" data-act="subscribe">สมัครพรีเมียม ' + h(MH.money(p.price_month)) + '/เดือน</button>' +
        '<p class="crs-hint">ชำระด้วย PromptPay ยกเลิกต่ออายุได้ทุกเมื่อ</p>';
    }

    var cards = plans.map(function (p) {
      var hi = !!p.price_month;
      return '<li class="plan-card' + (hi ? ' plan-card--hi' : '') + '"><h2>' + h(p.name) + (hi ? ' <span class="tag tag--stone">แนะนำ</span>' : '') + '</h2>' +
        '<p class="plan-price">' + (p.price_month ? h(MH.money(p.price_month)) + ' <small>/ เดือน</small>' : 'ฟรี') + '</p>' +
        '<ul class="plan-feats">' + (p.features || []).map(function (f) { return '<li>' + MH.ui.icon('i-check') + '<span>' + h(f) + '</span></li>'; }).join('') + '</ul>' +
        '<div class="plan-cta">' + stateFor(p) + '</div></li>';
    }).join('');

    var rowDefs = [
      ['ราคา', function (p) { return p.price_month ? MH.money(p.price_month) + ' / เดือน' : 'ฟรี'; }],
      ['ถาม Mahasart AI', function (p) { return (p.ai_daily_quota || 0) + ' คำถามต่อวัน'; }],
      ['บันทึกผลดูดวง', function (p) { return p.save_limit ? p.save_limit + ' รายการ' : 'ไม่จำกัด'; }],
      ['ส่วนลดจองผู้เชี่ยวชาญ', function (p) { return p.booking_discount ? 'ลด ' + Math.round(p.booking_discount * 100) + '%' : 'ไม่มี'; }],
      ['คอร์สเรียน', function (p) { return p.course_access || '-'; }]
    ];
    var table = '<div class="table-wrap"><table class="table plan-table"><caption class="sr-only">เปรียบเทียบแพ็กเกจ</caption><thead><tr><th scope="col">สิทธิประโยชน์</th>' +
      plans.map(function (p) { return '<th scope="col">' + h(p.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rowDefs.map(function (r) { return '<tr><th scope="row">' + h(r[0]) + '</th>' + plans.map(function (p) { return '<td>' + h(r[1](p)) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';

    var faq = [
      ['ยกเลิกได้ไหม', '<p>ยกเลิกต่ออายุได้ทุกเมื่อที่หน้าบัญชี → แพ็กเกจ ระบบจะไม่เรียกเก็บเงินรอบถัดไป และคุณยังใช้สิทธิ์พรีเมียมได้ถึงวันครบรอบบิลที่จ่ายไปแล้ว ไม่คืนเงินรายวัน</p>'],
      ['ต่ออายุอย่างไร', '<p>ระบบจริงต้องให้คุณกดชำระเองทุกเดือน เพราะ PromptPay ตัดเงินอัตโนมัติไม่ได้ จึงมีขั้นตอนเหล่านี้</p><ul><li>ก่อนครบรอบบิล 3 วัน ระบบแจ้งเตือนให้ต่ออายุ</li><li>กดสมัครต่ออายุ แล้วสแกน QR PromptPay ภายในเวลาที่กำหนด</li><li>ถ้าไม่ชำระ แพ็กเกจจะหมดอายุเมื่อถึงวันครบรอบบิล และกลับเป็นสมาชิกทั่วไป ข้อมูลที่บันทึกไว้ไม่หาย</li></ul>'],
      ['ชำระเงินอย่างไร', '<p>ชำระด้วย PromptPay (สแกน QR) อย่างเดียว ต้นแบบนี้มีปุ่มจำลองว่าโอนแล้วเพื่อให้ลองวงจรได้ ระบบจริงยืนยันการชำระจากธนาคารเท่านั้น</p>'],
      ['พรีเมียมเรียนคอร์สอะไรฟรีได้บ้าง', included.length
        ? '<p>คอร์สที่ร่วมรายการตอนนี้</p><ul>' + included.map(function (c) { return '<li><a href="course.html?slug=' + encodeURIComponent(c.slug) + '">' + h(c.title) + '</a></li>'; }).join('') + '</ul><p>คอร์สอื่นซื้อแยกรายคอร์สได้ทั้งสมาชิกทั่วไปและพรีเมียม</p>'
        : '<p>ตอนนี้ยังไม่มีคอร์สที่ร่วมรายการ คอร์สที่เผยแพร่ใหม่จะมีป้าย “พรีเมียมเรียนฟรี” เมื่อร่วมรายการ</p>'],
      ['ถ้าเปลี่ยนราคาแพ็กเกจ จะมีผลเมื่อไร', '<p>ราคาใหม่มีผลกับรอบบิลถัดไป รอบที่จ่ายไปแล้วไม่ถูกเรียกเก็บเพิ่ม</p>']
    ];

    root.innerHTML =
      '<div class="page-head"><nav class="crumbs" aria-label="เส้นทางหน้า"><a href="index.html">หน้าแรก</a><span aria-hidden="true">›</span><span aria-current="page">แพ็กเกจสมาชิก</span></nav>' +
      '<h1>แพ็กเกจสมาชิก</h1><p class="lede">เริ่มฟรี แล้วอัปเกรดเป็นพรีเมียม' + (premiumPlan ? ' ' + h(MH.money(premiumPlan.price_month)) + ' ต่อเดือน' : '') + ' เมื่ออยากถาม AI ได้มากขึ้น บันทึกผลไม่จำกัด และเรียนคอร์สที่ร่วมรายการฟรี</p></div>' +
      '<ul class="plan-grid" aria-label="แพ็กเกจ">' + cards + '</ul>' +
      '<section class="section" aria-labelledby="cmp-h"><div class="sec-head"><h2 id="cmp-h">เปรียบเทียบสิทธิประโยชน์</h2></div>' + table + '</section>' +
      '<section class="section" aria-labelledby="faq-h"><div class="sec-head"><h2 id="faq-h">คำถามที่พบบ่อย</h2></div><div class="plan-faq">' +
      faq.map(function (f) { return '<details><summary>' + h(f[0]) + '</summary><div>' + f[1] + '</div></details>'; }).join('') + '</div></section>' +
      '<p class="disclaimer">' + h(MH.store.setting('disclaimer') || '') + '</p>';
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act="subscribe"]'); if (!b) return;
    var m = MH.member.current(); if (!m) { location.href = MH.member.loginUrl(); return; }
    var pend = pendingSub(m);
    if (pend) { location.href = MH.pay.url(pend.payment); return; }
    var r = MH.commerce.subscribe('premium');
    if (r.error) { MH.ui.toast(r.error); render(); return; }
    if (r.resumed) { MH.ui.toast('ต่ออายุพรีเมียมตามเดิมแล้ว'); setTimeout(function () { location.reload(); }, 700); return; }
    location.href = MH.pay.url(r.payment);
  });

  render();
})();
