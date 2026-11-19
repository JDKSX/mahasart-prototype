/* ข้อมูลตัวอย่าง: หมวด บทความ วัตถุมงคล รูป สถิติ และดวง 12 ราศี
   ชื่อฟิลด์ตรงกับตารางใน spec เฟส 1 · วันที่เก็บเป็น ค.ศ. (ISO) แสดงผลเป็น พ.ศ.
   เนื้อบทความ: ย่อหน้าคั่นด้วยบรรทัดว่าง · "## " = หัวข้อ · "- " = รายการ */
window.MAHASART_DATA = window.MAHASART_DATA || {};
Object.assign(window.MAHASART_DATA, {

  categories: [
    { id: 1, type: 'article', name: 'โหราศาสตร์ไทย',   slug: 'thai-astrology', sort_order: 1, is_active: true, deleted_at: null },
    { id: 2, type: 'article', name: 'เลขศาสตร์',       slug: 'numerology',     sort_order: 2, is_active: true, deleted_at: null },
    { id: 3, type: 'article', name: 'ฮวงจุ้ย',         slug: 'fengshui',       sort_order: 3, is_active: true, deleted_at: null },
    { id: 4, type: 'article', name: 'วัตถุมงคล',       slug: 'amulet-guide',   sort_order: 4, is_active: true, deleted_at: null },
    { id: 5, type: 'article', name: 'ข่าวสาร & กิจกรรม', slug: 'news',           sort_order: 5, is_active: true, deleted_at: null },
    { id: 6, type: 'amulet',  name: 'พระเครื่อง',      slug: 'amulets',        sort_order: 1, is_active: true, deleted_at: null },
    { id: 7, type: 'amulet',  name: 'เหรียญ',          slug: 'coins',          sort_order: 2, is_active: true, deleted_at: null },
    { id: 8, type: 'amulet',  name: 'เครื่องราง',      slug: 'talismans',      sort_order: 3, is_active: true, deleted_at: null },
    { id: 9, type: 'amulet',  name: 'องค์บูชา',        slug: 'statues',        sort_order: 4, is_active: true, deleted_at: null },
    { id: 10, type: 'amulet', name: 'หินมงคล',         slug: 'stones',         sort_order: 5, is_active: true, deleted_at: null }
  ],

  /* status: draft | in_review | scheduled | published | archived
     thumb: ภาพประกอบชั่วคราว {glyph|art, tone: violet|amber} แทนรูปปกจริง */
  articles: [
    { id: 1, category_id: 1, slug: 'what-is-taksa', title: 'ทักษาปกรณ์คืออะไร ใช้ดูอะไรได้บ้าง',
      excerpt: 'ทักษาคือการจัดดาว 8 ดวงตามวันเกิด เพื่อบอกว่าด้านไหนของชีวิตสัมพันธ์กับดาวใด และสีหรือวันใดควรใช้หรือเลี่ยง',
      body: 'ทักษาปกรณ์เป็นหลักพื้นฐานของโหราศาสตร์ไทย ใช้ดาวประจำวันทั้ง 8 ดวง ได้แก่ อาทิตย์ จันทร์ อังคาร พุธ เสาร์ พฤหัสบดี ราหู และศุกร์ โดยเรียงวนเป็นวงตามลำดับนี้เสมอ\n\n## ตำแหน่งทั้ง 8\n\nเมื่อรู้วันเกิด เราเริ่มนับจากดาวประจำวันเกิดเป็นตำแหน่งแรก แล้วไล่ไปตามวง ได้ 8 ตำแหน่ง คือ บริวาร อายุ เดช ศรี มูละ อุตสาหะ มนตรี และกาลกิณี\n\n- บริวาร: คนรอบข้างและครอบครัว\n- ศรี: โชคลาภและสิริมงคล\n- กาลกิณี: สิ่งที่ควรเลี่ยง\n\n## นำไปใช้อย่างไร\n\nคนนิยมใช้ทักษาเลือกสีเสื้อ ตั้งชื่อ หรือเลือกวันทำสิ่งสำคัญ ทั้งหมดนี้เป็นไปตามความเชื่อ ควรใช้เป็นแนวทางประกอบ ไม่ใช่ตัวตัดสินใจหลัก',
      status: 'published', published_at: '2026-10-24T08:00:00+07:00', author_id: 3, reviewer_id: 5, reviewed_at: '2026-10-23T17:00:00+07:00', is_featured: true,
      thumb: { glyph: '๘', tone: 'violet' }, created_by: 3, updated_by: 2, created_at: '2026-10-21T10:00:00+07:00', updated_at: '2026-10-24T08:00:00+07:00', deleted_at: null },

    { id: 2, category_id: 4, slug: 'know-the-source-before-worship', title: 'ก่อนบูชาวัตถุมงคล ควรรู้ที่มาอย่างไร',
      excerpt: 'สามคำถามที่ควรถามทุกครั้งก่อนรับวัตถุมงคลมาบูชา: ใครสร้าง สร้างเมื่อไร และมีหลักฐานอะไรยืนยัน',
      body: 'วัตถุมงคลชิ้นเดียวกันอาจมีทั้งของที่สร้างจากวัดโดยตรง ของรุ่นใหม่ที่ทำตามแบบเดิม และของจำลอง การรู้ที่มาช่วยให้เราตัดสินใจได้ตรงกับสิ่งที่ตั้งใจ\n\n## ถามสามข้อนี้ก่อน\n\n- ใครเป็นผู้สร้าง หรือวัดใดเป็นเจ้าของรุ่น\n- สร้างปีไหน รุ่นอะไร\n- มีใบรับรองหรือหลักฐานอะไรบ้าง และใครเป็นผู้ออก\n\n## ป้ายประเภทบน MAHASART\n\nทุกชิ้นในแค็ตตาล็อกติดป้ายหนึ่งในห้าประเภท คือ มีใบรับรอง พระรุ่นใหม่ รุ่นจำลองเพื่อบูชา หินธรรมชาติ และองค์บูชา ถ้าไม่แน่ใจ ให้สอบถามรายละเอียดก่อนทุกครั้ง',
      status: 'published', published_at: '2026-10-20T08:00:00+07:00', author_id: 3, reviewer_id: 2, reviewed_at: '2026-10-19T16:00:00+07:00', is_featured: true,
      thumb: { art: 'a-somdej', tone: 'amber' }, created_by: 3, updated_by: 2, created_at: '2026-10-17T10:00:00+07:00', updated_at: '2026-10-20T08:00:00+07:00', deleted_at: null },

    { id: 3, category_id: 3, slug: 'bedroom-fengshui', title: 'ฮวงจุ้ยห้องนอน จัดอย่างไรให้หลับสบาย',
      excerpt: 'ตำแหน่งเตียง ทิศหัวนอน และของที่ไม่ควรวางในห้องนอน ตามหลักฮวงจุ้ยที่นิยมกัน',
      body: 'ห้องนอนเป็นที่ที่เราใช้เวลาพักผ่อนมากที่สุด หลักฮวงจุ้ยจึงให้ความสำคัญกับการจัดห้องนอนให้รู้สึกปลอดภัยและสงบ\n\n## ตำแหน่งเตียง\n\nหลักที่นิยมคือหัวเตียงชิดผนังทึบ และนอนแล้วมองเห็นประตูได้ แต่ไม่หันปลายเท้าตรงประตูพอดี\n\n## สิ่งที่ควรเลี่ยง\n\n- กระจกที่สะท้อนเตียงโดยตรง\n- คานหรือชั้นวางของหนักเหนือหัวนอน\n- ของรกใต้เตียง\n\nหลายข้อในฮวงจุ้ยตรงกับหลักการจัดห้องให้นอนหลับง่าย เช่น ห้องโล่ง แสงไม่จ้า และไม่มีของเกะกะ',
      status: 'published', published_at: '2026-10-16T08:00:00+07:00', author_id: 6, reviewer_id: 2, reviewed_at: '2026-10-15T15:00:00+07:00', is_featured: false,
      thumb: { glyph: '風', tone: 'violet' }, created_by: 6, updated_by: 2, created_at: '2026-10-12T10:00:00+07:00', updated_at: '2026-10-16T08:00:00+07:00', deleted_at: null },

    { id: 4, category_id: 1, slug: 'lek-7-tua-9-than', title: 'เลข 7 ตัว 9 ฐาน คืออะไร อ่านอย่างไร',
      excerpt: 'วิธีพยากรณ์แบบไทยที่ใช้ตัวเลขจากวัน เดือน และปีเกิด วางเป็นตาราง 7 หลัก 9 แถว',
      body: 'เลข 7 ตัว 9 ฐาน เป็นวิธีพยากรณ์ของโหราศาสตร์ไทยที่แปลงวัน เดือน และปีเกิดเป็นตัวเลข แล้ววางเป็นตาราง 7 หลักตามดาวประจำวัน และ 9 แถวหรือ "ฐาน"\n\n## ใช้อ่านอะไร\n\nแต่ละช่องในตารางมีความหมายเรื่องต่าง ๆ ของชีวิต เช่น ตัวตน ทรัพย์ คู่ครอง และการงาน ผู้พยากรณ์อ่านจากจำนวนเลขในช่องและความสัมพันธ์ระหว่างช่อง\n\n## บน MAHASART\n\nเครื่องคำนวณเลข 7 ตัว 9 ฐานยังไม่เปิดในเฟสแรก เพราะต้องให้โหรที่ปรึกษายืนยันวิธีตั้งเลขและตำราก่อน',
      status: 'published', published_at: '2026-10-11T08:00:00+07:00', author_id: 5, reviewer_id: 2, reviewed_at: '2026-10-10T15:00:00+07:00', is_featured: false,
      thumb: { glyph: '๙', tone: 'amber' }, created_by: 5, updated_by: 2, created_at: '2026-10-08T10:00:00+07:00', updated_at: '2026-10-11T08:00:00+07:00', deleted_at: null },

    { id: 5, category_id: 1, slug: 'thai-vs-western-rasi', title: 'ราศีแบบไทยกับแบบสากล ทำไมวันเปลี่ยนราศีไม่ตรงกัน',
      excerpt: 'โหราศาสตร์ไทยนับราศีตามตำแหน่งดาวจริงบนฟ้า (สุริยยาตร์) วันเปลี่ยนราศีจึงช้ากว่าแบบตะวันตกประมาณ 3–4 สัปดาห์',
      body: 'หลายคนเคยงงว่าทำไมเว็บไทยบอกว่าเราเป็นราศีหนึ่ง แต่เว็บต่างประเทศบอกอีกราศี คำตอบคือสองระบบนับจุดเริ่มต้นต่างกัน\n\n## สองระบบต่างกันตรงไหน\n\nแบบตะวันตกส่วนใหญ่ยึดฤดูกาล ราศีเมษเริ่มราววันที่ 21 มีนาคม ส่วนโหราศาสตร์ไทยยึดตำแหน่งดาวฤกษ์จริง ราศีเมษเริ่มราววันที่ 13–14 เมษายน ซึ่งตรงกับวันสงกรานต์\n\n## ถ้าเกิดวันใกล้รอยต่อ\n\nวันเปลี่ยนราศีขยับได้ประมาณหนึ่งวันในแต่ละปี ถ้าเกิดใกล้รอยต่อ ควรให้โหรคำนวณจากปีเกิดจริงอีกครั้ง',
      status: 'published', published_at: '2026-10-07T08:00:00+07:00', author_id: 5, reviewer_id: 2, reviewed_at: '2026-10-06T15:00:00+07:00', is_featured: false,
      thumb: { glyph: '♈︎', tone: 'violet' }, created_by: 5, updated_by: 2, created_at: '2026-10-04T10:00:00+07:00', updated_at: '2026-10-07T08:00:00+07:00', deleted_at: null },

    { id: 6, category_id: 4, slug: 'replica-new-certified', title: 'พระจำลอง พระรุ่นใหม่ และพระมีใบรับรอง ต่างกันอย่างไร',
      excerpt: 'อธิบายป้ายประเภทวัตถุมงคลบน MAHASART ว่าแต่ละป้ายหมายถึงอะไร และควรถามอะไรเพิ่ม',
      body: 'ป้ายประเภทช่วยให้รู้ทันทีว่ากำลังดูของแบบไหน ก่อนอ่านรายละเอียดอื่น\n\n## ความหมายของแต่ละป้าย\n\n- มีใบรับรอง: มีเอกสารจากผู้ออกใบรับรอง ระบุผู้ออกและเลขที่ไว้ในหน้าสินค้า\n- พระรุ่นใหม่: สร้างโดยวัดหรือผู้สร้างที่ระบุชื่อ บอกรุ่นและปีที่สร้าง\n- รุ่นจำลองเพื่อบูชา: ทำตามแบบพระที่มีชื่อเสียง ไม่ใช่ขององค์ต้นแบบ\n\n## สิ่งที่ควรถามเพิ่ม\n\nถ้าเป็นของมีใบรับรอง ขอดูรูปใบรับรองจริง ถ้าเป็นพระรุ่นใหม่ ถามชื่อรุ่นและปีที่สร้าง',
      status: 'published', published_at: '2026-10-03T08:00:00+07:00', author_id: 3, reviewer_id: 2, reviewed_at: '2026-10-02T15:00:00+07:00', is_featured: false,
      thumb: { art: 'a-coin', tone: 'amber' }, created_by: 3, updated_by: 2, created_at: '2026-09-30T10:00:00+07:00', updated_at: '2026-10-03T08:00:00+07:00', deleted_at: null },

    { id: 7, category_id: 5, slug: 'mahasart-prototype-open', title: 'MAHASART เปิดต้นแบบเว็บไซต์ให้ทดลองใช้',
      excerpt: 'ต้นแบบเฟสแรกเปิดให้ลองใช้เครื่องมือดูดวง 4 ตัว คลังความรู้ และแค็ตตาล็อกวัตถุมงคล',
      body: 'ทีม MAHASART เปิดต้นแบบเว็บไซต์เฟสแรกเพื่อรับฟังความเห็นก่อนพัฒนาระบบจริงบน mahasart.net\n\n## มีอะไรให้ลอง\n\n- ทักษาตามวันเกิด\n- สีและกาลกิณีประจำวัน\n- ราศีจากวันเกิด\n- เลขศาสตร์ชื่อ\n\n## ส่งความเห็น\n\nส่งความเห็นได้ทาง LINE OA @mahasart',
      status: 'published', published_at: '2026-10-26T07:00:00+07:00', author_id: 2, reviewer_id: 1, reviewed_at: '2026-10-25T18:00:00+07:00', is_featured: true,
      thumb: { glyph: 'M', tone: 'violet' }, created_by: 2, updated_by: 2, created_at: '2026-10-25T10:00:00+07:00', updated_at: '2026-10-26T07:00:00+07:00', deleted_at: null },

    { id: 8, category_id: 2, slug: 'name-numerology-basics', title: 'เลขศาสตร์ชื่อ คิดผลรวมอย่างไร',
      excerpt: 'หลักการรวมค่าตัวอักษรของชื่อและนามสกุล และทำไมแต่ละสำนักได้ผลไม่เท่ากัน',
      body: 'เลขศาสตร์ชื่อให้ค่าตัวเลขกับพยัญชนะ สระ และวรรณยุกต์แต่ละตัว แล้วรวมค่าของชื่อและนามสกุล\n\n## ทำไมผลไม่ตรงกัน\n\nแต่ละสำนักใช้ตารางค่าตัวอักษรต่างกันเล็กน้อย ผลรวมชื่อเดียวกันจึงอาจต่างกัน เครื่องมือบน MAHASART บอกเสมอว่าใช้ตารางชุดไหน\n\n## อ่านผลรวม\n\nผลรวมที่เป็นเลขสองหลักจะถูกบวกต่อจนเหลือหลักเดียว เพื่อดูความหมายพื้นฐาน',
      status: 'scheduled', published_at: '2026-10-29T08:00:00+07:00', author_id: 3, reviewer_id: 5, reviewed_at: '2026-10-25T20:00:00+07:00', is_featured: false,
      thumb: { glyph: '๕', tone: 'amber' }, created_by: 3, updated_by: 2, created_at: '2026-10-23T10:00:00+07:00', updated_at: '2026-10-25T20:00:00+07:00', deleted_at: null },

    { id: 9, category_id: 1, slug: 'day-colors-origin', title: 'สีประจำวันทั้ง 7 วัน มาจากไหน',
      excerpt: 'สีประจำวันของไทยผูกกับดาวเจ้าวันและเทพประจำวัน ตามคติที่สืบทอดกันมา',
      body: 'สีประจำวันของไทยผูกกับดาวเจ้าวันแต่ละดวง เช่น วันอาทิตย์คู่กับดวงอาทิตย์ใช้สีแดง วันจันทร์คู่กับดวงจันทร์ใช้สีเหลือง\n\n## ตารางสีประจำวัน\n\n- อาทิตย์: แดง\n- จันทร์: เหลือง\n- อังคาร: ชมพู\n- พุธ: เขียว\n- พฤหัสบดี: ส้ม\n- ศุกร์: ฟ้า\n- เสาร์: ม่วง',
      status: 'in_review', published_at: null, author_id: 3, reviewer_id: null, reviewed_at: null, is_featured: false,
      thumb: { glyph: '๗', tone: 'violet' }, created_by: 3, updated_by: 3, created_at: '2026-10-24T10:00:00+07:00', updated_at: '2026-10-25T21:10:00+07:00', deleted_at: null },

    { id: 10, category_id: 3, slug: 'office-desk-fengshui', title: 'จัดโต๊ะทำงานตามฮวงจุ้ย',
      excerpt: 'ฉบับร่าง: ตำแหน่งโต๊ะ ทิศที่หันหน้า และของบนโต๊ะ',
      body: 'ฉบับร่าง ยังเขียนไม่เสร็จ\n\n## ตำแหน่งโต๊ะ\n\nหลังพิงผนัง มองเห็นประตู',
      status: 'draft', published_at: null, author_id: 3, reviewer_id: null, reviewed_at: null, is_featured: false,
      thumb: { glyph: '風', tone: 'amber' }, created_by: 3, updated_by: 3, created_at: '2026-10-26T07:30:00+07:00', updated_at: '2026-10-26T07:30:00+07:00', deleted_at: null }
  ],

  article_sources: [
    { id: 1, article_id: 1, title: 'ตำราโหราศาสตร์ไทยที่โหรที่ปรึกษาเลือก (รอระบุ)', url: '', note: 'ใช้ยืนยันลำดับวงทักษา', sort_order: 1 },
    { id: 2, article_id: 5, title: 'ตารางวันเปลี่ยนราศีแบบสุริยยาตร์ (รอระบุ)', url: '', note: '', sort_order: 1 },
    { id: 3, article_id: 2, title: 'คู่มือการติดป้ายประเภทวัตถุมงคลของ MAHASART', url: 'page.html?slug=disclaimer', note: '', sort_order: 1 }
  ],

  /* provenance_type: certified | new_edition | replica | natural_stone | worship_statue
     art: ภาพประกอบชั่วคราว (symbol id) จนกว่าจะมีรูปจริง */
  amulets: [
    { id: 1, code: 'MH-0001', category_id: 6, slug: 'somdej-wat-rakang-replica', name: 'พระสมเด็จวัดระฆัง', provenance_type: 'replica',
      temple_name: '', maker: '', edition_name: 'แบบพิมพ์ทรงพระประธาน', edition_year_ce: null, certificate_issuer: '', certificate_no: '',
      material: 'เนื้อผง', size_text: '2.4 × 3.6 ซม.', belief_text: 'เมตตามหานิยม',
      description: 'รุ่นจำลองเพื่อบูชา ทำตามแบบพิมพ์ทรงพระประธาน ไม่ใช่พระสมเด็จวัดระฆังองค์ต้นแบบ เหมาะสำหรับผู้ที่ต้องการบูชาเป็นพุทธานุสติ',
      price_amount: null, is_price_visible: false, stock_status: 'available', status: 'published', published_at: '2026-10-18T09:00:00+07:00',
      is_featured: true, featured_order: 1, art: 'a-somdej', tone: 'amber', created_by: 4, updated_by: 4, created_at: '2026-10-15T09:00:00+07:00', updated_at: '2026-10-18T09:00:00+07:00', deleted_at: null },
    { id: 2, code: 'MH-0002', category_id: 7, slug: 'luang-por-ruay-coin', name: 'เหรียญหลวงพ่อรวย วัดตะโก', provenance_type: 'new_edition',
      temple_name: 'วัดตะโก จ.พระนครศรีอยุธยา', maker: 'วัดตะโก', edition_name: 'รุ่นตัวอย่าง', edition_year_ce: 2025, certificate_issuer: '', certificate_no: '',
      material: 'ทองแดง', size_text: '2.5 × 3.2 ซม.', belief_text: 'โชคลาภ ค้าขาย',
      description: 'เหรียญรุ่นใหม่ ชื่อรุ่นและปีในต้นแบบเป็นข้อมูลตัวอย่าง ต้องแก้ตามรุ่นจริงก่อนเผยแพร่',
      price_amount: null, is_price_visible: false, stock_status: 'available', status: 'published', published_at: '2026-10-18T09:10:00+07:00',
      is_featured: true, featured_order: 2, art: 'a-coin', tone: 'amber', created_by: 4, updated_by: 4, created_at: '2026-10-15T09:10:00+07:00', updated_at: '2026-10-18T09:10:00+07:00', deleted_at: null },
    { id: 3, code: 'MH-0003', category_id: 10, slug: 'auspicious-stone-bracelet', name: 'กำไลหินมงคล', provenance_type: 'natural_stone',
      temple_name: '', maker: '', edition_name: '', edition_year_ce: null, certificate_issuer: '', certificate_no: '',
      material: 'หินธรรมชาติ คละสี', size_text: 'เม็ด 8 มม.', belief_text: 'ปรับสมดุล เสริมกำลังใจ',
      description: 'กำไลหินธรรมชาติ ร้อยด้วยเอ็นยืด สีและลายของหินแต่ละเม็ดต่างกันตามธรรมชาติ',
      price_amount: null, is_price_visible: false, stock_status: 'available', status: 'published', published_at: '2026-10-18T09:20:00+07:00',
      is_featured: true, featured_order: 3, art: 'a-beads', tone: 'amber', created_by: 4, updated_by: 4, created_at: '2026-10-15T09:20:00+07:00', updated_at: '2026-10-18T09:20:00+07:00', deleted_at: null },
    { id: 4, code: 'MH-0004', category_id: 9, slug: 'thao-wessuwan-statue', name: 'ท้าวเวสสุวรรณ', provenance_type: 'worship_statue',
      temple_name: '', maker: '', edition_name: 'องค์บูชา ขนาดตั้งโต๊ะ', edition_year_ce: null, certificate_issuer: '', certificate_no: '',
      material: 'เรซิน ทำสีทอง', size_text: 'สูง 15 ซม.', belief_text: 'ปกป้อง คุ้มครอง',
      description: 'องค์บูชาท้าวเวสสุวรรณสำหรับตั้งบนหิ้งพระหรือโต๊ะทำงาน',
      price_amount: null, is_price_visible: false, stock_status: 'reserved', status: 'published', published_at: '2026-10-18T09:30:00+07:00',
      is_featured: true, featured_order: 4, art: 'a-statue', tone: 'amber', created_by: 4, updated_by: 4, created_at: '2026-10-15T09:30:00+07:00', updated_at: '2026-10-22T11:00:00+07:00', deleted_at: null },
    { id: 5, code: 'MH-0005', category_id: 6, slug: 'phra-pidta-powder', name: 'พระปิดตา เนื้อผง', provenance_type: 'certified',
      temple_name: 'ข้อมูลตัวอย่าง', maker: 'ข้อมูลตัวอย่าง', edition_name: 'รุ่นตัวอย่าง', edition_year_ce: 1995, certificate_issuer: 'ผู้ออกใบรับรองตัวอย่าง', certificate_no: 'DEMO-0001',
      material: 'เนื้อผง', size_text: '2.0 × 2.6 ซม.', belief_text: 'แคล้วคลาด',
      description: 'ข้อมูลวัด ผู้สร้าง และใบรับรองในต้นแบบเป็นข้อมูลสมมติ ใช้แสดงหน้าตาของสินค้าที่มีใบรับรองเท่านั้น',
      price_amount: null, is_price_visible: false, stock_status: 'available', status: 'published', published_at: '2026-10-18T09:40:00+07:00',
      is_featured: true, featured_order: 5, art: 'a-pidta', tone: 'amber', created_by: 4, updated_by: 4, created_at: '2026-10-15T09:40:00+07:00', updated_at: '2026-10-26T08:30:00+07:00', deleted_at: null },
    { id: 6, code: 'MH-0006', category_id: 10, slug: 'amethyst', name: 'หินอเมทิสต์', provenance_type: 'natural_stone',
      temple_name: '', maker: '', edition_name: '', edition_year_ce: null, certificate_issuer: '', certificate_no: '',
      material: 'อเมทิสต์ธรรมชาติ', size_text: 'ยาวประมาณ 6 ซม.', belief_text: 'สงบ ผ่อนคลาย',
      description: 'หินอเมทิสต์ทรงแท่ง รูปทรงและสีแต่ละชิ้นไม่เหมือนกัน',
      price_amount: null, is_price_visible: false, stock_status: 'available', status: 'published', published_at: '2026-10-18T09:50:00+07:00',
      is_featured: true, featured_order: 6, art: 'a-crystal', tone: 'violet', created_by: 4, updated_by: 4, created_at: '2026-10-15T09:50:00+07:00', updated_at: '2026-10-18T09:50:00+07:00', deleted_at: null },
    { id: 7, code: 'MH-0007', category_id: 8, slug: 'takrut-replica', name: 'ตะกรุดโทน', provenance_type: 'new_edition',
      temple_name: 'ข้อมูลตัวอย่าง', maker: 'ข้อมูลตัวอย่าง', edition_name: 'รุ่นตัวอย่าง', edition_year_ce: 2024, certificate_issuer: '', certificate_no: '',
      material: 'ทองแดง', size_text: 'ยาว 5 ซม.', belief_text: 'คุ้มครอง แคล้วคลาด',
      description: 'ตะกรุดรุ่นใหม่ ข้อมูลผู้สร้างเป็นข้อมูลตัวอย่าง',
      price_amount: null, is_price_visible: false, stock_status: 'sold', status: 'published', published_at: '2026-10-19T09:00:00+07:00',
      is_featured: false, featured_order: null, art: 'a-coin', tone: 'amber', created_by: 4, updated_by: 4, created_at: '2026-10-16T09:00:00+07:00', updated_at: '2026-10-24T09:00:00+07:00', deleted_at: null },
    { id: 8, code: 'MH-0008', category_id: 7, slug: 'new-coin-draft', name: 'เหรียญรุ่นใหม่ (ยังไม่มีรูป)', provenance_type: '',
      temple_name: '', maker: '', edition_name: '', edition_year_ce: null, certificate_issuer: '', certificate_no: '',
      material: '', size_text: '', belief_text: '',
      description: '',
      price_amount: null, is_price_visible: false, stock_status: 'not_for_sale', status: 'draft', published_at: null,
      is_featured: false, featured_order: null, art: null, tone: 'amber', created_by: 4, updated_by: 4, created_at: '2026-10-26T08:40:00+07:00', updated_at: '2026-10-26T08:40:00+07:00', deleted_at: null }
  ],

  /* รูปของวัตถุมงคลและบทความ · art = ภาพประกอบชั่วคราว (symbol id) */
  media: [
    { id: 1, owner_type: 'amulets', owner_id: 1, collection: 'gallery', file_name: 'mh-0001-front.webp', alt_text: 'พระสมเด็จจำลอง ด้านหน้า', art: 'a-somdej', sort_order: 1 },
    { id: 2, owner_type: 'amulets', owner_id: 1, collection: 'gallery', file_name: 'mh-0001-back.webp', alt_text: 'พระสมเด็จจำลอง ด้านหลัง', art: 'a-somdej', sort_order: 2 },
    { id: 3, owner_type: 'amulets', owner_id: 2, collection: 'gallery', file_name: 'mh-0002-front.webp', alt_text: 'เหรียญหลวงพ่อรวย ด้านหน้า', art: 'a-coin', sort_order: 1 },
    { id: 4, owner_type: 'amulets', owner_id: 3, collection: 'gallery', file_name: 'mh-0003.webp', alt_text: 'กำไลหินมงคล วางบนผ้า', art: 'a-beads', sort_order: 1 },
    { id: 5, owner_type: 'amulets', owner_id: 4, collection: 'gallery', file_name: 'mh-0004.webp', alt_text: 'องค์ท้าวเวสสุวรรณ ด้านหน้า', art: 'a-statue', sort_order: 1 },
    { id: 6, owner_type: 'amulets', owner_id: 5, collection: 'gallery', file_name: 'mh-0005-front.webp', alt_text: 'พระปิดตาเนื้อผง ด้านหน้า', art: 'a-pidta', sort_order: 1 },
    { id: 7, owner_type: 'amulets', owner_id: 5, collection: 'certificate', file_name: 'mh-0005-cert.webp', alt_text: 'ใบรับรองพระปิดตา เลขที่ DEMO-0001', art: 'a-scroll', sort_order: 1 },
    { id: 8, owner_type: 'amulets', owner_id: 6, collection: 'gallery', file_name: 'mh-0006.webp', alt_text: 'หินอเมทิสต์ทรงแท่ง', art: 'a-crystal', sort_order: 1 },
    { id: 9, owner_type: 'amulets', owner_id: 7, collection: 'gallery', file_name: 'mh-0007.webp', alt_text: 'ตะกรุดโทนทองแดง', art: 'a-coin', sort_order: 1 }
  ],

  /* สถิติรายวัน 7 วันล่าสุด (ไม่ระบุตัวบุคคล) */
  amulet_daily_stats: (function () {
    var rows = [], id = 1;
    var base = { 1: [42, 6], 2: [35, 5], 3: [28, 2], 4: [19, 3], 5: [51, 9], 6: [22, 1], 7: [11, 0] };
    for (var d = 0; d < 7; d++) {
      var date = new Date(Date.UTC(2026, 9, 20 + d)).toISOString().slice(0, 10);
      Object.keys(base).forEach(function (aid) {
        var v = base[aid], wiggle = (Number(aid) * 7 + d * 3) % 9 - 4;
        rows.push({ id: id++, amulet_id: Number(aid), stat_date: date, views: Math.max(0, v[0] + wiggle), line_clicks: Math.max(0, v[1] + (wiggle > 2 ? 1 : 0)) });
      });
    }
    return rows;
  })(),

  /* ดวง 12 ราศีรายสัปดาห์ (ตัวอย่าง) — สัปดาห์ 26 ต.ค. 2569 เผยแพร่ครบ, สัปดาห์ถัดไปเขียนแล้ว 5 ราศี */
  daily_horoscopes: (function () {
    var rasi = ['mesha', 'vrishabha', 'mithuna', 'karkata', 'simha', 'kanya', 'tula', 'vrischika', 'dhanu', 'makara', 'kumbha', 'mina'];
    var texts = [
      'สัปดาห์นี้งานที่ค้างมีโอกาสเดินหน้า ช่วงกลางสัปดาห์เหมาะกับการคุยงานกับผู้ใหญ่',
      'การเงินมีรายจ่ายจุกจิก ควรจดรายรับรายจ่ายให้ชัด ความสัมพันธ์ในครอบครัวราบรื่น',
      'มีเรื่องให้ต้องเดินทางหรือติดต่อหลายฝ่าย พักผ่อนให้พอในช่วงปลายสัปดาห์',
      'เหมาะกับการเริ่มเรียนหรือฝึกทักษะใหม่ ระวังการตัดสินใจเรื่องเงินด้วยอารมณ์',
      'มีคนเห็นผลงานมากขึ้น ใช้โอกาสนี้เสนอความคิดที่เตรียมไว้',
      'สุขภาพควรดูแลเรื่องการนอน งานเอกสารต้องตรวจทานก่อนส่ง',
      'ความรักมีเรื่องให้ปรับความเข้าใจ พูดตรง ๆ ด้วยความใจเย็นจะช่วยได้',
      'งานเป็นทีมได้ผลดีกว่าทำคนเดียว มีผู้ใหญ่ให้คำแนะนำที่มีประโยชน์',
      'มีโอกาสได้ลาภเล็ก ๆ จากงานพิเศษ ไม่ควรให้ใครยืมเงินในสัปดาห์นี้',
      'เหมาะกับการจัดบ้านหรือที่ทำงานใหม่ อารมณ์ดีขึ้นช่วงปลายสัปดาห์',
      'มีข่าวดีจากการติดต่อที่รอมานาน ระวังลืมนัดสำคัญ',
      'ใช้เวลากับคนใกล้ตัวมากขึ้น งานสร้างสรรค์ไปได้ดี'
    ];
    var rows = [], id = 1;
    rasi.forEach(function (r, i) {
      rows.push({ id: id++, period_type: 'week', period_start: '2026-10-26', rasi: r, body: texts[i], status: 'published', published_at: '2026-10-25T18:00:00+07:00', author_id: 5, created_at: '2026-10-24T10:00:00+07:00', updated_at: '2026-10-25T18:00:00+07:00', deleted_at: null });
    });
    rasi.slice(0, 5).forEach(function (r, i) {
      rows.push({ id: id++, period_type: 'week', period_start: '2026-11-02', rasi: r, body: texts[(i + 5) % 12], status: 'draft', published_at: null, author_id: 5, created_at: '2026-10-26T08:00:00+07:00', updated_at: '2026-10-26T08:00:00+07:00', deleted_at: null });
    });
    return rows;
  })()
});
