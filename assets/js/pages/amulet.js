/* หน้ารายละเอียดวัตถุมงคล: ?code=MH-0001 · แกลเลอรี · ป้ายที่มา · ใบรับรอง · สถานะ · ปุ่มสอบถาม LINE
   ดูตัวอย่างจากหลังบ้าน: ?code=…&preview=1 (เฉพาะทีมงานที่ล็อกอิน) */
(function () {
  'use strict';
  var MH = window.MH, h = MH.util.h;
  var root = document.getElementById('amulet-root');
  var disclaimer = '<p class="disclaimer">' + h(MH.store.setting('disclaimer') || '') + '</p>';

  var PROV_TEXT = {
    certified: 'ชิ้นนี้มีใบรับรอง ระบุผู้ออกและเลขที่ไว้ด้านล่าง พร้อมรูปใบรับรอง',
    new_edition: 'พระรุ่นใหม่ สร้างโดยวัดหรือผู้สร้างที่ระบุชื่อ บอกรุ่นและปีที่สร้างไว้ในตารางที่มา',
    replica: 'รุ่นจำลองเพื่อบูชา ทำตามแบบพระที่มีชื่อเสียง ไม่ใช่ขององค์ต้นแบบ',
    natural_stone: 'หินธรรมชาติ สีและลายของแต่ละชิ้นไม่เหมือนกัน ไม่ใช่พระหรือเหรียญ',
    worship_statue: 'องค์บูชาสำหรับตั้งบนหิ้งพระหรือโต๊ะทำงาน บอกวัสดุและขนาดไว้ในตารางที่มา'
  };

  function crumbs(items) {
    return '<nav class="crumbs" aria-label="เส้นทางหน้า">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span aria-hidden="true">›</span>' : '') + (it[0] && !last ? '<a href="' + it[0] + '">' + h(it[1]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + h(it[1]) + '</span>');
    }).join('') + '</nav>';
  }

  function notFound() {
    document.title = 'ไม่พบวัตถุมงคล · MAHASART';
    root.innerHTML = '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['amulets.html', 'วัตถุมงคล'], [null, 'ไม่พบ']]) + '</div>' +
      '<div class="state"><p class="big" aria-hidden="true">?</p><h1>ไม่พบวัตถุมงคลชิ้นนี้</h1>' +
      '<p>รหัสในลิงก์อาจพิมพ์ผิด หรือชิ้นนี้ถูกนำออกจากแค็ตตาล็อกแล้ว ลองดูชิ้นอื่นที่เปิดให้ชมอยู่</p>' +
      '<div class="btn-row"><a class="btn btn--primary" href="amulets.html">' + MH.ui.icon('i-back') + 'กลับไปดูวัตถุมงคล</a><a class="btn btn--outline" href="search.html">ค้นหา</a></div></div>';
  }

  var code = MH.util.param('code');
  var m = code ? (MH.q.amulet(code) || MH.q.amulet(String(code).toUpperCase())) : null;
  var live = MH.q.isLive(m);
  var wantsPreview = MH.util.param('preview') === '1';
  var preview = !!m && !live && wantsPreview && !!MH.auth.user();
  if (!m || (!live && !preview)) { notFound(); return; }

  /* นับยอดดูเฉพาะการเปิดจริงของคนทั่วไป (ไม่นับตอนทีมงานกดดูตัวอย่าง) */
  if (live && !wantsPreview) MH.store.track(m.id, 'views');

  document.title = m.name + ' · MAHASART';
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', (m.belief_text ? 'ความเชื่อ: ' + m.belief_text + ' · ' : '') + m.name + ' ประเภท' + ((MH.labels.provenance[m.provenance_type] || {}).label || ''));

  var cat = MH.q.category(m.category_id);
  var gallery = MH.q.media('amulets', m.id, 'gallery');
  var certImgs = MH.q.media('amulets', m.id, 'certificate');
  var prov = MH.labels.provenance[m.provenance_type];
  var altOf = function (g) { return g.alt_text || m.name; };
  if (!gallery.length) gallery = [{ art: m.art, alt_text: m.name }];
  var toneCls = m.tone === 'violet' ? ' thumb--violet' : '';

  /* ที่มา — แถวที่ว่างไม่แสดง */
  var rows = [
    ['วัด / สถานที่', m.temple_name], ['ผู้สร้าง', m.maker], ['รุ่น', m.edition_name],
    ['ปีที่สร้าง', m.edition_year_ce ? 'พ.ศ. ' + (Number(m.edition_year_ce) + 543) : ''],
    ['วัสดุ', m.material], ['ขนาด', m.size_text]
  ].filter(function (r) { return r[1]; });

  /* ใบรับรอง */
  var certHtml = '';
  if (m.provenance_type === 'certified') {
    var cimg = certImgs[0];
    certHtml = '<div class="cert">' +
      (cimg ? '<div class="thumb thumb--violet" role="img" aria-label="' + h(cimg.alt_text || 'รูปใบรับรอง') + '">' + MH.ui.art(cimg.art) + '</div>' : '') +
      '<div><h3>ใบรับรอง</h3><dl><dt>ผู้ออก</dt><dd>' + h(m.certificate_issuer || 'ยังไม่ระบุ') + '</dd><dt>เลขที่</dt><dd>' + h(m.certificate_no || 'ยังไม่ระบุ') + '</dd></dl>' +
      (cimg ? '' : '<p class="muted">ยังไม่มีรูปใบรับรอง</p>') + '</div></div>';
  }

  /* สถานะ + ปุ่มสอบถาม */
  var stockLabel = MH.labels.stock[m.stock_status] || m.stock_status;
  var askOpen = live && (m.stock_status === 'available' || m.stock_status === 'reserved');
  var why = '';
  if (!live) why = 'นี่คือตัวอย่างก่อนเผยแพร่ ปุ่มสอบถามจะใช้ได้หลังเผยแพร่แล้ว';
  else if (m.stock_status === 'sold') why = 'ชิ้นนี้ส่งมอบแล้ว จึงปิดปุ่มสอบถาม ดูชิ้นอื่นด้านล่างได้';
  else if (m.stock_status === 'not_for_sale') why = 'ชิ้นนี้ไม่เปิดให้บูชา จึงปิดปุ่มสอบถาม ดูชิ้นอื่นด้านล่างได้';
  else if (m.stock_status === 'reserved') why = 'มีผู้จองแล้ว แต่ยังสอบถามไว้ได้ เผื่อมีการเปลี่ยนแปลง';
  var askHtml = '<div class="ask-box">' +
    (askOpen
      ? '<button type="button" class="btn btn--primary" data-ask="' + h(m.code) + '">' + MH.ui.icon('i-chat') + 'สอบถามทาง LINE</button>'
      : '<button type="button" class="btn btn--primary" disabled aria-describedby="ask-why">' + MH.ui.icon('i-chat') + 'สอบถามทาง LINE</button>') +
    (why ? '<p id="ask-why">' + h(why) + '</p>' : '') + '</div>';

  /* ราคา + จำนวน + ปุ่มซื้อ (สไตล์อยู่ใน shop.css เติมลิงก์ให้เอง เพราะ amulet.html ไม่ได้ลิงก์ไว้) */
  if (!document.querySelector('link[href$="shop.css"]')) {
    var cssLink = document.createElement('link'); cssLink.rel = 'stylesheet'; cssLink.href = MH.base + 'assets/css/shop.css'; document.head.appendChild(cssLink);
  }
  var hasPrice = !!(m.is_price_visible && m.price_amount != null), stockQty = m.stock_qty || 0, canBuy = live && MH.ui.canBuy(m);
  function inCart() {
    var it = MH.cart.items().filter(function (x) { return x.amulet && x.amulet.id === m.id; })[0];
    return it ? it.qty : 0;
  }
  var buyWhy = '';
  if (!live) buyWhy = 'นี่คือตัวอย่างก่อนเผยแพร่ ยังสั่งซื้อไม่ได้';
  else if (m.stock_status === 'sold') buyWhy = 'ชิ้นนี้ส่งมอบแล้ว จึงสั่งซื้อไม่ได้';
  else if (m.stock_status === 'not_for_sale') buyWhy = 'ชิ้นนี้ไม่เปิดให้บูชา จึงสั่งซื้อไม่ได้';
  else if (stockQty <= 0) buyWhy = 'สินค้าหมดชั่วคราว สอบถามทาง LINE ว่าจะมีของเมื่อไหร่ หรือดูชิ้นอื่นด้านล่าง';
  var buyHtml;
  if (!hasPrice) {
    buyHtml = '<p class="sh-buy-why">ชิ้นนี้ยังไม่เปิดสั่งซื้อออนไลน์ สอบถามราคาทาง LINE ได้</p>';
  } else {
    buyHtml = '<div class="sh-buy">' + MH.ui.priceLine(m) +
      (canBuy
        ? '<div class="sh-buy-row"><span class="sh-lbl" id="buy-qty-l">จำนวน</span><div class="sh-qty" role="group" aria-labelledby="buy-qty-l">' +
            '<button type="button" data-q="-1" aria-label="ลดจำนวน" disabled>−</button>' +
            '<input type="number" id="buy-qty" inputmode="numeric" min="1" max="' + stockQty + '" value="1" aria-label="จำนวนที่ต้องการ">' +
            '<button type="button" data-q="1" aria-label="เพิ่มจำนวน"' + (stockQty <= 1 ? ' disabled' : '') + '>+</button></div>' +
          '<span class="muted" id="buy-left">มี ' + stockQty + ' ชิ้น</span></div>'
        : '') +
      '<div class="sh-buy-row"><button type="button" class="btn btn--gold" id="buy-add"' + (canBuy ? '' : ' disabled aria-describedby="buy-why"') + '>' + MH.ui.icon('i-cart') + 'ใส่ตะกร้า</button>' +
        '<button type="button" class="btn btn--primary" id="buy-now"' + (canBuy ? '' : ' disabled aria-describedby="buy-why"') + '>ซื้อเลย' + MH.ui.icon('i-arrow') + '</button></div>' +
      (canBuy ? '<p class="sh-buy-why" id="buy-incart" aria-live="polite"></p>' : '') +
      (buyWhy ? '<p class="sh-buy-why" id="buy-why">' + h(buyWhy) + '</p>' : '') + '</div>';
  }

  /* ชิ้นอื่น: หมวดเดียวกันก่อน แล้วเติมด้วยชิ้นอื่นจนครบ 4 */
  var others = MH.q.amulets().filter(function (x) { return x.id !== m.id; });
  var same = others.filter(function (x) { return x.category_id === m.category_id; });
  var rel = same.concat(others.filter(function (x) { return x.category_id !== m.category_id; })).slice(0, 4);

  root.innerHTML =
    '<div class="page-head">' + crumbs([['index.html', 'หน้าแรก'], ['amulets.html', 'วัตถุมงคล']].concat(cat ? [['amulets.html?cat=' + encodeURIComponent(cat.slug), cat.name]] : []).concat([[null, m.name]])) + '</div>' +
    (preview ? '<div class="notice notice--warn article-notice" role="status"><span>ตัวอย่างก่อนเผยแพร่ เห็นเฉพาะทีมงาน (สถานะ: <b>' + h(MH.labels.articleStatus[m.status] || m.status) + '</b>)</span></div>' : '') +
    '<div class="pd">' +
      '<div class="pd-gallery"><figure class="gal-main">' +
        '<div class="thumb' + toneCls + '" role="img" data-gal-main aria-label="' + h(altOf(gallery[0])) + '">' + MH.ui.art(gallery[0].art || m.art) + '</div>' +
        '<figcaption data-gal-cap aria-hidden="true">' + h(altOf(gallery[0])) + '</figcaption></figure>' +
        (gallery.length > 1
          ? '<ul class="gal-thumbs" aria-label="รูปทั้งหมดของชิ้นนี้">' + gallery.map(function (g, i) {
              return '<li><button type="button" data-gal-i="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="ดูรูป: ' + h(altOf(g)) + '">' + MH.ui.art(g.art || m.art) + '</button></li>';
            }).join('') + '</ul>'
          : '') +
        '<p class="fine-print">ภาพในต้นแบบเป็นภาพประกอบชั่วคราว</p>' +
      '</div>' +
      '<div class="pd-info">' +
        '<div class="code-line">' + MH.ui.provenanceTag(m.provenance_type) + '<span class="code">รหัส ' + h(m.code) + '</span></div>' +
        '<h1>' + h(m.name) + '</h1>' +
        (m.belief_text ? '<p class="belief-line">ความเชื่อ: ' + h(m.belief_text) + '</p>' : '') +
        '<p class="prov-note">' + h(prov ? PROV_TEXT[m.provenance_type] : 'ยังไม่ได้ระบุประเภทที่มา (ต้องระบุก่อนเผยแพร่)') + '</p>' +
        '<p class="stock stock--' + h(m.stock_status) + '">' + h(stockLabel) + '</p>' +
        buyHtml +
        askHtml +
        (live ? '<div class="sh-fav">' + MH.ui.favButton('amulet', m.id) + '</div>' : '') +
        '<h2>ที่มาและรายละเอียด</h2>' +
        (rows.length
          ? '<dl class="kv">' + rows.map(function (r) { return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>'; }).join('') + '</dl>'
          : '<p class="muted">ยังไม่มีรายละเอียดที่มาของชิ้นนี้ สอบถามเพิ่มเติมทาง LINE ได้</p>') +
        certHtml +
        (m.description ? '<p class="desc">' + h(m.description) + '</p>' : '') +
        disclaimer +
      '</div>' +
    '</div>' +
    (rel.length
      ? '<section class="section" aria-labelledby="rel-h"><div class="sec-head"><h2 id="rel-h">ดูวัตถุมงคลอื่น</h2><a href="amulets.html">ดูทั้งหมด</a></div>' +
        '<p class="sec-note">' + (same.length ? 'หมวดเดียวกันขึ้นก่อน' : 'ยังไม่มีชิ้นอื่นในหมวดนี้ ขอแนะนำชิ้นอื่นแทน') + '</p>' +
        '<ul class="amulets amulets--4">' + rel.map(MH.ui.amuletCard).join('') + '</ul></section>'
      : '');

  /* จำนวน · ใส่ตะกร้า · ซื้อเลย */
  var qtyIn = document.getElementById('buy-qty'), addBtn = document.getElementById('buy-add'), nowBtn = document.getElementById('buy-now');
  if (qtyIn && canBuy) {
    var decBtn = root.querySelector('[data-q="-1"]'), incBtn = root.querySelector('[data-q="1"]'), note = document.getElementById('buy-incart');
    var readQty = function () { var n = Math.floor(Number(qtyIn.value)); if (!isFinite(n) || n < 1) n = 1; if (n > stockQty) n = stockQty; return n; };
    var syncQty = function () {
      var n = readQty(), k = inCart();
      qtyIn.value = n; decBtn.disabled = n <= 1; incBtn.disabled = n >= stockQty;
      note.textContent = k ? 'ในตะกร้ามีชิ้นนี้แล้ว ' + k + ' ชิ้น' + (k >= stockQty ? ' (ครบจำนวนที่มีแล้ว)' : '') : '';
    };
    var addNow = function (goCart) {
      var n = readQty(), k = inCart(), left = stockQty - k;
      if (left <= 0) {
        if (goCart) { location.href = MH.base + 'cart.html'; return; }
        MH.ui.toast('ในตะกร้ามีชิ้นนี้ครบจำนวนที่มีแล้ว (' + k + ' ชิ้น)'); return;
      }
      if (n > left) { MH.ui.toast('เพิ่มได้อีกไม่เกิน ' + left + ' ชิ้น (ในตะกร้ามีแล้ว ' + k + ' ชิ้น)'); return; }
      var r = MH.cart.add(m.id, n);
      if (!r.ok) { MH.ui.toast(r.error); return; }
      syncQty();
      if (goCart) { location.href = MH.base + 'cart.html'; return; }
      MH.ui.dialog({ title: 'ใส่ตะกร้าแล้ว', html: '<p>เพิ่ม ' + h(m.name) + ' ' + n + ' ชิ้น · ในตะกร้ามีสินค้า ' + MH.cart.count() + ' ชิ้น</p>',
        actions: [{ label: 'เลือกต่อ', cls: 'btn--outline', value: null }, { label: 'ไปที่ตะกร้า', cls: 'btn--primary', value: 'go' }] })
        .then(function (v) { if (v === 'go') location.href = MH.base + 'cart.html'; });
    };
    decBtn.addEventListener('click', function () { qtyIn.value = readQty() - 1; syncQty(); });
    incBtn.addEventListener('click', function () { qtyIn.value = readQty() + 1; syncQty(); });
    qtyIn.addEventListener('change', syncQty);
    addBtn.addEventListener('click', function () { addNow(false); });
    nowBtn.addEventListener('click', function () { addNow(true); });
    syncQty();
  }

  /* สลับรูปในแกลเลอรี */
  var main = root.querySelector('[data-gal-main]'), cap = root.querySelector('[data-gal-cap]');
  var btns = Array.prototype.slice.call(root.querySelectorAll('[data-gal-i]'));
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = Number(b.getAttribute('data-gal-i')), g = gallery[i];
      main.innerHTML = MH.ui.art(g.art || m.art);
      main.setAttribute('aria-label', altOf(g));
      cap.textContent = altOf(g);
      btns.forEach(function (x, j) { x.setAttribute('aria-pressed', String(j === i)); });
    });
  });
})();
