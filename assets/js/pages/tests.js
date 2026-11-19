/* แสดงผล MH.astroTests.run() เป็นตาราง + สรุป "ผ่าน N · ล้ม M" */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;

  var rs = MH.astro.ruleset();
  document.querySelectorAll('[data-ruleset]').forEach(function (el) { el.textContent = rs ? rs.name : 'ยังไม่ได้เลือกตำรา'; });

  var summary = document.getElementById('test-summary'), tbody = document.getElementById('test-rows');

  function run() {
    var res = MH.astroTests.run(), html = '', last = null;
    res.rows.forEach(function (r) {
      if (r.group !== last) { html += '<tr class="group"><th scope="colgroup" colspan="4">' + h(r.group) + '</th></tr>'; last = r.group; }
      html += '<tr' + (r.ok ? '' : ' class="fail"') + '><td>' + h(r.name) + '</td><td class="mono">' + h(r.expected) + '</td><td class="mono">' + h(r.actual) + '</td>' +
        '<td>' + (r.ok ? '<span class="res-ok">✓ ผ่าน</span>' : '<span class="res-fail">✗ ล้ม</span>') + '</td></tr>';
    });
    tbody.innerHTML = html;
    summary.className = 'notice ' + (res.fail ? 'notice--danger' : 'notice--ok');
    summary.textContent = 'ผ่าน ' + res.pass + ' · ล้ม ' + res.fail + (res.fail ? ' — มีสูตรที่ให้ค่าไม่ตรง ดูแถวสีแดง' : ' — สูตรทุกข้อให้ค่าตรงตามที่ตั้งไว้');
    return res;
  }

  run();
  document.getElementById('rerun').addEventListener('click', function () {
    var res = run();
    MH.ui.toast('ตรวจอีกครั้งแล้ว: ผ่าน ' + res.pass + ' · ล้ม ' + res.fail);
  });
})();
