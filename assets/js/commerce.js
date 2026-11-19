/* MAHASART prototype — กฎธุรกิจเฟส 2–3 (สมาชิก ตะกร้า ชำระเงิน นัดหมาย คอร์ส แพ็กเกจ)
   ทุกหน้าที่เกี่ยวกับเงินหรือสมาชิกต้องเรียกผ่านไฟล์นี้ ห้ามแก้ตาราง orders/payments/bookings/enrollments/subscriptions ตรง ๆ
   โหลดหลัง store.js และก่อน astro.js / shell.js
   API: MH.member · MH.cart · MH.pay · MH.commerce · MH.q (เพิ่ม) · MH.labels (เพิ่ม) · MH.money */
(function () {
  'use strict';
  var MH = window.MH, S = MH.store;
  var MKEY = 'mahasart-member-session', CKEY = 'mahasart-cart';

  function nowISO() { return new Date().toISOString(); }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function addMonths(iso, n) { var d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString(); }
  function nextNo(table, field, prefix) {
    var be = new Date().getFullYear() + 543, max = 0;
    S.all(table, { withTrashed: true }).forEach(function (r) {
      var m = String(r[field] || '').match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1]));
    });
    return prefix + '-' + be + '-' + ('000' + (max + 1)).slice(-4);
  }

  /** ฿1,290 */
  MH.money = function (n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 }); };

  /* ---------- labels ---------- */
  Object.assign(MH.labels.role, { expert: 'ผู้เชี่ยวชาญ' });
  Object.assign(MH.labels, {
    provider: { line: 'LINE', google: 'Google', email: 'อีเมล' },
    memberStatus: { active: 'ใช้งานได้', suspended: 'ระงับการใช้งาน' },
    orderStatus: { pending_payment: 'รอชำระเงิน', paid: 'ชำระแล้ว รอแพ็ก', packing: 'กำลังแพ็ก', shipped: 'จัดส่งแล้ว', delivered: 'ได้รับสินค้าแล้ว', cancelled: 'ยกเลิก', refunded: 'คืนเงินแล้ว' },
    paymentStatus: { pending: 'รอชำระ', paid: 'ชำระแล้ว', expired: 'หมดเวลา', refunded: 'คืนเงินแล้ว', unpaid: 'ยังไม่ชำระ' },
    payableType: { order: 'คำสั่งซื้อ', booking: 'นัดผู้เชี่ยวชาญ', enrollment: 'คอร์สเรียน', subscription: 'แพ็กเกจพรีเมียม' },
    bookingStatus: { pending_payment: 'รอชำระเงิน', confirmed: 'ยืนยันแล้ว', completed: 'ปรึกษาเสร็จแล้ว', cancelled: 'ยกเลิก', no_show: 'ไม่มาตามนัด' },
    sessionType: { chat: 'แชต', video: 'วิดีโอคอล', phone: 'โทรศัพท์' },
    expertStatus: { pending: 'รอตรวจคุณสมบัติ', active: 'เปิดรับนัด', suspended: 'ระงับ' },
    subscriptionStatus: { pending_payment: 'รอชำระเงิน', active: 'ใช้งานอยู่', cancelled: 'ยกเลิกแล้ว (ใช้ได้ถึงรอบบิล)', expired: 'หมดอายุ' },
    enrollmentStatus: { pending_payment: 'รอชำระเงิน', active: 'เรียนได้', cancelled: 'ยกเลิก' },
    lessonType: { video: 'วิดีโอ', reading: 'บทอ่าน', quiz: 'แบบทดสอบ' },
    tool: { taksa: 'ทักษา', rasi: 'ราศี', numerology: 'เลขศาสตร์', ai: 'Mahasart AI' }
  });
  Object.assign(MH.labels.table, {
    members: 'สมาชิก', orders: 'คำสั่งซื้อ', order_items: 'รายการสินค้า', payments: 'การชำระเงิน', experts: 'ผู้เชี่ยวชาญ', expert_slots: 'ตารางเวลา',
    expert_bookings: 'นัดผู้เชี่ยวชาญ', expert_reviews: 'รีวิว', courses: 'คอร์สเรียน', course_lessons: 'บทเรียน', course_enrollments: 'การลงทะเบียนเรียน',
    plans: 'แพ็กเกจ', subscriptions: 'การสมัครแพ็กเกจ', ai_conversations: 'บทสนทนา AI', member_saved_readings: 'ผลดูดวงที่บันทึก', member_favorites: 'รายการโปรด'
  });
  Object.assign(MH.labels.action, { pay: 'ชำระเงิน', expire: 'หมดเวลาชำระ', ship: 'จัดส่ง', deliver: 'ส่งถึงแล้ว', cancel: 'ยกเลิก', refund: 'คืนเงิน',
    book: 'จองนัด', complete: 'ปรึกษาเสร็จ', enroll: 'ลงทะเบียนเรียน', subscribe: 'สมัครแพ็กเกจ', unsubscribe: 'ยกเลิกแพ็กเกจ', suspend: 'ระงับ', verify: 'ยืนยันคุณสมบัติ', register: 'สมัครสมาชิก',
    reserve: 'จองสต็อก', restock: 'คืนสต็อก', release: 'ปล่อยคิว', view_pii: 'เปิดดูข้อมูลส่วนบุคคล', view_ai_log: 'เปิดอ่านบทสนทนา AI' });

  /* ---------- สิทธิ์ทีมงานเฟส 2–3 ---------- */
  var P = MH.auth.perms;
  P.catalog = P.catalog.concat(['orders.view', 'orders.manage', 'shop.settings']);
  P.editor = P.editor.concat(['ai.view', 'experts.view', 'bookings.view', 'courses.view', 'courses.edit_any', 'courses.publish']);
  P.astrologer = P.astrologer.concat(['courses.view', 'experts.view']);
  P.expert = ['dashboard', 'expert.self', 'schedule.manage_own', 'bookings.view_own', 'courses.view', 'courses.create', 'courses.edit_own'];

  /* ---------- สมาชิก (ลูกค้า) — session แยกจากทีมงาน ---------- */
  MH.member = {
    current: function () {
      var s = ls(MKEY); if (!s || !s.member_id) return null;
      var m = S.find('members', s.member_id);
      return m && m.status === 'active' && !m.deleted_at ? m : null;
    },
    /** เข้าสู่ระบบจำลอง: provider = line | google | email · profile = { email, display_name } */
    login: function (provider, profile) {
      profile = profile || {};
      var email = String(profile.email || '').trim().toLowerCase();
      var m = S.all('members').find(function (x) { return x.email.toLowerCase() === email; });
      if (m && m.status !== 'active') return { error: 'บัญชีนี้ถูกระงับการใช้งาน ติดต่อทีมงานทาง LINE OA' };
      if (!m) {
        if (provider === 'email') return { error: 'ไม่พบบัญชีที่ใช้อีเมลนี้ ลองสมัครสมาชิกก่อน' };
        m = MH.member.register({ display_name: profile.display_name || email.split('@')[0], email: email, auth_provider: provider });
      }
      S.update('members', m.id, { last_login_at: nowISO() }, 'login');
      ls(MKEY, { member_id: m.id, at: nowISO() });
      return { member: S.find('members', m.id) };
    },
    register: function (data) {
      var row = Object.assign({ display_name: '', email: '', auth_provider: 'email', phone: '', birth_date: null, birth_time: null, birthday_key: null,
        consent_birthdata_at: null, consent_marketing: false, plan: 'free', status: 'active', last_login_at: nowISO() }, data);
      var m = S.insert('members', row);
      S._log('register', 'members', m.id, { provider: row.auth_provider });
      return m;
    },
    logout: function () { ls(MKEY, {}); },
    emailTaken: function (email) { email = String(email || '').trim().toLowerCase(); return S.all('members').some(function (x) { return x.email.toLowerCase() === email; }); },
    /** แพ็กเกจที่มีผลตอนนี้ (subscription active หรือ cancelled ที่ยังไม่ถึงรอบบิล) */
    plan: function (m) {
      m = m || MH.member.current();
      var free = MH.q.plan('free');
      if (!m) return free;
      var sub = MH.q.activeSubscription(m.id);
      return sub ? MH.q.plan(sub.plan_key) : free;
    },
    isPremium: function (m) { return MH.member.plan(m).key === 'premium'; },
    /** ลิงก์ไปหน้าเข้าสู่ระบบ แล้วกลับมาหน้าเดิม */
    loginUrl: function () { var p = location.pathname.split('/').pop() + location.search; return MH.base + 'login.html?next=' + encodeURIComponent(p); },
    /** เรียกก่อนทำสิ่งที่ต้องล็อกอิน · คืน member หรือพาไปหน้าเข้าสู่ระบบ */
    require: function () { var m = MH.member.current(); if (!m) location.href = MH.member.loginUrl(); return m; }
  };

  /* ---------- ตะกร้า (เก็บในเบราว์เซอร์จนกว่าจะสั่งซื้อ) ---------- */
  function cartRaw() { var c = ls(CKEY); return c && c.items ? c : { items: [] }; }
  MH.cart = {
    /** [{ amulet, qty, line_total, problem }] · problem = เหตุที่ซื้อไม่ได้ตอนนี้ */
    items: function () {
      return cartRaw().items.map(function (it) {
        var a = S.find('amulets', it.amulet_id), problem = '';
        if (!a || !MH.q.isLive(a)) problem = 'สินค้านี้ไม่เปิดขายแล้ว';
        else if (!a.is_price_visible || a.price_amount == null) problem = 'สินค้านี้ยังไม่เปิดให้สั่งซื้อออนไลน์';
        else if (a.stock_status === 'not_for_sale' || a.stock_status === 'sold') problem = 'สินค้าหมด';
        else if ((a.stock_qty || 0) < it.qty) problem = (a.stock_qty || 0) ? 'เหลือเพียง ' + a.stock_qty + ' ชิ้น' : 'สินค้าหมด';
        return { amulet: a, qty: it.qty, line_total: a ? (a.price_amount || 0) * it.qty : 0, problem: problem };
      });
    },
    count: function () { return cartRaw().items.reduce(function (s, it) { return s + it.qty; }, 0); },
    /** คืน { ok, error } */
    add: function (amuletId, qty) {
      qty = qty || 1;
      var a = S.find('amulets', amuletId);
      if (!a || !MH.q.isLive(a) || !a.is_price_visible) return { ok: false, error: 'สินค้านี้ยังไม่เปิดให้สั่งซื้อออนไลน์' };
      var c = cartRaw(), it = c.items.find(function (x) { return x.amulet_id === a.id; });
      var want = (it ? it.qty : 0) + qty;
      if (want > (a.stock_qty || 0)) return { ok: false, error: (a.stock_qty || 0) ? 'เหลือเพียง ' + a.stock_qty + ' ชิ้น' : 'สินค้าหมด' };
      if (it) it.qty = want; else c.items.push({ amulet_id: a.id, qty: qty });
      ls(CKEY, c); MH.cart._notify();
      return { ok: true };
    },
    setQty: function (amuletId, qty) {
      var c = cartRaw();
      c.items = c.items.map(function (x) { return x.amulet_id === Number(amuletId) ? { amulet_id: x.amulet_id, qty: Math.max(0, qty) } : x; }).filter(function (x) { return x.qty > 0; });
      ls(CKEY, c); MH.cart._notify();
    },
    remove: function (amuletId) { MH.cart.setQty(amuletId, 0); },
    clear: function () { ls(CKEY, { items: [] }); MH.cart._notify(); },
    /** { subtotal, shipping_fee, total, free_shipping_min, missing_for_free } */
    totals: function (items) {
      items = items || MH.cart.items();
      var sub = items.filter(function (x) { return !x.problem; }).reduce(function (s, x) { return s + x.line_total; }, 0);
      var fee = S.setting('shipping_fee') || 0, min = S.setting('free_shipping_min') || 0;
      var shipping = sub === 0 || (min && sub >= min) ? 0 : fee;
      return { subtotal: sub, shipping_fee: shipping, total: sub + shipping, free_shipping_min: min, missing_for_free: min && sub < min ? min - sub : 0 };
    },
    _notify: function () { document.dispatchEvent(new CustomEvent('mh:cart')); }
  };

  /* ---------- การชำระเงิน PromptPay (จำลอง) ----------
     ระบบจริง: สร้าง QR ผ่าน payment gateway และยืนยันจาก webhook เท่านั้น ห้ามเชื่อปุ่มหน้าบ้าน
     ต้นแบบ: หน้า payment.html มีปุ่ม "จำลองว่าโอนแล้ว" เพื่อเดินวงจรต่อ */
  MH.pay = {
    create: function (payableType, payableId, memberId, amount) {
      var mins = S.setting('payment_timeout_min') || 30, exp = new Date(); exp.setMinutes(exp.getMinutes() + mins);
      var id = S.all('payments', { withTrashed: true }).reduce(function (m, p) { return Math.max(m, p.id); }, 0) + 1;
      return S.insert('payments', { ref: 'PAY-' + ('000' + id).slice(-4), payable_type: payableType, payable_id: payableId, member_id: memberId,
        amount: amount, method: 'promptpay', status: 'pending', expires_at: exp.toISOString(), paid_at: null, gateway_ref: '' });
    },
    byRef: function (ref) { return S.all('payments').find(function (p) { return p.ref === ref; }) || null; },
    forPayable: function (type, id) { return S.all('payments').filter(function (p) { return p.payable_type === type && p.payable_id === Number(id); }).sort(function (a, b) { return b.id - a.id; }); },
    /** ยืนยันการชำระ แล้วอัปเดตสิ่งที่จ่ายให้ (คำสั่งซื้อ / นัด / คอร์ส / แพ็กเกจ) */
    markPaid: function (paymentId) {
      var p = S.find('payments', paymentId);
      if (!p || p.status !== 'pending') return { ok: false, error: p ? 'รายการนี้' + (MH.labels.paymentStatus[p.status] || p.status) + 'แล้ว' : 'ไม่พบรายการชำระเงิน' };
      if (new Date(p.expires_at) < new Date()) { MH.pay.expire(p.id); return { ok: false, error: 'หมดเวลาชำระเงินแล้ว' }; }
      /* สิ่งที่จ่ายต้องยังรอชำระอยู่ (กันจ่ายรายการที่ถูกยกเลิกไปแล้ว) */
      var TBL = { order: 'orders', booking: 'expert_bookings', enrollment: 'course_enrollments', subscription: 'subscriptions' };
      var target = S.find(TBL[p.payable_type], p.payable_id);
      if (!target || target.status !== 'pending_payment') {
        S.update('payments', p.id, { status: 'expired' }, 'expire');
        return { ok: false, error: 'รายการนี้ถูกยกเลิกหรือดำเนินการไปแล้ว จึงชำระไม่ได้' };
      }
      var now = nowISO();
      S.update('payments', p.id, { status: 'paid', paid_at: now, gateway_ref: 'DEMO-GW-' + ('000' + p.id).slice(-4) }, 'pay');
      if (p.payable_type === 'order') S.update('orders', p.payable_id, { status: 'paid', payment_status: 'paid', paid_at: now }, 'pay');
      if (p.payable_type === 'booking') S.update('expert_bookings', p.payable_id, { status: 'confirmed' }, 'pay');
      if (p.payable_type === 'enrollment') S.update('course_enrollments', p.payable_id, { status: 'active', enrolled_at: now }, 'pay');
      if (p.payable_type === 'subscription') {
        S.update('subscriptions', p.payable_id, { status: 'active', started_at: now, renews_at: addMonths(now, 1), cancelled_at: null }, 'subscribe');
        var sub = S.find('subscriptions', p.payable_id); if (sub) S.update('members', sub.member_id, { plan: sub.plan_key });
      }
      return { ok: true };
    },
    /** หมดเวลาชำระ: คืนสต็อก / ปล่อยคิว / ยกเลิกรายการที่ค้าง */
    expire: function (paymentId) {
      var p = S.find('payments', paymentId); if (!p || p.status !== 'pending') return;
      S.update('payments', p.id, { status: 'expired' }, 'expire');
      var why = 'ไม่ชำระเงินภายในเวลาที่กำหนด ระบบยกเลิกอัตโนมัติ';
      if (p.payable_type === 'order') MH.commerce.cancelOrder(p.payable_id, why, true);
      if (p.payable_type === 'booking') MH.commerce.cancelBooking(p.payable_id, why, true);
      if (p.payable_type === 'enrollment') S.update('course_enrollments', p.payable_id, { status: 'cancelled' }, 'expire');
      if (p.payable_type === 'subscription') S.update('subscriptions', p.payable_id, { status: 'expired' }, 'expire');
    },
    /** เรียกตอนโหลดหน้า: รายการที่เลยเวลาให้หมดอายุ */
    sweep: function () {
      S.all('payments').filter(function (p) { return p.status === 'pending' && new Date(p.expires_at) < new Date(); }).forEach(function (p) { MH.pay.expire(p.id); });
    },
    /** ลิงก์ไปหน้าชำระเงิน */
    url: function (p) { return MH.base + 'payment.html?ref=' + encodeURIComponent(p.ref); }
  };

  /* ---------- คำสั่งซื้อ นัด คอร์ส แพ็กเกจ ---------- */
  MH.commerce = {
    /** shipping = { name, phone, line, subdistrict, district, province, postcode } · คืน { order, payment } หรือ { error } */
    placeOrder: function (shipping, note) {
      var m = MH.member.current(); if (!m) return { error: 'ต้องเข้าสู่ระบบก่อนสั่งซื้อ' };
      var items = MH.cart.items(), bad = items.filter(function (x) { return x.problem; });
      if (!items.length) return { error: 'ตะกร้ายังว่าง' };
      if (bad.length) return { error: bad.map(function (x) { return (x.amulet ? x.amulet.name : 'สินค้า') + ': ' + x.problem; }).join(' · ') };
      var t = MH.cart.totals(items);
      var order = S.insert('orders', { order_no: nextNo('orders', 'order_no', 'MO'), member_id: m.id, status: 'pending_payment', subtotal: t.subtotal, shipping_fee: t.shipping_fee, total: t.total,
        shipping: shipping, shipping_method: 'ems', tracking_no: '', payment_status: 'unpaid', paid_at: null, note: note || '', shipped_at: null, delivered_at: null });
      items.forEach(function (x) {
        S.insert('order_items', { order_id: order.id, amulet_id: x.amulet.id, code: x.amulet.code, name: x.amulet.name, price: x.amulet.price_amount, qty: x.qty });
        S.update('amulets', x.amulet.id, { stock_qty: (x.amulet.stock_qty || 0) - x.qty }, 'reserve');     // จองสต็อกทันที
      });
      var payment = MH.pay.create('order', order.id, m.id, t.total);
      MH.cart.clear();
      return { order: order, payment: payment };
    },
    /** ยกเลิกคำสั่งซื้อ + คืนสต็อก · ถ้าจ่ายแล้วเปลี่ยนเป็นคืนเงิน */
    cancelOrder: function (orderId, reason, byTimeout) {
      var o = S.find('orders', orderId); if (!o || ['cancelled', 'refunded', 'delivered'].indexOf(o.status) >= 0) return false;
      var paid = o.payment_status === 'paid';
      S.update('orders', o.id, { status: paid ? 'refunded' : 'cancelled', payment_status: paid ? 'refunded' : (byTimeout ? 'expired' : 'unpaid'), cancelled_reason: reason || '' }, paid ? 'refund' : 'cancel');
      S.all('order_items').filter(function (i) { return i.order_id === o.id; }).forEach(function (i) {
        var a = S.find('amulets', i.amulet_id); if (a) S.update('amulets', a.id, { stock_qty: (a.stock_qty || 0) + i.qty }, 'restock');
      });
      MH.pay.forPayable('order', o.id).forEach(function (p) {
        if (paid && p.status === 'paid') S.update('payments', p.id, { status: 'refunded' }, 'refund');
        if (p.status === 'pending') S.update('payments', p.id, { status: 'expired' }, 'expire');   // ปิด QR ที่ค้าง
      });
      return true;
    },
    /** จองนัด: คืน { booking, payment } หรือ { error } · สมาชิกพรีเมียมได้ส่วนลดตามแพ็กเกจ */
    createBooking: function (expertId, slotId, sessionType, topic) {
      var m = MH.member.current(); if (!m) return { error: 'ต้องเข้าสู่ระบบก่อนจองนัด' };
      var e = S.find('experts', expertId); if (!e || e.status !== 'active') return { error: 'ผู้เชี่ยวชาญท่านนี้ยังไม่เปิดรับนัด' };
      var slot = S.find('expert_slots', slotId);
      if (!slot || slot.expert_id !== e.id || slot.status !== 'open' || new Date(slot.start_at) <= new Date()) return { error: 'ช่วงเวลานี้ถูกจองไปแล้ว เลือกเวลาอื่น' };
      var st = e.session_types.find(function (t) { return t.type === sessionType; }); if (!st) return { error: 'เลือกช่องทางปรึกษา' };
      var disc = Math.round(st.price * (MH.member.plan(m).booking_discount || 0));
      var b = S.insert('expert_bookings', { booking_no: nextNo('expert_bookings', 'booking_no', 'BK'), member_id: m.id, expert_id: e.id, slot_id: slot.id, start_at: slot.start_at,
        session_type: st.type, minutes: st.minutes, topic: topic || '', price: st.price, discount: disc, total: st.price - disc, status: 'pending_payment', meeting_note: '', completed_at: null, cancelled_reason: '' });
      S.update('expert_slots', slot.id, { status: 'booked' }, 'book');
      return { booking: b, payment: MH.pay.create('booking', b.id, m.id, b.total) };
    },
    /** ยกเลิกนัด + ปล่อยคิว · คืนเงินเต็มถ้ายกเลิกก่อน booking_cancel_hours */
    cancelBooking: function (bookingId, reason, byTimeout) {
      var b = S.find('expert_bookings', bookingId); if (!b || ['cancelled', 'completed', 'no_show'].indexOf(b.status) >= 0) return { ok: false };
      var hrs = S.setting('booking_cancel_hours') || 24, early = b.start_at && (new Date(b.start_at) - new Date()) / 36e5 >= hrs;
      S.update('expert_bookings', b.id, { status: 'cancelled', cancelled_reason: reason || '' }, 'cancel');
      if (b.slot_id) S.update('expert_slots', b.slot_id, { status: 'open' }, 'release');
      var refunded = false;
      MH.pay.forPayable('booking', b.id).forEach(function (p) {
        if (!byTimeout && early && p.status === 'paid') { S.update('payments', p.id, { status: 'refunded' }, 'refund'); refunded = true; }
        if (p.status === 'pending') S.update('payments', p.id, { status: 'expired' }, 'expire');
      });
      return { ok: true, refunded: refunded, early: early };
    },
    /** ลงทะเบียนคอร์ส: พรีเมียม + คอร์สร่วมรายการ = เรียนฟรีทันที, นอกนั้นสร้างรายการชำระเงิน */
    enroll: function (courseId) {
      var m = MH.member.current(); if (!m) return { error: 'ต้องเข้าสู่ระบบก่อนลงทะเบียนเรียน' };
      var c = S.find('courses', courseId); if (!c || c.status !== 'published') return { error: 'คอร์สนี้ยังไม่เปิดสอน' };
      var ex = MH.q.enrollment(m.id, c.id);
      if (ex && ex.status === 'active') return { enrollment: ex };
      /* มีรายการรอชำระที่ยังไม่หมดเวลา → ใช้อันเดิม ไม่สร้าง QR ซ้ำ */
      if (ex && ex.status === 'pending_payment') {
        var open = MH.pay.forPayable('enrollment', ex.id).filter(function (p) { return p.status === 'pending' && new Date(p.expires_at) > new Date(); })[0];
        if (open) return { enrollment: ex, payment: open };
      }
      var free = c.included_in_premium && MH.member.isPremium(m);
      var row = { member_id: m.id, course_id: c.id, source: free ? 'premium' : 'purchase', status: free ? 'active' : 'pending_payment', progress: [], quiz_scores: {}, enrolled_at: free ? nowISO() : null, completed_at: null, certificate_no: '' };
      var en = ex ? S.update('course_enrollments', ex.id, row, 'enroll') : S.insert('course_enrollments', row);
      if (free) return { enrollment: en };
      return { enrollment: en, payment: MH.pay.create('enrollment', en.id, m.id, c.price) };
    },
    /** บันทึกว่าเรียนบทนี้จบ · ครบทุกบทและผ่านแบบทดสอบ → ออกเลขที่เกียรติบัตร */
    completeLesson: function (enrollmentId, lessonId, quizScore) {
      var en = S.find('course_enrollments', enrollmentId); if (!en || en.status !== 'active') return null;
      var prog = (en.progress || []).slice(); if (prog.indexOf(lessonId) < 0) prog.push(lessonId);
      var scores = Object.assign({}, en.quiz_scores || {}); if (quizScore != null) scores[lessonId] = Math.max(quizScore, scores[lessonId] || 0);   // เก็บคะแนนที่ดีที่สุด
      var patch = { progress: prog, quiz_scores: scores };
      var lessons = MH.q.lessons(en.course_id);
      var done = lessons.every(function (l) { return prog.indexOf(l.id) >= 0 && (l.type !== 'quiz' || (scores[l.id] || 0) >= (l.pass_score || 0)); });
      if (done && !en.certificate_no) { patch.completed_at = nowISO(); patch.certificate_no = nextNo('course_enrollments', 'certificate_no', 'CERT'); }
      return S.update('course_enrollments', en.id, patch, done && !en.certificate_no ? 'complete' : 'update');
    },
    /** สมัครพรีเมียม → สร้างรายการชำระเงินรายเดือนแรก */
    subscribe: function (planKey) {
      var m = MH.member.current(); if (!m) return { error: 'ต้องเข้าสู่ระบบก่อนสมัครแพ็กเกจ' };
      var plan = MH.q.plan(planKey); if (!plan || !plan.price_month) return { error: 'ไม่พบแพ็กเกจ' };
      var cur = MH.q.activeSubscription(m.id);
      if (cur && cur.status === 'active') return { error: 'คุณเป็นสมาชิก' + plan.name + 'อยู่แล้ว' };
      /* ยกเลิกต่ออายุไว้แต่ยังไม่ครบรอบ → กลับมาต่ออายุตามเดิม ไม่ต้องจ่ายซ้ำในรอบนี้ */
      if (cur && cur.status === 'cancelled') {
        return { subscription: S.update('subscriptions', cur.id, { status: 'active', cancelled_at: null }, 'subscribe'), resumed: true };
      }
      var sub = S.insert('subscriptions', { member_id: m.id, plan_key: plan.key, status: 'pending_payment', started_at: null, renews_at: null, cancelled_at: null });
      return { subscription: sub, payment: MH.pay.create('subscription', sub.id, m.id, plan.price_month) };
    },
    /** ยกเลิกต่ออายุ: ใช้ได้ถึงวันครบรอบบิล */
    cancelSubscription: function (subId) {
      var s = S.find('subscriptions', subId); if (!s || s.status !== 'active') return false;
      S.update('subscriptions', s.id, { status: 'cancelled', cancelled_at: nowISO() }, 'unsubscribe');
      return true;
    }
  };

  /* ---------- queries เฟส 2–3 ---------- */
  Object.assign(MH.q, {
    plan: function (key) { return S.all('plans').find(function (p) { return p.key === key; }) || null; },
    plans: function () { return S.all('plans').filter(function (p) { return p.is_active; }); },
    /** subscription ที่ยังให้สิทธิ์อยู่ (active หรือ cancelled ที่ยังไม่ถึง renews_at) */
    activeSubscription: function (memberId) {
      var now = new Date();
      return S.all('subscriptions').filter(function (s) {
        return s.member_id === Number(memberId) && (s.status === 'active' || (s.status === 'cancelled' && s.renews_at && new Date(s.renews_at) > now));
      }).sort(function (a, b) { return b.id - a.id; })[0] || null;
    },
    /** โควตา AI วันนี้ { limit, used, left } */
    aiQuota: function (member) {
      member = member || MH.member.current();
      if (!member) return { limit: S.setting('ai_quota_guest') || 0, used: 0, left: S.setting('ai_quota_guest') || 0 };
      var limit = MH.member.plan(member).ai_daily_quota || 0, today = MH.util.todayISO();
      var row = S.all('ai_usage_daily').find(function (u) { return u.member_id === member.id && u.usage_date === today; });
      var used = row ? row.questions : 0;
      return { limit: limit, used: used, left: Math.max(0, limit - used) };
    },
    useAiQuota: function (memberId) {
      var today = MH.util.todayISO();
      var row = S.all('ai_usage_daily').find(function (u) { return u.member_id === memberId && u.usage_date === today; });
      if (row) S.update('ai_usage_daily', row.id, { questions: row.questions + 1 }); else S.insert('ai_usage_daily', { member_id: memberId, usage_date: today, questions: 1 });
    },
    experts: function () { return S.all('experts').filter(function (e) { return e.status === 'active'; }); },
    expert: function (slug) { return S.all('experts').find(function (e) { return e.slug === slug; }) || null; },
    /** { avg, count } จากรีวิวที่แสดงอยู่ */
    expertRating: function (expertId) {
      var r = S.all('expert_reviews').filter(function (x) { return x.expert_id === Number(expertId) && x.status === 'published'; });
      return { avg: r.length ? Math.round(r.reduce(function (s, x) { return s + x.rating; }, 0) / r.length * 10) / 10 : 0, count: r.length };
    },
    openSlots: function (expertId) {
      var now = new Date();
      return S.all('expert_slots').filter(function (s) { return s.expert_id === Number(expertId) && s.status === 'open' && new Date(s.start_at) > now; })
        .sort(function (a, b) { return a.start_at.localeCompare(b.start_at); });
    },
    courses: function () { return S.all('courses').filter(function (c) { return c.status === 'published'; }); },
    course: function (slug) { return S.all('courses').find(function (c) { return c.slug === slug; }) || null; },
    lessons: function (courseId) { return S.all('course_lessons').filter(function (l) { return l.course_id === Number(courseId); }).sort(function (a, b) { return a.sort - b.sort; }); },
    enrollment: function (memberId, courseId) { return S.all('course_enrollments').filter(function (e) { return e.member_id === Number(memberId) && e.course_id === Number(courseId); }).sort(function (a, b) { return b.id - a.id; })[0] || null; },
    favorite: function (memberId, type, refId) { return S.all('member_favorites').find(function (f) { return f.member_id === Number(memberId) && f.type === type && f.ref_id === Number(refId); }) || null; }
  });

  /* หมดเวลาชำระเงินที่ค้าง (ทำทุกครั้งที่เปิดหน้า เหมือน cron ในระบบจริง) */
  MH.pay.sweep();
})();
