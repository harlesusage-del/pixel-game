// ======================= PIXEL LIFE — EKONOMI, BISNIS, PINJAMAN, RESET (klien) =======================
// Semua perubahan uang terjadi di server (RPC pada 003_economy.sql). Klien hanya menampilkan dan memanggil.
const Econ = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KC = n => Number(n).toLocaleString('id-ID') + ' KC';
  const uid4 = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2));
  const CAT = { florist:{ mawar:['Mawar',8], tulip:['Tulip',7], lili:['Lili',10], pita:['Pita',4], kertas:['Kertas pembungkus',5] },
                mechanic:{ busi:['Busi',9], kampas:['Kampas rem',14], rantai:['Rantai',18], oli:['Oli mesin',10], filter:['Filter udara',12] } };
  const KIND = { seed:'Modal awal', fund_business:'Modal ke usaha', withdraw:'Tarik dari usaha', buy_stock:'Beli bahan', sale:'Pendapatan pesanan', gift:'Hadiah', upgrade:'Upgrade usaha', loan_disburse:'Pencairan pinjaman', loan_payment:'Pembayaran pinjaman' };
  const PURPOSE = { modal_bisnis:'Modal bisnis', pembelian_bahan:'Pembelian bahan', upgrade:'Upgrade usaha', rumah:'Kebutuhan rumah', keluarga:'Pengeluaran keluarga', lainnya:'Lainnya' };
  const STAT = { MENUNGGU_PERSETUJUAN:'MENUNGGU PERSETUJUAN', MENAWAR:'MENAWAR ULANG', AKTIF:'AKTIF', LUNAS:'LUNAS', DITOLAK:'DITOLAK', DIBATALKAN:'DIBATALKAN' };
  const UPCOST = { 1:250, 2:500 };

  let prevGR = null, sb = null, world = null, me = null, role = 'florist', names = {}, st = null, tab = 'saldo', busy = false, ch = null, o = {}, loaded = false, unavailable = false, prevLoans = null, prevResetStatus = null, noteTimer = 0;

  const myW = kind => st && st.wallets.find(w => w.owner_id === me && w.kind === kind);
  const partnerId = () => o.partnerId && o.partnerId();
  const partnerBiz = () => st && st.businesses.find(b => b.owner_id !== me);
  const myBiz = () => st && st.businesses.find(b => b.owner_id === me);
  const nm = id => names[id] || 'Pemain';
  const loanTerms = (p, i, n) => { const total = p + Math.round(p * i / 100), base = Math.floor(total / n); return { total, base, last: total - base * (n - 1) }; };
  const setMsg = (t, ok) => { const e = $('e-msg'); e.textContent = t || ''; e.className = 'msg ' + (ok ? 'good' : 'err'); };

  async function call(fn, args, okText) {
    if (busy) return; busy = true; setMsg('Memproses…', true);
    try { const { data, error } = await sb.rpc(fn, { p_world: world, ...args }); if (error) throw error; st = data; afterState(); setMsg(okText || '', true); }
    catch (e) { setMsg((e && e.message && !/JWT|fetch|network|Failed/i.test(e.message)) ? e.message : 'Gagal. Periksa koneksi lalu coba lagi.'); }
    finally { busy = false; render(); }
  }
  async function refresh() { try { const { data, error } = await sb.rpc('econ_state', { p_world: world }); if (!error && data) { st = data; afterState(); render(); } } catch (e) {} }

  // Notifikasi dari perubahan state + penanda cerita yang diturunkan dari state server
  function afterState() {
    const loans = new Map(st.loans.map(l => [l.id, l.status]));
    if (prevLoans) for (const l of st.loans) { const was = prevLoans.get(l.id), mineLender = l.lender === me;
      if (!was && mineLender && l.status === 'MENUNGGU_PERSETUJUAN') o.notify && o.notify(`💰 ${nm(l.borrower)} mengajukan pinjaman ${KC(l.principal)}. Buka UANG → PINJAMAN.`);
      else if (was && was !== l.status) {
        if (l.status === 'AKTIF') o.notify && o.notify('Pinjaman aktif: ' + KC(l.principal));
        else if (l.status === 'DITOLAK') o.notify && o.notify('Pinjaman ditolak.');
        else if (l.status === 'LUNAS') o.notify && o.notify('Pinjaman lunas! 🎉');
        else if (l.status === 'MENAWAR' && l.borrower === me) o.notify && o.notify(`${nm(l.lender)} menawar ulang pinjamanmu. Buka UANG → PINJAMAN.`); } }
    prevLoans = loans;
    if (st.gifts) { for (let n = 1; n <= 8; n++) { if (st.gifts.sent >= n) o.onFlag && o.onFlag('gs:' + n); if (st.gifts.received >= n) o.onFlag && o.onFlag('gr:' + n); }
      if (prevGR !== null && st.gifts.received > prevGR) o.notify && o.notify(`🎁 ${nm(partnerId())} mengirim hadiah untukmu!`); prevGR = st.gifts.received; }
    if (st.loans.filter(l => l.status === 'AKTIF' || l.status === 'LUNAS').length >= 2) o.onFlag && o.onFlag('loans:2');
    if (st.loans.some(l => l.status === 'AKTIF' || l.status === 'LUNAS')) o.onFlag && o.onFlag('loan_active');
    if (st.loans.some(l => l.status === 'LUNAS')) o.onFlag && o.onFlag('loan_settled');
    if (st.inventory.length || st.ledger.some(t => t.kind === 'buy_stock')) o.onFlag && o.onFlag('stock_bought');
    const b = myBiz(); if (b && b.level >= 2) o.onFlag && o.onFlag('upgraded'); if (b) for (const n of [1, 3, 5, 8, 12, 15]) if (b.reputation >= n) o.onFlag && o.onFlag('rep:' + n);
    const bw = myW('business'); if (bw) for (const n of [500, 800, 1000, 1200]) if (bw.balance >= n) o.onFlag && o.onFlag('cash:' + n);
    const r = st.reset, rs = r ? r.status : null;
    if (r && prevResetStatus !== rs) {
      if (rs === 'menunggu' && r.requested_by !== me) o.notify && o.notify(`⚠ ${nm(r.requested_by)} mengajukan RESET DUNIA. Buka UANG → DUNIA untuk menyetujui atau menolak.`);
      if (prevResetStatus === 'menunggu' && rs === 'ditolak') o.notify && o.notify('Permintaan reset dunia ditolak.');
      if (prevResetStatus === 'menunggu' && rs === 'kedaluwarsa') o.notify && o.notify('Permintaan reset dunia kedaluwarsa.');
      if (prevResetStatus === 'menunggu' && rs === 'dijalankan') { try { Object.keys(localStorage).filter(k => k.startsWith('pl_' + world)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
        alert('Dunia telah direset atas persetujuan kedua pemain. Game akan dimuat ulang.'); location.reload(); }
    }
    prevResetStatus = rs;
  }

  // ---------------- Tampilan ----------------
  const tabs = ['saldo', 'bisnis', 'pinjaman', 'riwayat', 'dunia'], TL = { saldo:'SALDO', bisnis:'BISNIS', pinjaman:'PINJAMAN', riwayat:'RIWAYAT', dunia:'DUNIA' };
  function render() {
    if ($('econ').classList.contains('hidden')) return;
    $('e-tabs').innerHTML = tabs.map(t => `<button data-tab="${t}" class="${t === tab ? 'on' : ''}">${TL[t]}</button>`).join('');
    const body = $('e-body');
    if (unavailable) { body.innerHTML = '<p>Fitur keuangan belum aktif di server. Jalankan <b>003_economy.sql</b> di Supabase SQL Editor, lalu muat ulang game.</p>'; return; }
    if (!st) { body.innerHTML = '<p>Memuat…</p>'; return; }
    body.innerHTML = ({ saldo:vSaldo, bisnis:vBisnis, pinjaman:vPinjaman, riwayat:vRiwayat, dunia:vDunia })[tab]();
  }
  function vSaldo() {
    const p = myW('personal'), b = myW('business'), pb = partnerBiz(), pw = pb && st.wallets.find(w => w.owner_id === pb.owner_id && w.kind === 'business');
    const mine = new Set(st.wallets.filter(w => w.owner_id === me).map(w => w.id)); let inc = 0, out = 0;
    for (const t of st.ledger) { const f = mine.has(t.from), to = mine.has(t.to); if (to && !f) inc += t.amount; if (f && !to) out += t.amount; }
    return `<div class="jch">UANG PRIBADI</div><div class="big">${KC(p ? p.balance : 0)}</div>
      <div class="jch">KAS USAHA</div><div class="big">${KC(b ? b.balance : 0)}</div>
      ${pb ? `<p class="mut">Usaha ${esc(nm(pb.owner_id))} (${pb.role === 'florist' ? 'Toko Bunga' : 'Bengkel'}): level ${pb.level}, kas ${KC(pw ? pw.balance : 0)}</p>` : ''}
      <div class="jch">PINDAHKAN DANA</div><input id="e-amt" type="number" min="1" placeholder="Jumlah (KC)" inputmode="numeric">
      <div class="row"><button data-act="fund">MODAL KE USAHA</button><button data-act="withdraw" class="sec">TARIK KE PRIBADI</button></div>
      <div class="jch">RINGKASAN (30 TRANSAKSI TERAKHIR)</div><p>Pemasukan: <b>${KC(inc)}</b> · Pengeluaran: <b>${KC(out)}</b> · Selisih: <b>${KC(inc - out)}</b></p>
      ${partnerId() ? `<div class="jch">BERI HADIAH KE ${esc(nm(partnerId()).toUpperCase())}</div><input id="g-amt" type="number" min="1" max="1000" placeholder="Jumlah hadiah (1–1.000 KC)" inputmode="numeric"><button data-act="gift" class="sec">KIRIM HADIAH 🎁</button>` : ''}
      <p class="mut">Uang pribadi dan kas usaha dipisah. Pernikahan tidak otomatis menggabungkannya.</p>`;
  }
  function vBisnis() {
    if (o.locked && o.locked()) return '<p>Bisnis baru dibuka pada <b>Hari ke-5</b> (Chapter 2). Selesaikan dulu Chapter 1: kenali kota dan pasanganmu.</p>';
    if (!o.inShop || !o.inShop()) return '<p>Bisnis dikerjakan di <b>meja kerja</b> di dalam tempat usahamu (Toko Bunga → Meja Rangkai, Bengkel → Meja Kerja).</p>';
    const b = myBiz(), w = myW('business'), inv = Object.fromEntries(st.inventory.map(i => [i.item, i.qty])), cat = CAT[role];
    const maxO = Math.min(5, 2 + b.level), up = UPCOST[b.level];
    let h = `<div class="jch">${role === 'florist' ? 'TOKO BUNGA' : 'BENGKEL'} · LEVEL ${b.level}</div><p>Kas usaha: <b>${KC(w.balance)}</b> · Reputasi: <b>${b.reputation}</b></p>`;
    h += up ? `<button data-act="upgrade">UPGRADE KE LEVEL ${b.level + 1} (${KC(up)})</button><p class="mut">Level lebih tinggi: pesanan lebih banyak dan bernilai lebih besar.</p>` : '<p class="mut">Usaha sudah di level tertinggi.</p>';
    h += `<div class="cat">PESANAN (${st.orders.length}/${maxO})</div>`;
    h += st.orders.length ? st.orders.map(r => { const ok = Object.entries(r.need).every(([k, v]) => (inv[k] || 0) >= v);
      return `<div class="q ${ok ? 's-BERLANGSUNG' : ''}"><span class="st">${KC(r.reward)}</span><h3>${esc(r.title)}</h3><p>Butuh: ${Object.entries(r.need).map(([k, v]) => `${v}× ${esc(cat[k] ? cat[k][0] : k)} (punya ${inv[k] || 0})`).join(', ')}</p><button data-act="fulfill" data-id="${r.id}" ${ok ? '' : 'class="sec"'}>KERJAKAN</button></div>`; }).join('') : '<p>Belum ada pesanan.</p>';
    h += `<button data-act="neworder" class="sec">CEK PESANAN BARU</button><div class="cat">BELI BAHAN (kas usaha)</div>`;
    h += Object.entries(cat).map(([k, [n, p]]) => `<div class="m"><span>${esc(n)} <small>${KC(p)} · stok ${inv[k] || 0}</small></span><span style="display:flex;gap:6px"><button data-act="buy" data-item="${k}" data-qty="1" style="width:56px">+1</button><button data-act="buy" data-item="${k}" data-qty="5" style="width:56px">+5</button></span></div>`).join('');
    return h;
  }
  const loanCard = l => {
    const mineB = l.borrower === me, other = mineB ? l.lender : l.borrower, t = loanTerms(l.principal, l.interest, l.n), p = myW('personal'), bal = p ? p.balance : 0;
    let h = `<div class="q s-${l.status === 'AKTIF' ? 'BERLANGSUNG' : l.status === 'LUNAS' ? 'SELESAI' : l.status === 'MENUNGGU_PERSETUJUAN' || l.status === 'MENAWAR' ? 'TERSEDIA' : 'TERKUNCI'}"><span class="st">${STAT[l.status]}</span>
      <h3>${mineB ? 'Pinjam dari' : 'Pinjamkan ke'} ${esc(nm(other))}: ${KC(l.principal)}</h3>
      <p>Tujuan: ${esc(PURPOSE[l.purpose] || l.purpose)} · Bunga ${l.interest}% · ${l.n}× cicilan</p>
      <p>Total kembali: <b>${KC(t.total)}</b> (cicilan ${KC(t.base)}${t.last !== t.base ? `, terakhir ${KC(t.last)}` : ''})</p>`;
    if (l.status === 'AKTIF' || l.status === 'LUNAS') h += `<p>Terbayar: ${KC(l.paid_total)} · Sisa: ${KC(l.total - l.paid_total)} (${l.paid_count}/${l.n})</p>`;
    if (!mineB && l.status === 'MENUNGGU_PERSETUJUAN') h += `<p>Saldo pribadimu ${KC(bal)} → sisa setelah pinjaman ${KC(bal - l.principal)}. Pembayaran terlambat belum dikenai denda.</p>
      <div class="row"><button data-act="loan" data-a="approve" data-id="${l.id}">SETUJUI</button><button data-act="loan" data-a="reject" data-id="${l.id}" class="sec">TOLAK</button></div><button data-act="counter" data-id="${l.id}" class="sec">TAWAR ULANG</button>`;
    if (mineB && l.status === 'MENAWAR') h += `<div class="row"><button data-act="loan" data-a="accept" data-id="${l.id}">TERIMA TAWARAN</button><button data-act="loan" data-a="reject" data-id="${l.id}" class="sec">TOLAK</button></div>`;
    if (mineB && (l.status === 'MENUNGGU_PERSETUJUAN' || l.status === 'MENAWAR')) h += `<button data-act="loan" data-a="cancel" data-id="${l.id}" class="sec">BATALKAN PERMINTAAN</button>`;
    if (mineB && l.status === 'AKTIF') h += `<div class="row"><button data-act="pay" data-mode="next" data-id="${l.id}">BAYAR CICILAN</button><button data-act="pay" data-mode="all" data-id="${l.id}" class="sec">LUNASI SEKARANG</button></div>`;
    return h + '</div>';
  };
  function vPinjaman() {
    if (!partnerId()) return '<p>Pinjaman antarpemain tersedia setelah pemain kedua bergabung.</p>';
    return `<div class="jch">AJUKAN PINJAMAN KE ${esc(nm(partnerId()).toUpperCase())}</div>
      <input id="l-p" type="number" min="1" placeholder="Jumlah (KC)" inputmode="numeric"><input id="l-i" type="number" min="0" max="50" step="0.5" placeholder="Bunga total % (0 = tanpa bunga)" inputmode="decimal">
      <input id="l-n" type="number" min="1" max="24" placeholder="Jumlah cicilan" inputmode="numeric">
      <select id="l-t">${Object.entries(PURPOSE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><p id="l-prev" class="mut">Isi jumlah, bunga, dan cicilan untuk melihat perhitungan.</p>
      <button data-act="loanreq">AJUKAN PINJAMAN</button><div class="cat">KONTRAK</div>${st.loans.length ? st.loans.map(loanCard).join('') : '<p>Belum ada kontrak.</p>'}`;
  }
  function vRiwayat() {
    const mine = new Set(st.wallets.filter(w => w.owner_id === me).map(w => w.id));
    return st.ledger.length ? st.ledger.map(t => { const inn = mine.has(t.to) && !mine.has(t.from), out = mine.has(t.from) && !mine.has(t.to), d = new Date(t.at);
      return `<div class="logline"><b style="color:${inn ? 'var(--ok)' : out ? 'var(--bad)' : 'var(--mut)'}">${inn ? '+' : out ? '−' : '↔'}${KC(t.amount)}</b> · ${esc(KIND[t.kind] || t.kind)}<br><span class="mut">${esc(t.memo || '')} · ${d.toLocaleString('id-ID')}</span></div>`; }).join('') : '<p>Belum ada transaksi.</p>';
  }
  function vDunia() {
    const r = st.reset, pid = partnerId(), mineReq = r && r.requested_by === me;
    let h = `<div class="jch">RESET DUNIA</div><p>Reset menghapus <b>semua</b> progres bersama: uang, bisnis, pinjaman, misi, dan cerita. Tidak ada pemain, termasuk host, yang dapat mereset sendirian: <b>kedua pemain harus setuju</b> dalam 24 jam. Cadangan disimpan di server sebelum reset, tetapi fitur pemulihan belum tersedia di game.</p>`;
    if (r && r.status === 'menunggu') {
      h += `<div class="q s-TERSEDIA"><span class="st">MENUNGGU</span><h3>Permintaan reset dari ${esc(nm(r.requested_by))}</h3><p>Berlaku sampai ${new Date(r.expires_at).toLocaleString('id-ID')}</p></div>`;
      h += mineReq ? '<p>Menunggu persetujuan pemain kedua.</p><button data-act="resetno" data-id="' + r.id + '" class="sec">BATALKAN PERMINTAAN</button>'
        : `<div class="row"><button data-act="resetyes" data-id="${r.id}" style="background:var(--bad)">SETUJUI RESET</button><button data-act="resetno" data-id="${r.id}" class="sec">TOLAK</button></div>`;
    } else {
      if (r) h += `<p class="mut">Permintaan terakhir: ${esc(r.status)}.</p>`;
      h += pid ? '<button data-act="resetreq" style="background:var(--bad)">AJUKAN RESET DUNIA</button>' : '<p>Reset memerlukan pemain kedua.</p>';
    }
    return h;
  }

  // ---------------- Aksi ----------------
  const num = id => Number(($(id) || {}).value);
  document.addEventListener('input', e => { if (!['l-p', 'l-i', 'l-n'].includes(e.target.id)) return; const p = num('l-p'), i = num('l-i') || 0, n = num('l-n'), el = $('l-prev');
    if (el && p > 0 && n > 0) { const t = loanTerms(p, i, n); el.textContent = `Total kembali ${KC(t.total)} (${KC(p)} + bunga ${KC(t.total - p)}), ${n}× cicilan ${KC(t.base)}${t.last !== t.base ? `, terakhir ${KC(t.last)}` : ''}.`; } });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tab],[data-act]'); if (!b || !$('econ').contains(b)) return;
    if (b.dataset.tab) { tab = b.dataset.tab; setMsg(''); render(); return; }
    const a = b.dataset.act, d = b.dataset;
    if (a === 'fund' || a === 'withdraw') call('econ_transfer', { p_dir:a, p_amount:Math.floor(num('e-amt')), p_key:uid4() }, 'Transfer berhasil.');
    else if (a === 'gift') call('econ_gift', { p_amount:Math.floor(num('g-amt')), p_key:uid4() }, 'Hadiah terkirim. 💝');
    else if (a === 'neworder') call('biz_new_order', {}, 'Pesanan baru diterima.');
    else if (a === 'buy') call('biz_buy', { p_item:d.item, p_qty:Number(d.qty), p_key:uid4() }, 'Bahan dibeli.');
    else if (a === 'fulfill') call('biz_fulfill', { p_order:d.id, p_key:uid4() }, 'Pesanan selesai! Pendapatan masuk ke kas usaha.');
    else if (a === 'upgrade') { if (confirm('Upgrade usaha? Biaya diambil dari kas usaha.')) call('biz_upgrade', { p_key:uid4() }, 'Usaha ditingkatkan!'); }
    else if (a === 'loanreq') call('loan_request', { p_principal:Math.floor(num('l-p')), p_interest:num('l-i') || 0, p_n:Math.floor(num('l-n')), p_purpose:$('l-t').value, p_key:uid4() }, 'Permintaan pinjaman dikirim. Menunggu persetujuan.');
    else if (a === 'loan') call('loan_respond', { p_loan:d.id, p_action:d.a }, 'Tersimpan.');
    else if (a === 'counter') { const l = st.loans.find(x => x.id === d.id), v = prompt('Tawaran ulang: jumlah,bunga%,cicilan (contoh 800,5,4)', `${l.principal},${l.interest},${l.n}`);
      if (v) { const [p, i, n] = v.split(',').map(Number); call('loan_respond', { p_loan:d.id, p_action:'counter', p_principal:p, p_interest:i, p_n:n }, 'Tawaran ulang dikirim. Peminjam harus menyetujuinya.'); } }
    else if (a === 'pay') call('loan_pay', { p_loan:d.id, p_mode:d.mode, p_key:uid4() }, 'Pembayaran berhasil.');
    else if (a === 'resetreq') { if (confirm('Ajukan reset dunia? Semua progres bersama akan dihapus JIKA pemain kedua juga setuju.')) call('reset_request', {}, 'Permintaan dikirim. Menunggu pemain kedua.'); }
    else if (a === 'resetyes') { if (confirm('SETUJUI reset? Semua progres bersama (uang, bisnis, pinjaman, cerita) akan dihapus dan tidak bisa dikembalikan di game.')) call('reset_respond', { p_request:d.id, p_approve:true }, 'Persetujuan dicatat.'); }
    else if (a === 'resetno') call('reset_respond', { p_request:d.id, p_approve:false }, 'Permintaan dibatalkan.');
  });
  $('e-close').onclick = () => $('econ').classList.add('hidden');
  $('g-econ').onclick = () => open('saldo');

  function open(t) { tab = t || tab; setMsg(''); $('econ').classList.remove('hidden'); render(); refresh(); }
  async function init(opts) {
    o = opts; sb = opts.sb; world = opts.world; me = opts.me; role = opts.role; names = opts.names; st = null; unavailable = false; prevLoans = null; prevResetStatus = null; prevGR = null;
    const { data, error } = await sb.rpc('econ_init', { p_world: world });
    if (error) { unavailable = true; if (o.notify) setTimeout(() => o.notify('Fitur uang belum aktif di server (jalankan 003_economy.sql).'), 1500); return; }
    st = data; prevLoans = new Map(st.loans.map(l => [l.id, l.status])); prevResetStatus = st.reset ? st.reset.status : null; afterState();
    if (ch) sb.removeChannel(ch);
    ch = sb.channel('econ:' + world);
    for (const t of ['wallets', 'loan_contracts', 'business_orders', 'world_reset_requests']) ch.on('postgres_changes', { event:'*', schema:'public', table:t, filter:'world_id=eq.' + world }, () => { clearTimeout(noteTimer); noteTimer = setTimeout(refresh, 250); });
    ch.subscribe();
  }
  function stop() { if (ch && sb) { sb.removeChannel(ch); ch = null; } st = null; }
  return { init, stop, open, refresh };
})();
