/* เลขศาสตร์ชื่อ: คำนวณในเบราว์เซอร์ · แสดงค่าตัวอักษรทีละตัว · ไม่เก็บชื่อ ไม่ใส่ URL */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, A = MH.astro;

  var rs = A.ruleset();
  var rsName = rs ? rs.name : 'ยังไม่ได้เลือกตำรา';
  document.querySelectorAll('[data-ruleset]').forEach(function (el) { el.textContent = rsName; });
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = MH.store.setting('disclaimer') || ''; });
  if (!MH.q.isLive(MH.q.article('name-numerology-basics'))) document.getElementById('why-link').hidden = true;

  var form = document.getElementById('nm-form'), fn = document.getElementById('nm-first'), ln = document.getElementById('nm-last');
  var out = document.getElementById('nm-result');
  var HINT = '<div class="result-hint">พิมพ์ชื่อแล้วกด “คำนวณ” ผลจะขึ้นตรงนี้</div>';

  function setErr(input, msg) {
    var err = document.getElementById(input.id + '-err');
    if (msg) { input.setAttribute('aria-invalid', 'true'); err.textContent = msg; err.hidden = false; }
    else { input.removeAttribute('aria-invalid'); err.textContent = ''; err.hidden = true; }
  }
  fn.addEventListener('input', function () { setErr(fn, ''); });
  ln.addEventListener('input', function () { setErr(ln, ''); });

  /* 45 → 4+5 = 9 */
  function chain(n) {
    var s = [n];
    while (n > 9) { n = String(n).split('').reduce(function (a, d) { return a + Number(d); }, 0); s.push(n); }
    return s.join(' → ');
  }
  /* สระ/วรรณยุกต์เดี่ยว ๆ ต้องมีวงกลมประรองรับ ไม่เช่นนั้นเครื่องหมายลอยผิดที่ */
  function glyph(ch) { return /\p{Mn}/u.test(ch) ? '◌' + ch : ch; }
  function letters(res) {
    return '<ul class="letters">' + res.letters.map(function (l) {
      return '<li><b>' + h(glyph(l.ch)) + '</b><span>' + l.value + '</span></li>';
    }).join('') + '</ul>';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var first = fn.value.trim(), last = ln.value.trim();
    setErr(fn, ''); setErr(ln, '');
    var r1 = A.numerology(first), r2 = A.numerology(last), bad = null;

    if (!first) { setErr(fn, 'ยังไม่ได้กรอกชื่อ พิมพ์ชื่อของคุณเป็นภาษาไทย เช่น สมชาย'); bad = fn; }
    else if (!r1.letters.length) { setErr(fn, 'ในช่องชื่อไม่มีตัวอักษรไทยที่อยู่ในตารางค่า ลองพิมพ์ชื่อเป็นภาษาไทย'); bad = fn; }
    if (last && !r2.letters.length) { setErr(ln, 'ในช่องนามสกุลไม่มีตัวอักษรไทยที่อยู่ในตารางค่า ลองพิมพ์เป็นภาษาไทย หรือเว้นว่างไว้'); bad = bad || ln; }
    if (bad) { out.innerHTML = HINT; bad.focus(); return; }

    var all = A.numerology(first + ' ' + last);
    var unknown = [];
    r1.unknown.concat(r2.unknown).forEach(function (c) { if (unknown.indexOf(c) < 0) unknown.push(c); });

    out.innerHTML =
      '<div class="card result">' +
        '<h2 id="nm-h" tabindex="-1">ผลเลขศาสตร์ชื่อ</h2>' +
        '<div class="sum-row">' +
          '<div class="sum"><span class="k">ผลรวมชื่อ</span><b>' + r1.total + '</b></div>' +
          '<div class="sum"><span class="k">ผลรวมนามสกุล</span><b>' + (last ? r2.total : '-') + '</b></div>' +
          '<div class="sum sum--hi"><span class="k">ผลรวมทั้งหมด</span><b>' + all.total + '</b></div>' +
        '</div>' +
        '<p class="reduced">เลขโดด <b>' + all.reduced + '</b>' + (all.meaning ? ' · ' + h(all.meaning.title) : '') +
          (all.total > 9 ? '<span class="muted"> (' + h(chain(all.total)) + ')</span>' : '') + '</p>' +
        (all.meaning
          ? '<p>' + h(all.meaning.meaning) + '</p>'
          : '<div class="notice notice--warn"><span>ตำรา “' + h(rsName) + '” ยังไม่มีคำอธิบายของเลข ' + all.reduced + '</span></div>') +
        '<h3>ชื่อ: ตัวอักษรและค่า</h3>' + letters(r1) +
        (last ? '<h3>นามสกุล: ตัวอักษรและค่า</h3>' + letters(r2) : '') +
        (unknown.length
          ? '<div class="notice notice--warn" role="status"><span>ตัวอักษรเหล่านี้ไม่มีในตารางค่า จึงไม่ถูกนับรวม: <b>' + unknown.map(h).join(' ') + '</b></span></div>'
          : '') +
        MH.ui.resultActions({
          tool: 'numerology', title: 'เลขศาสตร์ชื่อ: ผลรวม ' + all.total, input: { total: all.total, reduced: all.reduced },
          summary: 'ผลรวม ' + all.total + ' → เลขโดด ' + all.reduced + (all.meaning ? ' · ' + all.meaning.title : ''), explain: 'explain=numerology&total=' + all.total
        }) +
        '<p class="fine-print">คำนวณในเบราว์เซอร์ ไม่ได้ส่งหรือบันทึกชื่อของคุณ ถ้ากด “บันทึกผลนี้” จะเก็บเฉพาะตัวเลขผลรวม ไม่เก็บชื่อและไม่ใส่ลงที่อยู่เว็บ · ตารางค่าจากตำรา “' + h(rsName) + '” · ' + h(MH.store.setting('disclaimer') || '') + '</p>' +
      '</div>';
    document.getElementById('nm-h').focus();
  });
})();
