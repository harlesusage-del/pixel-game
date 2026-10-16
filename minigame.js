// ======================= PIXEL LIFE — MINI-GAME PESANAN =======================
// Florist: susun bunga sesuai pesanan → bungkus → ikat pita (timing).
// Mekanik: pilih suku cadang → pasang di tempat yang benar → kencangkan baut → tes mesin.
// Mini-game hanya membuat proses pesanan lebih hidup. Hasil uang tetap diputuskan server (biz_fulfill).
const Mini = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const FL = { mawar:{ n:'Mawar', c:'#e85a6a', d:'#a8323f' }, tulip:{ n:'Tulip', c:'#f2c14e', d:'#c98a1a' }, lili:{ n:'Lili', c:'#f3e8ff', d:'#a98ad8' } };
  const PT = { busi:{ n:'Busi', c:'#b8bfce' }, kampas:{ n:'Kampas rem', c:'#d9625a' }, rantai:{ n:'Rantai', c:'#f2c14e' }, oli:{ n:'Oli mesin', c:'#e8833a' }, filter:{ n:'Filter udara', c:'#7fb8e6' } };
  // Tempat pemasangan di sepeda motor (koordinat kanvas 160x112)
  const SLOTS = { busi:[[66,48,7,8],[78,48,7,8]], kampas:[[113,73,18,18],[29,73,18,18]], rantai:[[46,86,44,6]], oli:[[68,70,14,10]], filter:[[46,52,14,12]] };
  let S = null, raf = 0;
  const cv = $('mini-cv'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const stars = m => m === 0 ? 3 : m <= 2 ? 2 : 1;
  const say = (t, bad) => { const e = $('mini-msg'); e.textContent = t || ''; e.className = 'msg ' + (bad ? 'err' : 'good'); if (bad) { S.shake = 0.25; } };

  function line(x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) R(col, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1); }
  function bloom(k, x, y) { const f = FL[k]; R(f.d, x - 3, y - 1, 7, 3); R(f.d, x - 1, y - 3, 3, 7); R(f.c, x - 2, y - 2, 5, 5); R(f.c, x - 3, y, 7, 1); R(f.c, x, y - 3, 1, 7); R('#fff6', x - 1, y - 1, 1, 1); R('#f2c14e', x, y, 1, 1); }

  // ---------------- Florist ----------------
  function drawFlorist(t) {
    R('#3a2a3f', 0, 0, 160, 112); R('#5b3a1e', 0, 96, 160, 16); R('#7d5430', 0, 96, 160, 2);
    const stems = S.stems, n = stems.length, bx = 80, by = 100;
    const paper = S.wrapped; if (paper) { for (let y = 62; y <= 104; y++) { const w = 6 + (y - 62) * 0.42; R('#f3d9e3', bx - w, y, w * 2, 1); R('#d9b8c8', bx - w, y, 1, 1); R('#d9b8c8', bx + w - 1, y, 1, 1); } R('#ffffff', bx - 4, 64, 8, 1); }
    stems.forEach((k, i) => { const a = n === 1 ? 0 : (-0.75 + 1.5 * i / (n - 1)), hx = bx + Math.sin(a) * 36, hy = by - Math.cos(a) * 52 + 10; line(bx, by, hx, hy, '#3d8a3d'); });
    stems.forEach((k, i) => { const a = n === 1 ? 0 : (-0.75 + 1.5 * i / (n - 1)), hx = bx + Math.sin(a) * 36, hy = by - Math.cos(a) * 52 + 10; bloom(k, hx, hy); });
    if (S.step === 'ribbon' || S.step === 'done') { const ry = 92, c = S.tied ? '#e87aa6' : '#e87aa655'; if (S.tied) { R(c, bx - 9, ry - 3, 8, 6); R(c, bx + 2, ry - 3, 8, 6); R('#b84a76', bx - 2, ry - 2, 5, 5); R(c, bx - 6, ry + 3, 3, 8); R(c, bx + 4, ry + 3, 3, 8); } else R('#e87aa633', bx - 9, ry - 3, 20, 6); }
    if (S.step === 'ribbon' && !S.tied) { // bar timing
      R('#1d1a28', 28, 6, 104, 12); R('#2a2036', 30, 8, 100, 8); R('#6fcf97', S.zone - S.half + 30, 8, S.half * 2, 8);
      const cx = 30 + (Math.sin(t / 420) * 0.5 + 0.5) * 100; S.cursor = cx - 30; R('#fff', cx - 1, 5, 3, 14); }
    if (S.step === 'done') { R('#f2c14e', 52, 8, 56, 14); for (let i = 0; i < 3; i++) R(i < S.stars ? '#fff3a0' : '#7a6a2a', 60 + i * 16, 11, 8, 8); }
  }
  function trayFlorist() {
    const t = $('mini-tray'), need = S.need; let h = '';
    if (S.step === 'flowers') {
      h = Object.entries(FL).map(([k, f]) => `<button data-f="${k}" class="sec"><span class="mini-sw" style="background:${f.c}"></span>${f.n}${need[k] ? ` ${S.placed[k] || 0}/${need[k]}` : ''}</button>`).join('') + '<button data-act="undo" class="sec">CABUT</button>';
    } else if (S.step === 'wrap') h = '<button data-act="wrap">BUNGKUS DENGAN KERTAS</button>';
    else if (S.step === 'ribbon') h = '<button data-act="tie">IKAT PITA! (tekan saat penanda di zona hijau)</button>';
    else h = `<button data-act="done">SERAHKAN PESANAN ${'⭐'.repeat(S.stars)}</button>`;
    t.innerHTML = h;
  }
  function nextFlorist() {
    const order = ['flowers']; if (S.need.kertas) order.push('wrap'); if (S.need.pita) order.push('ribbon'); order.push('done');
    S.step = order[order.indexOf(S.step) + 1]; if (S.step === 'ribbon') { S.zone = 28 + Math.random() * 44; S.half = 11; S.zone = S.zone + S.half; }
    if (S.step === 'done') { S.stars = stars(S.mistakes); say('Pesanan selesai dirangkai! Bintang: ' + S.stars, false); }
    else say(S.step === 'wrap' ? 'Bagus! Sekarang bungkus bouquet.' : S.step === 'ribbon' ? 'Ikat pita dengan tepat.' : '', false);
    trayFlorist();
  }
  function clickFlorist(e) {
    const b = e.target.closest('button'); if (!b) return; const need = S.need;
    if (b.dataset.f) { const k = b.dataset.f;
      if (!need[k] || (S.placed[k] || 0) >= need[k]) { S.mistakes++; say(need[k] ? `Cukup! ${FL[k].n} sudah pas.` : `Pesanan ini tidak butuh ${FL[k].n}!`, true); return; }
      S.placed[k] = (S.placed[k] || 0) + 1; S.stems.push(k); say('', false); trayFlorist();
      if (Object.keys(FL).every(f => (S.placed[f] || 0) === (need[f] || 0))) setTimeout(() => S && nextFlorist(), 450); }
    else if (b.dataset.act === 'undo') { const k = S.stems.pop(); if (k) { S.placed[k]--; trayFlorist(); } }
    else if (b.dataset.act === 'wrap') { S.wrapped = true; nextFlorist(); }
    else if (b.dataset.act === 'tie') { if (Math.abs(S.cursor - S.zone) <= S.half) { S.tied = true; nextFlorist(); } else { S.mistakes++; say('Meleset! Coba lagi.', true); } }
    else if (b.dataset.act === 'done') finish({ stars: S.stars });
  }

  // ---------------- Mekanik ----------------
  function bike(shake) {
    const ox = shake ? Math.round((Math.random() - 0.5) * 2) : 0, oy = shake ? Math.round((Math.random() - 0.5) * 2) : 0; g.save(); g.translate(ox, oy);
    R('#3a2a3f', 0, 0, 160, 112); R('#5a5f6b', 0, 98, 160, 14); R('#7b808c', 0, 98, 160, 2);
    for (const cx of [38, 122]) { R('#15131c', cx - 15, 67, 30, 30); R('#15131c', cx - 13, 65, 26, 34); R('#2a2630', cx - 12, 70, 24, 24); R('#9aa0ad', cx - 5, 77, 10, 10); R('#c9ced9', cx - 2, 80, 4, 4); }
    R('#c9574f', 70, 40, 34, 11); R('#e07a72', 72, 40, 28, 2); R('#2a2630', 34, 46, 34, 7); R('#4a4f5c', 58, 56, 34, 28); R('#5f6573', 60, 58, 30, 8); R('#9aa0ad', 108, 34, 3, 3); R('#4a4f5c', 116, 40, 3, 40); R('#4a4f5c', 106, 32, 14, 3);
    R('#6b6f7a', 40, 86, 38, 5); R('#4a4f5c', 40, 78, 3, 10); g.restore();
  }
  function slotRect(k, i) { const r = SLOTS[k][i]; return r; }
  function partIcon(k, x, y, w, h, taps) {
    const c = PT[k].c;
    if (k === 'busi') { R('#e8e8f2', x + 2, y, 3, 3); R(c, x + 1, y + 3, 5, 5); R('#333', x + 3, y + 8, 1, 1); }
    else if (k === 'kampas') { R('#15131c', x, y, w, h); R(c, x + 3, y + 3, w - 6, h - 6); R('#2a2630', x + 6, y + 6, w - 12, h - 12); R('#fff6', x + 4, y + 4, 4, 1); }
    else if (k === 'rantai') { for (let i = 0; i < w; i += 3) { R(c, x + i, y + (i % 2), 2, 3); R('#8a6a1a', x + i, y + 4, 2, 1); } }
    else if (k === 'oli') { R('#6a4a2a', x, y, w, h); R(c, x + 1, y + 1, w - 2, h - 3); R('#fff', x + 3, y + 3, 4, 2); }
    else { R('#2a2630', x, y, w, h); R(c, x + 1, y + 1, w - 2, h - 2); for (let i = 3; i < h - 1; i += 3) R('#3a6a9a', x + 1, y + i, w - 2, 1); }
    if (taps !== undefined) for (let i = 0; i < 3; i++) R(i < taps ? '#6fcf97' : '#1d1a28', x + Math.round(w / 2) - 5 + i * 4, y - 4, 3, 2);
  }
  function drawMech(t) {
    bike(S.step === 'test' && S.testT > 0); const pulse = (Math.sin(t / 250) + 1) / 2;
    for (const [k, rs] of Object.entries(SLOTS)) rs.forEach(([x, y, w, h], i) => {
      const part = S.parts.find(p => p.k === k && p.slot === i && p.state !== 'tray');
      if (part) { partIcon(k, x, y, w, h, part.state === 'placed' ? part.taps : 3); return; }
      if (!S.need[k] || S.parts.filter(p => p.k === k).length <= i) return;
      const col = PT[k].c; for (let a = 0; a < w; a += 2) { R(col, x + a, y, 1, 1); R(col, x + a, y + h - 1, 1, 1); } for (let b = 0; b < h; b += 2) { R(col, x, y + b, 1, 1); R(col, x + w - 1, y + b, 1, 1); }
      if (S.sel) { R(col + '55', x, y, w, h); R('#fff', x + w / 2, y - 3 - pulse * 2, 1, 2); } });
    if (S.step === 'test' && S.testT > 0) for (let i = 0; i < 8; i++) { const a = (S.testT * 30 + i * 9) % 30; R('rgba(220,220,230,' + (1 - a / 30).toFixed(2) + ')', 36 - a * 0.6 + (i % 3), 88 - a * 0.7, 3, 3); }
    if (S.step === 'done') { R('#f2c14e', 52, 8, 56, 14); for (let i = 0; i < 3; i++) R(i < S.stars ? '#fff3a0' : '#7a6a2a', 60 + i * 16, 11, 8, 8); }
  }
  function trayMech() {
    const t = $('mini-tray'); let h = '';
    if (S.step === 'parts') {
      h = S.parts.map((p, i) => `<button data-p="${i}" class="${p.state === 'tray' ? 'sec' : ''} ${S.sel === p ? 'sel' : ''}" ${p.state === 'tray' ? '' : 'disabled'}><span class="mini-sw" style="background:${PT[p.k].c}"></span>${PT[p.k].n}${p.state === 'tray' ? '' : ' ✓'}</button>`).join('');
    } else if (S.step === 'test') h = '<button data-act="start">TES MESIN: NYALAKAN!</button>';
    else if (S.step === 'done') h = `<button data-act="done">SERAHKAN MOTOR ${'⭐'.repeat(S.stars)}</button>`;
    t.innerHTML = h;
  }
  function pointerMech(e) {
    if (S.step !== 'parts') return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 160, y = (e.clientY - r.top) / r.height * 112;
    // kencangkan baut: ketuk suku cadang terpasang
    for (const p of S.parts) if (p.state === 'placed') { const [sx, sy, w, h] = slotRect(p.k, p.slot); if (x >= sx - 4 && x <= sx + w + 4 && y >= sy - 6 && y <= sy + h + 4) { p.taps++; if (p.taps >= 3) { p.state = 'tight'; say(PT[p.k].n + ' terpasang kencang.', false); } checkParts(); return; } }
    if (!S.sel) { say('Pilih suku cadang dulu di bawah.', true); return; }
    for (const k of Object.keys(SLOTS)) for (let i = 0; i < SLOTS[k].length; i++) { const [sx, sy, w, h] = SLOTS[k][i];
      if (x >= sx - 3 && x <= sx + w + 3 && y >= sy - 3 && y <= sy + h + 3) {
        const count = S.parts.filter(p => p.k === k).length, free = [...Array(count).keys()].find(j => !S.parts.some(p => p.k === k && p.slot === j && p.state !== 'tray'));
        if (k !== S.sel.k || free === undefined) { S.mistakes++; say('Bukan di sini! Cocokkan warna dan bentuknya.', true); return; }
        S.sel.state = 'placed'; S.sel.slot = free; S.sel.taps = 0; S.sel = null; say('Terpasang. Ketuk suku cadang itu 3× untuk mengencangkan baut.', false); trayMech(); return; } }
  }
  function checkParts() { trayMech(); if (S.parts.every(p => p.state === 'tight')) { S.step = 'test'; say('Semua terpasang. Waktunya tes mesin!', false); trayMech(); } }
  function clickMech(e) {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.p !== undefined) { const p = S.parts[Number(b.dataset.p)]; S.sel = S.sel === p ? null : p; say(S.sel ? 'Sekarang ketuk tempatnya di motor.' : '', false); trayMech(); }
    else if (b.dataset.act === 'start') { S.testT = 0.01; b.disabled = true; say('Brmm…', false); setTimeout(() => { if (!S) return; S.testT = 0; S.stars = stars(S.mistakes); S.step = 'done'; say('Mesin menyala mulus! Bintang: ' + S.stars, false); trayMech(); }, 1600); }
    else if (b.dataset.act === 'done') finish({ stars: S.stars });
  }

  // ---------------- Umum ----------------
  function loop(t) { if (!S) return; if (S.testT > 0) S.testT += 0.016; if (S.shake > 0) S.shake -= 0.016;
    g.save(); if (S.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 3), 0);
    if (S.role === 'florist') drawFlorist(t); else drawMech(t); g.restore(); raf = requestAnimationFrame(loop); }
  function finish(res) { const r = S && S.resolve; S = null; cancelAnimationFrame(raf); $('mini').classList.add('hidden'); if (r) r(res); }
  $('mini-cancel').onclick = () => finish(null);
  $('mini-tray').addEventListener('click', e => { if (!S) return; if (S.role === 'florist') clickFlorist(e); else clickMech(e); });
  cv.addEventListener('pointerdown', e => { if (S && S.role === 'mechanic') { e.preventDefault(); pointerMech(e); } });

  function play({ order, role }) {
    return new Promise(resolve => {
      const need = order.need || {}; S = { role, order, need, resolve, mistakes: 0, shake: 0 };
      $('mini-title').textContent = order.title.toUpperCase();
      if (role === 'florist') { Object.assign(S, { step: 'flowers', placed: {}, stems: [], wrapped: false, tied: false, zone: 60, half: 11, cursor: 0, stars: 3 });
        $('mini-help').innerHTML = 'Susun bunga sesuai pesanan: <b>' + Object.entries(need).map(([k, v]) => v + '× ' + esc((FL[k] || { n: k === 'pita' ? 'Pita' : k === 'kertas' ? 'Kertas pembungkus' : k }).n)).join(', ') + '</b>. Pilih bunga yang tepat, lalu bungkus dan ikat pita.'; trayFlorist(); }
      else { const parts = []; for (const [k, v] of Object.entries(need)) for (let i = 0; i < v; i++) parts.push({ k, state: 'tray', slot: -1, taps: 0 });
        Object.assign(S, { step: 'parts', parts, sel: null, testT: 0, stars: 3 });
        $('mini-help').innerHTML = 'Pasang suku cadang: <b>' + Object.entries(need).map(([k, v]) => v + '× ' + esc(PT[k] ? PT[k].n : k)).join(', ') + '</b>. Pilih bagian di bawah, ketuk tempatnya di motor (cocokkan warna), lalu ketuk bagian itu 3× untuk mengencangkan baut.'; trayMech(); }
      say('', false); $('mini').classList.remove('hidden'); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    });
  }
  return { play };
})();
