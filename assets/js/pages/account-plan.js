/* แท็บ "แพ็กเกจ" ในหน้าบัญชี (account.html?tab=plan): แพ็กเกจปัจจุบัน · วันต่ออายุ · ประวัติการชำระ · ยกเลิกต่ออายุ · สมัครใหม่/ต่ออายุ
   ยกเลิกต่ออายุ = ใช้ได้ถึงวันครบรอบบิล (MH.commerce.cancelSubscription) · ชำระผ่านหน้าชำระเงินกลาง (MH.pay.url) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  if (!MH.account) return;

  function ensureCss() {
    if (document.querySelector('link[href$="courses.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = (MH.base || '') + 'assets/css/courses.css';
    document.head.appendChild(l);
  }

  function render(host, member) {
    ensureCss();
    member = MH.member.current() || member;
    var plan = MH.member.plan(member), cur = MH.q.activeSubscription(member.id);
    var premiumPlan = MH.q.plan('premium');
    var subs = MH.store.all('subscriptions').filter(function (s) { return s.member_id === member.id; });
    var subIds = subs.map(function (s) { return s.id; });
    var pays = MH.store.all('payments').filter(function (p) { return p.payable_type === 'subscription' && subIds.indexOf(p.payable_id) >= 0; })
      .sort(function (a, b) { return String(b.paid_at || b.created_at).localeCompare(String(a.paid_at || a.created_at)); });
    var pendSub = subs.filter(function (s) { return s.status === 'pending_payment'; }).sort(function (a, b) { return b.id - a.id; })[0];
    var pendPay = pendSub ? MH.pay.forPayable('subscription', pendSub.id).filter(function (p) { return p.status === 'pending'; })[0] : null;

    var state, actions = '';
    if (cur && cur.status === 'active') {
      state = '<p><span class="tag tag--cert">ใช้งานอยู่</span></p>' +
        '<p>ครบรอบบิลและต่ออายุวันที่ <b>' + h(MH.util.dateLong(cur.renews_at)) + '</b></p>' +
        '<p class="crs-note">ระบบจะแจ้งเตือนก่อนครบ 3 วัน ให้คุณกดชำระรอบถัดไปด้วย PromptPay (PromptPay ตัดเงินอัตโนมัติไม่ได้ จึงไม่มีการหักบัญชีโดยที่คุณไม่รู้)</p>';
      actions = '<button type="button" class="btn btn--outline" data-act="cancel" data-id="' + cur.id + '">ยกเลิกต่ออายุ</button>';
    } else if (cur && cur.status === 'cancelled') {
      state = '<p><span class="tag tag--stone">ยกเลิกต่ออายุแล้ว</span></p>' +
        '<p>ยังใช้สิทธิ์พรีเมียมได้ถึง <b>' + h(MH.util.dateLong(cur.renews_at)) + '</b> หลังจากนั้นกลับเป็นสมาชิกทั่วไป</p>';
      actions = '<button type="button" class="btn btn--gold" data-act="subscribe">สมัครต่ออายุ ' + h(premiumPlan ? MH.money(premiumPlan.price_month) : '') + '</button>';
    } else if (pendPay) {
      state = '<p><span class="tag tag--stone">รอชำระเงิน</span></p><p>คุณกดสมัครพรีเมียมไว้แล้ว ชำระ ' + h(MH.money(pendPay.amount)) + ' ภายในเวลาที่กำหนดเพื่อเริ่มใช้สิทธิ์</p>';
      actions = '<a class="btn btn--primary" href="' + h(MH.pay.url(pendPay)) + '">ชำระเงินต่อ</a>';
    } else {
      state = '<p>คุณเป็นสมาชิกทั่วไป อัปเกรดเป็นพรีเมียมเพื่อถาม AI ได้มากขึ้น บันทึกผลไม่จำกัด ลดค่าปรึกษา และเรียนคอร์สที่ร่วมรายการฟรี</p>';
      actions = '<button type="button" class="btn btn--gold" data-act="subscribe">สมัครพรีเมียม ' + h(premiumPlan ? MH.money(premiumPlan.price_month) : '') + '/เดือน</button>';
    }
    actions += '<a class="btn btn--outline" href="' + h(MH.base + 'pricing.html') + '">เปรียบเทียบแพ็กเกจ</a>';

    host.innerHTML = '<div class="sec-head"><h2>แพ็กเกจ</h2></div>' +
      '<div class="crs-block"><h3>' + h(plan.name) + (plan.price_month ? ' · ' + h(MH.money(plan.price_month)) + '/เดือน' : '') + '</h3>' + state +
      '<ul class="plan-feats">' + (plan.features || []).map(function (f) { return '<li>' + MH.ui.icon('i-check') + '<span>' + h(f) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="btn-row" id="plan-acts">' + actions + '</div></div>' +
      '<div class="sec-head"><h2>ประวัติการชำระเงินค่าแพ็กเกจ</h2></div>' +
      (pays.length ? '<ul class="crs-pay-list">' + pays.map(function (p) {
        return '<li><span>' + h(MH.util.dateTime(p.paid_at || p.created_at)) + ' · <span class="muted">' + h(p.ref) + '</span></span>' +
          '<span><span class="num">' + h(MH.money(p.amount)) + '</span> · ' + h(MH.labels.paymentStatus[p.status] || p.status) +
          (p.status === 'pending' ? ' · <a href="' + h(MH.pay.url(p)) + '">ชำระเงิน</a>' : '') + '</span></li>';
      }).join('') + '</ul>' : MH.ui.empty('ยังไม่มีประวัติการชำระ', 'เมื่อสมัครพรีเมียมและชำระเงินแล้ว รายการจะขึ้นที่นี่'));
  }

  function wire(host) {
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var m = MH.member.current(); if (!m) { location.href = MH.member.loginUrl(); return; }
      var act = b.getAttribute('data-act');
      if (act === 'subscribe') {
        var pendSub = MH.store.all('subscriptions').filter(function (s) { return s.member_id === m.id && s.status === 'pending_payment'; }).sort(function (a, c) { return c.id - a.id; })[0];
        var pend = pendSub ? MH.pay.forPayable('subscription', pendSub.id).filter(function (p) { return p.status === 'pending'; })[0] : null;
        if (pend) { location.href = MH.pay.url(pend); return; }
        var r = MH.commerce.subscribe('premium');
        if (r.error) { MH.ui.toast(r.error); return; }
        if (r.resumed) { MH.ui.toast('ต่ออายุพรีเมียมตามเดิมแล้ว'); setTimeout(function () { location.reload(); }, 700); return; }
        location.href = MH.pay.url(r.payment);
      }
      if (act === 'cancel') {
        var sub = MH.store.find('subscriptions', b.getAttribute('data-id'));
        MH.ui.confirm({ title: 'ยกเลิกต่ออายุพรีเมียม', body: 'คุณจะยังใช้สิทธิ์พรีเมียมได้ถึงวันครบรอบบิล ' + MH.util.dateLong(sub && sub.renews_at) + ' หลังจากนั้นกลับเป็นสมาชิกทั่วไป ระบบจะไม่เรียกเก็บเงินรอบถัดไป', okLabel: 'ยกเลิกต่ออายุ', danger: true })
          .then(function (ok) {
            if (!ok) return;
            if (MH.commerce.cancelSubscription(sub.id)) MH.ui.toast('ยกเลิกต่ออายุแล้ว ใช้สิทธิ์ได้ถึง ' + MH.util.dateLong(sub.renews_at));
            else MH.ui.toast('ยกเลิกไม่ได้ แพ็กเกจนี้ไม่ได้อยู่ในสถานะใช้งาน');
            render(host, MH.member.current());
          });
      }
    });
  }

  MH.account.register({
    key: 'plan', label: 'แพ็กเกจ', order: 9,
    render: function (host, member) {
      if (!host.getAttribute('data-plan-wired')) { host.setAttribute('data-plan-wired', '1'); wire(host); }
      render(host, member);
    }
  });
})();
