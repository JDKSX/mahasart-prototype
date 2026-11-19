/* ข้อมูลตัวอย่างเฟส 3: ผู้เชี่ยวชาญและการนัดหมาย · คอร์สเรียน · แพ็กเกจสมาชิกรายเดือน
   ชื่อผู้เชี่ยวชาญทั้งหมดเป็นชื่อสมมติ · ราคาเป็นค่าตัวอย่างให้แก้ภายหลัง
   ช่วงเวลานัด (expert_slots) สร้างจาก "วันนี้" จริง เพื่อให้มีคิวว่างให้ลองจองเสมอ */
window.MAHASART_DATA = window.MAHASART_DATA || {};
(function (D) {
  function pad(n) { return ('0' + n).slice(-2); }
  function localISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00+07:00'; }
  function dayAt(offset, h, m) { var d = new Date(); d.setHours(h, m || 0, 0, 0); d.setDate(d.getDate() + offset); return d; }

  /* ---------- ทีมงานบทบาทผู้เชี่ยวชาญ (ล็อกอินหลังบ้านเพื่อจัดตารางและคอร์สของตัวเอง) ---------- */
  D.users.push(
    { id: 7, name: 'ภูมิใจ ราศีงาม', email: 'phumjai@mahasart.net', role: 'expert', is_active: true, last_login_at: '2026-10-25T20:00:00+07:00', created_at: '2026-10-06T09:00:00+07:00', updated_at: '2026-10-06T09:00:00+07:00', deleted_at: null },
    { id: 8, name: 'มยุรี วังทอง', email: 'mayuree@mahasart.net', role: 'expert', is_active: true, last_login_at: '2026-10-24T10:00:00+07:00', created_at: '2026-10-06T09:10:00+07:00', updated_at: '2026-10-06T09:10:00+07:00', deleted_at: null },
    { id: 9, name: 'ชยพล เลขดี', email: 'chayapon@mahasart.net', role: 'expert', is_active: true, last_login_at: '2026-10-26T08:00:00+07:00', created_at: '2026-10-20T15:00:00+07:00', updated_at: '2026-10-20T15:00:00+07:00', deleted_at: null }
  );

  /* ---------- ผู้เชี่ยวชาญ ----------
     status: pending (รอตรวจคุณสมบัติ) | active | suspended · session_types = ช่องทางและราคาต่อครั้ง
     commission_rate = ส่วนแบ่งแพลตฟอร์ม (ค่าเริ่มต้นจาก settings.expert_commission) */
  D.experts = [
    { id: 1, user_id: 7, slug: 'phumjai', display_name: 'อาจารย์ภูมิใจ ราศีงาม', title: 'โหราศาสตร์ไทย · ทักษา · ฤกษ์มงคล',
      specialties: ['thai-astrology', 'auspicious-time'], years_experience: 15,
      bio: 'ศึกษาโหราศาสตร์ไทยแบบสุริยยาตร์มา 15 ปี เน้นอธิบายดวงให้เข้าใจง่าย และบอกเสมอว่าคำทำนายเป็นแนวทาง ไม่ใช่สิ่งที่ต้องเกิดขึ้นแน่นอน',
      session_types: [{ type: 'chat', minutes: 30, price: 399 }, { type: 'video', minutes: 30, price: 599 }],
      status: 'active', verified_at: '2026-10-07T10:00:00+07:00', commission_rate: 0.2, created_at: '2026-10-06T09:00:00+07:00', deleted_at: null },
    { id: 2, user_id: 8, slug: 'mayuree', display_name: 'อาจารย์มยุรี วังทอง', title: 'ฮวงจุ้ยบ้าน · ที่ทำงาน · ร้านค้า',
      specialties: ['fengshui'], years_experience: 9,
      bio: 'ให้คำปรึกษาการจัดบ้านและที่ทำงานตามหลักฮวงจุ้ย ควบคู่กับการจัดพื้นที่ให้ใช้งานสะดวก ส่งแบบแปลนบ้านมาล่วงหน้าได้',
      session_types: [{ type: 'video', minutes: 45, price: 790 }, { type: 'phone', minutes: 30, price: 490 }],
      status: 'active', verified_at: '2026-10-07T10:30:00+07:00', commission_rate: 0.2, created_at: '2026-10-06T09:10:00+07:00', deleted_at: null },
    { id: 3, user_id: 9, slug: 'chayapon', display_name: 'ชยพล เลขดี', title: 'เลขศาสตร์ชื่อ · เบอร์โทร',
      specialties: ['numerology'], years_experience: 4,
      bio: 'สมัครเข้ามาใหม่ รอทีมงานตรวจคุณสมบัติและตัวอย่างงานก่อนเปิดรับนัด',
      session_types: [{ type: 'chat', minutes: 20, price: 199 }],
      status: 'pending', verified_at: null, commission_rate: 0.2, created_at: '2026-10-20T15:00:00+07:00', deleted_at: null }
  ];

  /* ---------- ช่วงเวลาว่าง (สร้างล่วงหน้า 14 วันจากวันนี้) ----------
     status: open | booked | blocked */
  var slots = [], sid = 0;
  var PLAN = { 1: [[10, 0], [13, 0], [19, 0]], 2: [[9, 30], [14, 0]] };
  for (var off = 1; off <= 14; off++) {
    var wd = dayAt(off, 12).getDay();
    Object.keys(PLAN).forEach(function (eid) {
      if (eid === '2' && (wd === 0 || wd === 3)) return;      // อาจารย์มยุรีหยุดอาทิตย์และพุธ
      if (eid === '1' && wd === 1) return;                     // อาจารย์ภูมิใจหยุดวันจันทร์
      PLAN[eid].forEach(function (hm) {
        slots.push({ id: ++sid, expert_id: Number(eid), start_at: localISO(dayAt(off, hm[0], hm[1])), status: 'open' });
      });
    });
  }
  D.expert_slots = slots;
  function firstOpen(eid, minOff) {
    var cut = localISO(dayAt(minOff, 0));
    return slots.find(function (s) { return s.expert_id === eid && s.status === 'open' && s.start_at >= cut; });
  }
  var s2 = firstOpen(2, 2); if (s2) s2.status = 'booked';
  var s3 = firstOpen(1, 3); if (s3) s3.status = 'booked';
  var s5 = firstOpen(1, 6); if (s5) s5.status = 'blocked';

  /* ---------- การนัดหมาย ----------
     status: pending_payment | confirmed | completed | cancelled | no_show
     price = ราคาก่อนส่วนลด · discount = ส่วนลดสมาชิกพรีเมียม · total = ที่จ่ายจริง */
  D.expert_bookings = [
    { id: 1, booking_no: 'BK-2569-0001', member_id: 1, expert_id: 1, slot_id: null, start_at: '2026-10-20T19:00:00+07:00', session_type: 'video', minutes: 30,
      topic: 'อยากรู้จังหวะเปลี่ยนงานช่วงปลายปี', price: 599, discount: 60, total: 539, status: 'completed', meeting_note: 'คุยผ่านห้องวิดีโอของเว็บ', created_at: '2026-10-15T08:00:00+07:00', completed_at: '2026-10-20T19:35:00+07:00', cancelled_reason: '', deleted_at: null },
    { id: 2, booking_no: 'BK-2569-0002', member_id: 4, expert_id: 2, slot_id: s2 ? s2.id : null, start_at: s2 ? s2.start_at : null, session_type: 'video', minutes: 45,
      topic: 'จัดห้องทำงานในบ้านใหม่ ส่งแบบแปลนไว้แล้ว', price: 790, discount: 79, total: 711, status: 'confirmed', meeting_note: '', created_at: '2026-10-24T20:00:00+07:00', completed_at: null, cancelled_reason: '', deleted_at: null },
    { id: 3, booking_no: 'BK-2569-0003', member_id: 2, expert_id: 1, slot_id: s3 ? s3.id : null, start_at: s3 ? s3.start_at : null, session_type: 'chat', minutes: 30,
      topic: 'ถามเรื่องสีมงคลสำหรับวันสอบ', price: 399, discount: 0, total: 399, status: 'pending_payment', meeting_note: '', created_at: '2026-10-26T08:55:00+07:00', completed_at: null, cancelled_reason: '', deleted_at: null },
    { id: 4, booking_no: 'BK-2569-0004', member_id: 3, expert_id: 2, slot_id: null, start_at: '2026-10-22T14:00:00+07:00', session_type: 'phone', minutes: 30,
      topic: 'ปรึกษาตำแหน่งเตียง', price: 490, discount: 0, total: 490, status: 'cancelled', meeting_note: '', created_at: '2026-10-18T10:00:00+07:00', completed_at: null, cancelled_reason: 'สมาชิกยกเลิกก่อนนัด 24 ชั่วโมง คืนเงินเต็มจำนวน', deleted_at: null }
  ];
  /* รีวิว (เขียนได้หลังนัดเสร็จเท่านั้น) · status: published | hidden */
  D.expert_reviews = [
    { id: 1, booking_id: 1, expert_id: 1, member_id: 1, rating: 5, comment: 'อธิบายเข้าใจง่าย ไม่ขู่ให้กลัว และบอกชัดว่าเป็นแนวทาง', status: 'published', created_at: '2026-10-21T08:00:00+07:00' },
    { id: 2, booking_id: null, expert_id: 2, member_id: 4, rating: 4, comment: 'ตัวอย่างรีวิวจากนัดก่อนหน้า: แนะนำการจัดโต๊ะทำงานได้ดี', status: 'published', created_at: '2026-10-10T08:00:00+07:00' }
  ];
  /* ข้อความในห้องคุย (จำลอง) */
  D.expert_messages = [
    { id: 1, booking_id: 1, sender: 'member', content: 'สวัสดีค่ะ อาจารย์', created_at: '2026-10-20T19:00:30+07:00' },
    { id: 2, booking_id: 1, sender: 'expert', content: 'สวัสดีครับ เริ่มจากวันเกิดวันศุกร์นะครับ ช่วงนี้ตำแหน่งอุตสาหะ (การงาน) ตรงกับดาวเสาร์ ...', created_at: '2026-10-20T19:01:10+07:00' }
  ];

  /* ---------- คอร์สเรียน ----------
     included_in_premium = สมาชิกพรีเมียมเรียนได้โดยไม่ต้องซื้อแยก · lesson type: video | reading | quiz */
  D.courses = [
    { id: 1, slug: 'thai-astrology-101', title: 'พื้นฐานโหราศาสตร์ไทย 101', expert_id: 1, level: 'เริ่มต้น', price: 990, included_in_premium: true,
      summary: 'รู้จักดาว 8 ดวง ทักษาปกรณ์ และวิธีอ่านสีประจำวันอย่างมีหลัก จบแล้วอ่านทักษาของตัวเองได้', thumb: { glyph: '๘', tone: 'violet' },
      status: 'published', published_at: '2026-10-15T09:00:00+07:00', created_at: '2026-10-10T09:00:00+07:00', deleted_at: null },
    { id: 2, slug: 'home-fengshui', title: 'ฮวงจุ้ยบ้านและที่ทำงาน', expert_id: 2, level: 'เริ่มต้น', price: 1290, included_in_premium: false,
      summary: 'จัดตำแหน่งเตียง โต๊ะทำงาน และประตูตามหลักที่นิยม พร้อมเหตุผลด้านการใช้งานจริง', thumb: { glyph: '風', tone: 'amber' },
      status: 'published', published_at: '2026-10-18T09:00:00+07:00', created_at: '2026-10-12T09:00:00+07:00', deleted_at: null },
    { id: 3, slug: 'name-numerology', title: 'เลขศาสตร์ชื่อเบื้องต้น', expert_id: 3, level: 'เริ่มต้น', price: 590, included_in_premium: true,
      summary: 'ฉบับร่าง: วิธีรวมค่าตัวอักษรและอ่านความหมาย', thumb: { glyph: '๕', tone: 'amber' },
      status: 'draft', published_at: null, created_at: '2026-10-22T09:00:00+07:00', deleted_at: null }
  ];
  D.course_lessons = [
    { id: 1, course_id: 1, sort: 1, type: 'video', title: 'ดาว 8 ดวงในโหราศาสตร์ไทย', minutes: 8, is_preview: true,
      content: 'โหราศาสตร์ไทยใช้ดาวประจำวัน 8 ดวง ได้แก่ อาทิตย์ จันทร์ อังคาร พุธ พฤหัสบดี ศุกร์ เสาร์ และราหู ราหูแทนคนที่เกิดวันพุธกลางคืน' },
    { id: 2, course_id: 1, sort: 2, type: 'reading', title: 'วงทักษาและลำดับดาว', minutes: 6, is_preview: false,
      content: 'วงทักษาเรียงดาวเป็น อาทิตย์ → จันทร์ → อังคาร → พุธ → เสาร์ → พฤหัสบดี → ราหู → ศุกร์ ลำดับนี้ไม่ใช่ลำดับวันในสัปดาห์\n\n## ทำไมต้องจำลำดับนี้\n\nเพราะตำแหน่งทั้ง 8 ไล่ตามวงนี้เสมอ เริ่มจากดาววันเกิด' },
    { id: 3, course_id: 1, sort: 3, type: 'video', title: 'ตำแหน่งทั้ง 8: บริวารถึงกาลกิณี', minutes: 10, is_preview: false,
      content: 'บริวาร อายุ เดช ศรี มูละ อุตสาหะ มนตรี กาลกิณี เริ่มนับที่ดาววันเกิดเป็นบริวาร แล้วไล่ไปตามวงทักษา' },
    { id: 4, course_id: 1, sort: 4, type: 'reading', title: 'เกิดก่อน 6 โมงเช้านับเป็นวันไหน', minutes: 4, is_preview: false,
      content: 'วันทางโหราศาสตร์ไทยเริ่มตอนพระอาทิตย์ขึ้น ประมาณ 06:00 คนที่เกิดตี 2 ของวันจันทร์จึงนับเป็นคนเกิดวันอาทิตย์\n\nคนเกิดวันพุธตั้งแต่ 18:00 ถึงก่อน 06:00 ของวันพฤหัสบดี นับเป็นพุธกลางคืน (ราหู)' },
    { id: 5, course_id: 1, sort: 5, type: 'quiz', title: 'แบบทดสอบท้ายบท', minutes: 5, is_preview: false, pass_score: 2,
      questions: [
        { q: 'คนเกิดวันอาทิตย์ ตำแหน่งกาลกิณีคือดาวอะไร', choices: ['จันทร์', 'ศุกร์', 'เสาร์', 'ราหู'], answer: 1, explain: 'เริ่มนับอาทิตย์เป็นบริวาร ไล่ไป 8 ตำแหน่ง ตำแหน่งสุดท้ายคือศุกร์' },
        { q: 'เกิดวันพุธเวลา 20:00 นับเป็นดาวอะไร', choices: ['พุธ', 'พฤหัสบดี', 'ราหู', 'จันทร์'], answer: 2, explain: 'พุธตั้งแต่ 18:00 เป็นต้นไปนับเป็นพุธกลางคืน คือราหู' },
        { q: 'ลำดับใดเป็นลำดับวงทักษาที่ถูกต้อง', choices: ['อาทิตย์ จันทร์ อังคาร พุธ พฤหัสบดี', 'อาทิตย์ จันทร์ อังคาร พุธ เสาร์', 'จันทร์ อังคาร พุธ พฤหัสบดี ศุกร์', 'อาทิตย์ อังคาร พุธ เสาร์ ราหู'], answer: 1, explain: 'หลังพุธคือเสาร์ ไม่ใช่พฤหัสบดี' }
      ] },
    { id: 6, course_id: 2, sort: 1, type: 'video', title: 'หลักใหญ่ของฮวงจุ้ยในบ้าน', minutes: 9, is_preview: true,
      content: 'ฮวงจุ้ยให้ความสำคัญกับการไหลของพลังและความรู้สึกปลอดภัยในพื้นที่ หลายข้อตรงกับหลักจัดบ้านให้ใช้งานสะดวก' },
    { id: 7, course_id: 2, sort: 2, type: 'reading', title: 'ตำแหน่งเตียงและหัวนอน', minutes: 6, is_preview: false,
      content: 'หัวเตียงชิดผนังทึบ มองเห็นประตูได้แต่ไม่ตรงประตูพอดี\n\n- เลี่ยงกระจกสะท้อนเตียง\n- เลี่ยงคานเหนือหัวนอน' },
    { id: 8, course_id: 2, sort: 3, type: 'video', title: 'โต๊ะทำงานและตำแหน่งผู้นำ', minutes: 8, is_preview: false,
      content: 'นั่งหลังพิงผนัง มองเห็นประตู เรียกว่าตำแหน่งผู้นำ' },
    { id: 9, course_id: 2, sort: 4, type: 'quiz', title: 'แบบทดสอบท้ายคอร์ส', minutes: 4, is_preview: false, pass_score: 2,
      questions: [
        { q: 'ตำแหน่งเตียงที่นิยมคือแบบไหน', choices: ['หัวเตียงชิดหน้าต่าง', 'หัวเตียงชิดผนังทึบ มองเห็นประตู', 'ปลายเท้าตรงประตูพอดี', 'วางกลางห้องไม่ชิดผนัง'], answer: 1, explain: 'ผนังทึบให้ความรู้สึกมั่นคง และควรมองเห็นประตูได้' },
        { q: 'ตำแหน่งผู้นำของโต๊ะทำงานคือ', choices: ['หันหลังให้ประตู', 'หลังพิงผนัง มองเห็นประตู', 'หันหน้าเข้าผนัง', 'อยู่ใต้คาน'], answer: 1, explain: 'หลังพิงผนังและเห็นประตู ทำให้รู้สึกควบคุมพื้นที่ได้' }
      ] },
    { id: 10, course_id: 3, sort: 1, type: 'reading', title: 'ค่าตัวอักษรคืออะไร', minutes: 5, is_preview: true, content: 'ฉบับร่าง' }
  ];
  /* การลงทะเบียนเรียน · source: purchase | premium · progress = id บทที่เรียนจบแล้ว */
  D.course_enrollments = [
    { id: 1, member_id: 1, course_id: 1, source: 'premium', status: 'active', progress: [1, 2, 3], quiz_scores: {}, enrolled_at: '2026-10-16T20:00:00+07:00', completed_at: null, certificate_no: '', deleted_at: null },
    { id: 2, member_id: 4, course_id: 2, source: 'purchase', status: 'active', progress: [6, 7, 8, 9], quiz_scores: { 9: 2 }, enrolled_at: '2026-10-19T09:00:00+07:00', completed_at: '2026-10-23T21:00:00+07:00', certificate_no: 'CERT-2569-0001', deleted_at: null }
  ];

  /* ---------- แพ็กเกจสมาชิก ----------
     ค่าตัวอย่าง: พรีเมียม 99 บาท/เดือน */
  D.plans = [
    { id: 1, key: 'free', name: 'สมาชิกทั่วไป', price_month: 0, ai_daily_quota: 3, save_limit: 10, booking_discount: 0, course_access: 'ซื้อแยกรายคอร์ส',
      features: ['ใช้เครื่องมือดูดวงได้ทุกตัว', 'บันทึกผลดูดวงได้ 10 รายการ', 'ถาม Mahasart AI ได้วันละ 3 คำถาม', 'ซื้อคอร์สและจองผู้เชี่ยวชาญได้'], is_active: true },
    { id: 2, key: 'premium', name: 'พรีเมียม', price_month: 99, ai_daily_quota: 30, save_limit: null, booking_discount: 0.1, course_access: 'เรียนคอร์สที่ร่วมรายการได้ฟรี',
      features: ['ทุกอย่างของสมาชิกทั่วไป', 'บันทึกผลดูดวงไม่จำกัด', 'ถาม Mahasart AI ได้วันละ 30 คำถาม', 'เรียนคอร์สที่ร่วมรายการได้ฟรี', 'ส่วนลด 10% เมื่อจองผู้เชี่ยวชาญ', 'ยกเลิกได้ทุกเมื่อ ใช้ได้ถึงวันครบรอบบิล'], is_active: true }
  ];
  /* status: active | cancelled (ใช้ได้ถึง renews_at แล้วหมด) | expired */
  D.subscriptions = [
    { id: 1, member_id: 1, plan_key: 'premium', status: 'active', started_at: '2026-10-02T10:00:00+07:00', renews_at: '2026-11-02T10:00:00+07:00', cancelled_at: null },
    { id: 2, member_id: 4, plan_key: 'premium', status: 'cancelled', started_at: '2026-10-05T09:00:00+07:00', renews_at: '2026-11-05T09:00:00+07:00', cancelled_at: '2026-10-21T08:00:00+07:00' }
  ];

  /* ---------- การชำระเงินของเฟส 3 (ต่อจาก phase2.js) ---------- */
  var pid = D.payments.reduce(function (m, p) { return Math.max(m, p.id); }, 0);
  function pay(type, id, member, amount, status, at) {
    pid++;
    D.payments.push({ id: pid, ref: 'PAY-' + ('000' + pid).slice(-4), payable_type: type, payable_id: id, member_id: member, amount: amount, method: 'promptpay', status: status,
      created_at: at, expires_at: at, paid_at: status === 'paid' ? at : null, gateway_ref: status === 'paid' ? 'DEMO-GW-' + ('000' + pid).slice(-4) : '' });
  }
  pay('booking', 1, 1, 539, 'paid', '2026-10-15T08:02:00+07:00');
  pay('booking', 2, 4, 711, 'paid', '2026-10-24T20:02:00+07:00');
  pay('booking', 3, 2, 399, 'pending', '2026-10-26T08:55:00+07:00');
  pay('booking', 4, 3, 490, 'refunded', '2026-10-18T10:02:00+07:00');
  pay('enrollment', 2, 4, 1290, 'paid', '2026-10-19T09:00:00+07:00');
  pay('subscription', 1, 1, 99, 'paid', '2026-10-02T10:00:00+07:00');
  pay('subscription', 2, 4, 99, 'paid', '2026-10-05T09:00:00+07:00');
  D.payments.forEach(function (p) {
    if (p.status === 'pending') { var e = new Date(); e.setMinutes(e.getMinutes() + 25); p.expires_at = localISO(e); }
  });

  var next = D.settings.reduce(function (m, s) { return Math.max(m, s.id); }, 0);
  [
    ['expert_commission', 0.2],          // ส่วนแบ่งแพลตฟอร์มจากค่าปรึกษา
    ['booking_cancel_hours', 24],        // ยกเลิกก่อนนัดกี่ชั่วโมงจึงคืนเงินเต็ม
    ['course_commission', 0.3]           // ส่วนแบ่งแพลตฟอร์มจากค่าคอร์ส
  ].forEach(function (kv) { D.settings.push({ id: ++next, key: kv[0], value: kv[1] }); });
})(window.MAHASART_DATA);
