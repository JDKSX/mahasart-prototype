/* MAHASART prototype — สูตรคำนวณดวง (ฟังก์ชันล้วน ไม่แตะ DOM)
   ทักษาเป็นกฎกลางในโค้ด · สี ช่วงราศี ค่าตัวอักษร อ่านจากตำราที่ active ผ่าน MH.store
   ตอนทำระบบจริงให้แปลงไฟล์นี้เป็น PHP แบบตรงตัว แล้วใช้ชุดทดสอบเดียวกับ tests.html */
(function () {
  'use strict';
  var MH = window.MH = window.MH || {};

  /* วงทักษา: อาทิตย์ → จันทร์ → อังคาร → พุธ → เสาร์ → พฤหัสบดี → ราหู → ศุกร์ */
  var CYCLE = ['sun', 'moon', 'mars', 'mercury', 'saturn', 'jupiter', 'rahu', 'venus'];
  var ROLES = [
    { key: 'boriwan', name: 'บริวาร', meaning: 'คนรอบข้าง ครอบครัว' },
    { key: 'ayu', name: 'อายุ', meaning: 'สุขภาพ ความเป็นอยู่' },
    { key: 'det', name: 'เดช', meaning: 'อำนาจ ชื่อเสียง' },
    { key: 'sri', name: 'ศรี', meaning: 'โชคลาภ สิริมงคล' },
    { key: 'mula', name: 'มูละ', meaning: 'ทรัพย์สิน รากฐาน' },
    { key: 'utsaha', name: 'อุตสาหะ', meaning: 'ความขยัน การงาน' },
    { key: 'montri', name: 'มนตรี', meaning: 'ผู้อุปถัมภ์' },
    { key: 'kalakini', name: 'กาลกิณี', meaning: 'สิ่งที่ควรเลี่ยง' }
  ];
  /* วันเกิด 8 แบบ (พุธแยกกลางวัน/กลางคืน) · key ใช้ใน URL เช่น taksa.html?day=monday */
  var BIRTHDAYS = [
    { key: 'sunday', planet: 'sun', label: 'อาทิตย์' },
    { key: 'monday', planet: 'moon', label: 'จันทร์' },
    { key: 'tuesday', planet: 'mars', label: 'อังคาร' },
    { key: 'wednesday', planet: 'mercury', label: 'พุธ (กลางวัน)' },
    { key: 'wednesday-night', planet: 'rahu', label: 'พุธ (กลางคืน)' },
    { key: 'thursday', planet: 'jupiter', label: 'พฤหัสบดี' },
    { key: 'friday', planet: 'venus', label: 'ศุกร์' },
    { key: 'saturday', planet: 'saturn', label: 'เสาร์' }
  ];
  var WEEKDAY_PLANET = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']; // Date#getDay()

  function activeRuleset() {
    var rs = MH.store.all('rulesets').filter(function (r) { return r.is_active; });
    return rs[0] || null;
  }
  function rulesetRows(table) {
    var rs = activeRuleset(); if (!rs) return [];
    return MH.store.all(table).filter(function (r) { return r.ruleset_id === rs.id; });
  }
  function planetInfo(planet) {
    var c = rulesetRows('day_colors').find(function (r) { return r.planet_key === planet; });
    return c ? { planet: planet, day_name: c.day_name, color_name: c.color_name, hex: c.hex }
             : { planet: planet, day_name: planet, color_name: '-', hex: '#888888' };
  }

  MH.astro = {
    CYCLE: CYCLE, ROLES: ROLES, BIRTHDAYS: BIRTHDAYS,
    ruleset: activeRuleset,
    planetInfo: planetInfo,
    birthday: function (key) { return BIRTHDAYS.find(function (b) { return b.key === key; }) || null; },
    birthdayOfPlanet: function (planet) { return BIRTHDAYS.find(function (b) { return b.planet === planet; }) || null; },

    /** ทักษาของคนที่เกิดวันที่มีดาว planet · คืน 8 แถว [{role, name, meaning, planet, day_name, color_name, hex}] */
    taksa: function (planet) {
      var start = CYCLE.indexOf(planet);
      if (start < 0) throw new Error('unknown planet: ' + planet);
      return ROLES.map(function (r, i) {
        return Object.assign({ role: r.key, name: r.name, meaning: r.meaning }, planetInfo(CYCLE[(start + i) % 8]));
      });
    },

    /** ดาวประจำวันตามปฏิทิน (ใช้กับ "วันนี้" และสีประจำวัน) */
    planetOfWeekday: function (date) { return WEEKDAY_PLANET[(date || new Date()).getDay()]; },

    /** ดาววันเกิดตามโหราศาสตร์ไทย: วันเริ่ม 06:00 · พุธ 18:00–05:59 = ราหู */
    birthPlanet: function (date) {
      var d = new Date(date.getTime());
      var h = d.getHours();
      if (h < 6) d.setDate(d.getDate() - 1);
      var p = WEEKDAY_PLANET[d.getDay()];
      if (p === 'mercury' && (h >= 18 || h < 6)) return 'rahu';
      return p;
    },

    /** วันนี้ (ดาว planet) เป็นวันกาลกิณีของคนเกิดวันใดบ้าง */
    kalakiniFor: function (planet) {
      return BIRTHDAYS.filter(function (b) {
        return MH.astro.taksa(b.planet)[7].planet === planet;
      });
    },

    /** ราศีไทยจากวัน/เดือนเกิด · nearBoundary = ห่างรอยต่อไม่เกิน 1 วัน (อาจเป็นราศีข้างเคียง) */
    rasiOf: function (month, day) {
      var ranges = rulesetRows('rasi_ranges');
      function doy(m, d) { return new Date(Date.UTC(2001, m - 1, d)).getTime() / 864e5; }
      var x = doy(month, day), YEAR = 365;
      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i], s = doy(r.start_month, r.start_day), e = doy(r.end_month, r.end_day);
        var inRange = s <= e ? (x >= s && x <= e) : (x >= s || x <= e);
        if (!inRange) continue;
        var toStart = (x - s + YEAR) % YEAR, toEnd = (e - x + YEAR) % YEAR;
        var neighbor = null;
        if (toStart <= 1) neighbor = ranges[(i - 1 + ranges.length) % ranges.length];
        else if (toEnd <= 1) neighbor = ranges[(i + 1) % ranges.length];
        return { rasi: r.rasi, name: r.name, range: r, nearBoundary: !!neighbor, neighbor: neighbor };
      }
      return null;
    },

    /** เลขศาสตร์: รวมค่าตัวอักษร · unknown = ตัวที่ไม่มีในตาราง (ไม่นับ) */
    numerology: function (text) {
      var map = {};
      rulesetRows('numerology_letter_values').forEach(function (r) { map[r.letter] = r.value; });
      var letters = [], unknown = [], total = 0;
      Array.from(String(text || '')).forEach(function (ch) {
        if (/\s/.test(ch)) return;
        if (map[ch] != null) { letters.push({ ch: ch, value: map[ch] }); total += map[ch]; }
        else unknown.push(ch);
      });
      var reduced = total;
      while (reduced > 9) reduced = String(reduced).split('').reduce(function (s, d) { return s + Number(d); }, 0);
      var meaning = rulesetRows('numerology_meanings').find(function (m) { return m.total === reduced; }) || null;
      return { letters: letters, unknown: unknown, total: total, reduced: reduced, meaning: meaning };
    }
  };
})();
