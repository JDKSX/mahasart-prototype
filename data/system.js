/* ข้อมูลตัวอย่าง: ทีมงาน ค่าตั้งระบบ หน้าคงที่ และบันทึกการใช้งาน (users, settings, pages, audit_logs)
   ชื่อทีมงานทั้งหมดเป็นชื่อสมมติ */
window.MAHASART_DATA = window.MAHASART_DATA || {};
Object.assign(window.MAHASART_DATA, {

  /* role: admin | editor | writer | catalog | astrologer */
  users: [
    { id: 1, name: 'ปรีชา วงศ์ทอง',  email: 'admin@mahasart.net',      role: 'admin',      is_active: true,  last_login_at: '2026-10-26T08:12:00+07:00', created_at: '2026-10-01T09:00:00+07:00', updated_at: '2026-10-01T09:00:00+07:00', deleted_at: null },
    { id: 2, name: 'มาลี ศรีสุข',    email: 'editor@mahasart.net',     role: 'editor',     is_active: true,  last_login_at: '2026-10-25T19:40:00+07:00', created_at: '2026-10-01T09:05:00+07:00', updated_at: '2026-10-01T09:05:00+07:00', deleted_at: null },
    { id: 3, name: 'กิตติ ใจเย็น',    email: 'writer@mahasart.net',     role: 'writer',     is_active: true,  last_login_at: '2026-10-26T07:55:00+07:00', created_at: '2026-10-02T10:00:00+07:00', updated_at: '2026-10-02T10:00:00+07:00', deleted_at: null },
    { id: 4, name: 'สุดา แก้วมณี',    email: 'catalog@mahasart.net',    role: 'catalog',    is_active: true,  last_login_at: '2026-10-24T14:20:00+07:00', created_at: '2026-10-02T10:10:00+07:00', updated_at: '2026-10-02T10:10:00+07:00', deleted_at: null },
    { id: 5, name: 'อาจารย์ธนา โหรา', email: 'astrologer@mahasart.net', role: 'astrologer', is_active: true,  last_login_at: '2026-10-22T09:00:00+07:00', created_at: '2026-10-03T11:00:00+07:00', updated_at: '2026-10-03T11:00:00+07:00', deleted_at: null },
    { id: 6, name: 'วรเชษฐ์ นามดี',   email: 'writer2@mahasart.net',    role: 'writer',     is_active: false, last_login_at: '2026-10-05T16:00:00+07:00', created_at: '2026-10-03T11:30:00+07:00', updated_at: '2026-10-15T10:00:00+07:00', deleted_at: null }
  ],

  settings: [
    { id: 1, key: 'site_name',        value: 'MAHASART' },
    { id: 2, key: 'site_tagline',     value: 'ศูนย์รวมศาสตร์แห่งปัญญา' },
    { id: 3, key: 'site_url',         value: 'https://mahasart.net' },
    { id: 4, key: 'line_oa_id',       value: '@mahasart' },
    { id: 5, key: 'hero_fortune',     value: { eyebrow: 'โหราศาสตร์ไทย · เลขศาสตร์', title: 'พยากรณ์ออนไลน์', lede: 'รู้จังหวะชีวิตจากวันเดือนปีเกิด คำนวณตามตำราโหราศาสตร์ไทย ดูผลได้ทันทีโดยไม่ต้องสมัครสมาชิก' } },
    { id: 6, key: 'hero_amulet',      value: { eyebrow: 'พระเครื่อง · เหรียญ · เครื่องราง', title: 'วัตถุมงคล', lede: 'ทุกชิ้นบอกที่มาและประเภทชัดเจน ว่าเป็นของมีใบรับรอง พระรุ่นใหม่ หรือรุ่นจำลองเพื่อบูชา' } },
    { id: 7, key: 'disclaimer',       value: 'เนื้อหาด้านโหราศาสตร์และวัตถุมงคลเป็นไปตามความเชื่อ ไม่รับประกันผล ควรใช้ประกอบการตัดสินใจเท่านั้น' },
    { id: 8, key: 'banned_words',     value: ['รับประกัน', '100%', 'รวยแน่', 'หายขาด', 'ได้ผลแน่นอน', 'ถูกหวยแน่'] },
    { id: 9, key: 'maintenance_mode', value: false },
    { id: 10, key: 'featured_amulets', value: [1, 2, 3, 4, 5, 6] },
    { id: 11, key: 'show_public_counter', value: true },
    { id: 12, key: 'feedback_url', value: '' }
  ],

  pages: [
    { id: 1, slug: 'about', title: 'เกี่ยวกับ MAHASART', updated_by: 1, updated_at: '2026-10-20T10:00:00+07:00', deleted_at: null,
      body: 'MAHASART คือศูนย์รวมความรู้ด้านโหราศาสตร์ไทย เลขศาสตร์ ฮวงจุ้ย และวัตถุมงคล ที่อยากให้คนทั่วไปเข้าถึงศาสตร์เหล่านี้ได้ง่ายและเข้าใจที่มา\n\n## สิ่งที่เรายึดถือ\n\n- ทุกเครื่องมือดูดวงบอกตำราที่ใช้คำนวณ\n- วัตถุมงคลทุกชิ้นติดป้ายประเภทชัดเจน\n- เนื้อหาเป็นไปตามความเชื่อ เราไม่รับประกันผลใด ๆ\n\n## ติดต่อเรา\n\nสอบถามทาง LINE OA @mahasart หรือเว็บไซต์ mahasart.net' },
    { id: 2, slug: 'privacy', title: 'นโยบายความเป็นส่วนตัว', updated_by: 1, updated_at: '2026-10-20T10:05:00+07:00', deleted_at: null,
      body: 'ฉบับร่างสำหรับต้นแบบ ต้องให้ผู้รู้ด้านกฎหมายตรวจก่อนใช้จริง\n\n## ข้อมูลที่เราไม่เก็บ\n\nเครื่องมือดูดวงทุกตัวคำนวณในเบราว์เซอร์ของคุณ เราไม่บันทึกวันเกิด เวลาเกิด หรือชื่อที่คุณกรอก และไม่ส่งข้อมูลเหล่านี้ออกจากเครื่อง\n\n## คุกกี้\n\nเว็บไซต์ไม่ใช้คุกกี้ติดตามผู้เข้าชม สถิติการเข้าชมเก็บแบบไม่ระบุตัวบุคคล\n\n## ข้อมูลทีมงาน\n\nเราเก็บชื่อและอีเมลของทีมงานหลังบ้านเท่าที่จำเป็นต่อการเข้าสู่ระบบและการบันทึกการแก้ไข' },
    { id: 3, slug: 'terms', title: 'เงื่อนไขการใช้งาน', updated_by: 1, updated_at: '2026-10-20T10:10:00+07:00', deleted_at: null,
      body: 'ฉบับร่างสำหรับต้นแบบ\n\n## การใช้เนื้อหา\n\nบทความในคลังความรู้มีลิขสิทธิ์ของ MAHASART หากนำไปใช้ต่อ กรุณาอ้างอิงลิงก์ต้นทาง\n\n## การสอบถามวัตถุมงคล\n\nการกดสอบถามทาง LINE ยังไม่ใช่การสั่งซื้อ รายละเอียดราคาและการส่งมอบจะตกลงกันในแชต' },
    { id: 4, slug: 'disclaimer', title: 'คำชี้แจงเรื่องความเชื่อ', updated_by: 2, updated_at: '2026-10-21T09:00:00+07:00', deleted_at: null,
      body: 'ผลการคำนวณ คำพยากรณ์ และคำบรรยายสรรพคุณของวัตถุมงคลบนเว็บไซต์นี้ เป็นไปตามความเชื่อและตำราที่ระบุไว้ ไม่ใช่ข้อเท็จจริงทางวิทยาศาสตร์ และไม่รับประกันผล\n\n## เรื่องสำคัญในชีวิต\n\nเรื่องสุขภาพ การเงิน กฎหมาย หรือการตัดสินใจสำคัญ ควรปรึกษาผู้เชี่ยวชาญในเรื่องนั้นโดยตรง\n\n## หากคุณกำลังเครียดหรือรู้สึกไม่ปลอดภัย\n\nโทรสายด่วนสุขภาพจิต 1323 ได้ตลอด 24 ชั่วโมง' }
  ],

  audit_logs: [
    { id: 1, user_id: 1, action: 'create', subject_type: 'rulesets', subject_id: 1, changes: { name: 'ค่าตั้งต้นต้นแบบ' }, created_at: '2026-10-20T09:00:00+07:00', prev_hash: '0', hash: 'a1f3c09e' },
    { id: 2, user_id: 3, action: 'submit', subject_type: 'articles', subject_id: 9, changes: { status: ['draft', 'in_review'] }, created_at: '2026-10-25T21:10:00+07:00', prev_hash: 'a1f3c09e', hash: '5be2d771' },
    { id: 3, user_id: 4, action: 'update', subject_type: 'amulets', subject_id: 5, changes: { certificate_no: ['', 'DEMO-0001'] }, created_at: '2026-10-26T08:30:00+07:00', prev_hash: '5be2d771', hash: '9c04aa12' }
  ]
});

/* สถิติการเข้าชมรายวัน (site_visit_daily) — ข้อมูลตัวอย่าง 365 วันก่อนวันนี้
   สร้างจากวันที่แบบคงที่ (วันเดียวกันได้ตัวเลขเดิมทุกครั้ง) · ระบบจริงนับจาก log แบบไม่ใช้คุกกี้
   visitors = ผู้เข้าชมไม่ซ้ำในวันนั้น · page_views = จำนวนหน้าที่ถูกเปิด */
window.MAHASART_DATA.site_visit_daily = (function () {
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function noise(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h % 1000) / 1000; }
  var rows = [], today = new Date(); today.setHours(12, 0, 0, 0);
  for (var back = 365; back >= 1; back--) {
    var d = new Date(today.getTime()); d.setDate(d.getDate() - back);
    var key = iso(d), n = noise(key), dow = d.getDay();
    var trend = 160 + (365 - back) * 0.55;                 // ค่อย ๆ โตขึ้นตลอดปี
    var weekend = (dow === 0 || dow === 6) ? 1.25 : (dow === 3 ? 1.1 : 1);
    var visitors = Math.round(trend * weekend * (0.85 + n * 0.3));
    rows.push({ id: 366 - back, stat_date: key, visitors: visitors, page_views: Math.round(visitors * (2.1 + n * 0.9)) });
  }
  return rows;
})();
