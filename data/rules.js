/* ข้อมูลตัวอย่าง: ตำราและค่าคำนวณ (rulesets, day_colors, rasi_ranges, numerology_letter_values, numerology_meanings)
   ทุกค่ายังเป็น "ค่าตัวอย่าง" รอโหรที่ปรึกษายืนยันก่อนใช้จริง */
window.MAHASART_DATA = window.MAHASART_DATA || {};
Object.assign(window.MAHASART_DATA, {

  rulesets: [
    { id: 1, name: 'ค่าตั้งต้นต้นแบบ', source_book: 'รอระบุตำรา (ค่าตัวอย่างจากความรู้ทั่วไป)', approved_by: null, approved_at: null, is_active: true,
      note: 'ทักษาเป็นกฎกลางในโค้ด ส่วนสี ช่วงราศี และค่าตัวอักษรเก็บไว้ที่นี่ให้โหรแก้ได้',
      created_at: '2026-10-20T09:00:00+07:00', updated_at: '2026-10-20T09:00:00+07:00', deleted_at: null }
  ],

  /* planet_key: sun moon mars mercury jupiter venus saturn rahu */
  day_colors: [
    { id: 1, ruleset_id: 1, planet_key: 'sun',     day_name: 'อาทิตย์',     color_name: 'แดง',   hex: '#D33A2C' },
    { id: 2, ruleset_id: 1, planet_key: 'moon',    day_name: 'จันทร์',      color_name: 'เหลือง', hex: '#E8C13A' },
    { id: 3, ruleset_id: 1, planet_key: 'mars',    day_name: 'อังคาร',      color_name: 'ชมพู',  hex: '#E77FA8' },
    { id: 4, ruleset_id: 1, planet_key: 'mercury', day_name: 'พุธ',         color_name: 'เขียว', hex: '#3E9B57' },
    { id: 5, ruleset_id: 1, planet_key: 'jupiter', day_name: 'พฤหัสบดี',    color_name: 'ส้ม',   hex: '#E8873A' },
    { id: 6, ruleset_id: 1, planet_key: 'venus',   day_name: 'ศุกร์',       color_name: 'ฟ้า',   hex: '#4FA3D9' },
    { id: 7, ruleset_id: 1, planet_key: 'saturn',  day_name: 'เสาร์',       color_name: 'ม่วง',  hex: '#7A4FB5' },
    { id: 8, ruleset_id: 1, planet_key: 'rahu',    day_name: 'พุธกลางคืน',  color_name: 'เทาดำ', hex: '#4A4A55' }
  ],

  /* ราศีแบบไทย (สุริยยาตร์) ช่วงวันโดยประมาณ — วันต่อราศีขยับได้ ±1 วันในแต่ละปี */
  rasi_ranges: [
    { id: 1,  ruleset_id: 1, rasi: 'mesha',     name: 'เมษ',    start_month: 4,  start_day: 13, end_month: 5,  end_day: 14 },
    { id: 2,  ruleset_id: 1, rasi: 'vrishabha', name: 'พฤษภ',   start_month: 5,  start_day: 15, end_month: 6,  end_day: 14 },
    { id: 3,  ruleset_id: 1, rasi: 'mithuna',   name: 'เมถุน',   start_month: 6,  start_day: 15, end_month: 7,  end_day: 14 },
    { id: 4,  ruleset_id: 1, rasi: 'karkata',   name: 'กรกฎ',   start_month: 7,  start_day: 15, end_month: 8,  end_day: 16 },
    { id: 5,  ruleset_id: 1, rasi: 'simha',     name: 'สิงห์',    start_month: 8,  start_day: 17, end_month: 9,  end_day: 16 },
    { id: 6,  ruleset_id: 1, rasi: 'kanya',     name: 'กันย์',    start_month: 9,  start_day: 17, end_month: 10, end_day: 16 },
    { id: 7,  ruleset_id: 1, rasi: 'tula',      name: 'ตุลย์',    start_month: 10, start_day: 17, end_month: 11, end_day: 15 },
    { id: 8,  ruleset_id: 1, rasi: 'vrischika', name: 'พิจิก',   start_month: 11, start_day: 16, end_month: 12, end_day: 15 },
    { id: 9,  ruleset_id: 1, rasi: 'dhanu',     name: 'ธนู',     start_month: 12, start_day: 16, end_month: 1,  end_day: 13 },
    { id: 10, ruleset_id: 1, rasi: 'makara',    name: 'มังกร',   start_month: 1,  start_day: 14, end_month: 2,  end_day: 12 },
    { id: 11, ruleset_id: 1, rasi: 'kumbha',    name: 'กุมภ์',    start_month: 2,  start_day: 13, end_month: 3,  end_day: 13 },
    { id: 12, ruleset_id: 1, rasi: 'mina',      name: 'มีน',     start_month: 3,  start_day: 14, end_month: 4,  end_day: 12 }
  ],

  /* ค่าตัวอักษรเลขศาสตร์ — ตารางตัวอย่างที่ใช้กันทั่วไป แต่ละสำนักต่างกัน ต้องให้ผู้รู้ยืนยัน */
  numerology_letter_values: (function () {
    var groups = {
      1: 'กดถทภฤุ่าำ',
      2: 'ขชงบปูแ้เ',
      3: 'ฆตฑฒ๋',
      4: 'คธญษระโัิ',
      5: 'ฉฌณนมหฎฮฬึ',
      6: 'จลวอใ',
      7: 'ศส๊ีื',
      8: 'ยผฝพฟ็ซ',
      9: 'ฏฐไ์'
    };
    var rows = [], id = 1;
    Object.keys(groups).forEach(function (v) {
      Array.from(groups[v]).forEach(function (ch) { rows.push({ id: id++, ruleset_id: 1, letter: ch, value: Number(v) }); });
    });
    return rows;
  })(),

  /* ความหมายของเลขโดดหลังรวมผลรวม (1–9) — ข้อความตัวอย่าง */
  numerology_meanings: [
    { id: 1, ruleset_id: 1, total: 1, title: 'ผู้เริ่มต้น', meaning: 'ตามความเชื่อ เลข 1 สื่อถึงความเป็นผู้นำ กล้าตัดสินใจ และชอบเริ่มสิ่งใหม่' },
    { id: 2, ruleset_id: 1, total: 2, title: 'ผู้ประสาน', meaning: 'ตามความเชื่อ เลข 2 สื่อถึงความอ่อนโยน การรับฟัง และการทำงานร่วมกับผู้อื่น' },
    { id: 3, ruleset_id: 1, total: 3, title: 'ผู้ลงมือ', meaning: 'ตามความเชื่อ เลข 3 สื่อถึงความขยัน ความมุ่งมั่น และพลังในการทำงานหนัก' },
    { id: 4, ruleset_id: 1, total: 4, title: 'ผู้สื่อสาร', meaning: 'ตามความเชื่อ เลข 4 สื่อถึงการพูด การเจรจา และการเรียนรู้สิ่งใหม่' },
    { id: 5, ruleset_id: 1, total: 5, title: 'ผู้รู้', meaning: 'ตามความเชื่อ เลข 5 สื่อถึงสติปัญญา ความรอบคอบ และการเป็นที่ปรึกษา' },
    { id: 6, ruleset_id: 1, total: 6, title: 'ผู้รักความงาม', meaning: 'ตามความเชื่อ เลข 6 สื่อถึงศิลปะ ความรัก และความสุขในชีวิต' },
    { id: 7, ruleset_id: 1, total: 7, title: 'ผู้อดทน', meaning: 'ตามความเชื่อ เลข 7 สื่อถึงความอดทน ความหนักแน่น และการฝ่าอุปสรรค' },
    { id: 8, ruleset_id: 1, total: 8, title: 'ผู้กล้า', meaning: 'ตามความเชื่อ เลข 8 สื่อถึงความกล้า ความคิดนอกกรอบ และการเปลี่ยนแปลง' },
    { id: 9, ruleset_id: 1, total: 9, title: 'ผู้มีเมตตา', meaning: 'ตามความเชื่อ เลข 9 สื่อถึงความศักดิ์สิทธิ์ ความเมตตา และการช่วยเหลือผู้อื่น' }
  ]
});
