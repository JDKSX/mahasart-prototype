/* ข้อมูลตัวอย่างเฟส 2: สมาชิก ร้านค้า การชำระเงิน (PromptPay) และ Mahasart AI
   ชื่อสมาชิกทั้งหมดเป็นชื่อสมมติ · เงินเป็นบาท (DECIMAL) · วันที่ ค.ศ. ISO */
window.MAHASART_DATA = window.MAHASART_DATA || {};
(function (D) {

  /* ---------- ราคาและสต็อกวัตถุมงคล (เฟส 2 เปิดแสดงราคา) ---------- */
  var PRICE = { 1: [399, 12], 2: [299, 30], 3: [590, 8], 4: [1290, 0], 5: [12000, 1], 6: [450, 5], 7: [350, 0] };
  (D.amulets || []).forEach(function (m) {
    var p = PRICE[m.id];
    if (p) { m.price_amount = p[0]; m.is_price_visible = true; m.stock_qty = p[1]; }
    else { m.stock_qty = 0; }
  });

  /* ---------- สมาชิก (ลูกค้า) — แยกจาก users ที่เป็นทีมงาน ----------
     auth_provider: line | google | email · plan: free | premium (ดู subscriptions ใน phase3.js) */
  D.members = [
    { id: 1, display_name: 'นภา สุขใจ', email: 'napa@example.com', auth_provider: 'line', phone: '081-000-0001',
      birth_date: '1990-03-16', birth_time: '07:30', birthday_key: 'friday', consent_birthdata_at: '2026-10-02T10:00:00+07:00', consent_marketing: true,
      plan: 'premium', status: 'active', created_at: '2026-10-02T10:00:00+07:00', last_login_at: '2026-10-26T07:40:00+07:00', deleted_at: null },
    { id: 2, display_name: 'ธนพล มีโชค', email: 'thanapon@example.com', auth_provider: 'google', phone: '',
      birth_date: null, birth_time: null, birthday_key: null, consent_birthdata_at: null, consent_marketing: false,
      plan: 'free', status: 'active', created_at: '2026-10-08T19:20:00+07:00', last_login_at: '2026-10-25T21:05:00+07:00', deleted_at: null },
    { id: 3, display_name: 'วิมล ศรีงาม', email: 'wimon@example.com', auth_provider: 'email', phone: '089-000-0003',
      birth_date: null, birth_time: null, birthday_key: null, consent_birthdata_at: null, consent_marketing: false,
      plan: 'free', status: 'active', created_at: '2026-10-15T08:00:00+07:00', last_login_at: '2026-10-24T12:30:00+07:00', deleted_at: null },
    { id: 4, display_name: 'สมศักดิ์ ทองดี', email: 'somsak@example.com', auth_provider: 'line', phone: '086-000-0004',
      birth_date: '1972-11-02', birth_time: null, birthday_key: 'thursday', consent_birthdata_at: '2026-10-05T09:00:00+07:00', consent_marketing: true,
      plan: 'premium', status: 'active', created_at: '2026-10-05T09:00:00+07:00', last_login_at: '2026-10-23T18:10:00+07:00', deleted_at: null },
    { id: 5, display_name: 'ปริญญา ใจดี', email: 'parinya@example.com', auth_provider: 'email', phone: '',
      birth_date: null, birth_time: null, birthday_key: null, consent_birthdata_at: null, consent_marketing: false,
      plan: 'free', status: 'suspended', suspend_reason: 'ตัวอย่าง: แจ้งโอนเงินปลอมซ้ำ', created_at: '2026-10-10T11:00:00+07:00', last_login_at: '2026-10-12T11:00:00+07:00', deleted_at: null }
  ];

  /* ผลดูดวงที่สมาชิกบันทึกไว้ (เก็บเมื่อสมาชิกกดบันทึกเองเท่านั้น) · tool: taksa | rasi | numerology | ai */
  D.member_saved_readings = [
    { id: 1, member_id: 1, tool: 'taksa', title: 'ทักษา: เกิดวันศุกร์', input: { day: 'friday' }, summary: 'สีเสริมโชค (ศรี) ชมพู · สีที่ควรเลี่ยง (กาลกิณี) เทาดำ', created_at: '2026-10-20T08:15:00+07:00' },
    { id: 2, member_id: 1, tool: 'rasi', title: 'ราศีจากวันเกิด 16 มี.ค.', input: { month: 3, day: 16 }, summary: 'ราศีมีน', created_at: '2026-10-20T08:20:00+07:00' },
    { id: 3, member_id: 4, tool: 'taksa', title: 'ทักษา: เกิดวันพฤหัสบดี', input: { day: 'thursday' }, summary: 'สีเสริมโชค (ศรี) แดง · สีที่ควรเลี่ยง (กาลกิณี) ม่วง', created_at: '2026-10-21T19:00:00+07:00' }
  ];

  /* รายการโปรด · type: article | amulet | expert | course */
  D.member_favorites = [
    { id: 1, member_id: 1, type: 'article', ref_id: 1, created_at: '2026-10-24T09:00:00+07:00' },
    { id: 2, member_id: 1, type: 'amulet', ref_id: 3, created_at: '2026-10-24T09:02:00+07:00' },
    { id: 3, member_id: 2, type: 'amulet', ref_id: 5, created_at: '2026-10-25T21:00:00+07:00' }
  ];

  /* ---------- คำสั่งซื้อ ----------
     status: pending_payment | paid | packing | shipped | delivered | cancelled | refunded
     ที่อยู่เก็บแยกช่องตามแบบไทย (ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์) · ราคาในรายการเป็น snapshot ณ วันที่สั่ง */
  function addr(name, phone, line, sub, dist, prov, zip) { return { name: name, phone: phone, line: line, subdistrict: sub, district: dist, province: prov, postcode: zip }; }
  D.orders = [
    { id: 1, order_no: 'MO-2569-0001', member_id: 1, status: 'delivered', subtotal: 989, shipping_fee: 60, total: 1049,
      shipping: addr('นภา สุขใจ', '081-000-0001', '99/1 หมู่ 2', 'โพธิ์', 'เมืองศรีสะเกษ', 'ศรีสะเกษ', '33000'), shipping_method: 'ems', tracking_no: 'EB000000001TH',
      payment_status: 'paid', paid_at: '2026-10-12T10:05:00+07:00', note: '', created_at: '2026-10-12T10:00:00+07:00', updated_at: '2026-10-15T14:00:00+07:00', shipped_at: '2026-10-13T09:00:00+07:00', delivered_at: '2026-10-15T14:00:00+07:00', deleted_at: null },
    { id: 2, order_no: 'MO-2569-0002', member_id: 4, status: 'shipped', subtotal: 1290, shipping_fee: 60, total: 1350,
      shipping: addr('สมศักดิ์ ทองดี', '086-000-0004', '12 ซอยตัวอย่าง', 'ในเมือง', 'เมืองขอนแก่น', 'ขอนแก่น', '40000'), shipping_method: 'ems', tracking_no: 'EB000000002TH',
      payment_status: 'paid', paid_at: '2026-10-22T18:31:00+07:00', note: 'ฝากห่อกันกระแทกให้ด้วย', created_at: '2026-10-22T18:30:00+07:00', updated_at: '2026-10-24T09:00:00+07:00', shipped_at: '2026-10-24T09:00:00+07:00', delivered_at: null, deleted_at: null },
    { id: 3, order_no: 'MO-2569-0003', member_id: 2, status: 'paid', subtotal: 598, shipping_fee: 60, total: 658,
      shipping: addr('ธนพล มีโชค', '082-000-0002', '45/7 ถนนตัวอย่าง', 'ลาดยาว', 'จตุจักร', 'กรุงเทพมหานคร', '10900'), shipping_method: 'ems', tracking_no: '',
      payment_status: 'paid', paid_at: '2026-10-25T21:12:00+07:00', note: '', created_at: '2026-10-25T21:10:00+07:00', updated_at: '2026-10-25T21:12:00+07:00', shipped_at: null, delivered_at: null, deleted_at: null },
    { id: 4, order_no: 'MO-2569-0004', member_id: 3, status: 'pending_payment', subtotal: 450, shipping_fee: 60, total: 510,
      shipping: addr('วิมล ศรีงาม', '089-000-0003', '8 หมู่ 5', 'หนองครก', 'เมืองศรีสะเกษ', 'ศรีสะเกษ', '33000'), shipping_method: 'ems', tracking_no: '',
      payment_status: 'unpaid', paid_at: null, note: '', created_at: '2026-10-26T08:50:00+07:00', updated_at: '2026-10-26T08:50:00+07:00', shipped_at: null, delivered_at: null, deleted_at: null },
    { id: 5, order_no: 'MO-2569-0005', member_id: 2, status: 'cancelled', subtotal: 12000, shipping_fee: 0, total: 12000,
      shipping: addr('ธนพล มีโชค', '082-000-0002', '45/7 ถนนตัวอย่าง', 'ลาดยาว', 'จตุจักร', 'กรุงเทพมหานคร', '10900'), shipping_method: 'ems', tracking_no: '',
      payment_status: 'expired', paid_at: null, note: '', cancelled_reason: 'ไม่ชำระเงินภายใน 30 นาที ระบบยกเลิกและคืนสต็อกอัตโนมัติ', created_at: '2026-10-20T13:00:00+07:00', updated_at: '2026-10-20T13:31:00+07:00', shipped_at: null, delivered_at: null, deleted_at: null }
  ];
  D.order_items = [
    { id: 1, order_id: 1, amulet_id: 3, code: 'MH-0003', name: 'กำไลหินมงคล', price: 590, qty: 1 },
    { id: 2, order_id: 1, amulet_id: 1, code: 'MH-0001', name: 'พระสมเด็จวัดระฆัง (รุ่นจำลองเพื่อบูชา)', price: 399, qty: 1 },
    { id: 3, order_id: 2, amulet_id: 4, code: 'MH-0004', name: 'ท้าวเวสสุวรรณ', price: 1290, qty: 1 },
    { id: 4, order_id: 3, amulet_id: 2, code: 'MH-0002', name: 'เหรียญหลวงพ่อรวย วัดตะโก', price: 299, qty: 2 },
    { id: 5, order_id: 4, amulet_id: 6, code: 'MH-0006', name: 'หินอเมทิสต์', price: 450, qty: 1 },
    { id: 6, order_id: 5, amulet_id: 5, code: 'MH-0005', name: 'พระปิดตา เนื้อผง', price: 12000, qty: 1 }
  ];

  /* ---------- การชำระเงิน (ใช้ร่วมกันทุกประเภท) ----------
     payable_type: order | booking | enrollment | subscription · method: promptpay เท่านั้น
     status: pending | paid | expired | refunded · ระบบจริงยืนยันจาก webhook ของ payment gateway ไม่เชื่อค่าจากหน้าบ้าน */
  D.payments = [
    { id: 1, ref: 'PAY-0001', payable_type: 'order', payable_id: 1, member_id: 1, amount: 1049, method: 'promptpay', status: 'paid', created_at: '2026-10-12T10:00:00+07:00', expires_at: '2026-10-12T10:30:00+07:00', paid_at: '2026-10-12T10:05:00+07:00', gateway_ref: 'DEMO-GW-0001' },
    { id: 2, ref: 'PAY-0002', payable_type: 'order', payable_id: 2, member_id: 4, amount: 1350, method: 'promptpay', status: 'paid', created_at: '2026-10-22T18:30:00+07:00', expires_at: '2026-10-22T19:00:00+07:00', paid_at: '2026-10-22T18:31:00+07:00', gateway_ref: 'DEMO-GW-0002' },
    { id: 3, ref: 'PAY-0003', payable_type: 'order', payable_id: 3, member_id: 2, amount: 658, method: 'promptpay', status: 'paid', created_at: '2026-10-25T21:10:00+07:00', expires_at: '2026-10-25T21:40:00+07:00', paid_at: '2026-10-25T21:12:00+07:00', gateway_ref: 'DEMO-GW-0003' },
    { id: 4, ref: 'PAY-0004', payable_type: 'order', payable_id: 4, member_id: 3, amount: 510, method: 'promptpay', status: 'pending', created_at: '2026-10-26T08:50:00+07:00', expires_at: '2026-10-26T09:20:00+07:00', paid_at: null, gateway_ref: '' },
    { id: 5, ref: 'PAY-0005', payable_type: 'order', payable_id: 5, member_id: 2, amount: 12000, method: 'promptpay', status: 'expired', created_at: '2026-10-20T13:00:00+07:00', expires_at: '2026-10-20T13:30:00+07:00', paid_at: null, gateway_ref: '' }
  ];

  /* รายการที่รอชำระให้หมดเวลาหลังเปิดต้นแบบ 25 นาที (ไม่งั้นจะหมดอายุทันทีเพราะวันที่ในข้อมูลเป็นวันในอดีต) */
  D.payments.forEach(function (p) { if (p.status === 'pending') { var e = new Date(); e.setMinutes(e.getMinutes() + 25); p.expires_at = e.toISOString(); } });

  /* ---------- Mahasart AI ----------
     เก็บบทสนทนาเฉพาะสมาชิกที่ล็อกอิน · guard: null | crisis | health | finance | legal | purchase */
  D.ai_conversations = [
    { id: 1, member_id: 1, title: 'ทักษาของคนเกิดวันศุกร์', mode: 'explain', created_at: '2026-10-25T20:00:00+07:00', updated_at: '2026-10-25T20:02:00+07:00', deleted_at: null },
    { id: 2, member_id: 2, title: 'ราศีไทยกับสากลต่างกันไหม', mode: 'ask', created_at: '2026-10-25T21:30:00+07:00', updated_at: '2026-10-25T21:31:00+07:00', deleted_at: null }
  ];
  D.ai_messages = [
    { id: 1, conversation_id: 1, role: 'user', content: 'ช่วยอธิบายทักษาของคนเกิดวันศุกร์หน่อย', guard: null, sources: [], created_at: '2026-10-25T20:00:00+07:00' },
    { id: 2, conversation_id: 1, role: 'assistant', content: 'คนเกิดวันศุกร์มีดาวศุกร์เป็นบริวาร ตำแหน่งศรี (โชคลาภ) คือดาวอังคาร สีที่ถือว่าเสริมโชคตามความเชื่อจึงเป็นสีชมพู ส่วนกาลกิณีคือราหู ควรเลี่ยงสีเทาดำ ทั้งหมดนี้คำนวณตามหลักทักษาปกรณ์และเป็นไปตามความเชื่อ', guard: null, sources: [1], created_at: '2026-10-25T20:00:05+07:00' },
    { id: 3, conversation_id: 2, role: 'user', content: 'ทำไมราศีในเว็บไทยกับเว็บฝรั่งไม่ตรงกัน', guard: null, sources: [], created_at: '2026-10-25T21:30:00+07:00' },
    { id: 4, conversation_id: 2, role: 'assistant', content: 'โหราศาสตร์ไทยนับราศีตามตำแหน่งดาวจริงบนฟ้า (สุริยยาตร์) วันเปลี่ยนราศีจึงช้ากว่าแบบตะวันตกประมาณ 3–4 สัปดาห์ เช่น ราศีเมษแบบไทยเริ่มราว 13–14 เมษายน', guard: null, sources: [5], created_at: '2026-10-25T21:30:04+07:00' }
  ];
  /* จำนวนคำถามต่อวันต่อสมาชิก (ใช้นับโควตา) */
  D.ai_usage_daily = [
    { id: 1, member_id: 1, usage_date: '2026-10-25', questions: 4 },
    { id: 2, member_id: 2, usage_date: '2026-10-25', questions: 1 }
  ];

  /* ---------- ค่าตั้งเฟส 2 ---------- */
  var next = (D.settings || []).reduce(function (m, s) { return Math.max(m, s.id); }, 0);
  [
    ['shipping_fee', 60],                 // ค่าส่ง EMS เหมาจ่าย (บาท)
    ['free_shipping_min', 1500],          // ยอดสินค้าที่ส่งฟรี (บาท)
    ['payment_timeout_min', 30],          // เวลาชำระ PromptPay ก่อนยกเลิกอัตโนมัติ
    ['promptpay_display_name', 'บริษัท มหาศาสตร์ จำกัด (ตัวอย่าง)'],
    ['ai_enabled', true],
    ['ai_quota_guest', 0],                // ผู้ไม่ได้ล็อกอินถาม AI ไม่ได้ (ต้องสมัครสมาชิกฟรีก่อน)
    ['ai_quota_free', 3],                 // คำถามต่อวัน
    ['ai_quota_premium', 30],
    ['ai_crisis_words', ['ฆ่าตัวตาย', 'อยากตาย', 'ไม่อยากมีชีวิต', 'ทำร้ายตัวเอง', 'จบชีวิต']],
    ['ai_caution_words', { health: ['ป่วย', 'โรค', 'ยา', 'รักษา', 'มะเร็ง', 'ผ่าตัด'], finance: ['หวย', 'ลงทุน', 'หุ้น', 'คริปโต', 'กู้', 'หนี้'], legal: ['ฟ้อง', 'คดี', 'ทนาย', 'ศาล'] }]
  ].forEach(function (kv) { D.settings.push({ id: ++next, key: kv[0], value: kv[1] }); });
})(window.MAHASART_DATA);
