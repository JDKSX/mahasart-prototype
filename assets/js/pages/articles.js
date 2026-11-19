/* รายการบทความ: ตัวกรองหมวด (sync กับ URL ?cat=) · 9 เรื่องต่อหน้า */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h, PER = 9;
  var cats = MH.q.categories('article');

  var chipsHost = document.getElementById('cat-chips'), countEl = document.getElementById('ar-count');
  var listEl = document.getElementById('ar-list'), emptyEl = document.getElementById('ar-empty'), pagerEl = document.getElementById('ar-pager');

  var p = new URLSearchParams(location.search);
  var state = { cat: p.get('cat') || '', page: Math.max(1, parseInt(p.get('p'), 10) || 1) };

  chipsHost.innerHTML = '<button type="button" class="chip" data-cat="" aria-pressed="false">ทั้งหมด</button>' + cats.map(function (c) {
    return '<button type="button" class="chip" data-cat="' + h(c.slug) + '" aria-pressed="false">' + h(c.name) + '</button>';
  }).join('');

  function currentCat() { return state.cat ? cats.filter(function (c) { return c.slug === state.cat; })[0] || null : null; }

  function syncURL() {
    var sp = new URLSearchParams();
    if (state.cat) sp.set('cat', state.cat);
    if (state.page > 1) sp.set('p', state.page);
    var qs = sp.toString(), file = location.pathname.split('/').pop() || 'articles.html';
    try { history.replaceState(null, '', file + (qs ? '?' + qs : '')); } catch (e) {}
  }

  function renderPager(pages) {
    if (pages <= 1) { pagerEl.innerHTML = ''; return; }
    var html = '<button type="button" data-go="' + (state.page - 1) + '" aria-label="หน้าก่อนหน้า"' + (state.page === 1 ? ' disabled' : '') + '>‹</button>';
    for (var i = 1; i <= pages; i++) {
      html += '<button type="button" data-go="' + i + '" aria-label="หน้า ' + i + '"' + (i === state.page ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }
    html += '<button type="button" data-go="' + (state.page + 1) + '" aria-label="หน้าถัดไป"' + (state.page === pages ? ' disabled' : '') + '>›</button>';
    pagerEl.innerHTML = html;
  }

  function render() {
    var c = currentCat(), unknown = !!state.cat && !c;
    var all = unknown ? [] : MH.q.articles(c ? { categoryId: c.id } : {});
    var pages = Math.max(1, Math.ceil(all.length / PER));
    if (state.page > pages) state.page = pages;
    var slice = all.slice((state.page - 1) * PER, state.page * PER);

    chipsHost.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === state.cat)); });
    countEl.innerHTML = (c ? 'หมวด ' + h(c.name) + ' · ' : '') + 'พบ <b class="num">' + all.length + '</b> เรื่อง' + (pages > 1 ? ' · หน้า ' + state.page + ' จาก ' + pages : '');

    if (!all.length) {
      listEl.hidden = true; listEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.innerHTML = unknown
        ? MH.ui.empty('ไม่พบหมวดนี้', 'หมวดที่ระบุในลิงก์ไม่มีอยู่ ลองเลือกหมวดจากรายการด้านบน', '<button type="button" class="btn btn--primary" data-all>ดูบทความทั้งหมด</button>')
        : MH.ui.empty('หมวดนี้ยังไม่มีบทความ', 'บทความแรกของหมวด' + (c ? ' ' + c.name : '') + 'จะขึ้นที่นี่เมื่อเผยแพร่ ระหว่างนี้ลองอ่านหมวดอื่นก่อน', '<button type="button" class="btn btn--primary" data-all>ดูบทความทั้งหมด</button>');
    } else {
      emptyEl.hidden = true; emptyEl.innerHTML = '';
      listEl.hidden = false;
      listEl.innerHTML = slice.map(MH.ui.articleCard).join('');
    }
    renderPager(all.length ? pages : 1);
    syncURL();
  }

  chipsHost.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    state.cat = b.getAttribute('data-cat'); state.page = 1; render();
  });
  emptyEl.addEventListener('click', function (e) {
    if (!e.target.closest('[data-all]')) return;
    state.cat = ''; state.page = 1; render();
    chipsHost.querySelector('.chip').focus();
  });
  pagerEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b || b.disabled) return;
    state.page = Number(b.getAttribute('data-go')); render();
    countEl.scrollIntoView({ block: 'start' });
    countEl.focus({ preventScroll: true });
  });

  render();
})();
