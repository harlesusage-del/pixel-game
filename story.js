// ======================= PIXEL LIFE — MESIN CERITA (v3: pertemanan → pendekatan, 14 hari) =======================
// Logika murni (tanpa DOM). Cerita per HARI: selesaikan misi wajib hari itu, lalu tidur di Rumah untuk lanjut.
// Chapter 1 (hari 1-4) Awal yang Baru | Chapter 2 (hari 5-8) Kota yang Sama | Chapter 3 (hari 9-14) Semakin Dekat.
// Akhir tiap chapter: host memutuskan satu pilihan cerita (divalidasi server lewat story_decide).
const Story = (() => {
  const NAMES = { florist:'Toko Bunga', mechanic:'Bengkel', cafe:'Kafe', hall:'Balai Kota', house_f:'Rumah Florist', house_m:'Rumah Mekanik', market:'Pasar', school:'Sekolah Sihir' };
  const NPCN = { florist:'Bu Mawar', mechanic:'Pak Bimo', market:'Pak Udin', cafe:'Mbak Erma', hall:'Pak Lurah', school:'Bu Arunika', school2:'Kak Rimba' };
  const CHAPTERS = {
    1: { title:'Awal yang Baru', sub:'Dua orang asing, satu kota kecil, dan sebuah sekolah sihir yang membuat mereka enggan berjalan bersama.' },
    2: { title:'Kota yang Sama', sub:'Usaha mulai berjalan, dan perlahan kalian belajar saling mengandalkan.' },
    3: { title:'Semakin Dekat', sub:'Kebiasaan kecil, salah paham, dan hadiah-hadiah sederhana mendekatkan kalian.' },
    4: { title:'Membangun Hubungan', sub:'Dari malam festival, dua hati akhirnya saling jujur.' },
    5: { title:'Merencanakan Masa Depan', sub:'Mimpi besar, tawaran dari luar kota, dan badai pertama yang menguji kalian.' },
    6: { title:'Pernikahan', sub:'Anggaran, undangan, restu, dan janji yang diucapkan bersama.' },
    7: { title:'Rumah Baru', sub:'Segera hadir — kalian memulai kehidupan rumah tangga.' },
  };
  const DAYS = { 1:['Selamat Datang','Kenali tempat usahamu dan warga kota.'], 2:['Kabar dari Balai Kota','Sebuah surat undangan tiba.'], 3:['Antara Enggan dan Penasaran','Kabar burung mulai beredar.'],
    4:['Langkah Pertama Bersama','Mungkinkah kalian melangkah berdampingan?'], 5:['Mulai Berbisnis','Bahan, pesanan, dan kelas sihir.'], 6:['Belajar dan Saling Membantu','Ilmu baru, utang budi baru.'],
    7:['Naik Kelas','Usaha tumbuh, kepercayaan tumbuh.'], 8:['Janji di Sekolah Sihir','Dulu enggan, kini bersama.'], 9:['Kebiasaan Baru','Sarapan, berangkat, dan hadiah kecil.'],
    10:['Mengenal Lebih Dalam','Apa yang sebenarnya disukai pasanganmu?'], 11:['Salah Paham','Desas-desus membuat suasana canggung.'], 12:['Saling Menopang','Membantu usaha satu sama lain.'],
    13:['Sihir yang Sebenarnya','Kelas besar dan ramuan sempurna.'], 14:['Menjelang Festival','Kota bersiap, hati pun bersiap.'],
    15:['Malam Festival','Lampu-lampu menyala, perasaan pun menyala.'], 16:['Kabar Baik','Orang-orang terdekat mulai tahu.'], 17:['Hari-hari Berdua','Belajar, bekerja, dan bercerita.'], 18:['Hari Libur Berdua','Taman, pasar, dan makan malam.'],
    19:['Nasihat dan Hadiah','Pasangan baru, pelajaran baru.'], 20:['Mengumumkan Hubungan','Seluruh kota akhirnya tahu.'], 21:['Mimpi Besar','Seperti apa masa depan kalian?'], 22:['Tawaran dari Luar Kota','Sebuah surat mengubah suasana.'],
    23:['Perang Dingin','Dua orang saling diam.'], 24:['Hati yang Retak','Mencari cara mencairkan es.'], 25:['Duduk Bersama','Bicara tanpa menyela.'], 26:['Berdamai dan Berjanji','Badai itu akhirnya lewat.'],
    27:['Lamaran','Sebuah pertanyaan besar.'], 28:['Anggaran Pernikahan','Menabung berdua untuk hari besar.'], 29:['Tempat dan Undangan','Memilih tempat dan menyebar kabar.'], 30:['Busana dan Bunga','Persiapan yang makin nyata.'],
    31:['Persiapan Terakhir','Restu dan gladi.'], 32:['Hari Pernikahan','Dua orang yang dulu enggan, kini menjadi satu.'] };
  const LAST_DAY = { 1:4, 2:8, 3:14, 4:20, 5:26, 6:32 };
  const VP = { alun:'plaza', taman:'park', sekolah:'school', kafe:'cafe' }, VN = { plaza:'Alun-alun', park:'Taman Kota', school:'Sekolah Sihir', cafe:'Kafe' };
  const WILL = ['Enggan', 'Ragu', 'Mau', 'Akrab'];
  const LOOK = { 'Kuali Ramuan':['look:cauldron', 3], 'Bola Kristal':['look:crystal', 3], 'Rak Bunga':['look:rakbunga', 1], 'Rak Suku Cadang':['look:rakparts', 1], 'Lapak Sayur':['look:stallv', 1],
    'Lapak Buah':['look:stallf', 1], 'Papan Pengumuman':['look:board', 2], 'Mesin Kopi':['look:coffee', 2], 'Rak Buku Mantra':['look:books', 3], 'Papan Tulis Ajaib':['look:chalk', 3] };
  const LANDMARKS = [ { flag:'view:school', x:552, y:100, r:40 }, { flag:'view:plaza', x:320, y:200, r:56 }, { flag:'view:park', x:552, y:350, r:50 } ];
  const ORDER = ['intro_night', 'first_outing', 'festival_meet', 'couple_ritual', 'proposal_place', 'wedding_venue', 'first_home_wish'];
  const DECISIONS = {
    intro_night: { title:'Malam Perkenalan', req:'ch1:done', next:2,
      text:'Chapter 1 selesai: kalian berhasil melangkah ke Sekolah Sihir bersama. Sebagai host, tentukan di mana malam itu kalian berbincang santai untuk pertama kalinya. Pilihan ini membekas dalam cerita dan dialog warga.',
      options:[ { v:'cafe', label:'Kafe Kota', effect:'Suasana hangat dan ramai. Mbak Erma jadi saksi pertemuan kalian.' },
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
    couple_ritual: { title:'Kebiasaan Pasangan', req:'ch4:done', next:5,
      text:'Chapter 4 selesai: kalian resmi menjadi pasangan dan seluruh kota tahu. Sebagai host, tentukan kebiasaan kecil yang kalian jaga sebagai pasangan.',
      options:[ { v:'makan_malam', label:'Makan malam berdua', effect:'Tiap malam kalian menyempatkan makan bersama. Mbak Erma selalu menyiapkan meja.' },
        { v:'jalan_pagi', label:'Jalan pagi di taman', effect:'Kalian memulai hari dengan berjalan berdua di Taman Kota.' },
        { v:'kelas_malam', label:'Belajar sihir di kelas malam', effect:'Kalian rajin ikut kelas sihir malam bersama.' } ] },
    proposal_place: { title:'Tempat Lamaran', req:'ch5:done', next:6,
      text:'Chapter 5 selesai: badai itu lewat dan kalian berdamai. Sebagai host, tentukan di mana lamaran akan terjadi.',
      options:[ { v:'taman', label:'Taman Kota', effect:'Di tepi kolam saat senja.' }, { v:'alun', label:'Alun-alun', effect:'Di dekat air mancur, disaksikan lampu kota.' },
        { v:'sekolah', label:'Sekolah Sihir', effect:'Di tempat segalanya dimulai.' }, { v:'kafe', label:'Kafe', effect:'Di meja pojok yang selalu menjadi milik kalian.' } ] },
    wedding_venue: { title:'Tempat Pernikahan', req:'engaged', next:6,
      text:'Kalian bertunangan! Sebagai host, tentukan tempat pernikahan, sesuai anggaran yang sudah kalian sepakati berdua.',
      options:[ { v:'taman', label:'Taman Kota', effect:'Pernikahan di tepi kolam, dikelilingi pohon dan bunga.' }, { v:'alun', label:'Alun-alun', effect:'Pernikahan di jantung kota, disaksikan seluruh warga.' },
        { v:'sekolah', label:'Sekolah Sihir', effect:'Pernikahan bernuansa sihir, dengan lentera-lentera ajaib.' } ] },
    first_home_wish: { title:'Impian Rumah Pertama', req:'ch6:done', next:7,
      text:'Kalian resmi menikah! Sebagai host, tentukan impian lokasi rumah pertama kalian (untuk chapter berikutnya).',
      options:[ { v:'dekat_taman', label:'Dekat Taman Kota', effect:'Rumah dengan pemandangan kolam dan pepohonan.' }, { v:'dekat_alun', label:'Dekat Alun-alun', effect:'Rumah di tengah keramaian kota.' },
        { v:'dekat_sekolah', label:'Dekat Sekolah Sihir', effect:'Rumah di sudut tenang dekat sekolah.' } ] },
  };
  const PLACE = { cafe:'Kafe Kota', taman:'Taman Kota', alun:'Alun-alun', sekolah:'Sekolah Sihir', kafe:'Kafe', makan_malam:'Makan malam berdua', jalan_pagi:'Jalan pagi di taman', kelas_malam:'Belajar sihir di kelas malam', dekat_taman:'Dekat Taman Kota', dekat_alun:'Dekat Alun-alun', dekat_sekolah:'Dekat Sekolah Sihir' };

  let flags = new Set(), chapter = 1, decisions = {}, role = 'florist', isHost = false, key = '', mode = 'local', opts = {}, cb = {}, log = [];
  const has = f => flags.has(f);
  const other = () => role === 'florist' ? 'mechanic' : 'florist';
  const homeId = () => role === 'florist' ? 'house_f' : 'house_m';
  const vplace = k => VP[decisions[k]] || 'plaza';
  const strained = () => chapter >= 5 && (has('quarrel') || has('quarrel_recv')) && !(has('ice_broken') || has('ice_recv'));
  const will = () => has('will:3') ? 3 : has('will:2') ? 2 : has('will:1') ? 1 : 0;
  const curDay = () => { let d = 1; for (const f of flags) if (f.startsWith('day:')) d = Math.max(d, Number(f.slice(4)) || 1); return d; };
  const partner = () => (opts.partnerName && opts.partnerName()) || 'pasanganmu';
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } };
  const lsSet = () => { try { localStorage.setItem(key, JSON.stringify({ flags:[...flags], decisions, chapter })); } catch (e) {} };
  const emit = () => cb.change && cb.change();

  // ---------------- Daftar misi ----------------
  const Q = (id, cat, ch, day, title, desc, steps, reward, x = {}) => ({ id, cat, ch, day, title, desc, steps, reward, pre:x.pre || [], start:x.start, opt:!!x.opt, grants:x.grants || [], gnote:x.gnote });
  const S = (id, text, t = {}) => ({ id, text, t });
  const quests = () => { const m = role, o = other(), B = NAMES, MJ = m === 'florist' ? 'Meja Rangkai' : 'Meja Kerja', RAK = m === 'florist' ? 'Rak Bunga' : 'Rak Suku Cadang', HOME = m === 'florist' ? 'house_f' : 'house_m', V1 = vplace('festival_meet'), V2 = vplace('proposal_place'), V3 = vplace('wedding_venue'), MN = NPCN[m]; const L = [
    // ================= CHAPTER 1 (hari 1-4) =================
    Q('q1','utama',1,1,'Hari Pertama di Kota','Kenali tempat usahamu dan sapa pemasok langgananmu.',
      [ S('enter:' + m, `Masuk ke ${B[m]} (tempat usahamu)`, { door:m }), S('talk:' + m, `Ajak bicara ${NPCN[m]} di dalam`, { door:m, npc:true }) ], 'Kamu resmi memulai usahamu di kota ini.'),
    Q('q2','utama',1,1,'Sapa Pak Udin','Pedagang pasar tahu segalanya tentang kota ini.', [ S('talk:market','Bicara dengan Pak Udin di Pasar', { door:'market', npc:true }) ], 'Pak Udin senang punya langganan baru.', { pre:['q1'] }),
    Q('q3','utama',1,1,'Kopi Pertama','Kafe adalah tempat warga bertukar kabar.', [ S('talk:cafe','Sapa Mbak Erma di Kafe', { door:'cafe', npc:true }) ], 'Kopi pertamamu di kota ini terasa enak.', { pre:['q1'] }),
    Q('q4','utama',1,1,'Rumah Sementara','Lihat tempat tinggalmu. Di sinilah kamu tidur; hari baru dimulai setelah kamu dan pasanganmu tidur bersamaan.', [ S('enter:' + HOME, `Masuk ke ${B[HOME]} (rumahmu)`, { door:HOME }) ], 'Rumah kecil ini akan menjadi saksi banyak cerita.', { pre:['q1'] }),
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
      [ S('gossip_cafe','Dengar kabar dari Mbak Erma di Kafe', { door:'cafe', npc:true }), S('gossip_market','Dengar kabar dari Pak Udin di Pasar', { door:'market', npc:true }) ],
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
    Q('r17','utama',2,6,'Saran dari Mbak Erma','Mbak Erma hafal rahasia usaha-usaha kecil.', [ S('kiki_tip','Minta saran bisnis dari Mbak Erma di Kafe', { door:'cafe', npc:true }) ], 'Kamu dapat saran berharga soal pelanggan.', { pre:['r2'] }),
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
    Q('c9','utama',3,11,'Desas-desus','Ada kabar tak enak yang beredar.', [ S('rumor_udin','Dengar desas-desus dari Pak Udin', { door:'market', npc:true }), S('rumor_kiki','Dengar desas-desus dari Mbak Erma', { door:'cafe', npc:true }) ], 'Kamu sadar ada salah paham yang harus diluruskan.'),
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
  ); if (chapter >= 4) L.push(
    // ================= CHAPTER 4 (hari 15-20): MEMBANGUN HUBUNGAN =================
    Q('e1','kerja sama',4,15,'Menuju Malam Festival',`Malam festival tiba. Temui pasanganmu di tempat yang kalian janjikan: ${VN[V1]}.`, [ S('t15:' + V1, `Berdiri berdekatan dengan pasanganmu di ${VN[V1]} beberapa detik (tempat janji festival)`) ], 'Lampu-lampu festival menyala di atas kalian.'),
    Q('e2','utama',4,15,'Keramaian Festival','Sapa warga di tengah keramaian.', [ S('fest_udin','Sapa Pak Udin di Pasar', { door:'market', npc:true }), S('fest_erma','Sapa Mbak Erma di Kafe', { door:'cafe', npc:true }), S('fest_lurah','Sapa Pak Lurah di Balai Kota', { door:'hall', npc:true }) ], 'Festival terasa meriah.'),
    Q('e3','kerja sama',4,15,'Pengakuan','Malam ini terasa tepat untuk jujur pada perasaan.', [ S('confess','Sampaikan perasaanmu: dekati pasangan di tempat janji, tekan AKSI', { partner:true }), S('confess_recv','Dengarkan pengakuan pasanganmu (dia harus menyapamu)') ], 'Kalian saling mengerti perasaan masing-masing.',
      { pre:['e1'], grants:['dating'], gnote:'Hubungan kalian: Teman → MENJALIN HUBUNGAN. 💞' }),
    Q('e4','utama',4,16,'Kabar Baik','Orang-orang terdekat mulai tahu.', [ S('react_mentor', `Ceritakan pada ${MN}`, { door:m, npc:true }), S('react_udin','Ceritakan pada Pak Udin', { door:'market', npc:true }), S('react_erma','Ceritakan pada Mbak Erma', { door:'cafe', npc:true }) ], 'Semua ikut berbahagia.'),
    Q('e5','kerja sama',4,16,'Kencan Malam Pertama','Alun-alun paling indah saat malam.', [ S('t16:plaza_night','Berdiri berdekatan dengan pasanganmu di Alun-alun pada malam hari (setelah sekitar pukul 19:00)') ], 'Kencan pertama yang manis.'),
    Q('e6','utama',4,16,'Hadiah untuk Kekasih','Hadiah kecil sebagai pasangan.', [ S('gs:5','Kirim hadiah ke pasanganmu (total 5 kali)') ], 'Dia tersenyum menerimanya.'),
    Q('e7','kerja sama',4,17,'Kelas Berdua','Belajar sihir sambil bergandengan.', [ S('t17:school','Berdiri berdekatan dengan pasanganmu di Sekolah Sihir beberapa detik', { door:'school' }) ], 'Kelas terasa lebih hangat.'),
    Q('e8','utama',4,17,'Delapan Belas Pesanan','Usaha tetap harus jalan.', [ S('rep:18','Selesaikan 18 pesanan (total)', { door:m }) ], 'Usahamu stabil di tengah hati yang berbunga-bunga.'),
    Q('e9','kerja sama',4,17,'Berbagi Cerita','Ngopi dan bercerita.', [ S('t17:cafe','Berdiri berdekatan dengan pasanganmu di Kafe beberapa detik', { door:'cafe' }) ], 'Kalian bercerita sampai larut.'),
    Q('e10','kerja sama',4,18,'Piknik di Taman','Hari libur berdua.', [ S('t18:park','Berdiri berdekatan dengan pasanganmu di Taman Kota beberapa detik') ], 'Piknik sederhana yang berkesan.'),
    Q('e11','kerja sama',4,18,'Belanja Bareng','Belanja jadi ajang bercanda.', [ S('t18:market','Berdiri berdekatan dengan pasanganmu di Pasar beberapa detik', { door:'market' }) ], 'Pak Udin geleng-geleng sambil tersenyum.'),
    Q('e12','kerja sama',4,18,'Makan Malam di Kafe','Makan malam romantis.', [ S('t18:cafe_night','Berdiri berdekatan dengan pasanganmu di Kafe pada malam hari (setelah sekitar pukul 19:00)', { door:'cafe' }) ], 'Makan malam yang hangat.'),
    Q('e13','utama',4,19,'Nasihat Guru Sihir','Pasangan baru butuh nasihat.', [ S('couple_tip_a','Minta nasihat Bu Arunika', { door:'school', npc:'school' }), S('couple_tip_r','Minta nasihat Kak Rimba', { door:'school', npc:'school2' }) ], 'Nasihat-nasihat itu berguna.'),
    Q('e14','utama',4,19,'Hadiah Romantis','Satu hadiah lagi.', [ S('gs:6','Kirim hadiah ke pasanganmu (total 6 kali)') ], 'Kejutan kecil yang manis.'),
    Q('e15','utama',4,19,'Kas Seribu Lima Ratus','Masa depan butuh modal.', [ S('cash:1500','Kumpulkan kas usaha hingga 1.500 KC', { door:m }) ], 'Kas usaha yang tebal menenangkan.'),
    Q('e16','utama',4,20,'Kabar untuk Pak Lurah','Beri tahu kota secara resmi.', [ S('announce','Umumkan hubunganmu pada Pak Lurah di Balai Kota', { door:'hall', npc:true }) ], 'Seluruh kota tahu.'),
    Q('e17','kerja sama',4,20,'Foto Bersama','Abadikan momen.', [ S('t20:plaza','Berdiri berdekatan dengan pasanganmu di Alun-alun beberapa detik') ], 'Foto yang akan selalu kalian simpan.'),
    Q('e18','kerja sama',4,20,'Janji Setia','Janji kecil di bawah lampu kota.', [ S('loyal','Berjanji setia: dekati pasangan di Alun-alun, tekan AKSI', { partner:true }), S('loyal_recv','Terima janji setia pasanganmu') ], 'Kalian berjanji saling setia.', { pre:['e17'] }),
  ); if (chapter >= 5) L.push(
    // ================= CHAPTER 5 (hari 21-26): MERENCANAKAN MASA DEPAN & BADAI =================
    Q('f1','utama',5,21,'Mimpi Besar','Seperti apa masa depan yang kalian bayangkan?', [ S('dream_mentor', `Bicara soal masa depan dengan ${MN}`, { door:m, npc:true }), S('dream_arunika','Bicara soal masa depan dengan Bu Arunika', { door:'school', npc:'school' }) ], 'Mimpimu makin jelas.'),
    Q('f2','kerja sama',5,21,'Tabungan Bersama','Mulailah menabung untuk tujuan bersama.', [ S('fam_open','Buka Tabungan Bersama (UANG → TABUNGAN)'), S('fam_in:100','Setor minimal 100 KC ke tabungan bersama (setoran milikmu sendiri)') ], 'Tabungan bersama terbuka. Uangnya milik berdua, bukan milik satu pihak.'),
    Q('f3','utama',5,21,'Dua Puluh Pesanan','Usaha tetap prioritas.', [ S('rep:20','Selesaikan 20 pesanan (total)', { door:m }) ], 'Reputasimu terus naik.'),
    Q('f4','utama',5,22,'Surat Tawaran','Ada kabar dari luar kota.', [ S('offer_letter','Ambil surat dari Pak Lurah di Balai Kota', { door:'hall', npc:true }) ], 'Kamu membaca tawaran itu berulang kali.'),
    Q('f5','utama',5,22,'Meminta Nasihat','Tawaran besar, hati bimbang.', [ S('arunika_offer','Minta nasihat Bu Arunika', { door:'school', npc:'school' }) ], 'Nasihatnya tenang tapi tegas.'),
    Q('f6','kerja sama',5,22,'Pertengkaran Pertama','Tawaran itu bisa memisahkan kalian.', [ S('quarrel','Bicarakan tawaran itu dengan pasanganmu (dekati dia, tekan AKSI)', { partner:true }), S('quarrel_recv','Pasanganmu mengajakmu bicara soal tawaran itu') ], 'Pembicaraan itu berubah menjadi pertengkaran.', { pre:['f4'] }),
    Q('f7','utama',5,23,'Tanya Mbak Erma','Hubungan kalian sedang goyah. Dengarkan orang yang peduli.', [ S('erma_strain','Minta pendapat Mbak Erma di Kafe', { door:'cafe', npc:true }) ], 'Mbak Erma menenangkanmu.'),
    Q('f8','utama',5,23,'Tanya Pak Lurah','Orang yang lebih tua sering melihat lebih jauh.', [ S('lurah_strain','Minta pendapat Pak Lurah di Balai Kota', { door:'hall', npc:true }) ], 'Pak Lurah bercerita soal masa mudanya.'),
    Q('f9','utama',5,23,'Tanya Bu Arunika','Mungkin sihir tak bisa menyelesaikan ini, tapi nasihatnya bisa.', [ S('arunika_strain','Minta pendapat Bu Arunika di Sekolah Sihir', { door:'school', npc:'school' }) ], 'Kamu mulai melihat dari sisi pasanganmu.'),
    Q('f10','utama',5,23,'Menjaga Usaha','Kesal bukan alasan menelantarkan pelanggan.', [ S('rep:22','Selesaikan 22 pesanan (total)', { door:m }) ], 'Pekerjaan sedikit menenangkan pikiran.'),
    Q('f11','utama',5,24,'Hadiah Permintaan Maaf','Kadang maaf perlu dibuktikan.', [ S('gs:7','Kirim hadiah permintaan maaf ke pasanganmu (total 7 kali)') ], 'Hadiah itu terkirim dengan hati berdebar.'),
    Q('f12','kerja sama',5,24,'Mencairkan Es','Sapa dia dengan tulus setelah mendengar semua nasihat.',
      [ S('ice_broken','Sapa pasanganmu dengan tulus (butuh nasihat Erma, Lurah, Arunika, dan hadiah ke-7)', { partner:true }), S('ice_recv','Terima sapaan tulus dari pasanganmu') ], 'Es di antara kalian mulai mencair.', { pre:['f7','f8','f9','f11'] }),
    Q('f13','utama',5,24,'Kas Seribu Delapan Ratus','Keuangan sehat menenangkan hati.', [ S('cash:1800','Kumpulkan kas usaha hingga 1.800 KC', { door:m }) ], 'Kamu lebih tenang menghadapi pilihan.'),
    Q('f14','kerja sama',5,25,'Bicara di Taman','Bicara jujur tanpa menyela.', [ S('t25:park','Berdiri berdekatan dengan pasanganmu di Taman Kota beberapa detik') ], 'Kalian saling mendengarkan.', { pre:['f12'] }),
    Q('f15','kerja sama',5,25,'Bicara di Sekolah','Tempat segalanya bermula.', [ S('t25:school','Berdiri berdekatan dengan pasanganmu di Sekolah Sihir beberapa detik', { door:'school' }) ], 'Kalian mengingat awal pertemuan.', { pre:['f12'] }),
    Q('f16','kerja sama',5,25,'Tabungan Masa Depan','Menabung bersama tanda kalian serius.', [ S('fam_tot:300','Total setoran tabungan bersama mencapai 300 KC') ], 'Tabungan kalian terus bertumbuh.', { pre:['f2'] }),
    Q('f17','kerja sama',5,26,'Berdamai','Saatnya benar-benar berdamai.',
      [ S('t26:plaza','Berdiri berdekatan dengan pasanganmu di Alun-alun beberapa detik'), S('peace','Berdamai: dekati pasangan di Alun-alun, tekan AKSI', { partner:true }), S('peace_recv','Terima perdamaian dari pasanganmu') ],
      'Kalian berdamai dan memutuskan menyelesaikan tawaran itu bersama.', { pre:['f12'], grants:['reconciled'], gnote:'Badai itu lewat. Kepercayaan kalian justru makin kuat.' }),
    Q('f18','utama',5,26,'Restu Masa Depan','Kabar baik dibagi pada orang terdekat.', [ S('promise_lurah','Ceritakan rencana kalian pada Pak Lurah', { door:'hall', npc:true }), S('promise_mentor', `Ceritakan rencana kalian pada ${MN}`, { door:m, npc:true }) ], 'Mereka memberi restu dengan senyum.'),
    Q('f19','kerja sama',5,26,'Rayakan di Kafe','Rayakan perdamaian.', [ S('t26:cafe','Berdiri berdekatan dengan pasanganmu di Kafe beberapa detik', { door:'cafe' }) ], 'Kopi paling enak setelah badai.', { pre:['f17'] }),
  ); if (chapter >= 6) L.push(
    // ================= CHAPTER 6 (hari 27-32): PERNIKAHAN =================
    Q('w1','kerja sama',6,27,'Menuju Tempat Lamaran','Tempat yang dipilih host untuk momen istimewa.', [ S('t27:' + V2, `Berdiri berdekatan dengan pasanganmu di ${VN[V2]} beberapa detik`) ], 'Suasana mendadak hening dan penuh debar.'),
    Q('w2','kerja sama',6,27,'Lamaran','Waktunya melamar.', [ S('proposal','Lamar pasanganmu: dekati dia di tempat itu, tekan AKSI', { partner:true }), S('proposal_recv','Terima lamaran pasanganmu') ], 'Kalian bertunangan.',
      { pre:['w1'], grants:['engaged'], gnote:'Hubungan kalian: MERENCANAKAN PERNIKAHAN. 💍' }),
    Q('w3','utama',6,27,'Kabar Bahagia','Orang-orang akan sangat senang.', [ S('joy_erma','Kabari Mbak Erma', { door:'cafe', npc:true }), S('joy_udin','Kabari Pak Udin', { door:'market', npc:true }) ], 'Seluruh kota bersorak.', { pre:['w2'] }),
    Q('w4','kerja sama',6,28,'Modal Pernikahan','Setiap orang menyumbang.', [ S('fam_in:300','Setor total minimal 300 KC ke tabungan bersama (setoran milikmu sendiri)') ], 'Kalian saling menopang.'),
    Q('w5','kerja sama',6,28,'Anggaran Terkumpul','Pernikahan butuh biaya.', [ S('fam_tot:800','Total setoran tabungan bersama mencapai 800 KC') ], 'Anggaran mulai terkumpul.', { pre:['w4'] }),
    Q('w6','kerja sama',6,28,'Gedung dan Tempat','Ajukan pengeluaran; pasangan harus menyetujuinya.', [ S('fam:gedung','Ajukan dan setujui pengeluaran "Gedung" min. 100 KC (UANG → TABUNGAN)') ], 'Tempat pernikahan terjamin.', { pre:['w5'] }),
    Q('w7','utama',6,29,'Memilih Tempat Pernikahan','Host menentukan tempat pernikahan.', [ S('venue_chosen','Host memilih tempat pernikahan (MISI → CERITA)') ], 'Tempatnya sudah ditentukan.', { pre:['w2'] }),
    Q('w8','kerja sama',6,29,'Dekorasi','Hias tempatnya.', [ S('fam:dekorasi','Ajukan dan setujui pengeluaran "Dekorasi" min. 100 KC') ], 'Dekorasinya cantik.', { pre:['w5'] }),
    Q('w9','utama',6,29,'Undang Warga','Undang orang-orang tersayang.', [ S('inv_udin','Undang Pak Udin', { door:'market', npc:true }), S('inv_erma','Undang Mbak Erma', { door:'cafe', npc:true }), S('inv_lurah','Undang Pak Lurah', { door:'hall', npc:true }), S('inv_arunika','Undang Bu Arunika', { door:'school', npc:'school' }) ], 'Undangan tersebar.', { pre:['w2'] }),
    Q('w10','kerja sama',6,30,'Busana dan Jamuan','Pakaian dan hidangan.', [ S('fam:busana','Ajukan dan setujui "Busana" min. 100 KC'), S('fam:jamuan','Ajukan dan setujui "Jamuan" min. 100 KC') ], 'Semua siap.', { pre:['w5'] }),
    Q('w11','utama',6,30,'Pesanan Spesial', `Buat sendiri ${m === 'florist' ? 'bouquet pengantinmu' : 'dekorasi motor pengantinmu'}.`, [ S('wedding_item', `Kerjakan pesanan spesial pernikahan di ${MJ} (BISNIS → PESANAN SPESIAL PERNIKAHAN)`, { door:m }) ], 'Karya terbaikmu untuk hari istimewa.'),
    Q('w12','utama',6,30,'Dua Puluh Lima Pesanan','Usaha tak boleh berhenti.', [ S('rep:25','Selesaikan 25 pesanan (total)', { door:m }) ], 'Usahamu kokoh.'),
    Q('w13','utama',6,31,'Restu Para Mentor','Pamit pada orang yang membimbing kalian.', [ S('bless_florist','Minta restu Bu Mawar di Toko Bunga', { door:'florist', npc:true }), S('bless_mechanic','Minta restu Pak Bimo di Bengkel', { door:'mechanic', npc:true }) ], 'Restu mereka menghangatkan hati.'),
    Q('w14','kerja sama',6,31,'Cek Tempat','Gladi sehari sebelum hari-H.', [ S('t31:' + V3, `Berdiri berdekatan dengan pasanganmu di ${VN[V3]} beberapa detik`) ], 'Semua sudah siap.', { pre:['w7'] }),
    Q('w15','utama',6,31,'Kas Pernikahan','Cadangan tak boleh tipis.', [ S('cash:2000','Kumpulkan kas usaha hingga 2.000 KC', { door:m }) ], 'Kamu tenang menyambut hari bahagia.'),
    Q('w16','kerja sama',6,32,'Menuju Pelaminan','Hari-H tiba.', [ S('t32:' + V3, `Berdiri berdekatan dengan pasanganmu di ${VN[V3]} beberapa detik`) ], 'Seluruh warga hadir.', { pre:['w14'] }),
    Q('w17','kerja sama',6,32,'Ucapkan Janji','Janji pernikahan.', [ S('vow_given','Ucapkan janji: dekati pasangan di tempat pernikahan, tekan AKSI', { partner:true }), S('vow_recv','Dengarkan janji pasanganmu') ], 'Kalian resmi menikah.',
      { pre:['w16'], grants:['wedding_done'], gnote:'Hubungan kalian: MENIKAH. 💒' }),
    Q('w18','utama',6,32,'Menyapa Para Tamu','Terima ucapan selamat.', [ S('wed_lurah','Terima ucapan dari Pak Lurah', { door:'hall', npc:true }), S('wed_udin','Terima ucapan dari Pak Udin', { door:'market', npc:true }), S('wed_erma','Terima ucapan dari Mbak Erma', { door:'cafe', npc:true }), S('wed_arunika','Terima ucapan dari Bu Arunika', { door:'school', npc:'school' }) ], 'Pesta berjalan meriah.', { pre:['w17'] }),
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
      { when:s => s.own && !s.has('talk:florist'), lines:['Selamat datang di tokomu sendiri! Aku Bu Mawar, pemasok bunga langgananmu.','Nanti di sini kamu akan merangkai bouquet sesuai pesanan, mengatur stok, lalu menjual dengan harga yang kamu tentukan.','Untuk sekarang, kenali dulu kotamu: Pak Udin di Pasar dan Mbak Erma di Kafe.','Semangat membuka usaha baru!'] },
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
      { when:s => s.has('basket_returned'), lines:['Keranjangku sudah kembali, berkat kamu!','Kalau mau tahu kabar kota, tanya Mbak Erma di Kafe. Dia tahu semuanya.'] },
      { when:() => true, lines:['Keranjangku masih belum ketemu. Coba cek sekitar Taman Kota, ya.'] },
    ],
    cafe: [
      { when:s => s.day() >= 3 && s.has('got_letter') && !s.has('gossip_cafe'), flags:['gossip_cafe'], lines:s => ['Kamu dengar? Surat dari Sekolah Sihir itu jadi bahan obrolan satu kota.',`${s.partner()} bilang ke sini, katanya, "Aku ke sana sendiri saja. Nggak enak kalau bareng." Kamu juga begitu, kan?`,'Tapi aku lihat kalian berdua sama-sama penasaran. Gengsi itu cuma kulit luarnya.'] },
      { when:s => s.ch >= 3 && s.day() >= 11 && !s.has('rumor_kiki'), flags:['rumor_kiki'], lines:s => [`Hati-hati, ada gosip kalau ${s.partner()} dan kamu sedang "perang dingin". Padahal kalian cuma salah paham, kan?`,'Gosip itu kayak kopi: kalau didiamkan jadi pahit. Lebih baik bicara langsung.'] },
      { when:s => s.ch >= 2 && s.day() >= 6 && !s.has('kiki_tip'), flags:['kiki_tip'], lines:['Saran dari barista: ingat pelanggan, ingat kesukaannya. Itu rahasia usaha kecil mana pun.','Dan satu lagi: jangan lupa tersenyum, bahkan saat stok menipis.'] },
      { when:s => s.dec('intro_night') === 'cafe', lines:['Malam itu di kafeku... aku saksinya, lho! Kalian berdua tampak canggung tapi senang.','Kafe ini akan selalu punya meja untuk kalian.'] },
      { when:s => s.dec('intro_night') === 'taman', lines:['Kudengar kalian berbincang di Taman Kota. Tempat yang tenang, pilihan bagus.','Kapan-kapan mampirlah ke sini, kuseduhkan kopi spesial.'] },
      { when:s => s.dec('intro_night') === 'alun', lines:['Orang-orang bilang kalian berbincang di dekat air mancur alun-alun. Romantis sekali!','Mampirlah ke kafe sebelum pulang, ya.'] },
      { when:s => !s.has('talk:cafe'), lines:['Selamat datang di Kafe Kota! Aku Erma.','Kafe ini tempat warga berkumpul. Banyak pelanggan tetap datang dari sini.','Kudengar pemilik toko bunga dan pemilik bengkel akan sering bertemu. Mungkin kalian bisa saling melengkapi?','Oh ya, Pak Lurah di Balai Kota biasanya punya kabar buat warga baru. Mampirlah besok.'] },
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
  // ---- Dialog Chapter 4-6: satu kali per penanda, pada hari yang sesuai ----
  const RL = (flag, ch, day, lines, cond) => ({ when:s => s.ch >= ch && s.day() >= day && !s.has(flag) && (!cond || cond(s)), flags:[flag], lines });
  const dating = s => s.has('dating'), engaged = s => s.has('engaged'), quarrelled = s => s.has('quarrel') || s.has('quarrel_recv');
  const RIT = { makan_malam:'Kalian rutin makan malam berdua di sini. Aku sampai hafal pesanan kalian!', jalan_pagi:'Kalian sering jalan pagi di taman berdua. Aku lihat dari jendela kafe, manis sekali.', kelas_malam:'Kalian rajin ikut kelas sihir malam berdua. Pulangnya selalu mampir beli kopi, hehe.' };
  D.market.unshift(
    RL('fest_udin',4,15,['Malam festival! Pasar ramai sekali.','Kulihat kalian berdua datang. Semoga malam ini jadi malam yang kalian ingat lama, hehe.']),
    RL('react_udin',4,16,s => ['Hah?! Kalian jadian?! Aku sudah curiga sejak kalian berdua beli bahan dengan wajah merah!','Selamat, ya. Kalau butuh bunga atau suku cadang buat kencan, kasih tahu aku.'], dating),
    RL('joy_udin',6,27,s => [`Bertunangan?! ${s.partner()} menerima lamaranmu?!`,'Seluruh pasar kuberi kabar! Hari ini semua dagangan kudiskon sedikit, hehe.'], engaged),
    RL('inv_udin',6,29,['Undangan pernikahan? Aku pasti datang. Aku sudah siapkan buah segar untuk jamuan.'], engaged),
    RL('wed_udin',6,32,['Selamat, pengantin baru! Inilah hari yang kutunggu sejak melihat kalian pertama kali jalan sendiri-sendiri di pasar.','Semoga langgeng!'], engaged));
  D.cafe.unshift(
    RL('fest_erma',4,15,['Malam festival! Meja-mejaku penuh. Tapi untuk kalian, selalu ada ruang.','Aku punya firasat malam ini akan terjadi sesuatu.']),
    RL('react_erma',4,16,s => ['Aku sudah menduga! Lihat saja, kalian berdua senyum-senyum sendiri.','Selamat ya. Kopi pertama sebagai pasangan, kutraktir.'], dating),
    RL('erma_strain',5,23,s => [`Kudengar kamu dan ${s.partner()} bertengkar soal tawaran dari luar kota. Duduklah.`,'Aku tidak akan bilang siapa yang benar. Tapi coba bayangkan: kalau dia pergi, apa yang kamu rasakan?','Marah itu wajar. Diam selamanya itu yang berbahaya. Kirimkan hadiah kecil, lalu sapa dia dengan tulus.'], quarrelled),
    RL('joy_erma',6,27,s => ['Bertunangan! Astaga, aku harus duduk dulu!','Kafe ini akan jadi tempat reuni kalian setiap tahun. Aku janji.'], engaged),
    RL('inv_erma',6,29,['Aku akan mengurus kopi dan kue untuk tamu. Jangan khawatir, serahkan saja padaku.'], engaged),
    RL('wed_erma',6,32,['Kalian cantik dan tampan sekali! Aku tidak kuat, aku menangis!','Selamat menempuh hidup baru.'], engaged),
    { when:s => s.ch >= 5 && s.dec('couple_ritual') === 'makan_malam', lines:[RIT.makan_malam] },
    { when:s => s.ch >= 5 && s.dec('couple_ritual') === 'jalan_pagi', lines:[RIT.jalan_pagi] },
    { when:s => s.ch >= 5 && s.dec('couple_ritual') === 'kelas_malam', lines:[RIT.kelas_malam] });
  D.hall.unshift(
    RL('fest_lurah',4,15,['Selamat datang di festival kota! Silakan menikmati malam ini.','Kota ini beruntung punya warga seperti kalian berdua.']),
    RL('announce',4,20,s => [`Saya sudah dengar kabar baiknya. Kamu dan ${s.partner()}, bukan?`,'Hubungan yang dimulai dari saling enggan sering justru yang paling kuat. Selamat!','Kota ini akan menjaga kebahagiaan kalian.'], dating),
    RL('offer_letter',5,22,s => ['Ini surat untukmu, dari kota seberang. Mereka tertarik pada usahamu dan menawarkan tempat, modal, dan nama besar.',`Pasanganmu menerima surat serupa dari kota lain. Aku tidak tahu isinya, tapi aku bisa menebak: ${s.partner()} juga bimbang.`,'Pikirkan baik-baik, tapi jangan putuskan sendirian.']),
    RL('lurah_strain',5,23,s => ['Kamu terlihat murung. Pertengkaran?','Saat muda, saya juga pernah hampir kehilangan seseorang karena terlalu keras kepala. Bedanya, saya terlambat sadar.','Jangan menunggu terlambat. Cari jalan tengah dan sapa dia dengan tulus.'], quarrelled),
    RL('promise_lurah',5,26,s => ['Kalian sudah berdamai? Syukurlah.','Dengar, kota ini selalu mendukung kalian apa pun keputusannya. Mau tinggal atau mau pergi, kalian tetap warga kami.'], s => s.has('ice_broken') || s.has('ice_recv')),
    RL('inv_lurah',6,29,['Undangan pernikahan! Dengan senang hati saya hadir, dan saya sendiri yang akan menyiapkan sambutan.'], engaged),
    RL('wed_lurah',6,32,s => ['Atas nama seluruh warga, saya ucapkan selamat atas pernikahan kalian.','Dari dua orang yang enggan berjalan bersama, kini menjadi satu keluarga. Itulah kisah kota ini.'], engaged));
  D.school.unshift(
    RL('couple_tip_a',4,19,s => [`Pasangan baru, ya. ${s.partner()} dan kamu cocok sekali.`,'Nasihat sihir yang paling jarang disebut: dengarkan dulu, baru bicara. Itu mantra yang paling ampuh.'], dating),
    RL('dream_arunika',5,21,s => ['Masa depan? Sihir kecil tidak bisa meramalnya, tapi bisa membantu kita menghadapinya.','Mulailah dengan tujuan bersama. Tabungan kecil yang dikumpulkan berdua lebih kuat dari tabungan besar yang dikumpulkan sendiri.']),
    RL('arunika_offer',5,22,s => ['Tawaran dari luar kota? Selamat, itu tanda kamu berkembang.','Tapi ingat: tawaran terbaik adalah yang tak membuatmu harus memilih antara karier dan orang yang kamu sayang.','Bicarakan dengan pasanganmu, tenang saja.']),
    RL('arunika_strain',5,23,s => [`Kudengar kamu dan ${s.partner()} sedang saling diam. Tidak apa-apa. Diam itu bukan akhir.`,'Sihir tidak bisa memaksa hati. Tapi aku tahu satu hal: orang yang masih peduli akan selalu menunggu di pintu.','Dengarkan nasihat orang lain, kirim hadiah, lalu sapa dia.'], quarrelled),
    RL('inv_arunika',6,29,['Pernikahan! Murid-muridku akan menyalakan lentera sihir di sepanjang jalan.'], engaged),
    RL('wed_arunika',6,32,s => ['Aku masih ingat hari pertama kalian di sekolahku. Siapa sangka akan sampai di sini.','Selamat. Sihir paling indah yang pernah kulihat adalah dua orang yang akhirnya saling memilih.'], engaged));
  D.school2.unshift(RL('couple_tip_r',4,19,s => [`Wah, kamu dan ${s.partner()} sekarang pasangan? Dulu kalian cemberut tiap lewat pintu ini!`,'Tips dariku: jangan lupa tertawa bersama. Itu bumbu hubungan.'], dating));
  D.florist.unshift(
    RL('react_mentor',4,16,s => ['Wah, kabar yang indah! Aku sudah lihat dia lewat sini tiap sore, ternyata ada maunya, hehe.','Selamat ya. Kalau perlu bunga untuk kencan, ambil yang segar.'], s => s.own && dating(s)),
    RL('dream_mentor',5,21,s => ['Masa depan, ya. Aku dulu juga punya mimpi besar sebelum membuka toko ini.','Kalau kamu bahagia dan tahu kamu tidak sendirian, mimpi apa pun jadi mungkin.'], s => s.own),
    RL('promise_mentor',5,26,s => ['Kalian sudah berdamai! Aku lega sekali. Tokoku selalu ramai kalau kalian berdua sedang bahagia.'], s => s.own),
    RL('bless_florist',6,31,s => s.own ? ['Aku restui kalian sepenuh hati. Biar aku sendiri yang menyiapkan bunga terbaik untuk pernikahanmu.','Pengantin yang bahagia membuat bunga tampak lebih cantik.'] : ['Ini toko bunga pasanganmu, bukan? Mawar terbaik kupersiapkan untuk pernikahan kalian. Aku restui kalian.'], s => s.has('engaged')));
  D.mechanic.unshift(
    RL('react_mentor',4,16,s => ['Kabar bagus! Pantas saja kamu lebih sering tersenyum belakangan ini.','Selamat. Kalau motor pengantar butuh servis gratis untuk kencan, bilang saja.'], s => s.own && dating(s)),
    RL('dream_mentor',5,21,s => ['Masa depan? Aku cuma tahu satu hal: mesin yang dirawat dua orang lebih awet dari mesin yang dirawat sendirian.','Hubungan juga begitu.'], s => s.own),
    RL('promise_mentor',5,26,s => ['Berdamai, ya. Bagus. Bengkel ini terasa lebih hidup kalau kamu tidak murung.'], s => s.own),
    RL('bless_mechanic',6,31,s => s.own ? ['Aku restui kalian. Biar aku periksa sendiri motor pengantinmu supaya tidak mogok di hari bahagia.','Selamat menempuh hidup baru.'] : ['Ini bengkel pasanganmu. Aku restui kalian, dan motor pengantinnya akan kupastikan prima.'], s => s.has('engaged')));

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
  // Sapaan kontekstual: bisa memicu pengakuan, pertengkaran, perdamaian, lamaran, dan janji pernikahan. Mengembalikan { msg, kind }.
  function greet(place) {
    const pn = partner(), d = curDay(), K = (kind, msg, refused) => ({ kind, msg, refused });
    if (strained()) {
      if (['erma_strain', 'lurah_strain', 'arunika_strain', 'gs:7'].every(has)) { setFlag('ice_broken'); return K('ice', `Kamu menyapa ${pn} dengan tulus. Dia menoleh pelan... es di antara kalian mulai mencair.`); }
      return K('', `${pn} memalingkan wajah. Sepertinya dia masih kesal. Dengarkan dulu nasihat Mbak Erma, Pak Lurah, dan Bu Arunika, lalu kirim hadiah permintaan maaf ke-7.`, true);
    }
    setFlag('greeted'); if (d >= 11 && has('rumor_udin')) setFlag('apology');
    if (chapter >= 6 && d >= 32 && !has('vow_given') && place === vplace('wedding_venue') && has('t32:' + place)) { setFlag('vow_given'); return K('vow', `Kamu mengucapkan janji pernikahan untuk ${pn}. 💞`); }
    if (chapter >= 6 && d >= 27 && !has('proposal') && place === vplace('proposal_place') && has('t27:' + place)) { setFlag('proposal'); return K('proposal', `Kamu melamar ${pn} dengan tangan gemetar. 💍`); }
    if (chapter >= 5 && d >= 26 && !has('peace') && (has('ice_broken') || has('ice_recv')) && place === 'plaza' && has('t26:plaza')) { setFlag('peace'); return K('peace', `Kamu dan ${pn} berdamai. Kalian memutuskan menyelesaikan semuanya berdua.`); }
    if (chapter >= 5 && d >= 22 && has('offer_letter') && !has('quarrel')) { setFlag('quarrel'); return K('quarrel', `Kamu dan ${pn} berdebat soal tawaran dari luar kota. Nada suara meninggi, lalu hening...`); }
    if (chapter >= 4 && d >= 15 && !has('confess') && place === vplace('festival_meet') && has('t15:' + place)) { setFlag('confess'); return K('confess', `Kamu menyampaikan perasaanmu pada ${pn}. Jantungmu berdebar...`); }
    if (chapter >= 4 && d >= 20 && !has('loyal') && place === 'plaza' && has('t20:plaza')) { setFlag('loyal'); return K('loyal', `Kamu berjanji setia pada ${pn} di bawah lampu alun-alun. ❤`); }
    return K('', `Kamu menyapa ${pn}. 👋`);
  }
  const RECV = { confess:'menyampaikan perasaannya padamu. ❤', loyal:'berjanji setia padamu. ❤', quarrel:'berdebat denganmu soal tawaran dari luar kota...', ice:'menyapamu dengan tulus. Hatimu mulai melunak.', peace:'berdamai denganmu. ✨', proposal:'melamarmu! 💍', vow:'mengucapkan janji pernikahan untukmu. 💞' };
  function greetRecv(kind) {
    const pn = partner(); if (!RECV[kind]) { setFlag('greeted'); return `${pn} menyapamu! 👋`; }
    setFlag(kind + '_recv'); return `${pn} ${RECV[kind]}`;
  }

  // ---------------- Hari & tidur ----------------
  function canSleep() {
    const d = curDay(), all = quests(), left = all.filter(q => q.day === d && !q.opt && !qDone(q));
    if (left.length) return { ok:false, msg:`Masih ada urusan hari ini: ${left.map(q => q.title).join(', ')}.` };
    const nd = d + 1, need = nd <= 4 ? 1 : nd <= 8 ? 2 : nd <= 14 ? 3 : nd <= 20 ? 4 : nd <= 26 ? 5 : nd <= 32 ? 6 : 7;
    if (need === 7) return { ok:false, msg:'Hari berikutnya belum tersedia: Chapter 7 (Rumah Baru) segera hadir.' };
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
    if (!left.length) { const s = canSleep(); return { quest:{ title:'Istirahat' }, step:{ text:s.ok ? `Hari ${d} selesai. Pulang ke rumahmu dan tidur di Tempat Tidur. Hari baru dimulai saat kamu dan pasanganmu tidur bersamaan (misi sampingan boleh dilanjut dulu)` : s.msg }, door:s.ok ? homeId() : undefined }; }
    return pick(true);
  }

  // ---------------- Status & pesan ----------------
  function note(text) { log.unshift({ text, at:Date.now() }); if (log.length > 80) log.pop(); cb.msg && cb.msg(text); emit(); }
  const req = ch => quests().filter(q => q.ch === ch && !q.opt);
  const pending = () => { if (!isHost) return null; const k = ORDER.find(k => !decisions[k]); return (k && has(DECISIONS[k].req)) ? { key:k, ...DECISIONS[k] } : null; };
  function setFlag(f) {
    if (has(f)) return false;
    const before = doneSet(); flags.add(f); lsSet();
    if (f === 'dating' || f === 'engaged' || f === 'wedding_done' || f === 'peace') cb.celebrate && cb.celebrate();
    if (f === 'engaged' && isHost) setTimeout(() => { if (pending()) { note('Sebagai host, tentukan tempat pernikahan. Buka MISI → CERITA.'); cb.decision && cb.decision(); } }, 0);
    if (mode === 'server' && opts.persistFlag) opts.persistFlag(f).then(ok => { if (!ok) mode = 'local'; }).catch(() => {});
    const all = quests();
    for (const q of all) if (qDone(q) && !before.has(q.id)) { note(`✔ Misi selesai: ${q.title}`); if (q.reward) note(q.reward); q.grants.forEach(g => setFlag(g)); if (q.gnote) note(q.gnote); }
    for (const n of [1, 2, 3, 4, 5, 6]) { const fl = 'ch' + n + ':done';
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
    const prevCh = chapter; chapter = Math.max(chapter, d.next); if (k === 'wedding_venue') setFlag('venue_chosen'); lsSet();
    if (d.next > prevCh) { if (d.next <= 6) note(`Tidurlah di rumah masing-masing (bersamaan!) untuk memulai Hari ke-${LAST_DAY[d.next - 1] + 1} dan Chapter ${d.next}.`); else note('Chapter 7 (Rumah Baru) segera hadir. Terima kasih sudah bermain sampai pernikahan!'); cb.chapterCard && cb.chapterCard(d.next); }
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
    const all = quests(), cn = chapter, ids = req(Math.min(cn, 6)).map(q => q.id), d = curDay(), rl = decisions.first_outing || has('ch3:done');
    return { chapter:{ n:cn, ...CHAPTERS[cn] }, mode, isHost, pending:pending(), day:d, dayTitle:DAYS[d] ? DAYS[d][0] : '', will:will(), willLabel:WILL[will()],
      progress:{ done:cn >= 7 ? 1 : ids.filter(id => qDone(all.find(q => q.id === id))).length, total:cn >= 7 ? 1 : ids.length },
      quests:all.map(q => { const st = qStatus(q, all); return { id:q.id, cat:q.cat, title:q.title, desc:q.desc, reward:q.reward, status:st, day:q.day, opt:q.opt,
        lock:curDay() < q.day ? `Tersedia pada Hari ${q.day}.` : 'Selesaikan misi sebelumnya.', steps:q.steps.map(s => ({ text:s.text, done:has(s.id) })) }; }),
      rel: has('wedding_done') ? 'Menikah' : has('engaged') ? 'Merencanakan pernikahan' : has('dating') ? 'Menjalin hubungan' : has('ch3:done') ? 'Sangat dekat' : (decisions.first_outing || will() >= 3) ? 'Semakin dekat' : decisions.intro_night ? 'Teman' : has('greeted') ? 'Kenalan' : 'Belum mengenal',
      decisions:Object.keys(decisions).filter(k => DECISIONS[k]).map(k => ({ title:DECISIONS[k].title, value:PLACE[decisions[k]] || decisions[k] })), log };
  }
  return { init, flag:setFlag, dialogue, objects, target, view, decide, remoteState, note, has, trySleep, will, look, together, greet, greetRecv, strained, landmarks:() => LANDMARKS,
    chapter:() => chapter, day:curDay, home:homeId, canSleep, dayInfo:n => DAYS[n], decisionDef:k => DECISIONS[k], chapters:CHAPTERS,
    hasAny:() => flags.size > 0, mode:() => mode, isDone:() => decisions.intro_night };
})();
