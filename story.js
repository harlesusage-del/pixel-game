// ======================= PIXEL LIFE — MESIN CERITA (v3: pertemanan → pendekatan, 14 hari) =======================
// Logika murni (tanpa DOM). Cerita per HARI: selesaikan misi wajib hari itu, lalu tidur di Rumah untuk lanjut.
// Chapter 1 (hari 1-4) Awal yang Baru | Chapter 2 (hari 5-8) Kota yang Sama | Chapter 3 (hari 9-14) Semakin Dekat.
// Akhir tiap chapter: host memutuskan satu pilihan cerita (divalidasi server lewat story_decide).
const Story = (() => {
  const NAMES = { florist:'Toko Bunga', mechanic:'Bengkel', cafe:'Kafe', hall:'Balai Kota', house:'Rumah', market:'Pasar', school:'Sekolah Sihir' };
  const NPCN = { florist:'Bu Mawar', mechanic:'Pak Bimo', market:'Pak Udin', cafe:'Mbak Kiki', hall:'Pak Lurah', school:'Bu Arunika', school2:'Kak Rimba' };
  const CHAPTERS = {
    1: { title:'Awal yang Baru', sub:'Dua orang asing, satu kota kecil, dan sebuah sekolah sihir yang membuat mereka enggan berjalan bersama.' },
    2: { title:'Kota yang Sama', sub:'Usaha mulai berjalan, dan perlahan kalian belajar saling mengandalkan.' },
    3: { title:'Semakin Dekat', sub:'Kebiasaan kecil, salah paham, dan hadiah-hadiah sederhana mendekatkan kalian.' },
    4: { title:'Membangun Hubungan', sub:'Segera hadir — festival kota menanti kalian berdua.' },
  };
  const DAYS = { 1:['Selamat Datang','Kenali tempat usahamu dan warga kota.'], 2:['Kabar dari Balai Kota','Sebuah surat undangan tiba.'], 3:['Antara Enggan dan Penasaran','Kabar burung mulai beredar.'],
    4:['Langkah Pertama Bersama','Mungkinkah kalian melangkah berdampingan?'], 5:['Mulai Berbisnis','Bahan, pesanan, dan kelas sihir.'], 6:['Belajar dan Saling Membantu','Ilmu baru, utang budi baru.'],
    7:['Naik Kelas','Usaha tumbuh, kepercayaan tumbuh.'], 8:['Janji di Sekolah Sihir','Dulu enggan, kini bersama.'], 9:['Kebiasaan Baru','Sarapan, berangkat, dan hadiah kecil.'],
    10:['Mengenal Lebih Dalam','Apa yang sebenarnya disukai pasanganmu?'], 11:['Salah Paham','Desas-desus membuat suasana canggung.'], 12:['Saling Menopang','Membantu usaha satu sama lain.'],
    13:['Sihir yang Sebenarnya','Kelas besar dan ramuan sempurna.'], 14:['Menjelang Festival','Kota bersiap, hati pun bersiap.'] };
  const LAST_DAY = { 1:4, 2:8, 3:14 };
  const WILL = ['Enggan', 'Ragu', 'Mau', 'Akrab'];
  const LOOK = { 'Kuali Ramuan':['look:cauldron', 3], 'Bola Kristal':['look:crystal', 3], 'Rak Bunga':['look:rakbunga', 1], 'Rak Suku Cadang':['look:rakparts', 1], 'Lapak Sayur':['look:stallv', 1],
    'Lapak Buah':['look:stallf', 1], 'Papan Pengumuman':['look:board', 2], 'Mesin Kopi':['look:coffee', 2], 'Rak Buku Mantra':['look:books', 3], 'Papan Tulis Ajaib':['look:chalk', 3] };
  const LANDMARKS = [ { flag:'view:school', x:552, y:100, r:40 }, { flag:'view:plaza', x:320, y:200, r:56 }, { flag:'view:park', x:552, y:350, r:50 } ];
  const ORDER = ['intro_night', 'first_outing', 'festival_meet'];
  const DECISIONS = {
    intro_night: { title:'Malam Perkenalan', req:'ch1:done', next:2,
      text:'Chapter 1 selesai: kalian berhasil melangkah ke Sekolah Sihir bersama. Sebagai host, tentukan di mana malam itu kalian berbincang santai untuk pertama kalinya. Pilihan ini membekas dalam cerita dan dialog warga.',
      options:[ { v:'cafe', label:'Kafe Kota', effect:'Suasana hangat dan ramai. Mbak Kiki jadi saksi pertemuan kalian.' },
        { v:'taman', label:'Taman Kota', effect:'Tenang di bawah pohon dan dekat kolam. Warga membicarakan keromantisan taman.' },
        { v:'alun', label:'Alun-alun', effect:'Di dekat air mancur, di tengah kota. Pak Lurah menyebutnya awal ikatan kota ini.' } ] },
    first_outing: { title:'Jalan Berdua Pertama', req:'ch2:done', next:3,
      text:'Chapter 2 selesai: usaha berjalan dan kalian tak lagi enggan. Sebagai host, tentukan ke mana kalian pertama kali sengaja berjalan berdua (bukan karena misi, tapi karena ingin).',
      options:[ { v:'taman', label:'Taman Kota', effect:'Menyusuri kolam saat senja. Warga yang lewat tersenyum-senyum.' },
        { v:'alun', label:'Alun-alun', effect:'Duduk di bangku dekat air mancur. Obrolan terasa mengalir.' },
        { v:'sekolah', label:'Sekolah Sihir (kelas malam)', effect:'Belajar mantra kecil berdua di kelas malam. Bu Arunika pura-pura tidak melihat.' } ] },
    festival_meet: { title:'Janji Festival', req:'ch3:done', next:4,
      text:'Chapter 3 selesai: kalian kini sangat dekat. Sebagai host, tentukan di mana kalian berjanji bertemu pada malam festival kota yang akan datang.',
      options:[ { v:'alun', label:'Alun-alun', effect:'Di bawah lampu-lampu festival, dekat air mancur.' },
        { v:'taman', label:'Taman Kota', effect:'Di tepi kolam, jauh dari keramaian.' },
        { v:'sekolah', label:'Sekolah Sihir', effect:'Di depan gerbang sekolah tempat segalanya dimulai.' } ] },
  };
  const PLACE = { cafe:'Kafe Kota', taman:'Taman Kota', alun:'Alun-alun', sekolah:'Sekolah Sihir' };

  let flags = new Set(), chapter = 1, decisions = {}, role = 'florist', isHost = false, key = '', mode = 'local', opts = {}, cb = {}, log = [];
  const has = f => flags.has(f);
  const other = () => role === 'florist' ? 'mechanic' : 'florist';
  const will = () => has('will:3') ? 3 : has('will:2') ? 2 : has('will:1') ? 1 : 0;
  const curDay = () => { let d = 1; for (const f of flags) if (f.startsWith('day:')) d = Math.max(d, Number(f.slice(4)) || 1); return d; };
  const partner = () => (opts.partnerName && opts.partnerName()) || 'pasanganmu';
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } };
  const lsSet = () => { try { localStorage.setItem(key, JSON.stringify({ flags:[...flags], decisions, chapter })); } catch (e) {} };
  const emit = () => cb.change && cb.change();

  // ---------------- Daftar misi ----------------
  const Q = (id, cat, ch, day, title, desc, steps, reward, x = {}) => ({ id, cat, ch, day, title, desc, steps, reward, pre:x.pre || [], start:x.start, opt:!!x.opt, grants:x.grants || [], gnote:x.gnote });
  const S = (id, text, t = {}) => ({ id, text, t });
  const quests = () => { const m = role, o = other(), B = NAMES, MJ = m === 'florist' ? 'Meja Rangkai' : 'Meja Kerja', RAK = m === 'florist' ? 'Rak Bunga' : 'Rak Suku Cadang'; const L = [
    // ================= CHAPTER 1 (hari 1-4) =================
    Q('q1','utama',1,1,'Hari Pertama di Kota','Kenali tempat usahamu dan sapa pemasok langgananmu.',
      [ S('enter:' + m, `Masuk ke ${B[m]} (tempat usahamu)`, { door:m }), S('talk:' + m, `Ajak bicara ${NPCN[m]} di dalam`, { door:m, npc:true }) ], 'Kamu resmi memulai usahamu di kota ini.'),
    Q('q2','utama',1,1,'Sapa Pak Udin','Pedagang pasar tahu segalanya tentang kota ini.', [ S('talk:market','Bicara dengan Pak Udin di Pasar', { door:'market', npc:true }) ], 'Pak Udin senang punya langganan baru.', { pre:['q1'] }),
    Q('q3','utama',1,1,'Kopi Pertama','Kafe adalah tempat warga bertukar kabar.', [ S('talk:cafe','Sapa Mbak Kiki di Kafe', { door:'cafe', npc:true }) ], 'Kopi pertamamu di kota ini terasa enak.', { pre:['q1'] }),
    Q('q4','utama',1,1,'Rumah Sementara','Lihat tempat tinggalmu. Di sinilah kamu tidur untuk memulai hari berikutnya.', [ S('enter:house','Masuk ke Rumah', { door:'house' }) ], 'Rumah kecil ini akan menjadi saksi banyak cerita.', { pre:['q1'] }),
    Q('q15','sampingan',1,1,'Kenali Dagangan Sendiri','Periksa perlengkapan tempat usahamu.', [ S(m === 'florist' ? 'look:rakbunga' : 'look:rakparts', `Periksa ${RAK} di dalam tempat usahamu`, { door:m }) ], 'Kamu hafal letak barang dagangan.', { pre:['q1'], opt:true }),
    Q('q16','utama',1,1,'Jalan-jalan di Pasar','Lihat-lihat barang dagangan pasar.', [ S('look:stallv','Periksa Lapak Sayur di Pasar', { door:'market' }), S('look:stallf','Periksa Lapak Buah di Pasar', { door:'market' }) ], 'Kamu tahu apa saja yang dijual di pasar.', { pre:['q2'] }),
    Q('q5','sampingan',1,1,'Keranjang yang Hilang','Pak Udin kehilangan keranjang dagangannya. Mungkin tertinggal di taman.',
      [ S('basket_found','Temukan keranjang di Taman Kota (ikuti panah)', { obj:'basket' }), S('basket_returned','Kembalikan ke Pak Udin di Pasar', { door:'market', npc:true }) ], 'Pak Udin berhutang budi padamu.', { pre:['q2'], start:'basket_quest', opt:true }),
    Q('q6','utama',1,2,'Panggilan Balai Kota','Pak Lurah mengirim kabar untuk warga baru.', [ S('got_letter','Temui Pak Lurah di Balai Kota (ada kabar untukmu)', { door:'hall', npc:true }) ], 'Kamu menerima Surat Undangan Sekolah Sihir.'),
    Q('q17','utama',1,2,'Kabar di Papan','Warga menempel kabar di balai kota.', [ S('look:board','Baca Papan Pengumuman di Balai Kota', { door:'hall' }) ], 'Kamu tahu kabar terbaru kota.', { pre:['q6'] }),
    Q('q7','utama',1,2,'Undangan Sekolah Sihir','Surat itu mengundangmu belajar di Sekolah Sihir. Kamu belum mau pergi bersama pasanganmu... jadi pergilah sendiri dulu.',
      [ S('view:school','Lihat Sekolah Sihir dari dekat (pojok kanan atas kota)', { door:'school' }), S('enter:school','Masuk ke Sekolah Sihir (sendirian saja)', { door:'school' }), S('talk:school','Temui Bu Arunika di dalam', { door:'school', npc:'school' }) ],
      'Sekolah itu ternyata indah. Tapi kamu masih enggan datang bersama pasanganmu.', { pre:['q6'] }),
    Q('q8','kerja sama',1,2,'Sapa Tetanggamu','Temukan pasanganmu di kota, sapa dia, lalu kunjungi tempat usahanya.',
      [ S('greeted','Sapa pasanganmu (dekati dia, tekan AKSI)', { partner:true }), S('enter:' + o, `Kunjungi ${B[o]} milik pasanganmu`, { door:o }) ], 'Kalian resmi saling mengenal.', { pre:['q1'] }),
    Q('q9','utama',1,2,'Keliling Kota','Kenali sudut-sudut kota sambil berjalan-jalan.',
      [ S('view:plaza','Lihat air mancur di Alun-alun (tengah kota)'), S('view:park','Lihat kolam di Taman Kota (pojok kanan bawah)') ], 'Kamu mulai hafal jalan-jalan kota.', { pre:['q1'] }),
    Q('q18','sampingan',1,2,'Aroma Kopi','Mesin kopi kafe terkenal seantero kota.', [ S('look:coffee','Periksa Mesin Kopi di Kafe', { door:'cafe' }) ], 'Aromanya melekat di ingatanmu.', { pre:['q3'], opt:true }),
    Q('q10','utama',1,3,'Kabar Burung','Setelah surat itu, warga mulai bergosip soal kalian berdua.',
      [ S('gossip_cafe','Dengar kabar dari Mbak Kiki di Kafe', { door:'cafe', npc:true }), S('gossip_market','Dengar kabar dari Pak Udin di Pasar', { door:'market', npc:true }) ],
      'Kamu jadi penasaran dengan pasanganmu.', { pre:['q7'], grants:['will:1'], gnote:'Sikapmu ke Sekolah Sihir bersama pasangan: ENGGAN → RAGU. Kamu tidak lagi menolak berada di sekolah yang sama dengannya.' }),
    Q('q11','utama',1,3,'Pelajaran Pertama','Ikut kelas pertama di Sekolah Sihir.',
      [ S('look:cauldron','Periksa Kuali Ramuan', { door:'school' }), S('look:crystal','Periksa Bola Kristal', { door:'school' }), S('talk:school2','Ajak bicara Kak Rimba (murid senior)', { door:'school', npc:'school2' }) ], 'Sihir ternyata menyenangkan.', { pre:['q7'] }),
    Q('q19','utama',1,3,'Buku dan Kapur Ajaib','Pelajari isi kelas lebih dalam.', [ S('look:books','Periksa Rak Buku Mantra', { door:'school' }), S('look:chalk','Baca Papan Tulis Ajaib', { door:'school' }) ], 'Kamu hafal mantra-mantra dasar.', { pre:['q7'] }),
    Q('q12','kerja sama',1,3,'Berpapasan di Sekolah','Kini kamu tidak keberatan satu sekolah dengan pasanganmu. Kalian tidak harus berdekatan.',
      [ S('school_copresent','Berada di Sekolah Sihir pada saat yang sama dengan pasanganmu (butuh pasangan online)', { door:'school' }) ], 'Kalian satu kelas, walau duduk berjauhan.', { pre:['q10'] }),
    Q('q13','kerja sama',1,4,'Mencairkan Suasana','Waktunya mengobrol tanpa gengsi.',
      [ S('t4:cafe','Duduk berdekatan dengan pasanganmu di dalam Kafe beberapa detik (butuh pasangan online)', { door:'cafe' }) ], 'Obrolan di kafe mencairkan suasana.',
      { pre:['q12'], grants:['will:2'], gnote:'Sikapmu ke Sekolah Sihir: RAGU → MAU. Kamu bersedia berjalan ke sana bersama pasanganmu.' }),
    Q('q21','kerja sama',1,4,'Belanja Berdua','Berbelanja lebih seru kalau ada teman.', [ S('t4:market','Berdiri berdekatan dengan pasanganmu di Pasar beberapa detik', { door:'market' }) ], 'Belanja berdua ternyata menyenangkan.', { pre:['q12'] }),
    Q('q22','kerja sama',1,4,'Senja di Taman','Kolam taman paling cantik saat sore.', [ S('t4:park','Berdiri berdekatan dengan pasanganmu di Taman Kota beberapa detik (dekat kolam)') ], 'Senja di taman terasa tenang.', { pre:['q12'] }),
    Q('q14','kerja sama',1,4,'Berangkat Bersama','Langkah besar: ke Sekolah Sihir berdampingan, bukan sendiri-sendiri.',
      [ S('school_together','Masuk Sekolah Sihir bersama pasanganmu (berjalan berdampingan ke pintu)', { door:'school' }) ], 'Kalian melangkah masuk bersama untuk pertama kalinya.', { pre:['q13'] }),
  ]; if (chapter >= 2) L.push(
    // ================= CHAPTER 2 (hari 5-8) =================
    Q('r1','utama',2,5,'Modal dan Bahan',`Beli bahan di ${MJ}, lalu siapkan usahamu.`, [ S('stock_bought',`Beli bahan di ${MJ} (atau tombol UANG → BISNIS saat di dalam tempat usahamu)`, { door:m }) ], 'Rak bahanmu mulai terisi.'),
    Q('r2','utama',2,5,'Pesanan Pertama','Pelanggan pertama menunggu.', [ S('rep:1','Selesaikan 1 pesanan', { door:m }) ], 'Pendapatan pertama masuk ke kas usahamu.', { pre:['r1'] }),
    Q('r3','kerja sama',2,5,'Kelas Pagi Bersama','Sekarang kalian mau berada sedekat itu di kelas.', [ S('class_together','Berada berdekatan dengan pasanganmu di dalam Sekolah Sihir (butuh pasangan online)', { door:'school' }) ], 'Kelas pagi terasa lebih ramai.', { pre:['q14'] }),
    Q('r15','utama',2,5,'Kenali Pemasokmu',`Ngobrol dengan ${NPCN[m]} soal pasokan dan harga.`, [ S('supplier_tip',`Minta saran pasokan dari ${NPCN[m]} di ${B[m]}`, { door:m, npc:true }) ], 'Kamu tahu cara menghemat belanja bahan.', { pre:['r1'] }),
    Q('r16','utama',2,5,'Hadiah Pertama','Tanda kecil perhatian untuk pasanganmu.', [ S('gs:1','Kirim hadiah ke pasanganmu (UANG → SALDO → BERI HADIAH)') ], 'Hadiah kecil membuat suasana hangat.'),
    Q('r4','utama',2,6,'Tiga Pesanan','Reputasi dibangun dari pesanan demi pesanan.', [ S('rep:3','Selesaikan 3 pesanan (total)', { door:m }) ], 'Warga mulai membicarakan usahamu.', { pre:['r2'] }),
    Q('r5','utama',2,6,'Belajar Sihir Usaha','Bu Arunika punya pelajaran khusus untuk pemilik usaha.', [ S('lesson1','Belajar dari Bu Arunika di Sekolah Sihir', { door:'school', npc:'school' }) ], 'Kamu belajar sihir kecil untuk usahamu.', { pre:['r3'] }),
    Q('r6','kerja sama',2,6,'Saling Membantu','Pinjam-meminjam antar dua usaha, dengan perjanjian yang jelas.', [ S('loan_active','Buat atau setujui pinjaman antarpemain (UANG → PINJAMAN)') ], 'Kepercayaan di antara kalian bertambah.'),
    Q('r7','kerja sama',2,6,'Ramuan Bersama','Meracik ramuan butuh dua pasang tangan.', [ S('brew_together','Periksa Kuali Ramuan saat pasanganmu juga berada di sekolah', { door:'school' }) ], 'Ramuan pertama kalian berhasil.',
      { pre:['r5'], grants:['will:3'], gnote:'Sikapmu ke Sekolah Sihir: MAU → AKRAB. Berangkat bersama sudah jadi kebiasaan.' }),
    Q('r17','utama',2,6,'Saran dari Mbak Kiki','Mbak Kiki hafal rahasia usaha-usaha kecil.', [ S('kiki_tip','Minta saran bisnis dari Mbak Kiki di Kafe', { door:'cafe', npc:true }) ], 'Kamu dapat saran berharga soal pelanggan.', { pre:['r2'] }),
    Q('r18','kerja sama',2,6,'Saling Berkunjung','Lihat dunia kerja pasanganmu dari dekat.', [ S('t6:florist','Berdiri berdekatan dengan pasanganmu di Toko Bunga beberapa detik', { door:'florist' }), S('t6:mechanic','Berdiri berdekatan dengan pasanganmu di Bengkel beberapa detik', { door:'mechanic' }) ], 'Kalian saling memahami pekerjaan masing-masing.', { pre:['q14'] }),
    Q('r8','utama',2,7,'Lima Pesanan','Usahamu makin sibuk.', [ S('rep:5','Selesaikan 5 pesanan (total)', { door:m }) ], 'Pelanggan tetap mulai berdatangan.', { pre:['r4'] }),
    Q('r9','utama',2,7,'Kas Sehat','Usaha yang sehat punya cadangan kas.', [ S('cash:500','Kumpulkan kas usaha hingga 500 KC', { door:m }) ], 'Keuanganmu mulai stabil.', { pre:['r4'] }),
    Q('r10','utama',2,7,'Naik Kelas','Kembangkan usahamu ke level berikutnya.', [ S('upgraded',`Upgrade usaha ke level 2 (${MJ} → BISNIS)`, { door:m }) ], 'Usahamu lebih besar: pesanan lebih banyak dan lebih bernilai.', { pre:['r4'] }),
    Q('r11','kerja sama',2,7,'Melunasi Janji','Utang yang dilunasi menumbuhkan kepercayaan.', [ S('loan_settled','Pinjaman antarpemain berstatus LUNAS') ], 'Janji ditepati.', { pre:['r6'] }),
    Q('r19','kerja sama',2,7,'Saling Memberi','Hadiah kecil yang berbalas.', [ S('gs:2','Kirim hadiah (total 2 kali) ke pasanganmu'), S('gr:1','Terima hadiah dari pasanganmu') ], 'Perhatian kecil terasa berarti.', { pre:['r16'] }),
    Q('r12','utama',2,8,'Usaha Berkembang','Delapan pesanan: tanda usahamu dipercaya.', [ S('rep:8','Selesaikan 8 pesanan (total)', { door:m }) ], 'Usahamu dikenal seluruh kota.', { pre:['r8'] }),
    Q('r13','utama',2,8,'Kas Besar','Cadangan yang tebal membuatmu tenang.', [ S('cash:800','Kumpulkan kas usaha hingga 800 KC', { door:m }) ], 'Kamu siap menghadapi masa depan.', { pre:['r9'] }),
    Q('r20','utama',2,8,'Persiapan Festival','Kota bersiap menyambut festival.', [ S('festival_prep','Dengar rencana festival dari Pak Lurah', { door:'hall', npc:true }), S('udin_festival','Dengar kabar festival dari Pak Udin', { door:'market', npc:true }) ], 'Seluruh kota sibuk bersiap.', { pre:['q14'] }),
    Q('r14','kerja sama',2,8,'Janji di Sekolah Sihir','Temui Bu Arunika bersama-sama, tanpa enggan lagi.', [ S('finale_school','Temui Bu Arunika bersama pasanganmu di Sekolah Sihir (berdekatan)', { door:'school', npc:'school' }) ], 'Dulu enggan, kini selalu bersama.', { pre:['r7'] }),
  ); if (chapter >= 3) L.push(
    // ================= CHAPTER 3 (hari 9-14): PENDEKATAN =================
    Q('c1','kerja sama',3,9,'Sarapan Bersama','Kebiasaan baru: sarapan di kafe sebelum bekerja.', [ S('t9:cafe','Duduk berdekatan dengan pasanganmu di Kafe beberapa detik', { door:'cafe' }) ], 'Pagi terasa lebih ringan.'),
    Q('c2','kerja sama',3,9,'Berangkat Sekolah, Lagi','Kini berangkat bersama sudah wajar.', [ S('t9:schoolgate','Masuk Sekolah Sihir bersama pasanganmu (berdampingan ke pintu)', { door:'school' }) ], 'Tak ada lagi yang canggung di pintu sekolah.'),
    Q('c3','utama',3,9,'Hadiah Kecil','Perhatian kecil lebih berarti dari barang mahal.', [ S('gs:3','Kirim hadiah ke pasanganmu (total 3 kali)') ], 'Kamu mulai paham cara membuatnya tersenyum.'),
    Q('c4','utama',3,9,'Catatan Pasangan',`Orang terdekat pasanganmu tahu kebiasaannya. Tanya ${NPCN[m]}.`, [ S('mentor_tip3',`Dengar cerita soal pasanganmu dari ${NPCN[m]}`, { door:m, npc:true }) ], 'Kamu tahu satu kebiasaan kecil pasanganmu.'),
    Q('c5','kerja sama',3,10,'Senja di Alun-alun','Duduk menikmati air mancur.', [ S('t10:plaza','Berdiri berdekatan dengan pasanganmu di Alun-alun beberapa detik (dekat air mancur)') ], 'Air mancur jadi tempat obrolan favorit.'),
    Q('c6','kerja sama',3,10,'Cerita di Taman','Kolam taman dan cerita masa kecil.', [ S('t10:park','Berdiri berdekatan dengan pasanganmu di Taman Kota beberapa detik') ], 'Kalian saling bercerita soal masa kecil.'),
    Q('c7','utama',3,10,'Tanya Kak Rimba','Murid senior suka mengamati.', [ S('rimba3','Ngobrol dengan Kak Rimba soal pasanganmu', { door:'school', npc:'school2' }) ], 'Kamu dapat sudut pandang baru.'),
    Q('c8','utama',3,10,'Tanya Bu Arunika','Guru sihir selalu punya nasihat.', [ S('arunika3','Minta nasihat Bu Arunika', { door:'school', npc:'school' }) ], 'Nasihatnya sederhana tapi mengena.'),
    Q('c9','utama',3,11,'Desas-desus','Ada kabar tak enak yang beredar.', [ S('rumor_udin','Dengar desas-desus dari Pak Udin', { door:'market', npc:true }), S('rumor_kiki','Dengar desas-desus dari Mbak Kiki', { door:'cafe', npc:true }) ], 'Kamu sadar ada salah paham yang harus diluruskan.'),
    Q('c10','kerja sama',3,11,'Meluruskan Salah Paham','Bicara baik-baik di tempat yang tenang.', [ S('t11:school','Berdiri berdekatan dengan pasanganmu di Sekolah Sihir beberapa detik', { door:'school' }) ], 'Kalian bicara jujur tanpa gengsi.', { pre:['c9'] }),
    Q('c11','kerja sama',3,11,'Minta Maaf','Satu sapaan tulus kadang cukup.', [ S('apology','Sapa pasanganmu sekali lagi dengan tulus (dekati dia, tekan AKSI)', { partner:true }) ], 'Salah paham itu selesai.', { pre:['c9'] }),
    Q('c12','utama',3,11,'Hadiah Penebus','Sebuah hadiah sebagai tanda tulus.', [ S('gs:4','Kirim hadiah ke pasanganmu (total 4 kali)') ], 'Hadiah itu sampai dengan senyum.', { pre:['c9'] }),
    Q('c13','kerja sama',3,12,'Toko Bunga Berdua','Bantu menata dagangan.', [ S('t12:florist','Berdiri berdekatan dengan pasanganmu di Toko Bunga beberapa detik', { door:'florist' }) ], 'Tata letak dagangan jadi lebih rapi.'),
    Q('c14','kerja sama',3,12,'Bengkel Berdua','Bantu merapikan perkakas.', [ S('t12:mechanic','Berdiri berdekatan dengan pasanganmu di Bengkel beberapa detik', { door:'mechanic' }) ], 'Perkakas tertata berkat kerja berdua.'),
    Q('c15','utama',3,12,'Dua Belas Pesanan','Usahamu stabil dan dipercaya.', [ S('rep:12','Selesaikan 12 pesanan (total)', { door:m }) ], 'Pelanggan setia makin banyak.'),
    Q('c16','utama',3,12,'Kas Besar II','Cadangan kas yang lebih tebal.', [ S('cash:1200','Kumpulkan kas usaha hingga 1.200 KC', { door:m }) ], 'Keuanganmu sangat sehat.'),
    Q('c17','kerja sama',3,12,'Pinjaman Kepercayaan','Percaya berarti berani membantu lagi.', [ S('loans:2','Miliki 2 pinjaman antarpemain yang pernah AKTIF/LUNAS (UANG → PINJAMAN)') ], 'Kepercayaan kalian teruji dan terjaga.'),
    Q('c18','kerja sama',3,13,'Kelas Besar','Kelas penuh mantra yang butuh dua orang.', [ S('t13:school','Berdiri berdekatan dengan pasanganmu di Sekolah Sihir beberapa detik', { door:'school' }) ], 'Mantra kalian selaras.'),
    Q('c19','kerja sama',3,13,'Kristal Bersama','Bola kristal bereaksi pada dua hati.', [ S('crystal_together','Periksa Bola Kristal saat pasanganmu juga berada di sekolah', { door:'school' }) ], 'Bola kristal memancarkan cahaya hangat.'),
    Q('c20','utama',3,13,'Mantra Pribadi','Setiap orang punya mantra sendiri.', [ S('spell_lesson3','Pelajari mantra pribadi dari Bu Arunika', { door:'school', npc:'school' }) ], 'Kamu punya mantra yang cocok untukmu.'),
    Q('c21','utama',3,13,'Lima Belas Pesanan','Reputasi usahamu menembus kota.', [ S('rep:15','Selesaikan 15 pesanan (total)', { door:m }) ], 'Usahamu jadi buah bibir.'),
    Q('c22','utama',3,14,'Kabar Festival','Pak Lurah ingin bicara dengan kalian berdua.', [ S('festival_hall','Temui Pak Lurah bersama pasanganmu di Balai Kota (berdekatan)', { door:'hall', npc:true }) ], 'Festival kota sebentar lagi.'),
    Q('c23','kerja sama',3,14,'Persiapan Bersama','Berbelanja untuk festival.', [ S('t14:market','Berdiri berdekatan dengan pasanganmu di Pasar beberapa detik', { door:'market' }) ], 'Perlengkapan festival siap.'),
    Q('c24','kerja sama',3,14,'Janji di Alun-alun','Malam sebelum festival, di bawah lampu kota.', [ S('t14:plaza','Berdiri berdekatan dengan pasanganmu di Alun-alun beberapa detik') ], 'Kalian berjanji bertemu lagi pada hari festival.'),
  ); return L; };

  const qDone = q => q.steps.every(s => has(s.id));
  const qStatus = (q, all) => {
    if (qDone(q)) return 'SELESAI';
    if (curDay() < q.day) return 'TERKUNCI';
    if (!q.pre.every(id => { const p = all.find(x => x.id === id); return p && qDone(p); })) return 'TERKUNCI';
    if (q.start && !has(q.start)) return 'TERSEDIA';
    return 'BERLANGSUNG';
  };
  const doneSet = () => new Set(quests().filter(qDone).map(q => q.id));
  const neededFlags = () => { const s = new Set(); for (const q of quests()) if (!qDone(q)) for (const st of q.steps) if (!has(st.id)) s.add(st.id); return s; };

  // ---------------- Dialog bersyarat (aturan pertama yang cocok dipakai) ----------------
  const hint = () => { const t = target(); return t ? `Kalau bingung, ingat tujuanmu: ${t.step.text}.` : 'Kamu sudah mengenal kota ini dengan baik.'; };
  const D = {
    florist: [
      { when:s => s.own && s.ch >= 3 && s.day() >= 9 && !s.has('mentor_tip3'), flags:['mentor_tip3'], lines:s => [`Soal ${s.partner()}? Kuperhatikan dia suka lewat sini saat sore, sambil melirik bunga-bunga yang paling harum.`,'Orang yang suka hal-hal harum biasanya hatinya lembut. Jangan terlalu keras kepala, ya.'] },
      { when:s => s.own && !s.has('talk:florist'), lines:['Selamat datang di tokomu sendiri! Aku Bu Mawar, pemasok bunga langgananmu.','Nanti di sini kamu akan merangkai bouquet sesuai pesanan, mengatur stok, lalu menjual dengan harga yang kamu tentukan.','Untuk sekarang, kenali dulu kotamu: Pak Udin di Pasar dan Mbak Kiki di Kafe.','Semangat membuka usaha baru!'] },
      { when:s => s.own && s.ch >= 2 && s.day() >= 5 && !s.has('supplier_tip'), flags:['supplier_tip'], lines:['Saran dari pemasok: beli bunga secukupnya. Bunga yang menumpuk akan layu dan uangmu ikut layu.','Mulailah dari paket Bouquet Sederhana: bahannya murah dan pelanggannya banyak.'] },
      { when:s => s.own && s.ch >= 2, lines:s => ['Sekarang waktunya berbisnis! Pakai Meja Rangkai untuk membeli bahan dan mengerjakan pesanan.', s.hint()] },
      { when:s => s.own, lines:s => ['Ada yang bisa kubantu lagi?', s.hint()] },
      { when:() => true, lines:['Ini toko bunga milik pasanganmu, ya? Cantik sekali.','Kalau dia butuh bantuan, kalian bisa saling membantu lewat uang dan pinjaman.','Mampirlah sesekali!'] },
    ],
    mechanic: [
      { when:s => s.own && s.ch >= 3 && s.day() >= 9 && !s.has('mentor_tip3'), flags:['mentor_tip3'], lines:s => [`Soal ${s.partner()}? Dia sering melirik motor tua di pojok sambil tersenyum, padahal bukan miliknya.`,'Orang yang menghargai barang lama biasanya setia. Hati-hati, jangan sampai kamu kalah setia, ya.'] },
      { when:s => s.own && !s.has('talk:mechanic'), lines:['Wah, bengkel baru! Aku Bimo, pemasok suku cadang. Barangku bagus-bagus, tenang saja.','Nanti pelanggan datang dengan keluhan motor mereka. Tugasmu memilih suku cadang yang tepat, lalu memperbaikinya.','Untuk sekarang, kenali dulu orang-orang di kota ini: Pasar dan Kafe.'] },
      { when:s => s.own && s.ch >= 2 && s.day() >= 5 && !s.has('supplier_tip'), flags:['supplier_tip'], lines:['Saran dari pemasok: jangan menimbun suku cadang. Beli sesuai servis yang sedang menunggu.','Mulailah dari Ganti Oli: murah, cepat, dan pelanggannya selalu ada.'] },
      { when:s => s.own && s.ch >= 2, lines:s => ['Waktunya bekerja! Pakai Meja Kerja untuk membeli suku cadang dan mengerjakan servis pelanggan.', s.hint()] },
      { when:s => s.own, lines:s => ['Bengkelmu mulai terasa hidup!', s.hint()] },
      { when:() => true, lines:['Kamu temannya pemilik bengkel ini? Dia orang yang teliti.','Motor pengantar bunga pasti sering butuh servis. Kalian bisa saling bantu.'] },
    ],
    market: [
      { when:s => s.has('basket_found') && !s.has('basket_returned'), flags:['basket_returned'], lines:['Itu keranjangku! Di mana kamu menemukannya?','Terima kasih banyak. Kamu orang baik. Jangan sungkan datang kalau butuh bahan.'] },
      { when:s => !s.has('talk:market'), flags:['basket_quest'], lines:['Halo! Aku Udin, pedagang di pasar ini sudah lama.','Bahan-bahan dari pemasok masuk ke kota lewat pasar ini: bunga segar, suku cadang, dan banyak lagi.','Eh, ngomong-ngomong, keranjang daganganku hilang. Mungkin tertinggal waktu aku istirahat di Taman Kota. Kalau kamu lewat sana, tolong cari ya?'] },
      { when:s => s.day() >= 3 && s.has('got_letter') && !s.has('gossip_market'), flags:['gossip_market'], lines:s => [`Katanya kamu dapat surat dari Sekolah Sihir? ${s.partner()} juga dapat, lho.`,'Tapi kudengar dia bilang tidak mau berangkat bareng kamu. Hehe, sama-sama gengsi!','Santai saja. Orang yang awalnya enggan sering jadi yang paling kompak belakangan.'] },
      { when:s => s.ch >= 3 && s.day() >= 11 && !s.has('rumor_udin'), flags:['rumor_udin'], lines:s => [`Eh, kamu dengar? Ada yang bilang ${s.partner()} merasa kamu menghindarinya akhir-akhir ini.`,'Aku nggak percaya sih. Tapi kalau benar, lebih baik cepat diluruskan sebelum jadi gosip besar.'] },
      { when:s => s.ch >= 2 && s.day() >= 8 && !s.has('udin_festival'), flags:['udin_festival'], lines:['Kabar baik! Kota akan mengadakan festival sebentar lagi. Pasar ini bakal ramai sekali.','Siapkan stok dan siapkan hati. Festival itu waktu yang bagus buat dekat dengan seseorang, hehe.'] },
      { when:s => s.has('basket_returned'), lines:['Keranjangku sudah kembali, berkat kamu!','Kalau mau tahu kabar kota, tanya Mbak Kiki di Kafe. Dia tahu semuanya.'] },
      { when:() => true, lines:['Keranjangku masih belum ketemu. Coba cek sekitar Taman Kota, ya.'] },
    ],
    cafe: [
      { when:s => s.day() >= 3 && s.has('got_letter') && !s.has('gossip_cafe'), flags:['gossip_cafe'], lines:s => ['Kamu dengar? Surat dari Sekolah Sihir itu jadi bahan obrolan satu kota.',`${s.partner()} bilang ke sini, katanya, "Aku ke sana sendiri saja. Nggak enak kalau bareng." Kamu juga begitu, kan?`,'Tapi aku lihat kalian berdua sama-sama penasaran. Gengsi itu cuma kulit luarnya.'] },
      { when:s => s.ch >= 3 && s.day() >= 11 && !s.has('rumor_kiki'), flags:['rumor_kiki'], lines:s => [`Hati-hati, ada gosip kalau ${s.partner()} dan kamu sedang "perang dingin". Padahal kalian cuma salah paham, kan?`,'Gosip itu kayak kopi: kalau didiamkan jadi pahit. Lebih baik bicara langsung.'] },
      { when:s => s.ch >= 2 && s.day() >= 6 && !s.has('kiki_tip'), flags:['kiki_tip'], lines:['Saran dari barista: ingat pelanggan, ingat kesukaannya. Itu rahasia usaha kecil mana pun.','Dan satu lagi: jangan lupa tersenyum, bahkan saat stok menipis.'] },
      { when:s => s.dec('intro_night') === 'cafe', lines:['Malam itu di kafeku... aku saksinya, lho! Kalian berdua tampak canggung tapi senang.','Kafe ini akan selalu punya meja untuk kalian.'] },
      { when:s => s.dec('intro_night') === 'taman', lines:['Kudengar kalian berbincang di Taman Kota. Tempat yang tenang, pilihan bagus.','Kapan-kapan mampirlah ke sini, kuseduhkan kopi spesial.'] },
      { when:s => s.dec('intro_night') === 'alun', lines:['Orang-orang bilang kalian berbincang di dekat air mancur alun-alun. Romantis sekali!','Mampirlah ke kafe sebelum pulang, ya.'] },
      { when:s => !s.has('talk:cafe'), lines:['Selamat datang di Kafe Kota! Aku Kiki.','Kafe ini tempat warga berkumpul. Banyak pelanggan tetap datang dari sini.','Kudengar pemilik toko bunga dan pemilik bengkel akan sering bertemu. Mungkin kalian bisa saling melengkapi?','Oh ya, Pak Lurah di Balai Kota biasanya punya kabar buat warga baru. Mampirlah besok.'] },
      { when:s => s.will() === 1, lines:s => ['Ada kursi yang pas di pojok kafe. Kalau kamu dan ' + s.partner() + ' mau duduk berdekatan sebentar, kopi pertama aku traktir.', s.hint()] },
      { when:() => true, lines:s => ['Kopi hari ini enak sekali!', s.hint()] },
    ],
    hall: [
      { when:s => s.ch >= 3 && s.day() >= 14 && s.together() && !s.has('festival_hall'), flags:['festival_hall'], lines:s => [`Ah, kalian datang berdua! Kebetulan, ${s.partner()} dan kamu kuundang ke panitia festival.`,'Festival dimulai tak lama lagi. Pilihlah tempat bertemu yang berkesan, ya.','Anak muda zaman sekarang... saya iri dengan keberanian kalian.'] },
      { when:s => s.ch >= 2 && s.day() >= 8 && !s.has('festival_prep'), flags:['festival_prep'], lines:['Kabar gembira: kota akan mengadakan festival! Seluruh warga ikut bersiap.','Usaha kalian berdua akan jadi bagian penting festival. Terus berkembang, ya!'] },
      { when:s => s.day() >= 2 && !s.has('got_letter'), flags:['got_letter'], lines:s => ['Ah, kebetulan! Ada surat untukmu, dari Sekolah Sihir di pojok kanan atas kota.','Mereka mengundang warga baru untuk belajar sihir kecil yang bisa membantu usaha. Pasanganmu juga menerima surat yang sama.','Katanya sih kalian belum akrab. Tidak apa-apa. Pergilah dengan caramu sendiri dulu.'] },
      { when:s => !s.has('talk:hall'), lines:['Selamat datang, warga baru! Saya Pak Lurah.','Kota ini kecil, tapi hangat. Usaha kalian berdua akan sangat berarti bagi warga.','Besok mampirlah lagi. Mungkin ada kabar untukmu.'] },
      { when:s => s.has('ch1:done') && s.dec('intro_night'), lines:['Warga baru sudah menjadi bagian kota. Saya bangga.','Sekarang saatnya usaha kalian tumbuh. Kabar festival akan menyusul.'] },
      { when:s => s.has('ch1:done'), lines:['Kalian berdua akhirnya berangkat ke Sekolah Sihir bersama. Kabar itu sampai ke telinga saya.','Host kalian sedang menentukan malam perkenalan. Tunggu kabarnya.'] },
      { when:() => true, lines:s => ['Ada yang bisa saya bantu?', s.hint()] },
    ],
    school: [
      { when:s => s.ch >= 2 && s.day() >= 8 && s.will() >= 3 && s.together() && !s.has('finale_school'), flags:['finale_school'], lines:s => ['Aku masih ingat hari pertama kalian datang: satu per satu, dengan wajah enggan.','Sekarang kalian masuk berdampingan, saling menunggu di pintu. Itulah sihir yang paling kuat di sekolah ini.',`${s.partner()} sudah bukan orang asing lagi, bukan?`,'Selamat. Pintu sekolah ini akan selalu terbuka untuk kalian berdua.'] },
      { when:s => s.ch >= 3 && s.day() >= 13 && !s.has('spell_lesson3'), flags:['spell_lesson3'], lines:s => s.role === 'florist'
          ? ['Mantra pribadimu: "Wangi Tenang". Ucapkan saat hatimu gelisah, dan aroma bunga akan menenangkanmu.','Mantra yang paling kuat lahir dari hal yang kamu cintai.']
          : ['Mantra pribadimu: "Roda Setia". Ucapkan saat kamu ragu, dan kamu akan ingat pada siapa kamu ingin kembali.','Mantra yang paling kuat lahir dari hal yang kamu cintai.'] },
      { when:s => s.ch >= 3 && s.day() >= 10 && !s.has('arunika3'), flags:['arunika3'], lines:s => [`Kamu bertanya soal ${s.partner()}? Aku tidak akan membocorkan rahasia murid.`,'Tapi aku bisa bilang: orang yang diam-diam menunggumu di pintu sekolah itu jarang kebetulan.','Jujurlah pada perasaanmu, sedikit demi sedikit.'] },
      { when:s => s.ch >= 2 && s.day() >= 6 && !s.has('lesson1'), flags:['lesson1'], lines:s => s.role === 'florist'
          ? ['Pelajaran khusus untuk pemilik toko bunga: mantra "Mekar Abadi".','Bunga yang dirangkai dengan niat baik akan awet lebih lama. Itu bukan rahasia dagang, itu cinta pada pekerjaan.','Praktikkan di Meja Rangkai, ya.']
          : ['Pelajaran khusus untuk pemilik bengkel: rune "Roda Lancar".','Mesin yang dirawat dengan sabar tak akan mudah mogok. Itu bukan rahasia dagang, itu cinta pada pekerjaan.','Praktikkan di Meja Kerja, ya.'] },
      { when:s => !s.has('talk:school'), lines:s => ['Selamat datang di Sekolah Sihir. Aku Arunika, gurumu.',`Surat undangan juga sampai ke ${s.partner()}. Tapi kalian tampak sama-sama enggan datang bersamaan, ya?`,'Tidak apa-apa. Sihir tidak memaksa. Datanglah sesuka hatimu dulu.'] },
      { when:s => s.will() === 0, lines:s => ['Kamu datang sendirian lagi? Tak apa.', `Kadang kita butuh waktu untuk nyaman dengan orang baru seperti ${s.partner()}.`, s.hint()] },
      { when:s => s.will() === 1, lines:s => ['Kulihat sikapmu melunak. Tidak keberatan sekelas dengannya, kan?', s.hint()] },
      { when:s => s.will() === 2, lines:s => ['Kamu mau berjalan bersamanya sekarang. Itu kemajuan besar.', s.hint()] },
      { when:() => true, lines:s => ['Kalian berdua murid yang menyenangkan. Teruslah belajar.', s.hint()] },
    ],
    school2: [
      { when:s => s.ch >= 3 && s.day() >= 10 && !s.has('rimba3'), flags:['rimba3'], lines:s => [`Kamu tanya soal ${s.partner()}? Dia selalu datang lebih awal dan duduk di dekat pintu, seperti menunggu seseorang.`,'Aku tidak bilang siapa. Hehe. Tapi bangku di sebelahnya sering kosong.'] },
      { when:s => !s.has('talk:school2'), lines:s => ['Aku Rimba, murid senior. Kamu murid baru, ya?',`Kemarin ${s.partner()} juga ke sini. Dia keluar sendirian, wajahnya cemberut. Kalian kenapa sih?`,'Ah, sudahlah. Coba periksa Kuali Ramuan dan Bola Kristal itu. Keren, kan?'] },
      { when:s => s.will() === 0, lines:s => ['Kalau mau masuk bareng, harus akrab dulu. Aturan tak tertulis di sini.', s.hint()] },
      { when:s => s.will() === 1, lines:['Sekarang kalian bisa satu kelas, walau masih jaga jarak. Hehe.','Lama-lama juga mendekat sendiri.'] },
      { when:s => s.will() === 2, lines:['Lihat? Sekarang kalian bisa berangkat bareng. Kemajuan!','Tinggal praktik ramuan bersama untuk jadi tim sungguhan.'] },
      { when:() => true, lines:s => ['Kalian sudah jadi pasangan murid favoritku.', s.hint()] },
    ],
  };
  function dialogue(npcKey, fallback) {
    const rules = D[npcKey]; if (!rules) return fallback || ['...'];
    const own = npcKey === role, s = { has, own, role, dec:k => decisions[k], hint, ch:chapter, will, day:curDay, partner, together:() => !!(opts.together && opts.together()) };
    const r = rules.find(r => r.when(s)); const lines = r ? (typeof r.lines === 'function' ? r.lines(s) : r.lines) : fallback;
    if (r && r.flags) r.flags.forEach(f => setFlag(f));
    setFlag('talk:' + npcKey); return lines;
  }

  // ---------------- Benda, penanda, dan peristiwa dunia ----------------
  const BASKET = { x:552, y:350 };
  function objects(sceneId) {
    if (sceneId !== 'kota') return [];
    const all = quests(), q = all.find(q => q.id === 'q5');
    if (q && has('basket_quest') && !has('basket_found') && qStatus(q, all) === 'BERLANGSUNG')
      return [{ id:'basket', label:'Ambil keranjang', x:BASKET.x, y:BASKET.y, run:() => { setFlag('basket_found'); note('Kamu menemukan keranjang milik Pak Udin! Bawa kembali ke Pasar.'); } }];
    return [];
  }
  // Periksa benda: flag hanya diberikan pada hari yang tepat agar tidak melompati cerita
  function look(name) { const e = LOOK[name]; if (e && curDay() >= e[1]) setFlag(e[0]); }
  // Berdekatan dengan pasangan cukup lama: flag t<hari>:<tempat>, hanya jika ada misi yang membutuhkannya
  function together(place) { const f = 't' + curDay() + ':' + place; if (neededFlags().has(f)) setFlag(f); }
  function greet() { setFlag('greeted'); if (curDay() >= 11 && has('rumor_udin')) setFlag('apology'); }

  // ---------------- Hari & tidur ----------------
  function canSleep() {
    const d = curDay(), all = quests(), left = all.filter(q => q.day === d && !q.opt && !qDone(q));
    if (left.length) return { ok:false, msg:`Masih ada urusan hari ini: ${left.map(q => q.title).join(', ')}.` };
    const nd = d + 1, need = nd <= 4 ? 1 : nd <= 8 ? 2 : nd <= 14 ? 3 : 4;
    if (need === 4) return { ok:false, msg:'Hari berikutnya belum tersedia: Chapter 4 segera hadir.' };
    if (need > chapter) return { ok:false, msg:isHost ? 'Tentukan dulu pilihan cerita (MISI → CERITA) sebelum hari baru dimulai.' : 'Menunggu host menentukan pilihan cerita sebelum hari baru dimulai.' };
    return { ok:true };
  }
  function trySleep() {
    const c = canSleep(); if (!c.ok) return c; const nd = curDay() + 1; setFlag('day:' + nd);
    note(`Hari ke-${nd} dimulai: ${DAYS[nd] ? DAYS[nd][0] : ''}`); cb.dayCard && cb.dayCard(nd); return { ok:true };
  }

  // ---------------- Target tujuan aktif ----------------
  function target() {
    const all = quests();
    const pick = opt => { for (const q of all) { if (q.opt !== opt || qStatus(q, all) !== 'BERLANGSUNG') continue; const step = q.steps.find(s => !has(s.id)); if (step) return { quest:q, step, ...step.t }; } return null; };
    const main = pick(false); if (main) return main;
    const d = curDay(), left = all.filter(q => q.day === d && !q.opt && !qDone(q));
    if (!left.length) { const s = canSleep(); return { quest:{ title:'Istirahat' }, step:{ text:s.ok ? `Hari ${d} selesai. Pulang ke Rumah dan tidur di Tempat Tidur (misi sampingan boleh dilanjut dulu)` : s.msg }, door:s.ok ? 'house' : undefined }; }
    return pick(true);
  }

  // ---------------- Status & pesan ----------------
  function note(text) { log.unshift({ text, at:Date.now() }); if (log.length > 80) log.pop(); cb.msg && cb.msg(text); emit(); }
  const req = ch => quests().filter(q => q.ch === ch && !q.opt);
  const pending = () => { if (!isHost) return null; const k = ORDER.find(k => !decisions[k]); return (k && has(DECISIONS[k].req)) ? { key:k, ...DECISIONS[k] } : null; };
  function setFlag(f) {
    if (has(f)) return false;
    const before = doneSet(); flags.add(f); lsSet();
    if (mode === 'server' && opts.persistFlag) opts.persistFlag(f).then(ok => { if (!ok) mode = 'local'; }).catch(() => {});
    const all = quests();
    for (const q of all) if (qDone(q) && !before.has(q.id)) { note(`✔ Misi selesai: ${q.title}`); if (q.reward) note(q.reward); q.grants.forEach(g => setFlag(g)); if (q.gnote) note(q.gnote); }
    for (const n of [1, 2, 3]) { const fl = 'ch' + n + ':done';
      if (!has(fl) && chapter >= n && req(n).length && req(n).every(qDone)) { setFlag(fl); note(`Chapter ${n} selesai!`);
        if (isHost && pending()) { note('Sebagai host, kamu menentukan pilihan cerita berikutnya. Buka MISI → CERITA.'); cb.decision && cb.decision(); }
        else if (!isHost) note('Menunggu host menentukan pilihan cerita berikutnya.'); } }
    emit(); return true;
  }

  async function decide(k, v) {
    const def = DECISIONS[k]; if (!def || !def.options.some(o => o.v === v)) throw new Error('Pilihan tidak valid.');
    if (!isHost) throw new Error('Hanya host yang boleh menentukan pilihan cerita.');
    if (!has(def.req)) throw new Error('Chapter ini belum selesai.');
    if (decisions[k]) throw new Error('Keputusan ini sudah ditetapkan.');
    if (mode === 'server') decisions = await opts.persistDecision(k, v); else decisions = { ...decisions, [k]:v };
    lsSet(); announceDecision(k); emit();
  }
  function announceDecision(k) {
    const d = DECISIONS[k], o = d.options.find(o => o.v === decisions[k]); note(`Keputusan cerita: ${d.title} — ${o.label}. ${o.effect}`);
    chapter = Math.max(chapter, d.next); lsSet();
    if (d.next <= 3) note(`Tidurlah di Rumah untuk memulai Hari ke-${LAST_DAY[d.next - 1] + 1} dan Chapter ${d.next}.`); else note('Chapter 4 segera hadir. Terima kasih sudah bermain sampai sejauh ini!');
    cb.chapterCard && cb.chapterCard(d.next);
  }
  function remoteState(row) {
    const nd = row.decisions || {}, fresh = Object.keys(nd).filter(k => !decisions[k]); decisions = nd; if (row.chapter) chapter = Math.max(chapter, row.chapter);
    fresh.forEach(announceDecision); lsSet(); emit();
  }

  async function init(o, callbacks) {
    opts = o; cb = callbacks || {}; role = o.role; isHost = !!o.isHost; key = o.key; log = [];
    const loc = lsGet(); flags = new Set(loc.flags || []); decisions = loc.decisions || {}; chapter = loc.chapter || 1;
    if (o.server) { mode = 'server';
      const sf = new Set(o.server.flags || []); for (const f of flags) if (!sf.has(f) && o.persistFlag) o.persistFlag(f).catch(() => {});
      for (const f of sf) flags.add(f); decisions = o.server.decisions || {}; chapter = o.server.chapter || 1;
    } else { mode = 'local'; }
    lsSet();
    if (mode === 'local') note('Progres cerita disimpan di perangkat ini saja (server cerita belum aktif).');
  }

  function view() {
    const all = quests(), cn = chapter, ids = req(Math.min(cn, 3)).map(q => q.id), d = curDay(), rl = decisions.first_outing || has('ch3:done');
    return { chapter:{ n:cn, ...CHAPTERS[cn] }, mode, isHost, pending:pending(), day:d, dayTitle:DAYS[d] ? DAYS[d][0] : '', will:will(), willLabel:WILL[will()],
      progress:{ done:cn >= 4 ? 1 : ids.filter(id => qDone(all.find(q => q.id === id))).length, total:cn >= 4 ? 1 : ids.length },
      quests:all.map(q => { const st = qStatus(q, all); return { id:q.id, cat:q.cat, title:q.title, desc:q.desc, reward:q.reward, status:st, day:q.day, opt:q.opt,
        lock:curDay() < q.day ? `Tersedia pada Hari ${q.day}.` : 'Selesaikan misi sebelumnya.', steps:q.steps.map(s => ({ text:s.text, done:has(s.id) })) }; }),
      rel: has('ch3:done') ? 'Sangat dekat' : (decisions.first_outing || will() >= 3) ? 'Semakin dekat' : decisions.intro_night ? 'Teman' : has('greeted') ? 'Kenalan' : 'Belum mengenal',
      decisions:Object.keys(decisions).filter(k => DECISIONS[k]).map(k => ({ title:DECISIONS[k].title, value:PLACE[decisions[k]] || decisions[k] })), log };
  }
  return { init, flag:setFlag, dialogue, objects, target, view, decide, remoteState, note, has, trySleep, will, look, together, greet, landmarks:() => LANDMARKS,
    chapter:() => chapter, day:curDay, dayInfo:n => DAYS[n], decisionDef:k => DECISIONS[k], chapters:CHAPTERS,
    hasAny:() => flags.size > 0, mode:() => mode, isDone:() => decisions.intro_night };
})();
