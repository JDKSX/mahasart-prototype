/* MAHASART prototype — เครื่องมือทักษา (ใช้ทั้งหน้าแรกและ taksa.html)
   MH.taksaWidget.mount(host, { day: 'monday', onChange: fn(key) })
   host = element ว่างภายใน .band · วาดกล่อง "วันนี้" + ตัวเลือกวันเกิด + ผล 8 ตำแหน่ง
   สีของ swatch ตั้งผ่าน element.style (ไม่ใช้ style="" ใน HTML เพื่อให้ตั้ง CSP ได้ตอนทำจริง) */
(function () {
  'use strict';
  var MH = window.MH;
  var h = MH.util.h;

  function paint(root) {
    root.querySelectorAll('[data-hex]').forEach(function (el) { el.style.background = el.getAttribute('data-hex'); });
  }

  MH.taksaWidget = {
    mount: function (host, opts) {
      opts = opts || {};
      var A = MH.astro, now = new Date();
      var todayPlanet = A.planetOfWeekday(now), todayInfo = A.planetInfo(todayPlanet);
      var start = A.birthday(opts.day) || A.birthdayOfPlanet(todayPlanet);
      var rs = A.ruleset();
      var kala = A.kalakiniFor(todayPlanet).map(function (b) { return b.label; }).join(', ');

      host.classList.add('taksa');
      host.innerHTML =
        '<div class="today">' +
          '<p class="label">วันนี้</p>' +
          '<p class="date">' + h(MH.util.dateLong(now.toISOString(), true)) + '</p>' +
          '<p class="daycolor"><span class="sw" data-hex="' + h(todayInfo.hex) + '"></span><span>สีประจำวัน <b>' + h(todayInfo.color_name) + '</b></span></p>' +
          '<p class="daycolor"><span>วันนี้เป็นวันกาลกิณีของคนเกิดวัน<b>' + h(kala) + '</b></span></p>' +
          '<a href="' + MH.base + 'daily.html">อ่านดวง 12 ราศี' + MH.ui.icon('i-arrow') + '</a>' +
        '</div>' +
        '<div class="tool">' +
          '<h2 id="taksa-h">ทักษาตามวันเกิด</h2>' +
          '<p class="lede">เลือกวันที่คุณเกิด ระบบจะเรียงดาวทั้ง 8 ตามหลักทักษาปกรณ์ บอกสีเสริมโชคและสีที่ควรเลี่ยง คำนวณในเครื่องของคุณ ไม่บันทึกข้อมูล</p>' +
          '<fieldset class="days"><legend>คุณเกิดวันอะไร</legend>' +
          A.BIRTHDAYS.map(function (b) {
            var info = A.planetInfo(b.planet);
            return '<label for="day-' + b.key + '"><input type="radio" name="birthday" id="day-' + b.key + '" value="' + b.key + '"' + (b.key === start.key ? ' checked' : '') + '>' +
              '<span><i class="sw" data-hex="' + h(info.hex) + '"></i>' + h(b.label) + '</span></label>';
          }).join('') +
          '</fieldset>' +
          '<p class="summary" data-summary></p>' +
          '<ul class="roles" data-roles aria-live="polite"></ul>' +
          '<p class="fine">คำนวณตามหลักทักษาปกรณ์ · ค่าสีจากตำรา "' + h(rs ? rs.name : '-') + '" · เป็นไปตามความเชื่อ ไม่รับประกันผล · เกิดก่อน 06:00 ให้นับเป็นวันก่อนหน้า</p>' +
        '</div>';

      function render(key) {
        var b = A.birthday(key), rows = A.taksa(b.planet);
        var sri = rows[3], kala = rows[7];
        host.querySelector('[data-summary]').innerHTML =
          '<span><i class="sw" data-hex="' + h(sri.hex) + '"></i>สีเสริมโชค (ศรี) <b>' + h(sri.color_name) + '</b></span>' +
          '<span><i class="sw" data-hex="' + h(kala.hex) + '"></i>สีที่ควรเลี่ยง (กาลกิณี) <b>' + h(kala.color_name) + '</b></span>';
        host.querySelector('[data-roles]').innerHTML = rows.map(function (r) {
          return '<li class="role' + (r.role === 'sri' ? ' hi' : r.role === 'kalakini' ? ' lo' : '') + '">' +
            '<span class="rn">' + h(r.name) + '</span>' +
            '<span class="pl"><i class="sw" data-hex="' + h(r.hex) + '"></i>' + h(r.day_name) + '</span>' +
            '<span class="mn">' + h(r.meaning) + '</span></li>';
        }).join('');
        paint(host);
        if (opts.onChange) opts.onChange(key);
      }
      host.querySelector('.days').addEventListener('change', function (e) { render(e.target.value); });
      paint(host);
      render(start.key);
    }
  };
})();
