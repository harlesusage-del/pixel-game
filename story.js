// ======================= PIXEL LIFE — MESIN CERITA =======================
// Logika murni (tanpa DOM): chapter, misi berantai, dialog bersyarat, keputusan host.
// Tampilan ada di game.js. Progres: server (story_load/story_flag/story_decide) atau lokal sebagai cadangan.
const Story = (() => {
  const NAMES = { florist:'Toko Bunga', mechanic:'Bengkel', cafe:'Kafe', hall:'Balai Kota', house:'Rumah', market:'Pasar' };
  const NPCN = { florist:'Bu Mawar', mechanic:'Pak Bimo', market:'Pak Udin', cafe:'Mbak Kiki', hall:'Pak Lurah' };
  const CHAPTERS = {
    1: { title:'Awal yang Baru', sub:'Dua orang asing, satu kota kecil, dan usaha yang baru dimulai.' },
    2: { title:'Kota yang Sama', sub:'Usaha kalian mulai berjalan dan saling bersinggungan.' },
    3: { title:'Semakin Dekat', sub:'Segera hadir — kalian mulai mengenal kepribadian satu sama lain.' },
  };
  const DECISIONS = {
    intro_night: { title:'Malam Perkenalan', ch:1,
      text:'Chapter 1 selesai. Sebagai host, tentukan di mana kedua tokoh pertama kali berbincang santai di malam hari. Pilihan ini membekas dalam cerita dan dialog warga.',
      options:[
        { v:'cafe',  label:'Kafe Kota', effect:'Suasana hangat dan ramai. Mbak Kiki jadi saksi pertemuan kalian.' },
        { v:'taman', label:'Taman Kota', effect:'Tenang di bawah pohon dan dekat kolam. Warga membicarakan keromantisan taman.' },
        { v:'alun',  label:'Alun-alun', effect:'Di dekat air mancur, di tengah kota. Pak Lurah menyebutnya awal ikatan kota ini.' } ] },
  };
  const PLACE = { cafe:'Kafe Kota', taman:'Taman Kota', alun:'Alun-alun' };

  let flags = new Set(), chapter = 1, decisions = {}, role = 'florist', isHost = false, key = '', mode = 'local', opts = {}, cb = {}, log = [];
  const has = f => flags.has(f);
  const other = () => role === 'florist' ? 'mechanic' : 'florist';
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } };
  const lsSet = () => { try { localStorage.setItem(key, JSON.stringify({ flags:[...flags], decisions, chapter })); } catch (e) {} };
  const emit = () => cb.change && cb.change();

  const curChapter = () => has('ch2:done') ? 3 : chapter;
  const quests = () => { const m = role, o = other(); const base = [
    { id:'q1', cat:'utama', title:'Hari Pertama di Kota', pre:[], desc:'Kenali tempat usahamu dan sapa pemasok langgananmu.',
      steps:[ { id:'enter:' + m, text:`Masuk ke ${NAMES[m]} (tempat usahamu)`, t:{ door:m } }, { id:'talk:' + m, text:`Ajak bicara ${NPCN[m]} di dalam`, t:{ door:m, npc:true } } ],
      reward:'Kamu resmi memulai usahamu di kota ini.' },
    { id:'q2', cat:'utama', title:'Kenali Warga Kota', pre:['q1'], desc:'Perkenalkan dirimu kepada tiga warga penting.',
      steps:[ { id:'talk:market', text:'Bicara dengan Pak Udin di Pasar', t:{ door:'market', npc:true } }, { id:'talk:cafe', text:'Sapa Mbak Kiki di Kafe', t:{ door:'cafe', npc:true } }, { id:'talk:hall', text:'Temui Pak Lurah di Balai Kota', t:{ door:'hall', npc:true } } ],
      reward:'Warga mulai mengenalmu. Nama usahamu mulai dibicarakan.' },
    { id:'q4', cat:'kerja sama', title:'Sapa Tetanggamu', pre:['q1'], desc:'Temukan pasanganmu di kota, sapa dia, lalu kunjungi tempat usahanya.',
      steps:[ { id:'greeted', text:'Sapa pasanganmu (dekati dia, tekan AKSI)', t:{ partner:true } }, { id:'enter:' + o, text:`Kunjungi ${NAMES[o]} milik pasanganmu`, t:{ door:o } } ],
      reward:'Kalian resmi saling mengenal.' },
    { id:'q5', cat:'utama', title:'Rumah Sementara', pre:['q1'], desc:'Lihat tempat tinggalmu di kota.',
      steps:[ { id:'enter:house', text:'Masuk ke Rumah', t:{ door:'house' } } ], reward:'Rumah kecil ini akan menjadi saksi banyak cerita.' },
    { id:'q3', cat:'sampingan', title:'Keranjang yang Hilang', pre:['q1'], start:'basket_quest', desc:'Pak Udin kehilangan keranjang dagangannya. Mungkin tertinggal di taman.',
      steps:[ { id:'basket_found', text:'Temukan keranjang di Taman Kota (ikuti panah)', t:{ obj:'basket' } }, { id:'basket_returned', text:'Kembalikan ke Pak Udin di Pasar', t:{ door:'market', npc:true } } ],
      reward:'Pak Udin berhutang budi padamu.' },
  ]; if (chapter >= 2) base.push(
    { id:'q6', cat:'utama', ch:2, title:'Pesanan Pertama', pre:[], desc:'Mulai berbisnis: beli bahan, lalu kerjakan pesanan pelanggan.',
      steps:[ { id:'stock_bought', text:'Beli bahan di meja kerja tempat usahamu (tombol UANG atau meja kerja → BISNIS)', t:{ door:m } }, { id:'order_done', text:'Selesaikan satu pesanan pelanggan', t:{ door:m } } ],
      reward:'Pendapatan pertama masuk ke kas usahamu dan tercatat di riwayat transaksi.' },
    { id:'q7', cat:'kerja sama', ch:2, title:'Saling Membantu', pre:[], desc:'Pinjam-meminjam antar dua usaha, dengan perjanjian yang jelas.',
      steps:[ { id:'loan_active', text:'Buat atau setujui pinjaman antarpemain (UANG → PINJAMAN)', t:{} }, { id:'loan_settled', text:'Lunasi pinjaman sampai berstatus LUNAS', t:{} } ],
      reward:'Kepercayaan di antara kalian bertambah.' },
    { id:'q8', cat:'utama', ch:2, title:'Naik Kelas', pre:['q6'], desc:'Kembangkan usahamu ke level berikutnya.',
      steps:[ { id:'upgraded', text:'Upgrade usaha ke level 2 (meja kerja → BISNIS)', t:{ door:m } } ], reward:'Usahamu lebih besar: pesanan lebih banyak dan lebih bernilai.' } );
    return base; };
  const qDone = q => q.steps.every(s => has(s.id));
  const qStatus = (q, all) => {
    if (qDone(q)) return 'SELESAI';
    if (!q.pre.every(id => qDone(all.find(x => x.id === id)))) return 'TERKUNCI';
    if (q.start && !has(q.start)) return 'TERSEDIA';
    return 'BERLANGSUNG';
  };
  const doneSet = () => new Set(quests().filter(qDone).map(q => q.id));

  // ---- Dialog bersyarat: aturan pertama yang cocok dipakai ----
  const hint = () => { const t = target(); return t ? `Kalau bingung, ingat tujuanmu: ${t.step.text}.` : 'Kamu sudah mengenal kota ini dengan baik.'; };
  const D = {
    florist: [
      { when:s => s.own && !s.has('talk:florist'), lines:['Selamat datang di tokomu sendiri! Aku Bu Mawar, pemasok bunga langgananmu.','Nanti di sini kamu akan merangkai bouquet sesuai pesanan, mengatur stok, lalu menjual dengan harga yang kamu tentukan.','Untuk sekarang, kenali dulu kotamu: Pak Udin di Pasar, Mbak Kiki di Kafe, dan Pak Lurah di Balai Kota.','Semangat membuka usaha baru!'] },
      { when:s => s.own && s.ch >= 2, lines:s => ['Sekarang waktunya berbisnis! Pakai Meja Rangkai untuk membeli bahan dan mengerjakan pesanan.', s.hint()] },
      { when:s => s.own, lines:s => ['Ada yang bisa kubantu lagi?', s.hint()] },
      { when:() => true, lines:['Ini toko bunga milik pasanganmu, ya? Cantik sekali.','Kalau dia butuh bantuan, kalian bisa saling membantu nanti lewat uang dan pinjaman.','Mampirlah sesekali!'] },
    ],
    mechanic: [
      { when:s => s.own && !s.has('talk:mechanic'), lines:['Wah, bengkel baru! Aku Bimo, pemasok suku cadang. Barangku bagus-bagus, tenang saja.','Nanti pelanggan datang dengan keluhan motor mereka. Tugasmu mendiagnosis, memilih suku cadang yang tepat, lalu memperbaikinya.','Untuk sekarang, kenali dulu orang-orang di kota ini: Pasar, Kafe, lalu Balai Kota.'] },
      { when:s => s.own && s.ch >= 2, lines:s => ['Waktunya bekerja! Pakai Meja Kerja untuk membeli suku cadang dan mengerjakan servis pelanggan.', s.hint()] },
      { when:s => s.own, lines:s => ['Bengkelmu mulai terasa hidup!', s.hint()] },
      { when:() => true, lines:['Kamu temannya pemilik bengkel ini? Dia orang yang teliti.','Motor pengantar bunga pasti sering butuh servis. Kalian bisa saling bantu.'] },
    ],
    market: [
      { when:s => s.has('basket_found') && !s.has('basket_returned'), flags:['basket_returned'], lines:['Itu keranjangku! Di mana kamu menemukannya?','Terima kasih banyak. Kamu orang baik. Jangan sungkan datang kalau butuh bahan.'] },
      { when:s => !s.has('talk:market'), flags:['basket_quest'], lines:['Halo! Aku Udin, pedagang di pasar ini sudah lama.','Bahan-bahan dari pemasok masuk ke kota lewat pasar ini: bunga segar, suku cadang, dan banyak lagi.','Eh, ngomong-ngomong, keranjang daganganku hilang. Mungkin tertinggal waktu aku istirahat di Taman Kota. Kalau kamu lewat sana, tolong cari ya?'] },
      { when:s => s.has('basket_returned'), lines:['Keranjangku sudah kembali, berkat kamu!','Kalau mau tahu kabar kota, tanya Mbak Kiki di Kafe. Dia tahu semuanya.'] },
      { when:() => true, lines:['Keranjangku masih belum ketemu. Coba cek sekitar Taman Kota, ya.'] },
    ],
    cafe: [
      { when:s => s.dec('intro_night') === 'cafe', lines:['Malam itu di kafeku... aku saksinya, lho! Kalian berdua tampak canggung tapi senang.','Kafe ini akan selalu punya meja untuk kalian.'] },
      { when:s => s.dec('intro_night') === 'taman', lines:['Kudengar kalian berbincang di Taman Kota. Tempat yang tenang, pilihan bagus.','Kapan-kapan mampirlah ke sini, kuseduhkan kopi spesial.'] },
      { when:s => s.dec('intro_night') === 'alun', lines:['Orang-orang bilang kalian berbincang di dekat air mancur alun-alun. Romantis sekali!','Mampirlah ke kafe sebelum pulang, ya.'] },
      { when:s => !s.has('talk:cafe'), lines:['Selamat datang di Kafe Kota! Aku Kiki.','Kafe ini tempat warga berkumpul. Banyak pelanggan tetap datang dari sini.','Kudengar pemilik toko bunga dan pemilik bengkel akan sering bertemu. Mungkin kalian bisa saling melengkapi?','Oh ya, Pak Lurah di Balai Kota sedang mencari warga baru. Temui beliau, ya.'] },
      { when:() => true, lines:s => ['Kopi hari ini enak sekali!', s.hint()] },
    ],
    hall: [
      { when:s => s.has('ch1:done') && s.dec('intro_night'), lines:['Warga baru sudah menjadi bagian kota. Saya bangga.','Kota akan segera bersiap untuk festival. Kabar berikutnya akan saya umumkan di papan pengumuman.'] },
      { when:s => s.has('ch1:done'), lines:['Kalian berdua sudah mengenal kota ini. Hebat!','Ada sesuatu yang sedang dibicarakan host kalian mengenai malam perkenalan. Tunggu kabarnya.'] },
      { when:s => !s.has('talk:hall'), lines:['Selamat datang, warga baru! Saya Pak Lurah.','Kota ini kecil, tapi hangat. Usaha kalian berdua akan sangat berarti bagi warga.','Kota akan terus berkembang: area baru terbuka seiring usaha dan cerita kalian.','Lihat Papan Pengumuman di dinding untuk kabar terbaru. Selamat bertugas!'] },
      { when:() => true, lines:s => ['Ada yang bisa saya bantu?', s.hint()] },
    ],
  };
  function dialogue(sceneId, fallback) {
    const rules = D[sceneId]; if (!rules) return fallback || ['...'];
    const s = { has, own:sceneId === role, dec:k => decisions[k], hint, ch:chapter };
    const r = rules.find(r => r.when(s)); const lines = r ? (typeof r.lines === 'function' ? r.lines(s) : r.lines) : fallback;
    if (r && r.flags) r.flags.forEach(f => setFlag(f));
    setFlag('talk:' + sceneId); return lines;
  }

  // ---- Penanda dunia (benda yang muncul karena misi) ----
  const BASKET = { x:552, y:350 };
  function objects(sceneId) {
    if (sceneId !== 'kota') return [];
    const q = quests().find(q => q.id === 'q3');
    if (has('basket_quest') && !has('basket_found') && qStatus(q, quests()) === 'BERLANGSUNG')
      return [{ id:'basket', label:'Ambil keranjang', x:BASKET.x, y:BASKET.y, run:() => { setFlag('basket_found'); note('Kamu menemukan keranjang milik Pak Udin! Bawa kembali ke Pasar.'); } }];
    return [];
  }

  // ---- Target tujuan aktif ----
  function target() {
    const all = quests();
    for (const q of all) { if (qStatus(q, all) !== 'BERLANGSUNG') continue; const step = q.steps.find(s => !has(s.id)); if (step) return { quest:q, step, ...step.t }; }
    return null;
  }

  // ---- Status & pesan ----
  function note(text) { log.unshift({ text, at:Date.now() }); if (log.length > 60) log.pop(); cb.msg && cb.msg(text); emit(); }
  function setFlag(f) {
    if (has(f)) return false;
    const before = doneSet(); flags.add(f); lsSet();
    if (mode === 'server' && opts.persistFlag) opts.persistFlag(f).then(ok => { if (!ok) mode = 'local'; }).catch(() => {});
    const all = quests();
    for (const q of all) if (qDone(q) && !before.has(q.id)) { note(`✔ Misi selesai: ${q.title}`); if (q.reward) note(q.reward); }
    if (!has('ch1:done') && ['q1','q2','q4','q5'].every(id => qDone(all.find(q => q.id === id)))) {
      setFlag('ch1:done'); note('Chapter 1 selesai!');
      if (isHost && !decisions.intro_night) { note('Sebagai host, kamu menentukan pilihan cerita berikutnya. Buka MISI → CERITA.'); cb.decision && cb.decision(); }
      else if (!decisions.intro_night) note('Menunggu host menentukan pilihan cerita berikutnya.');
    }
    if (!has('ch2:done') && chapter >= 2 && ['q6','q7','q8'].every(id => { const q = all.find(q => q.id === id); return q && qDone(q); })) {
      setFlag('ch2:done'); note('Chapter 2 selesai! Usaha kalian berjalan dan saling membantu.'); cb.chapterCard && cb.chapterCard(3); }
    emit(); return true;
  }
  const pending = () => (isHost && has('ch1:done') && !decisions.intro_night) ? { key:'intro_night', ...DECISIONS.intro_night } : null;

  async function decide(k, v) {
    const def = DECISIONS[k]; if (!def || !def.options.some(o => o.v === v)) throw new Error('Pilihan tidak valid.');
    if (!isHost) throw new Error('Hanya host yang boleh menentukan pilihan cerita.');
    if (!has('ch1:done')) throw new Error('Chapter 1 belum selesai.');
    if (decisions[k]) throw new Error('Keputusan ini sudah ditetapkan.');
    if (mode === 'server') decisions = await opts.persistDecision(k, v); else decisions = { ...decisions, [k]:v };
    lsSet(); announceDecision(k); emit();
  }
  function announceDecision(k) {
    const o = DECISIONS[k].options.find(o => o.v === decisions[k]); note(`Keputusan cerita: ${DECISIONS[k].title} — ${o.label}. ${o.effect}`);
    chapter = 2; cb.chapterCard && cb.chapterCard(2);
  }
  function remoteState(row) {
    const nd = row.decisions || {}, fresh = Object.keys(nd).filter(k => !decisions[k]); decisions = nd; if (row.chapter) chapter = row.chapter;
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
    const all = quests(), done = all.filter(qDone).length;
    const cn = curChapter(), ids = cn === 1 ? ['q1','q2','q4','q5'] : cn === 2 ? ['q6','q7','q8'] : [];
    return { chapter:{ n:cn, ...CHAPTERS[cn] }, mode, isHost, pending:pending(),
      progress:{ done:ids.length ? ids.filter(id => qDone(all.find(q => q.id === id))).length : 1, total:ids.length || 1 },
      quests:all.map(q => ({ id:q.id, cat:q.cat, title:q.title, desc:q.desc, reward:q.reward, status:qStatus(q, all), steps:q.steps.map(s => ({ text:s.text, done:has(s.id) })) })),
      rel: decisions.intro_night ? 'Teman' : has('greeted') ? 'Kenalan' : 'Belum mengenal',
      decisions:Object.keys(decisions).map(k => ({ title:DECISIONS[k].title, value:PLACE[decisions[k]] || decisions[k] })), log };
  }
  return { init, flag:setFlag, dialogue, objects, target, view, decide, remoteState, note, has, decisionDef:k => DECISIONS[k], chapters:CHAPTERS,
    hasAny:() => flags.size > 0, mode:() => mode, isDone:() => decisions.intro_night };
})();
