/* MAHASART prototype — ชุดทดสอบสูตรคำนวณใน astro.js (ไม่แตะ DOM)
   MH.astroTests.run() → { pass, fail, rows: [{ group, name, expected, actual, ok }] }
   ใช้ใน tests.html และหลังบ้าน rulesets.html · ตอนทำระบบจริงให้แปลงชุดเดียวกันเป็น PHPUnit */
(function () {
  'use strict';
  var MH = window.MH = window.MH || {};

  /* ลำดับดาวตำแหน่ง บริวาร → กาลกิณี ของวันเกิดแต่ละแบบ (ค่าที่ถูกต้อง) */
  var ORDER = {
    'sunday':          'sun moon mars mercury saturn jupiter rahu venus',
    'monday':          'moon mars mercury saturn jupiter rahu venus sun',
    'tuesday':         'mars mercury saturn jupiter rahu venus sun moon',
    'wednesday':       'mercury saturn jupiter rahu venus sun moon mars',
    'thursday':        'jupiter rahu venus sun moon mars mercury saturn',
    'friday':          'venus sun moon mars mercury saturn jupiter rahu',
    'saturday':        'saturn jupiter rahu venus sun moon mars mercury',
    'wednesday-night': 'rahu venus sun moon mars mercury saturn jupiter'
  };

  /* วันเกิดตามเวลาท้องถิ่น: [ปี, เดือน(1-12), วัน, ชั่วโมง, นาที, ดาวที่ถูกต้อง, คำอธิบาย] */
  var BIRTH = [
    [2026, 10, 28, 10, 0, 'mercury', 'พุธ 10:00 → พุธกลางวัน'],
    [2026, 10, 28, 19, 0, 'rahu', 'พุธ 19:00 → พุธกลางคืน'],
    [2026, 10, 27, 3, 0, 'moon', 'อังคาร 03:00 → ก่อน 06:00 นับเป็นวันจันทร์'],
    [2026, 10, 29, 5, 0, 'rahu', 'พฤหัสบดี 05:00 → ก่อน 06:00 นับเป็นพุธกลางคืน']
  ];

  /* ราศี: [เดือน, วัน, ราศีที่ถูกต้อง, ใกล้รอยต่อหรือไม่] */
  var RASI = [
    [4, 13, 'mesha', true],
    [5, 1, 'mesha', false],
    [1, 5, 'dhanu', false],
    [1, 14, 'makara', true],
    [10, 26, 'tula', false]
  ];

  function pad(n) { return ('0' + n).slice(-2); }
  function yn(b) { return b ? 'ใช่' : 'ไม่ใช่'; }

  /* ทดสอบ 1 ข้อ: fn คืนค่าจริง · ถ้าโยน error ให้ถือว่าล้มและบอกสาเหตุ */
  function check(rows, group, name, expected, fn) {
    var actual;
    try { actual = String(fn()); } catch (e) { actual = 'เกิดข้อผิดพลาด: ' + (e && e.message ? e.message : e); }
    rows.push({ group: group, name: name, expected: String(expected), actual: actual, ok: actual === String(expected) });
  }

  MH.astroTests = {
    run: function () {
      var A = MH.astro, rows = [];

      /* 1) ทักษา: ลำดับดาวของแต่ละวันเกิด */
      Object.keys(ORDER).forEach(function (key) {
        var b = A.birthday(key);
        check(rows, 'ทักษา: ลำดับดาว บริวาร → กาลกิณี', 'เกิดวัน' + (b ? b.label : key), ORDER[key], function () {
          return A.taksa(b.planet).map(function (r) { return r.planet; }).join(' ');
        });
      });

      /* 2) วันนี้เป็นกาลกิณีของใคร */
      check(rows, 'กาลกิณี: วันที่เป็นกาลกิณีของคนเกิดวันใด', 'วันจันทร์ (moon) เป็นกาลกิณีของคนเกิดวัน', 'tuesday', function () {
        return A.kalakiniFor('moon').map(function (b) { return b.key; }).join(' ');
      });
      check(rows, 'กาลกิณี: วันที่เป็นกาลกิณีของคนเกิดวันใด', 'วันอาทิตย์ (sun) เป็นกาลกิณีของคนเกิดวัน', 'monday', function () {
        return A.kalakiniFor('sun').map(function (b) { return b.key; }).join(' ');
      });

      /* 3) ดาววันเกิดจากวันและเวลา (06:00 เปลี่ยนวัน · พุธ 18:00–05:59 = ราหู) */
      BIRTH.forEach(function (c) {
        check(rows, 'ดาววันเกิด: ตัดวัน 06:00 และพุธกลางคืน',
          c[0] + '-' + pad(c[1]) + '-' + pad(c[2]) + ' ' + pad(c[3]) + ':' + pad(c[4]) + ' (' + c[6] + ')', c[5],
          function () { return A.birthPlanet(new Date(c[0], c[1] - 1, c[2], c[3], c[4])); });
      });

      /* 4) ราศีไทยจากวัน/เดือนเกิด */
      RASI.forEach(function (c) {
        check(rows, 'ราศี: จากวันและเดือนเกิด', 'วันที่ ' + c[1] + ' เดือน ' + c[0], c[2] + ' · ใกล้รอยต่อ: ' + yn(c[3]), function () {
          var r = A.rasiOf(c[0], c[1]);
          if (!r) return 'ไม่พบราศี';
          return r.rasi + ' · ใกล้รอยต่อ: ' + yn(r.nearBoundary);
        });
      });

      /* 5) เลขศาสตร์ */
      check(rows, 'เลขศาสตร์: รวมค่าตัวอักษร', 'ข้อความ "กก"', 'รวม 2 · เลขโดด 2', function () {
        var r = A.numerology('กก'); return 'รวม ' + r.total + ' · เลขโดด ' + r.reduced;
      });
      check(rows, 'เลขศาสตร์: รวมค่าตัวอักษร', 'ข้อความ "มหา" (11 → 1+1)', 'รวม 11 · เลขโดด 2', function () {
        var r = A.numerology('มหา'); return 'รวม ' + r.total + ' · เลขโดด ' + r.reduced;
      });
      check(rows, 'เลขศาสตร์: รวมค่าตัวอักษร', 'ข้อความ "ก A" (A ไม่มีในตาราง)', 'ไม่มีในตาราง: A', function () {
        var r = A.numerology('ก A'); return 'ไม่มีในตาราง: ' + r.unknown.join(' ');
      });

      var fail = rows.filter(function (r) { return !r.ok; }).length;
      return { pass: rows.length - fail, fail: fail, rows: rows };
    }
  };
})();
