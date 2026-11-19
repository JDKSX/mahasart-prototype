/* ทักษา: วิดเจ็ต + คำอธิบาย 8 ตำแหน่ง + ลิงก์ด่วนทุกวันเกิด + บทความที่เกี่ยวข้อง */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, A = MH.astro;

  function paint(root) {
    root.querySelectorAll('[data-hex]').forEach(function (el) { el.style.background = el.getAttribute('data-hex'); });
  }

  var rs = A.ruleset();
  document.querySelectorAll('[data-ruleset]').forEach(function (el) { el.textContent = rs ? rs.name : 'ยังไม่ได้เลือกตำรา'; });
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });

  /* 8 ตำแหน่ง */
  document.getElementById('role-guide').innerHTML = A.ROLES.map(function (r, i) {
    return '<li' + (r.key === 'sri' ? ' class="hi"' : '') + '><span class="n">ตำแหน่งที่ ' + (i + 1) + '</span><b>' + h(r.name) + '</b><span class="m">' + h(r.meaning) + '</span></li>';
  }).join('');

  /* วงทักษา */
  var cycle = document.getElementById('cycle');
  cycle.innerHTML = A.CYCLE.map(function (p) {
    var info = A.planetInfo(p);
    return '<li><i class="sw" data-hex="' + h(info.hex) + '"></i>' + h(info.day_name) + '</li>';
  }).join('');
  paint(cycle);

  /* ลิงก์ด่วนวันเกิด */
  var links = document.getElementById('day-links');
  links.innerHTML = A.BIRTHDAYS.map(function (b) {
    return '<a class="chip" href="taksa.html?day=' + encodeURIComponent(b.key) + '" data-day="' + h(b.key) + '">' + h(b.label) + '</a>';
  }).join('');
  function mark(key) {
    links.querySelectorAll('a').forEach(function (a) {
      if (a.getAttribute('data-day') === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ปุ่ม "บันทึกผลนี้" และ "ให้ AI อธิบายผลนี้" ใต้ผลทักษา (สมาชิกเท่านั้นที่บันทึกได้ · ไม่ใส่ชื่อหรือวันเกิดเต็มลง URL) */
  function actions(key) {
    var roles = document.querySelector('#taksa [data-roles]'); if (!roles) return;
    var box = document.getElementById('taksa-actions');
    if (!box) { box = document.createElement('div'); box.id = 'taksa-actions'; roles.insertAdjacentElement('afterend', box); }
    var b = A.birthday(key), rows = A.taksa(b.planet), sri = rows[3], kala = rows[7];
    box.innerHTML = MH.ui.resultActions({
      tool: 'taksa', title: 'ทักษา: เกิดวัน' + b.label, input: { day: key },
      summary: 'สีเสริมโชค (ศรี) ' + sri.color_name + ' · สีที่ควรเลี่ยง (กาลกิณี) ' + kala.color_name,
      explain: 'explain=taksa&day=' + encodeURIComponent(key)
    }) + '<p class="fine">' + (MH.member.current()
      ? 'บันทึกแล้วดูได้ที่ บัญชีของฉัน → ผลดูดวงที่บันทึก · เก็บเฉพาะวันเกิดที่เลือก'
      : 'สมาชิกบันทึกผลไว้ดูภายหลังได้ กดบันทึกแล้วระบบจะพาไปเข้าสู่ระบบก่อน') + '</p>';
  }

  /* วิดเจ็ต: เปลี่ยนวันเกิดแล้วอัปเดต URL (ไม่โหลดหน้าใหม่) */
  MH.taksaWidget.mount(document.getElementById('taksa'), {
    day: MH.util.param('day'),
    onChange: function (key) {
      mark(key);
      try { history.replaceState(null, '', '?day=' + key); } catch (e) {}
      actions(key);
    }
  });

  /* บทความที่เกี่ยวข้อง (เฉพาะที่เผยแพร่แล้ว) */
  var rel = ['what-is-taksa', 'day-colors-origin'].map(function (s) { return MH.q.article(s); }).filter(MH.q.isLive);
  if (rel.length) {
    document.getElementById('related-list').innerHTML = rel.map(MH.ui.articleItem).join('');
    document.getElementById('related').hidden = false;
  }
})();
