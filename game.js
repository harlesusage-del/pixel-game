
(() => {
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLE = { florist: 'Florist', mechanic: 'Mekanik' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const showView = v => ['v-auth','v-menu','v-world'].forEach(x => $(x).classList.toggle('hidden', x !== v));
const say = (el, t, ok) => { $(el).textContent = t || ''; $(el).className = 'msg ' + (ok ? 'good' : 'err'); };

// @@SCENES_START
// ======================= MODUL: ADEGAN (kota + interior) =======================
const Scenes = (() => {
  const TS = 16;
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0); };
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const rectDist = (px, py, r) => Math.hypot(Math.max(r.x - px, 0, px - (r.x + r.w)), Math.max(r.y - py, 0, py - (r.y + r.h)));
  // Kotak tabrak kaki: lebar 10, tinggi 6, berpusat di (x, y) = telapak kaki
  const mkBlocked = (W, H, isSolid) => {
    const s = (px, py) => { const tx = Math.floor(px/TS), ty = Math.floor(py/TS); return tx < 0 || ty < 0 || tx >= W || ty >= H || isSolid(tx, ty); };
    return (x, y) => s(x-5, y-6) || s(x+4.99, y-6) || s(x-5, y) || s(x+4.99, y);
  };
  const NAMES = { florist:'Toko Bunga', mechanic:'Bengkel', cafe:'Kafe', hall:'Balai Kota', house_f:'Rumah Florist', house_m:'Rumah Mekanik', market:'Pasar', school:'Sekolah Sihir' };

  // ---------------- KOTA ----------------
  const city = (() => {
    const W = 40, H = 28, T = { GRASS:0, ROAD:1, WALL:2, TREE:3, DOOR:4, PLAZA:5, PATH:6, WATER:7, DECO:8 };
    const grid = new Uint8Array(W * H), at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 255 : grid[y*W + x];
    const buildings = [
      { id:'florist',  x:5,  y:7,  w:6, h:4, roof:'#e87aa6', wall:'#f3d9e3', pot:'#e85a7a' },
      { id:'mechanic', x:28, y:7,  w:7, h:4, roof:'#4a79c9', wall:'#c9d3e6', pot:'#f2c14e' },
      { id:'cafe',     x:5,  y:17, w:5, h:4, roof:'#a0693d', wall:'#ead8c0', pot:'#f5f5f5' },
      { id:'hall',     x:16, y:2,  w:8, h:5, roof:'#7a7f8f', wall:'#dcdde3', pot:'#b77ae8' },
      { id:'house_m',  x:29, y:17, w:5, h:4, roof:'#3d5a8a', wall:'#e1e6f0', pot:'#f2c14e' },
      { id:'house_f',  x:23, y:18, w:5, h:4, roof:'#f0a0c0', wall:'#fbeaf1', pot:'#ff8fb8' },
      { id:'market',   x:13, y:18, w:5, h:4, roof:'#4fa36a', wall:'#d8ead9', pot:'#e8833a' },
      { id:'school',   x:31, y:1,  w:7, h:4, roof:'#6a4ab8', wall:'#e4dcf5', pot:'#7ad9f0' },
    ];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let t = T.GRASS;
      if (x === 0 || y === 0 || x === W-1 || y === H-1) t = T.TREE;
      else if (y === 13 || y === 14 || x === 19 || x === 20) t = T.ROAD;
      if (x >= 17 && x <= 22 && y >= 11 && y <= 16) t = T.PLAZA;
      if (t === T.GRASS && x >= 33 && y >= 21 && hash(x, y) % 4 === 0) t = T.TREE;
      grid[y*W + x] = t;
    }
    for (let y = 23; y <= 24; y++) for (let x = 34; x <= 36; x++) grid[y*W + x] = T.WATER; // kolam taman
    const doors = [];
    for (const b of buildings) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) grid[y*W + x] = T.WALL;
      const dx = b.x + (b.w >> 1), dy = b.y + b.h - 1; grid[dy*W + dx] = T.DOOR;
      doors.push({ id:b.id, name:NAMES[b.id], dx, dy, x:dx*TS + TS/2, y:(dy+1)*TS });
    }
    const path = (x, y) => { if (at(x, y) === T.GRASS) grid[y*W + x] = T.PATH; };
    for (const d of doors) { const b = buildings.find(b => b.id === d.id);
      if (d.id === 'school') continue;
      if (b.y < 13) { for (let y = d.dy + 1; y < 13; y++) path(d.dx, y); }
      else { const row = d.dy + 2; path(d.dx, d.dy + 1); path(d.dx, row);
        if (d.dx < 19) for (let x = d.dx; x <= 18; x++) path(x, row); else for (let x = d.dx; x >= 21; x--) path(x, row); } }
    path(34, 5); path(34, 6); path(35, 6); path(36, 6); for (let y = 7; y <= 12; y++) path(36, y); // jalur Sekolah Sihir
    // Dekorasi
    const deco = [], addD = (type, tx, ty, solid, opt) => { if (at(tx, ty) === T.GRASS || at(tx, ty) === T.PATH || at(tx, ty) === T.PLAZA) { deco.push({ type, tx, ty, ...opt }); if (solid) grid[ty*W + tx] = T.DECO; } };
    for (let y = 13; y <= 14; y++) for (let x = 19; x <= 20; x++) { grid[y*W + x] = T.DECO; } deco.push({ type:'fountain', tx:19, ty:13 });
    for (const x of [3, 12, 15, 24, 27, 37]) { addD('lamp', x, 12, true); addD('lamp', x, 15, true); }
    for (const [x, y] of [[17,11],[22,11],[17,16],[22,16]]) addD('bench', x, y, true);
    for (const [x, y] of [[18,11],[21,11],[18,16],[21,16]]) addD('bed', x, y, false);
    for (const b of buildings) { const d = doors.find(d => d.id === b.id);
      addD('bush', b.x - 1, b.y + b.h - 1, true); addD('bush', b.x + b.w, b.y + b.h - 1, true);
      deco.push({ type:'pot', tx:d.dx - 1, ty:d.dy + 1, c:b.pot }); deco.push({ type:'pot', tx:d.dx + 1, ty:d.dy + 1, c:b.pot }); }
    addD('moto', 34, 11, true); addD('bike', 4, 11, true); addD('sign', 16, 12, true); addD('mail', 28, 16, true); addD('bench', 35, 22, true); addD('bed', 33, 22, false);
    addD('bed', 4, 16, false); addD('bed', 11, 16, false);

    const lights = [];
    const drawDeco = (g, d) => { const x = d.tx*TS, y = d.ty*TS;
      switch (d.type) {
        case 'lamp': lights.push({ x:x+8, y:y+3, r:34 }); R(g,'#0003',x+4,y+14,8,2); R(g,'#3b3f4a',x+6,y+12,4,3); R(g,'#4d5260',x+7,y+4,2,9); R(g,'#4d5260',x+4,y+1,8,4); R(g,'#ffe9a0',x+5,y+2,6,2); break;
        case 'bench': R(g,'#0003',x+1,y+13,14,2); R(g,'#7d5430',x+1,y+4,14,3); R(g,'#9a6b3e',x+1,y+8,14,3); R(g,'#4a3320',x+2,y+11,2,3); R(g,'#4a3320',x+12,y+11,2,3); break;
        case 'bush': R(g,'#0003',x+1,y+13,14,3); R(g,'#2f7d3a',x+1,y+5,14,9); R(g,'#2f7d3a',x+3,y+3,10,4); R(g,'#3d9748',x+4,y+5,4,3); R(g,'#3d9748',x+9,y+8,4,3); R(g,'#e85a7a',x+3,y+9,2,2); R(g,'#e85a7a',x+11,y+6,2,2); break;
        case 'pot': R(g,'#2f7d3a',x+7,y+4,2,6); R(g,d.c,x+4,y+2,4,4); R(g,d.c,x+9,y+3,4,4); R(g,'#f2c14e',x+6,y+3,2,2); R(g,'#b5653a',x+4,y+10,8,6); R(g,'#8f4a28',x+4,y+10,8,1); break;
        case 'bed': R(g,'#7a4a26',x+1,y+8,14,7); R(g,'#5b3a1e',x+1,y+8,14,1); for (let i = 0; i < 5; i++) { R(g,['#e85a7a','#f2c14e','#fff','#b77ae8','#ff9ec5'][i],x+2+i*3,y+4+(i%2)*2,2,3); R(g,'#2f7d3a',x+2+i*3,y+7,2,2); } break;
        case 'moto': R(g,'#0003',x+1,y+13,14,3); R(g,'#222',x+1,y+9,5,5); R(g,'#222',x+10,y+9,5,5); R(g,'#aaa',x+3,y+11,1,1); R(g,'#aaa',x+12,y+11,1,1); R(g,'#c9574f',x+4,y+7,8,3); R(g,'#333',x+3,y+5,5,2); R(g,'#9aa0ad',x+11,y+4,2,5); break;
        case 'bike': R(g,'#0003',x+1,y+13,14,3); R(g,'#333',x+1,y+9,5,5); R(g,'#333',x+10,y+9,5,5); R(g,'#e85a7a',x+4,y+8,7,1); R(g,'#c9a14a',x+11,y+3,5,5); R(g,'#e85a7a',x+12,y+2,2,2); R(g,'#f2c14e',x+14,y+2,2,2); break;
        case 'sign': R(g,'#0003',x+3,y+14,10,2); R(g,'#5b3a1e',x+7,y+5,2,10); R(g,'#a47244',x+1,y+2,14,6); R(g,'#fff6',x+2,y+3,12,1); R(g,'#3a2412',x+4,y+5,8,1); break;
        case 'mail': R(g,'#0003',x+4,y+14,8,2); R(g,'#5b3a1e',x+7,y+8,2,7); R(g,'#4a79c9',x+3,y+3,10,6); R(g,'#2f5aa0',x+3,y+3,10,2); R(g,'#e85a5a',x+11,y+2,2,3); break;
        case 'fountain': R(g,'#0003',x+1,y+30,30,2); R(g,'#8f95a3',x+1,y+3,30,27); R(g,'#aab0be',x+1,y+3,30,3); R(g,'#8f95a3',x,y+6,32,21); R(g,'#5eb8ea',x+4,y+7,24,19); R(g,'#8ad4f7',x+6,y+9,8,2); R(g,'#8ad4f7',x+18,y+20,7,2); R(g,'#c9ced9',x+12,y+8,8,14); R(g,'#e5e9f2',x+10,y+6,12,4); R(g,'#b9bfcc',x+14,y+2,4,6); break;
      } };

    function render() {
      lights.length = 0; const [c, g] = mk(W*TS, H*TS); const fl = ['#ffffff','#ffd1e3','#fff3a0','#d9c2ff'];
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        const t = grid[ty*W + tx], px = tx*TS, py = ty*TS, h = hash(tx, ty);
        R(g, (tx+ty)%2 ? '#5fae5a' : '#63b35e', px, py, TS, TS);
        if (t === T.GRASS || t === T.TREE || t === T.DECO) { R(g,'#4e9a4d',px + h%13,py + (h>>4)%13,1,2); R(g,'#4e9a4d',px + (h>>8)%13,py + (h>>12)%13,1,2);
          if (t === T.GRASS && h % 7 === 0) { const col = fl[(h>>6)%4]; R(g,'#3d8a3d',px+(h>>3)%11+1,py+(h>>9)%10+3,1,2); R(g,col,px+(h>>3)%11,py+(h>>9)%10+1,3,2); } }
        if (t === T.GRASS && h % 23 === 1) { R(g,'#8a8f9b',px+4,py+9,5,3); R(g,'#aab0be',px+4,py+9,5,1); R(g,'#6a6f7b',px+5,py+12,5,1); }
        if (t === T.ROAD) { R(g,'#6b6f7a',px,py,TS,TS); R(g,'#7b808c',px + h%14,py + (h>>5)%14,2,1);
          if (ty === 13 && tx % 2 === 0 && tx !== 19 && tx !== 20) R(g,'#d9d36a',px+2,py+TS-1,6,1);
          if (tx === 19 && ty % 2 === 0 && ty !== 13 && ty !== 14) R(g,'#d9d36a',px+TS-1,py+2,1,6);
          const nb = (dx, dy) => { const n = at(tx+dx, ty+dy); return n !== 255 && n !== T.ROAD && n !== T.PLAZA && n !== T.DECO; };
          if (nb(0,-1)) { R(g,'#aeb3c0',px,py,TS,2); R(g,'#4e525e',px,py+2,TS,1); } if (nb(0,1)) { R(g,'#aeb3c0',px,py+TS-2,TS,2); R(g,'#4e525e',px,py+TS-3,TS,1); }
          if (nb(-1,0)) { R(g,'#aeb3c0',px,py,2,TS); R(g,'#4e525e',px+2,py,1,TS); } if (nb(1,0)) { R(g,'#aeb3c0',px+TS-2,py,2,TS); R(g,'#4e525e',px+TS-3,py,1,TS); } }
        if (t === T.PLAZA || t === T.DECO) { R(g,(tx+ty)%2 ? '#d8c9a8' : '#cdbd9a',px,py,TS,TS); R(g,'#bfae88',px+h%12,py+(h>>5)%12,2,1); if (t === T.DECO && !(tx>=19&&tx<=20&&ty>=13&&ty<=14)) {} }
        if (t === T.PATH) { R(g,'#cdbf9c',px,py,TS,TS); R(g,'#b8a780',px+1,py+1,6,5); R(g,'#b8a780',px+9,py+2,6,5); R(g,'#b8a780',px+3,py+9,6,5); R(g,'#b8a780',px+11,py+10,4,4); }
        if (t === T.WATER) { R(g,'#4aa3d8',px,py,TS,TS); R(g,'#6fc0ee',px+2+h%8,py+3+(h>>4)%8,5,1); R(g,'#3a8cc0',px+(h>>7)%9,py+10,5,1);
          const nb = (dx, dy) => at(tx+dx, ty+dy) !== T.WATER;
          if (nb(0,-1)) R(g,'#e8dca0',px,py,TS,2); if (nb(0,1)) R(g,'#e8dca0',px,py+TS-2,TS,2); if (nb(-1,0)) R(g,'#e8dca0',px,py,2,TS); if (nb(1,0)) R(g,'#e8dca0',px+TS-2,py,2,TS);
          if (tx === 35 && ty === 23) { R(g,'#2f8a3e',px+4,py+5,6,4); R(g,'#e85a7a',px+6,py+6,2,2); } }
        if (t === T.TREE) { R(g,'#0003',px+1,py+13,14,3); R(g,'#6b4a2b',px+7,py+9,3,7); R(g,'#2f7d3a',px+1,py+1,14,10); R(g,'#37893f',px+3,py,10,3); R(g,'#3d9748',px+4,py+2,5,4); R(g,'#2a6e33',px+9,py+7,5,3); if (h % 5 === 0) R(g,'#e85a5a',px+10,py+4,2,2); }
      }
      for (const b of buildings) { R(g,'rgba(0,0,0,.17)',b.x*TS+3,(b.y+b.h)*TS,b.w*TS,5); R(g,'rgba(0,0,0,.10)',b.x*TS+4,(b.y+b.h)*TS+5,b.w*TS-2,3); R(g,'rgba(0,0,0,.12)',(b.x+b.w)*TS,(b.y+1)*TS+3,5,b.h*TS-3); }
      for (const b of buildings) {
        const d = doors.find(d => d.id === b.id);
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
          const px = x*TS, py = y*TS, ry = y - b.y;
          if (ry < 2) { R(g,b.roof,px,py,TS,TS); for (let k = 3; k < 16; k += 4) R(g,'#0002',px,py+k,TS,1); R(g,'#fff2',px+((ry*8+x*4)%16),py+1,5,1); R(g,'#fff2',px+(((ry+1)*8+x*4+8)%16),py+5,4,1);
            if (ry === 0) R(g,'#fff3',px,py,TS,1); if (ry === 1) { R(g,'#0003',px,py+TS-2,TS,2); } }
          else { R(g,b.wall,px,py,TS,TS); const hh = hash(x, y); R(g,'#0001',px+hh%12,py+(hh>>4)%12,3,1); R(g,'#0001',px,py+TS-1,TS,1);
            if (ry === 2 && (x - b.x) % 2 === 1) { lights.push({ x:px+8, y:py+7, r:13 }); R(g,'#fff',px+2,py+2,12,10); R(g,'#7fb8e6',px+3,py+3,10,8); R(g,'#fff',px+7,py+3,1,8); R(g,'#fff',px+3,py+6,10,1); R(g,'#fff7',px+4,py+4,2,2); R(g,'#8a5a44',px+2,py+12,12,3); R(g,b.pot,px+3,py+11,2,2); R(g,'#fff',px+7,py+11,2,2); R(g,b.pot,px+11,py+11,2,2); } }
          if (grid[y*W + x] === T.DOOR) { R(g,'#5b3a1e',px+2,py+1,12,15); R(g,'#7a4a26',px+3,py+2,10,14); R(g,'#8f5a30',px+4,py+3,3,5); R(g,'#8f5a30',px+9,py+3,3,5); R(g,'#e8c25a',px+10,py+10,2,2); }
        }
        if (b.id === 'house_f' || b.id === 'house_m' || b.id === 'mechanic' || b.id === 'cafe') { const cx = (b.x + 1)*TS + 8, cy = b.y*TS - 5; R(g,'#7a4a3a',cx,cy,5,10); R(g,'#5b362b',cx-1,cy,7,2); }
        if (b.id === 'school') { const cx = (b.x + b.w/2)*TS; R(g,'#f2e08a',cx-4,b.y*TS+4,9,9); R(g,b.roof,cx-1,b.y*TS+3,8,8); for (const [sx, sy] of [[10,6],[30,10],[52,5],[76,12],[96,7]]) { R(g,'#f2e08a',b.x*TS+sx,b.y*TS+sy,2,2); R(g,'#fff8',b.x*TS+sx+1,b.y*TS+sy-1,1,1); } }
        for (let k = -1; k <= 1; k++) { const px = (d.dx + k)*TS, py = d.dy*TS; for (let i = 0; i < 16; i += 4) { R(g,((i/4)%2 ? '#ffffff' : b.roof),px+i,py,4,5); } R(g,'#0003',px,py+5,TS,1); }
        g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillStyle = '#0007'; g.fillText(NAMES[b.id], (b.x + b.w/2)*TS + 0.5, (b.y + 1)*TS + 4.5); g.fillStyle = '#fff'; g.fillText(NAMES[b.id], (b.x + b.w/2)*TS, (b.y + 1)*TS + 4);
      }
      for (const d of deco) drawDeco(g, d);
      return c;
    }
    const citizens = [
      { pts:[[40,250],[600,250]], body:'#e8833a', hair:'#3a2c1f' }, { pts:[[100,202],[700,202]], body:'#4fa36a', hair:'#7a4a26' },
      { pts:[[392,128],[392,410]], body:'#b77ae8', hair:'#222' }, { pts:[[565,330],[610,330]], body:'#d95a5a', hair:'#c9a14a' },
    ].map((c, i) => ({ ...c, x:c.pts[0][0], y:c.pts[0][1], i:1, dir:'right', anim:i*2, moving:true, role:'x', spd:16 + i*3 }));
    const blocked = mkBlocked(W, H, (tx, ty) => { const t = grid[ty*W + tx]; return t === T.WALL || t === T.TREE || t === T.WATER || t === T.DECO; });
    const animate = (ctx, t) => { const cx = 320, cy = 222; for (let i = 0; i < 6; i++) { const p = (t/1200 + i/6) % 1, a = i * 1.047, rr = 11*p;
      ctx.fillStyle = '#e8f8ff'; ctx.fillRect(Math.round(cx + Math.cos(a)*rr), Math.round(cy - 8 - Math.sin(p*Math.PI)*9 + p*5), 2, 2); }
      ctx.fillStyle = '#ffffff55'; const rp = (t/900) % 1; ctx.fillRect(Math.round(cx - 6 - rp*6), cy + 3, Math.round(12 + rp*12), 1);
      for (let i = 0; i < 5; i++) { const al = 0.35 + 0.35*Math.sin(t/260 + i*1.9); ctx.fillStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')'; ctx.fillRect(546 + ((i*11 + Math.floor(t/700)*3) % 44), 372 + ((i*7) % 24), 2, 1); } };
    const step = dt => { for (const c of citizens) { const [tx, ty] = c.pts[c.i], dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { c.i = 1 - c.i; continue; } c.x += dx/d*c.spd*dt; c.y += dy/d*c.spd*dt; c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); c.anim += dt*6; } };
    return { id:'kota', name:'Kota', W, H, doors, lights, blocked, citizens, animate, step, img:null, render, acts:[], npcs:[],
      spawn: role => { const b = buildings.find(b => b.id === role); return { x:(b.x + (b.w >> 1))*TS + TS/2, y:(b.y + b.h + 1)*TS }; } };
  })();

  // ---------------- INTERIOR ----------------
  const IW = 14, IH = 10;
  const PAL = { F:['#e87aa6','#f2c14e','#ffffff','#b77ae8','#e85a5a'], W:['#f3d9e3','#7fb8e6','#f2c14e','#a0d9a0'], P:['#c9574f','#4a79c9','#9aa0ad','#f2c14e','#333333'], C:['#ffffff','#e8c9a0','#a0693d','#d95a5a'], B:['#c9574f','#4a79c9','#4fa36a','#f2c14e','#7a4a9c'] };
  const shelf = (g, X, Y, w, h, pal) => { R(g,'#5b3a1e',X,Y,w,h); R(g,'#8b5e34',X+1,Y+1,w-2,h-2);
    for (let k = 0; k < h/16; k++) { const by = Y + 14 + k*16; R(g,'#5a3a1c',X+1,by,w-2,2);
      for (let xx = X + 3; xx < X + w - 5; xx += 6) { const hh = 4 + hash(xx, by) % 6; R(g,pal[hash(xx, by+1) % pal.length],xx,by - hh,4,hh); R(g,'#fff4',xx,by-hh,1,hh); } } };
  const counter = (g, X, Y, w, h, top, body) => { R(g,'#0003',X,Y+h,w,2); R(g,body,X,Y+5,w,h-5); R(g,top,X,Y,w,7); R(g,'#fff4',X,Y,w,1); R(g,'#0003',X,Y+7,w,1); };
  const table = (g, X, Y, w, h) => { R(g,'#0003',X+2,Y+h-1,w-4,3); R(g,'#a0693d',X+3,Y+4,w-6,h-8); R(g,'#c88f5a',X+3,Y+4,w-6,2); R(g,'#fff',X+w/2-3,Y+h/2-3,6,3); R(g,'#e8c25a',X+w/2-1,Y+h/2-5,2,2);
    R(g,'#5b3a1e',X,Y+h/2,3,6); R(g,'#5b3a1e',X+w-3,Y+h/2,3,6); };
  const drawItem = (g, t, x, y, w, h) => { const X = x*TS, Y = y*TS, Wd = w*TS, Ht = h*TS;
    switch (t) {
      case 'shelfF': shelf(g,X,Y,Wd,Ht,PAL.F); break; case 'shelfW': shelf(g,X,Y,Wd,Ht,PAL.W); break; case 'shelfP': shelf(g,X,Y,Wd,Ht,PAL.P); break;
      case 'shelfC': shelf(g,X,Y,Wd,Ht,PAL.C); break; case 'shelfB': shelf(g,X,Y,Wd,Ht,PAL.B); break;
      case 'counter': counter(g,X,Y,Wd,Ht,'#c88f5a','#8b5e34'); R(g,'#333',X+Wd-14,Y-5,9,6); R(g,'#7fe0a0',X+Wd-12,Y-4,5,2); break;
      case 'counterC': counter(g,X,Y,Wd,Ht,'#e8c9a0','#a0693d'); R(g,'#fff',X+Wd-10,Y-3,5,3); R(g,'#fff',X+Wd-18,Y-3,5,3); break;
      case 'coffee': R(g,'#333',X+2,Y+2,12,12); R(g,'#c9574f',X+3,Y+3,10,3); R(g,'#7fe0a0',X+10,Y+8,2,2); R(g,'#fff',X+5,Y+10,4,4); break;
      case 'benchF': counter(g,X,Y,Wd,Ht,'#9a6b3e','#6b4423'); for (let i = 0; i < 4; i++) { R(g,'#2f7d3a',X+6+i*12,Y-5,2,6); R(g,PAL.F[i],X+4+i*12,Y-9,5,5); } R(g,'#e87aa6',X+Wd-14,Y-3,8,3); break;
      case 'benchM': counter(g,X,Y,Wd,Ht,'#8a8f9b','#5a5f6b'); R(g,'#c9574f',X+4,Y-4,8,5); R(g,'#9aa0ad',X+18,Y-3,12,2); R(g,'#f2c14e',X+Wd-14,Y-4,4,5); break;
      case 'bucket': R(g,'#0003',X+2,Y+14,12,2); R(g,'#9aa0ad',X+3,Y+8,10,7); R(g,'#c9ced9',X+3,Y+8,10,1); R(g,'#2f7d3a',X+5,Y+3,6,6); for (let i = 0; i < 3; i++) R(g,PAL.F[(i*2)%5],X+3+i*4,Y+1+(i%2)*2,4,4); break;
      case 'plant': R(g,'#0003',X+3,Y+14,10,2); R(g,'#b5653a',X+4,Y+9,8,7); R(g,'#2f7d3a',X+2,Y+2,12,8); R(g,'#3d9748',X+4,Y,8,5); R(g,'#2a6e33',X+9,Y+5,4,4); break;
      case 'rug': R(g,'#a0453f',X,Y,Wd,Ht); R(g,'#e8c25a',X+2,Y+2,Wd-4,Ht-4); R(g,'#c9574f',X+4,Y+4,Wd-8,Ht-8); for (let i = 0; i < Wd; i += 6) R(g,'#e8c25a',X+i,Y+Ht/2,2,2); break;
      case 'bikeLift': R(g,'#0003',X+2,Y+Ht-2,Wd-4,3); R(g,'#5a5f6b',X+2,Y+Ht-6,Wd-4,6); R(g,'#222',X+6,Y+8,12,12); R(g,'#222',X+Wd-18,Y+8,12,12); R(g,'#aaa',X+10,Y+12,4,4); R(g,'#aaa',X+Wd-14,Y+12,4,4); R(g,'#c9574f',X+14,Y+6,Wd-30,6); R(g,'#333',X+12,Y+2,12,4); R(g,'#9aa0ad',X+Wd-14,Y+1,3,10); break;
      case 'tires': for (let i = 0; i < 3; i++) { R(g,'#222',X+2,Y+Ht-12-i*8,Wd-4,9); R(g,'#444',X+6,Y+Ht-10-i*8,Wd-12,5); } break;
      case 'toolbox': R(g,'#0003',X+1,Y+14,14,2); R(g,'#c9574f',X+1,Y+6,14,9); R(g,'#9a3a34',X+1,Y+6,14,2); R(g,'#9aa0ad',X+6,Y+3,4,4); break;
      case 'drum': R(g,'#0003',X+2,Y+14,12,2); R(g,'#4a79c9',X+3,Y+2,10,13); R(g,'#2f5aa0',X+3,Y+6,10,1); R(g,'#2f5aa0',X+3,Y+10,10,1); break;
      case 'tableC': table(g,X,Y,Wd,Ht); R(g,'#8b5e34',X-3,Y+4,3,8); R(g,'#8b5e34',X+Wd,Y+4,3,8); break;
      case 'desk': counter(g,X,Y,Wd,Ht,'#8b6a4a','#5a4430'); R(g,'#fff',X+6,Y-3,8,4); R(g,'#333',X+Wd-14,Y-4,8,5); break;
      case 'flag': R(g,'#9aa0ad',X+7,Y,2,Ht); R(g,'#e85a5a',X+9,Y+1,13,5); R(g,'#fff',X+9,Y+6,13,5); break;
      case 'board': R(g,'#5b3a1e',X,Y,Wd,Ht); R(g,'#c9a14a',X+2,Y+2,Wd-4,Ht-4); for (let i = 0; i < 4; i++) { R(g,'#fff',X+6+i*11,Y+6,8,10); R(g,['#e85a5a','#4a79c9','#4fa36a','#f2c14e'][i],X+9+i*11,Y+4,2,2); } break;
      case 'benchW': R(g,'#0003',X,Y+14,Wd,2); R(g,'#8b5e34',X,Y+6,Wd,5); R(g,'#a47244',X,Y+6,Wd,2); R(g,'#5b3a1e',X+2,Y+11,2,4); R(g,'#5b3a1e',X+Wd-4,Y+11,2,4); break;
      case 'bedF': R(g,'#0003',X,Y+Ht,Wd,2); R(g,'#7a4a26',X,Y,Wd,Ht); R(g,'#ffffff',X+2,Y+2,Wd-4,10); R(g,'#e87aa6',X+2,Y+12,Wd-4,Ht-14); R(g,'#fff',X+3,Y+3,12,6); break;
      case 'bedM': R(g,'#0003',X,Y+Ht,Wd,2); R(g,'#4a3a2a',X,Y,Wd,Ht); R(g,'#ffffff',X+2,Y+2,Wd-4,10); R(g,'#4a79c9',X+2,Y+12,Wd-4,Ht-14); R(g,'#2f5aa0',X+2,Y+12,Wd-4,3); R(g,'#fff',X+3,Y+3,12,6); break;
      case 'wardrobe': R(g,'#0003',X,Y+Ht,Wd,2); R(g,'#6b4423',X,Y,Wd,Ht); R(g,'#8b5e34',X+2,Y+2,Wd/2-3,Ht-4); R(g,'#8b5e34',X+Wd/2+1,Y+2,Wd/2-3,Ht-4); R(g,'#e8c25a',X+Wd/2-3,Y+Ht/2,2,3); R(g,'#e8c25a',X+Wd/2+1,Y+Ht/2,2,3); break;
      case 'wallwin': g.fillStyle = 'rgba(255,255,210,.12)'; g.beginPath(); g.moveTo(X+6, Y+Ht-2); g.lineTo(X+Wd-6, Y+Ht-2); g.lineTo(X+Wd+12, Y+Ht+40); g.lineTo(X-6, Y+Ht+40); g.fill(); R(g,'#fff',X+4,Y+3,Wd-8,Ht-8); R(g,'#8fd0f5',X+6,Y+5,Wd-12,Ht-12); R(g,'#fff',X+Wd/2-1,Y+5,2,Ht-12); R(g,'#fff7',X+8,Y+7,6,3); R(g,'#c9574f',X+2,Y+3,3,Ht-8); R(g,'#c9574f',X+Wd-5,Y+3,3,Ht-8); break;
      case 'kitchen': counter(g,X,Y,Wd,Ht,'#dfe3ea','#9aa0ad'); R(g,'#333',X+6,Y+3,10,4); R(g,'#c9ced9',X+Wd-18,Y+2,8,5); R(g,'#e87aa6',X+Wd/2,Y-4,4,5); break;
      case 'tableH': table(g,X,Y,Wd,Ht); R(g,'#8b5e34',X-3,Y+4,3,8); R(g,'#8b5e34',X+Wd,Y+4,3,8); break;
      case 'sofa': R(g,'#0003',X,Y+Ht,Wd,2); R(g,'#4a79c9',X,Y+2,Wd,Ht-2); R(g,'#2f5aa0',X,Y+2,Wd,5); R(g,'#6b95dd',X+3,Y+8,Wd-6,Ht-9); R(g,'#2f5aa0',X,Y+4,3,Ht-4); R(g,'#2f5aa0',X+Wd-3,Y+4,3,Ht-4); break;
      case 'stallV': R(g,'#0003',X,Y+Ht,Wd,2); R(g,'#a0693d',X,Y+10,Wd,Ht-10); for (let i = 0; i < Wd; i += 8) { R(g,i % 16 ? '#fff' : '#4fa36a',X+i,Y,8,8); } R(g,'#0003',X,Y+8,Wd,1); for (let xx = X+3; xx < X+Wd-6; xx += 7) { R(g,['#4fa36a','#e8833a','#d95a5a','#9bd45a'][hash(xx,Y)%4],xx,Y+11,5,5); } break;
      case 'stallF': R(g,'#0003',X,Y+Ht,Wd,2); R(g,'#a0693d',X,Y+10,Wd,Ht-10); for (let i = 0; i < Wd; i += 8) { R(g,i % 16 ? '#fff' : '#e8833a',X+i,Y,8,8); } R(g,'#0003',X,Y+8,Wd,1); for (let xx = X+3; xx < X+Wd-6; xx += 7) { R(g,['#d95a5a','#f2c14e','#9bd45a','#b77ae8'][hash(xx,Y+3)%4],xx,Y+11,5,5); } break;
      case 'crates': for (let i = 0; i < w; i++) { R(g,'#0003',X+i*16,Y+14,16,2); R(g,'#a0693d',X+i*16+1,Y+3,14,12); R(g,'#7d5430',X+i*16+1,Y+8,14,1); R(g,'#c88f5a',X+i*16+1,Y+3,14,2); } break;
      case 'sacks': for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { const sx = X+i*16, sy = Y+j*16; R(g,'#0003',sx+1,sy+14,14,2); R(g,'#e8d9b0',sx+2,sy+3,12,12); R(g,'#c9b98a',sx+2,sy+3,12,2); R(g,'#a89868',sx+5,sy+8,6,1); } break;
      case 'pegboard': R(g,'#8a8f9b',X,Y,Wd,Ht); for (let xx = X+3; xx < X+Wd-4; xx += 8) { R(g,'#c9574f',xx,Y+4,3,9); R(g,'#9aa0ad',xx+3,Y+6,2,10); R(g,'#f2c14e',xx,Y+18,4,3); } break;
      case 'chalk': R(g,'#5b3a1e',X,Y,Wd,Ht); R(g,'#2f5a4a',X+2,Y+2,Wd-4,Ht-4); for (let i = 0; i < 5; i++) R(g,'#e8f2ee',X+6+i*11,Y+6+(i%2)*6,7,1); R(g,'#f2c14e',X+Wd-12,Y+5,3,3); R(g,'#fff8',X+10,Y+Ht-9,12,1); break;
      case 'crystal': R(g,'#0003',X+3,Y+14,10,2); R(g,'#6a4ab8',X+4,Y+10,8,6); R(g,'#b8a0ff',X+2,Y+1,12,11); R(g,'#8fd0f5',X+3,Y+2,10,9); R(g,'#fff',X+5,Y+3,3,3); break;
      case 'cauldron': R(g,'#e8833a',X+8,Y+Ht-3,Wd-16,3); R(g,'#0003',X+2,Y+Ht-1,Wd-4,3); R(g,'#2a2a3a',X+3,Y+10,Wd-6,Ht-13); R(g,'#4a4a5e',X+1,Y+8,Wd-2,4); R(g,'#7be07b',X+4,Y+9,Wd-8,3); R(g,'#c9ffc9',X+8,Y+6,3,3); R(g,'#c9ffc9',X+Wd-14,Y+3,2,2); break;
      case 'deskS': counter(g,X,Y,Wd,Ht,'#a47244','#6b4423'); R(g,'#c9574f',X+4,Y-4,6,5); R(g,'#4a79c9',X+11,Y-3,6,4); R(g,'#fff',X+Wd-12,Y-3,7,3); break;
      case 'wand': R(g,'#5b3a1e',X,Y,Wd,Ht); R(g,'#3a2412',X+2,Y+2,Wd-4,Ht-4); for (let i = 0; i < 3; i++) { R(g,'#c9a14a',X+3+i*4,Y+8,2,Ht-12); R(g,'#f2c14e',X+2+i*4,Y+6,4,3); } break;
      case 'mat': R(g,'#a0693d',X,Y,Wd,Ht); R(g,'#7a4a26',X+1,Y+1,Wd-2,Ht-2); break;
      default: R(g,'#888',X,Y,Wd,Ht);
    } };

  // Data interior: [tipe, x, y, w, h, padat?, nama, teks]
  const NPC = {
    florist: { x:6, y:3, name:'Bu Mawar', body:'#9a5ab8', hair:'#c9c9d6',
      own:['Selamat datang di tokomu sendiri! Aku Bu Mawar, pemasok bunga langgananmu.','Nanti di sini kamu akan merangkai bouquet sesuai pesanan pelanggan, mengatur stok, lalu menjual dengan harga yang kamu tentukan.','Untuk sekarang, kenali dulu kotamu: ngobrollah dengan Pak Udin di Pasar, Mbak Erma di Kafe, dan Pak Lurah di Balai Kota.','Semangat membuka usaha baru!'],
      other:['Ini toko bunga milik pasanganmu, ya? Tokonya cantik sekali.','Kalau dia butuh bantuan modal atau stok, kamu bisa membantunya nanti lewat fitur pinjaman.','Mampirlah sesekali, ya!'] },
    mechanic: { x:3, y:3, name:'Pak Bimo', body:'#3d8a8a', hair:'#222',
      own:['Wah, bengkel baru! Aku Bimo, pemasok suku cadang. Barangku bagus-bagus, tenang saja.','Nanti pelanggan datang dengan keluhan motor mereka. Tugasmu mendiagnosis, memilih suku cadang yang tepat, lalu memperbaikinya.','Untuk sekarang, kenali dulu orang-orang di kota ini. Mulai dari Pasar, Kafe, lalu Balai Kota.'],
      other:['Kamu temannya pemilik bengkel ini? Dia orang yang teliti.','Motor pengantar bunga pasti sering butuh servis. Kalian bisa saling bantu.'] },
    cafe: { x:8, y:3, name:'Mbak Erma', body:'#e8833a', hair:'#7a3b2a',
      lines:['Selamat datang di Kafe Kota! Aku Erma.','Kafe ini tempat warga berkumpul. Banyak pelanggan tetap datang dari sini.','Kudengar pemilik toko bunga dan pemilik bengkel akan sering bertemu. Mungkin kalian bisa saling melengkapi?','Oh ya, Pak Lurah di Balai Kota sedang mencari warga baru. Temui beliau, ya.'] },
    hall: { x:7, y:2, name:'Pak Lurah', body:'#7a7f8f', hair:'#aaa',
      lines:['Selamat datang, warga baru! Saya Pak Lurah.','Kota ini kecil, tapi hangat. Usaha kalian berdua akan sangat berarti bagi warga.','Kota akan terus berkembang: area baru terbuka seiring usaha dan cerita kalian.','Lihat Papan Pengumuman di dinding untuk kabar terbaru. Selamat bertugas!'] },
    school: { x:7, y:3, name:'Bu Arunika', body:'#6a4ab8', hair:'#e8e8f5' },
    school2: { x:10, y:3, name:'Kak Rimba', body:'#2f9ab8', hair:'#1d1d3a' },
    market: { x:7, y:3, name:'Pak Udin', body:'#4fa36a', hair:'#5b3a1e',
      lines:['Halo! Aku Udin, pedagang di pasar ini sudah lama.','Di sini bahan-bahan dari pemasok masuk ke kota: bunga segar, suku cadang, dan banyak lagi.','Kalau mau tahu kabar kota, tanyakan ke Mbak Erma di Kafe. Dia tahu semuanya!'] },
  };
  const SPEC = {
    florist: { floor:['#e8cfa0','#dfc493'], wall:'#f6dfe8', trim:'#e87aa6', items:[
      ['shelfF',1,1,3,2,1,'Rak Bunga','Aneka bunga segar tertata rapi: mawar, tulip, dan baby breath. Nanti stok bunga menentukan pesanan yang bisa kamu penuhi.'],
      ['shelfW',10,1,3,2,1,'Rak Pita & Pembungkus','Pita, kertas pembungkus, dan hiasan kecil untuk mempercantik bouquet.'],
      ['wallwin',5,0,3,2,0,'',''], ['rug',5,6,4,2,0,'',''],
      ['benchF',3,4,3,1,1,'Meja Rangkai','Di meja inilah bouquet dirangkai: pilih bunga, warna, pita, dan pembungkus sesuai pesanan. (Sistem pesanan masih dibangun.)'],
      ['counter',9,4,3,1,1,'Meja Kasir','Tempat pelanggan membayar. Nanti pemasukan toko tercatat di sini.'],
      ['bucket',1,5,1,1,1,'Ember Bunga','Bunga-bunga cantik menunggu dirangkai.'], ['bucket',1,6,1,1,1,'Ember Bunga','Wanginya segar sekali.'], ['bucket',12,6,1,1,1,'Ember Bunga','Mawar merah dan kuning.'],
      ['plant',12,2,1,1,1,'Tanaman Hias','Tanaman ini tampak subur dan sehat.'], ['plant',1,8,1,1,1,'Tanaman Hias','Disiram rutin oleh pemilik toko.'] ] },
    mechanic: { floor:['#9ca0aa','#939aa5'], wall:'#c9d3e6', trim:'#4a79c9', items:[
      ['shelfP',1,1,4,2,1,'Rak Suku Cadang','Busi, kampas rem, rantai, dan filter. Stok suku cadang menentukan perbaikan yang bisa kamu kerjakan.'],
      ['pegboard',7,0,3,2,0,'',''],
      ['benchM',10,1,3,2,1,'Meja Kerja','Tempat memeriksa dan merakit komponen. (Sistem diagnosis masih dibangun.)'],
      ['bikeLift',5,4,3,2,1,'Motor di Lift','Motor pelanggan sedang diangkat untuk diperiksa. Nanti kamu mendiagnosis kerusakannya di sini.'],
      ['tires',1,5,2,2,1,'Tumpukan Ban','Ban cadangan berbagai ukuran.'], ['toolbox',11,5,1,1,1,'Kotak Perkakas','Kunci pas, obeng, dan tang tersusun rapi.'], ['drum',12,3,1,1,1,'Drum Oli','Berisi oli mesin untuk servis rutin.'] ] },
    cafe: { floor:['#c79a6b','#bd8f60'], wall:'#ead8c0', trim:'#a0693d', items:[
      ['shelfC',9,1,3,2,1,'Rak Cangkir','Cangkir dan toples biji kopi tertata rapi.'], ['wallwin',3,0,3,2,0,'',''],
      ['counterC',2,3,6,1,1,'Meja Barista','Meja tempat kopi diracik. Aromanya menggoda!'], ['coffee',3,2,1,1,1,'Mesin Kopi','Mesin kopi besar yang masih mengepul.'],
      ['tableC',3,6,2,2,1,'Meja Kafe','Meja kecil yang nyaman untuk berbincang.'], ['tableC',8,5,2,2,1,'Meja Kafe','Seseorang meninggalkan buku di meja ini.'], ['tableC',10,7,2,2,1,'Meja Kafe','Tempat favorit untuk menikmati sore.'],
      ['plant',12,2,1,1,1,'Tanaman Hias','Daunnya hijau segar.'], ['plant',1,8,1,1,1,'Tanaman Hias','Menambah suasana asri.'] ] },
    hall: { floor:['#cfcfd6','#c4c4cd'], wall:'#dcdde3', trim:'#7a7f8f', items:[
      ['rug',6,4,2,5,0,'',''], ['flag',1,1,1,2,1,'Bendera Kota','Bendera kota berkibar bangga di dalam balai.'],
      ['shelfB',3,1,2,2,1,'Lemari Arsip','Arsip kota dari masa ke masa.'],
      ['board',9,0,3,2,1,'Papan Pengumuman','Pengumuman: "Warga baru, selamat datang! Festival kota akan hadir saat usaha dan cerita kalian berkembang."'],
      ['desk',5,3,4,1,1,'Meja Pelayanan','Meja tempat urusan warga dilayani.'],
      ['benchW',2,6,3,1,1,'Kursi Tunggu','Kursi untuk warga yang menunggu antrean.'], ['benchW',9,6,3,1,1,'Kursi Tunggu','Kursi untuk warga yang menunggu antrean.'],
      ['plant',12,3,1,1,1,'Tanaman Hias','Tanaman besar di sudut ruangan.'], ['plant',1,4,1,1,1,'Tanaman Hias','Terawat dengan baik.'] ] },
    house_f: { floor:['#ecd2b8','#e4c8ac'], wall:'#fbeaf1', trim:'#e87aa6', items:[
      ['wardrobe',1,1,2,2,1,'Lemari Pakaian','Lemari berisi celemek, gaun, dan pita rambut.'], ['wallwin',4,0,2,2,0,'',''],
      ['kitchen',8,1,4,2,1,'Dapur','Dapur mungil dengan kompor dan wastafel. Ada vas bunga di jendela.'],
      ['rug',4,4,3,2,0,'',''], ['sofa',4,6,3,1,1,'Sofa','Sofa empuk untuk beristirahat setelah seharian merangkai bunga.'],
      ['bedF',1,5,2,3,1,'Tempat Tidur','Tempat tidurmu. Hari baru dimulai saat kamu dan pasanganmu tidur bersamaan.'],
      ['tableH',9,5,3,2,1,'Meja Makan','Meja makan untuk dua orang. Suatu hari mungkin bertambah kursi...'],
      ['bucket',12,4,1,1,1,'Vas Bunga','Bunga segar dari tokomu, menyegarkan rumah.'], ['plant',12,8,1,1,1,'Tanaman Hias','Menyegarkan sudut rumah.'] ] },
    house_m: { floor:['#cdbf9f','#c3b494'], wall:'#e1e6f0', trim:'#4a79c9', items:[
      ['wardrobe',1,1,2,2,1,'Lemari Pakaian','Lemari berisi overall bengkel dan jaket kulit.'], ['wallwin',4,0,2,2,0,'',''],
      ['kitchen',8,1,4,2,1,'Dapur','Dapur mungil. Ada kaleng kopi dan beberapa cangkir bernoda oli.'],
      ['rug',4,4,3,2,0,'',''], ['sofa',4,6,3,1,1,'Sofa','Sofa tempat tidur siang setelah servis seharian.'],
      ['bedM',1,5,2,3,1,'Tempat Tidur','Tempat tidurmu. Hari baru dimulai saat kamu dan pasanganmu tidur bersamaan.'],
      ['tableH',9,5,3,2,1,'Meja Makan','Meja makan untuk dua orang. Suatu hari mungkin bertambah kursi...'],
      ['toolbox',12,4,1,1,1,'Kotak Perkakas','Perkakas cadangan untuk perbaikan kecil di rumah.'], ['drum',12,8,1,1,1,'Drum Oli Bekas','Drum bekas yang dijadikan pot tanaman.'] ] },
    school: { floor:['#8f86c9','#867cc0'], wall:'#e4dcf5', trim:'#6a4ab8', items:[
      ['shelfB',1,1,3,2,1,'Rak Buku Mantra','Buku-buku tua berisi mantra dasar: Mekar, Lancar, Terang. Tulisannya bergerak pelan.'],
      ['chalk',5,0,4,2,1,'Papan Tulis Ajaib','Tulisan kapur muncul sendiri: "Pelajaran hari ini: sihir kecil untuk kehidupan sehari-hari."'],
      ['shelfF',11,1,2,2,1,'Lemari Ramuan','Botol-botol ramuan warna-warni berderet. Labelnya ditulis tangan.'],
      ['rug',5,6,3,2,0,'',''],
      ['cauldron',3,5,2,2,1,'Kuali Ramuan','Kuali besar mendidih tenang. Uapnya wangi bunga dan oli sekaligus. Sepertinya ramuan ini enak dibuat berdua.'],
      ['crystal',12,4,1,1,1,'Bola Kristal','Bola kristal berpendar lembut. Di dalamnya samar terlihat dua bayangan berjalan berdampingan...'],
      ['deskS',6,4,2,1,1,'Meja Belajar','Meja dengan buku catatan terbuka dan pena bulu.'],
      ['deskS',9,6,2,1,1,'Meja Belajar','Seseorang meninggalkan catatan: "Jangan menyerah pada sihir kecil."'],
      ['wand',1,5,1,2,1,'Rak Tongkat Sihir','Tongkat-tongkat latihan dengan bintang kecil di ujungnya.'],
      ['plant',12,8,1,1,1,'Tanaman Hias','Daunnya bersinar redup dalam gelap.'] ] },
    market: { floor:['#c9b38a','#bfa77c'], wall:'#d8ead9', trim:'#4fa36a', items:[
      ['wallwin',5,0,3,2,0,'',''],
      ['stallV',1,2,4,2,1,'Lapak Sayur','Sayuran segar dari petani sekitar kota.'], ['stallF',9,2,4,2,1,'Lapak Buah','Buah manis yang baru dipetik pagi tadi.'],
      ['crates',2,6,2,1,1,'Peti Kayu','Peti-peti berisi barang dagangan.'], ['sacks',10,6,2,2,1,'Karung Beras','Karung beras dan tepung bertumpuk.'] ] },
  };
  const cache = {};
  function interior(id) {
    if (cache[id]) return cache[id];
    const S = SPEC[id], [c, g] = mk(IW*TS, IH*TS), ig = new Uint8Array(IW*IH), acts = [];
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (y < 2 || x === 0 || x === IW-1 || (y === IH-1 && x !== 6 && x !== 7)) ig[y*IW + x] = 1;
    for (let y = 2; y < IH; y++) for (let x = 0; x < IW; x++) R(g, (x+y)%2 ? S.floor[0] : S.floor[1], x*TS, y*TS, TS, TS);
    R(g,S.wall,0,0,IW*TS,2*TS); R(g,'#0001',0,0,IW*TS,3); R(g,S.trim,0,TS+2,IW*TS,TS-6); R(g,'#0002',0,2*TS-4,IW*TS,4); R(g,'#fff3',0,TS+2,IW*TS,1);
    for (let x = 0; x < IW*TS; x += 16) R(g,'#0001',x,6,1,TS-8);
    for (const [pxx, col] of [[1.2, '#e87aa6'], [9.6, '#7fb8e6'], [12.0, '#f2c14e']]) { const X0 = Math.round(pxx*TS); R(g,'#5b3a1e',X0,2,13,11); R(g,'#fdf6e3',X0+1,3,11,9); R(g,col,X0+3,5,7,5); R(g,'#fff8',X0+3,5,2,1); }
    R(g,'#5b3a1e',6*TS+4,1,11,11); R(g,'#fdf6e3',6*TS+5,2,9,9); R(g,'#222',6*TS+9,4,1,4); R(g,'#222',6*TS+9,7,3,1);
    for (const lx of [3*TS+8, 7*TS+8, 11*TS+8]) { R(g,'#3a3a4a',lx,0,1,6); R(g,'#f2c14e',lx-3,6,7,4); R(g,'rgba(255,230,150,.22)',lx-9,10,19,6); R(g,'rgba(255,230,150,.10)',lx-15,16,31,12); }
    R(g,'rgba(255,235,170,.07)',2*TS,3*TS,10*TS,6*TS); R(g,'rgba(255,235,170,.06)',4*TS,4*TS,6*TS,4*TS);
    for (let y = 2; y < IH; y++) { R(g,S.wall,0,y*TS,TS,TS); R(g,S.wall,(IW-1)*TS,y*TS,TS,TS); R(g,S.trim,TS-3,y*TS,3,TS); R(g,S.trim,(IW-1)*TS,y*TS,3,TS); }
    for (let x = 0; x < IW; x++) if (x !== 6 && x !== 7) { R(g,S.wall,x*TS,(IH-1)*TS,TS,TS); R(g,S.trim,x*TS,(IH-1)*TS,TS,5); R(g,'#0002',x*TS,(IH-1)*TS+5,TS,2); }
    R(g,'#0002',TS,(IH-1)*TS - 0,0,0);
    // Karpet pintu keluar
    R(g,'#7a4a26',6*TS,(IH-1)*TS,2*TS,TS); R(g,'#a0693d',6*TS+2,(IH-1)*TS+2,2*TS-4,TS-4); R(g,'#e8c25a',6*TS+4,(IH-1)*TS+4,2*TS-8,2);
    g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('KELUAR', 7*TS, (IH-1)*TS + 12);
    const order = S.items.slice().sort((a, b) => (a[0] === 'rug' || a[0] === 'wallwin' || a[0] === 'pegboard' ? -1 : 0) - (b[0] === 'rug' || b[0] === 'wallwin' || b[0] === 'pegboard' ? -1 : 0));
    for (const [t, x, y, w, h, solid, name, text] of order) { drawItem(g, t, x, y, w, h);
      if (solid) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) ig[j*IW + i] = 1;
      if (name) acts.push({ kind:'item', name, rect:{ x:x*TS, y:y*TS, w:w*TS, h:h*TS }, lines:[text] }); }
    const npcs = [];
    for (const nk of [id, id + '2']) { const n = NPC[nk]; if (!n) continue; const o = { id, key:nk, name:n.name, x:n.x*TS + 8, y:(n.y + 1)*TS - 1, body:n.body, hair:n.hair, dir:'down', anim:0, moving:false, role:'x', n }; npcs.push(o); ig[n.y*IW + n.x] = 1; acts.push({ kind:'npc', name:n.name, npc:o }); }
    acts.push({ kind:'exit', name:'Keluar', rect:{ x:6*TS, y:(IH-1)*TS, w:2*TS, h:TS } });
    return cache[id] = { id, name:NAMES[id], W:IW, H:IH, blocked:mkBlocked(IW, IH, (tx, ty) => ig[ty*IW + tx] === 1), img:c, acts, npcs, doors:[], citizens:[],
      spawn:{ x:7*TS, y:(IH-1)*TS - 10 }, exitY:(IH-1)*TS + 4 };
  }
  city.img = null;
  return { TS, city, interior, rectDist, buildingName: id => NAMES[id], npcName: id => NPC[id].name };
})();
// @@SCENES_END

// ======================= MODUL: ANTARMUKA CERITA (jurnal, pesan, kartu chapter, keputusan) =======================
const Guide = (() => {
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const OVERLAYS = ['tut', 'journal', 'decision', 'econ', 'gmenu'];
  const tutOpen = () => OVERLAYS.some(id => !$(id).classList.contains('hidden'));
  let tab = 'misi', started = false, picked = null, cardT = 0, unread = false;

  function toast(t) { const c = $('toasts'), d = document.createElement('div'); d.className = 'toast'; d.textContent = t; c.appendChild(d);
    while (c.children.length > 3) c.firstChild.remove(); setTimeout(() => d.classList.add('out'), 3800); setTimeout(() => d.remove(), 4300); }
  function card(n) { const ch = Story.chapters[n]; if (!ch) return; const el = $('chcard');
    el.querySelector('.n').textContent = 'CHAPTER ' + n; el.querySelector('.t').textContent = ch.title; el.querySelector('.s').textContent = ch.sub;
    el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(cardT); cardT = setTimeout(() => el.classList.add('hidden'), 4300); }

  function dayCard(n) { const i = Story.dayInfo(n); if (!i) return; const el = $('chcard'); el.querySelector('.n').textContent = 'HARI ' + n; el.querySelector('.t').textContent = i[0]; el.querySelector('.s').textContent = i[1];
    el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(cardT); cardT = setTimeout(() => el.classList.add('hidden'), 4300); }
  function refreshGoal() { const t = Story.target(), el = $('goal');
    el.innerHTML = t ? `<b>HARI ${Story.view().day} · ${esc(t.quest.title.toUpperCase())}</b>${esc(t.step.text)}` : '<b>TUJUAN</b>' + (Story.view().pending ? 'Tentukan pilihan cerita (MISI → CERITA).' : 'Jelajahi kota bersama pasanganmu.'); }

  function renderJournal() {
    const v = Story.view(); document.querySelectorAll('#j-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab)); let h = '';
    if (tab === 'misi') {
      h += `<div class="jch">CHAPTER ${v.chapter.n} — ${esc(v.chapter.title)}</div><div class="jsub">${esc(v.chapter.sub)}</div><div class="jsub" style="color:var(--gold)">Hari ke-${v.day}: ${esc(v.dayTitle)}</div>`;
      h += `<div class="bar"><i style="width:${Math.round(v.progress.done / v.progress.total * 100)}%"></i></div><p class="mut">Misi wajib chapter ini: ${v.progress.done}/${v.progress.total} selesai. Misi hari berikutnya muncul setelah kamu tidur.</p>`;
      for (const cat of ['utama', 'kerja sama', 'sampingan']) { const qs = v.quests.filter(q => q.cat === cat && q.day <= v.day && (q.status !== 'SELESAI' || q.day === v.day)); if (!qs.length) continue;
        h += `<div class="cat">${cat.toUpperCase()}</div>`;
        for (const q of qs) h += `<div class="q s-${q.status}"><span class="st">${q.status}</span><h3>${esc(q.title)}${q.opt ? ' (opsional)' : ''}</h3><p>${q.status === 'TERKUNCI' ? esc(q.lock) : q.status === 'TERSEDIA' ? 'Cari tahu dari warga kota…' : esc(q.desc)}</p>` +
          (q.status === 'BERLANGSUNG' || q.status === 'SELESAI' ? '<ul>' + q.steps.map(s => `<li class="${s.done ? 'd' : ''}">${s.done ? '✔' : '○'} ${esc(s.text)}</li>`).join('') + '</ul>' : '') + (q.status === 'SELESAI' ? `<p>Hasil: ${esc(q.reward)}</p>` : '') + '</div>'; }
    } else if (tab === 'cerita') {
      h += `<div class="jch">HUBUNGAN</div><p>Tahap: <b>${esc(v.rel)}</b></p><p>Sikap ke Sekolah Sihir bersama pasangan: <b>${esc(v.willLabel)}</b></p><div class="jch">KEPUTUSAN CERITA</div>`;
      h += v.decisions.length ? v.decisions.map(d => `<p>${esc(d.title)}: <b>${esc(d.value)}</b></p>`).join('') : '<p>Belum ada keputusan.</p>';
      if (v.pending) h += `<button id="j-decide">BUAT KEPUTUSAN (HOST)</button>`;
      else if (!v.isHost && !v.decisions.length) h += '<p>Keputusan cerita utama ditentukan oleh host.</p>';
      h += `<p style="color:var(--mut)">${v.mode === 'server' ? 'Progres cerita tersimpan di server.' : 'Progres cerita hanya tersimpan di perangkat ini (jalankan 002_story.sql untuk menyimpan di server).'}</p>`;
    } else h += v.log.length ? v.log.map(l => `<div class="logline">${esc(l.text)}</div>`).join('') : '<p>Belum ada pesan.</p>';
    $('j-body').innerHTML = h; const b = $('j-decide'); if (b) b.onclick = openDecision;
  }
  function openJournal() { unread = false; $('j-badge').classList.add('hidden'); $('m-badge').classList.add('hidden'); renderJournal(); $('journal').classList.remove('hidden'); }
  $('g-journal').onclick = openJournal; $('j-close').onclick = () => $('journal').classList.add('hidden'); $('goal').onclick = openJournal;
  $('g-hamb').onclick = () => $('gmenu').classList.remove('hidden'); $('gm-close').onclick = () => $('gmenu').classList.add('hidden');
  $('gmenu').addEventListener('click', e => { if (e.target === $('gmenu') || e.target.closest('.mgrid button')) $('gmenu').classList.add('hidden'); });
  addEventListener('keydown', e => { if ($('game').classList.contains('hidden') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName || '')) return; const k = e.key.toLowerCase();
    if (k === 'escape') { ['tut', 'journal', 'econ', 'gmenu'].forEach(id => $(id).classList.add('hidden')); }
    else if (k === 'j') openJournal(); else if (k === 'u') Econ.open('saldo'); else if (k === 'm') $('gmenu').classList.toggle('hidden'); });
  document.querySelectorAll('#j-tabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; renderJournal(); });
  $('g-help').onclick = () => $('tut').classList.remove('hidden');
  $('tut-ok').onclick = () => { $('tut').classList.add('hidden'); ls.set('pl_tut_seen', '1'); };

  // ---- Keputusan host: pilih → ringkasan → konfirmasi ----
  function openDecision() { const p = Story.view().pending; if (!p) return; picked = null; $('journal').classList.add('hidden');
    $('d-title').textContent = p.title.toUpperCase(); $('d-text').textContent = p.text; $('d-sum').classList.add('hidden'); $('d-msg').textContent = '';
    $('d-opts').innerHTML = p.options.map(o => `<button class="opt" data-v="${o.v}">${esc(o.label)}<small>${esc(o.effect)}</small></button>`).join('');
    $('d-opts').querySelectorAll('button').forEach(b => b.onclick = () => { picked = b.dataset.v; const o = p.options.find(o => o.v === picked);
      $('d-opts').classList.add('hidden'); const s = $('d-sum'); s.classList.remove('hidden');
      s.innerHTML = `<p>Ringkasan: <b>${esc(o.label)}</b></p><p>${esc(o.effect)}</p><p style="color:var(--bad)">Keputusan ini tidak bisa diubah.</p><button id="d-ok">KONFIRMASI</button><button id="d-back" class="sec">PILIH LAGI</button>`;
      $('d-back').onclick = () => { $('d-opts').classList.remove('hidden'); s.classList.add('hidden'); };
      $('d-ok').onclick = async () => { $('d-ok').disabled = true; try { await Story.decide(p.key, picked); $('decision').classList.add('hidden'); $('d-opts').classList.remove('hidden'); }
        catch (e) { $('d-msg').className = 'msg err'; $('d-msg').textContent = e.message || 'Gagal menyimpan keputusan.'; $('d-ok').disabled = false; } }; });
    $('d-opts').classList.remove('hidden'); $('decision').classList.remove('hidden'); }
  $('d-cancel').onclick = () => { $('decision').classList.add('hidden'); $('d-opts').classList.remove('hidden'); };

  const cbs = { msg: t => { toast(t); if ($('journal').classList.contains('hidden')) { unread = true; $('j-badge').classList.remove('hidden'); $('m-badge').classList.remove('hidden'); } },
    change: () => { refreshGoal(); if (!$('journal').classList.contains('hidden')) renderJournal(); },
    decision: () => setTimeout(openDecision, 1800), chapterCard: n => setTimeout(() => card(n), 1200), dayCard: n => setTimeout(() => dayCard(n), 900) };

  return {
    async init(o) { started = false; await Story.init(o, cbs); },
    begin() { refreshGoal(); const first = !Story.hasAny(); card(Story.view().chapter.n); setTimeout(() => toast('Hari ke-' + Story.view().day + ': ' + Story.view().dayTitle), 4600);
      if (!ls.get('pl_tut_seen')) setTimeout(() => $('tut').classList.remove('hidden'), first ? 4400 : 300);
      if (Story.view().pending) setTimeout(openDecision, 5000); },
    flag: f => Story.flag(f), target: () => { const t = Story.target(); return t ? { door:t.door, npc:t.npc, obj:t.obj, partner:t.partner } : null; },
    msg: t => Story.note(t), remoteState: r => Story.remoteState(r), tutOpen,
    closeAll() { OVERLAYS.forEach(id => $(id).classList.add('hidden')); $('chcard').classList.add('hidden'); $('toasts').innerHTML = ''; },
  };
})();

// ======================= MODUL: INPUT (keyboard + joystick) =======================
const Input = (() => {
  const keys = new Set(); let jx = 0, jy = 0, onAct = () => {};
  addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test((e.target.tagName||''))) return; const k = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    if ((k === 'e' || k === ' ' || k === 'enter') && !keys.has(k)) onAct(); keys.add(k); });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { keys.clear(); jx = jy = 0; });
  const stick = $('stick'), knob = $('knob'); let tid = null, ox = 0, oy = 0;
  const set = (cx, cy) => { let dx = cx - ox, dy = cy - oy; const R = 45, d = Math.hypot(dx, dy);
    if (d > R) { dx *= R/d; dy *= R/d; } knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.min(1, Math.hypot(dx, dy) / R); const dead = m < 0.15; jx = dead ? 0 : dx / R; jy = dead ? 0 : dy / R; };
  stick.addEventListener('touchstart', e => { const t = e.changedTouches[0]; tid = t.identifier; const r = stick.getBoundingClientRect(); ox = r.left + r.width/2; oy = r.top + r.height/2; set(t.clientX, t.clientY); e.preventDefault(); }, { passive:false });
  stick.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === tid) set(t.clientX, t.clientY); e.preventDefault(); }, { passive:false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === tid) { tid = null; jx = jy = 0; knob.style.transform = ''; } };
  stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);
  let lastTap = 0; const tap = e => { e.preventDefault(); const n = performance.now(); if (n - lastTap > 250) { lastTap = n; onAct(); } };
  $('act').addEventListener('pointerdown', tap); $('dlg').addEventListener('pointerdown', tap);
  return { setAction: f => onAct = f,
    axis() { let x = jx, y = jy;
      if (keys.has('arrowleft') || keys.has('a')) x -= 1; if (keys.has('arrowright') || keys.has('d')) x += 1;
      if (keys.has('arrowup') || keys.has('w')) y -= 1; if (keys.has('arrowdown') || keys.has('s')) y += 1;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } return { x, y }; } };
})();

// ======================= MODUL: GAME (loop, gerak, kamera, adegan) =======================
const Game = (() => {
  const cv = $('cv'), ctx = cv.getContext('2d'); let running = false, raf = 0, last = 0, now = 0;
  const SPEED = 62, TS = Scenes.TS;
  const me = { x:0, y:0, vx:0, vy:0, dir:'down', anim:0, moving:false, role:'florist', name:'Saya' };
  const remote = { on:false, x:0, y:0, tx:0, ty:0, dir:'down', moving:false, anim:0, role:'mechanic', name:'Pemain', seen:0, map:'kota' };
  const cam = { x:0, y:0 }; let scale = 3, vw = 0, vh = 0, hooks = {}, scene = Scenes.city, outPos = { x:0, y:0 }, near = null;
  const dwell = {}; let sleeping = false, dawning = false, sleepT = 0, bedRect = null, socialT = 0, lastSent = 0, lastSentMoving = false, trans = null, dialog = null, cd = 0, whereTxt = '';

  let zoomK = (() => { try { return Number(localStorage.getItem('pl_zoom')) || 1; } catch (e) { return 1; } })(), baseScale = 3;
  // Layar penuh: skala dihitung dari ukuran CSS layar (bukan piksel perangkat) agar HP tidak jadi mungil. ~11 petak pada sisi terpendek.
  function applyScale() { let sc = baseScale; if (scene && scene.id !== 'kota') sc = Math.max(baseScale, Math.floor(Math.min(cv.width / (scene.W*TS), cv.height / (scene.H*TS)))); scale = Math.max(2, sc); vw = cv.width/scale; vh = cv.height/scale; }
  function resize() { const dpr = window.devicePixelRatio || 1; cv.width = Math.round(innerWidth*dpr); cv.height = Math.round(innerHeight*dpr);
    const css = clamp(Math.min(innerWidth, innerHeight) / 176 * zoomK, 1.6, 10); baseScale = Math.max(2, Math.round(css * dpr)); applyScale(); ctx.imageSmoothingEnabled = false; }
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 250)); if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  const camTarget = () => { const mw = scene.W*TS, mh = scene.H*TS; let tx = me.x - vw/2, ty = me.y - 8 - vh/2;
    tx = mw <= vw ? (mw - vw)/2 : clamp(tx, 0, mw - vw); ty = mh <= vh ? (mh - vh)/2 : clamp(ty, 0, mh - vh); return { tx, ty }; };
  const snapCam = () => { const t = camTarget(); cam.x = t.tx; cam.y = t.ty; };

  function setScene(s) { scene = s; if (!s.img && s.render) s.img = s.render(); applyScale(); snapCam(); cd = 0.7; lastSent = 0; }
  const fadeTo = fn => { if (!trans) trans = { phase:'out', t:0, fn }; };
  // ---------- Tidur bersamaan: kedua pemain harus tidur di saat yang sama untuk memulai hari baru ----------
  function bedAction(a) {
    if (scene.id !== Story.home()) { openDialog(a.name, ['Ini tempat tidur ' + (remote.name || 'pasanganmu') + '. Kamu tidur di rumahmu sendiri.']); return; }
    const c = Story.canSleep(); if (!c.ok) { openDialog(a.name, [c.msg]); return; }
    if (hooks.hasPartner && hooks.hasPartner() && !remote.on) { openDialog(a.name, ['Pasanganmu sedang offline. Hari baru dimulai setelah kalian berdua tidur bersamaan. Tunggu dia online, ya.']); return; }
    fadeTo(() => { sleeping = true; dawning = false; sleepT = 0; bedRect = a.rect; me.vx = me.vy = 0; lastSent = 0; $('sleepui').classList.remove('hidden'); });
  }
  function wake() { sleeping = false; sleepT = 0; if (bedRect) { me.x = bedRect.x + bedRect.w/2; me.y = bedRect.y + bedRect.h + 10; } me.dir = 'down'; lastSent = 0; $('sleepui').classList.add('hidden'); }
  function sleepTick(dt) {
    sleepT += dt; const solo = !(hooks.hasPartner && hooks.hasPartner());
    $('sleep-msg').textContent = dawning ? 'Malam berlalu…' : solo ? 'Zzz… (tekan AKSI untuk bangun)' : remote.on ? 'Zzz… menunggu ' + remote.name + ' tidur. (AKSI untuk bangun)' : 'Pasanganmu offline. Hari baru butuh kalian berdua tidur. (AKSI untuk bangun)';
    if (!dawning && !trans && sleepT > 0.8 && (solo || (remote.on && remote.sl))) startDawn();
  }
  function startDawn() {
    dawning = true; $('fadeblk').classList.add('on');
    setTimeout(() => {
      if (!sleeping) { dawning = false; $('fadeblk').classList.remove('on'); return; }
      const solo = !(hooks.hasPartner && hooks.hasPartner());
      if (!solo && !(performance.now() - (remote.slAt || 0) < 2500)) { hooks.toast('Pasanganmu terbangun. Tidur lagi bersamaan untuk memulai hari baru.'); dawning = false; $('fadeblk').classList.remove('on'); wake(); return; }
      const r = Story.trySleep();
      if (!r.ok) { hooks.toast(r.msg); dawning = false; $('fadeblk').classList.remove('on'); wake(); return; }
      const base = (Date.now() / 1000 * 1.5) % 1440; clockOffset = (390 - base + 1440) % 1440; try { localStorage.setItem('pl_clk', String(clockOffset)); } catch (e) {} // pagi 06:30
      wake(); dawning = true;
      setTimeout(() => { $('fadeblk').classList.remove('on'); setTimeout(() => { dawning = false; }, 1500); }, 700);
    }, 1700);
  }
  function drawLying() {
    if (!sleeping || !bedRect) return; const cx = Math.round(bedRect.x + bedRect.w/2), top = Math.round(bedRect.y), br = Math.round(Math.sin(now/700)*0.6 + 0.4), isF = me.role === 'florist', O = '#1d1a28', hair = isF ? '#7a3b2a' : '#2c2c3a';
    const P = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(cx + x, top + y, w, h); };
    P(O, -6, 3, 12, 11); P('#f2cfa5', -5, 4, 10, 9); P(hair, -5, 4, 10, 3); if (isF) { P(hair, -6, 5, 1, 8); P(hair, 5, 5, 1, 8); P('#ff8fb8', 3, 3, 3, 2); }
    P(O, -3, 9, 2, 1); P(O, 1, 9, 2, 1); P('#f2a0a0', -4, 11, 2, 1); P('#f2a0a0', 2, 11, 2, 1);
    P('rgba(255,255,255,.22)', -7, 15 - br, 14, 3); P('rgba(0,0,0,.12)', -7, 17, 14, 2);
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const ph = ((now/900) + i/3) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (1 - ph).toFixed(2) + ')'; ctx.fillText('z', cx + 10 + i*4 + Math.sin(ph*6)*2, top + 2 - ph*18); }
  }
  function canEnter(d) {
    if (d.id !== 'school') return true;
    if (!Story.has('got_letter')) { hooks.toast('Sekolah ini hanya untuk warga yang diundang. Temui Pak Lurah di Balai Kota dulu.'); cd = 1.5; return false; }
    const w = Story.will(), pn = remote.name; let nearP = false, recent = false;
    if (remote.on) { const dist = Math.hypot(remote.x - me.x, remote.y - me.y);
      nearP = remote.map === 'kota' && dist < 70; recent = remote.map === 'school' && performance.now() - (remote.mapAt || 0) < 5000;
      if (nearP && w < 2) { hooks.toast('Kamu enggan berjalan ke Sekolah Sihir bareng ' + pn + '. Mungkin nanti, kalau kalian sudah lebih akrab.'); Story.flag('school_refused'); cd = 1.5; return false; }
      if (remote.map === 'school' && w < 1) { hooks.toast(pn + ' sedang di dalam. Kamu enggan masuk selagi dia di sana.'); cd = 1.5; return false; } }
    if (w >= 2 && (nearP || recent) && Story.day() >= 4) { Story.flag('school_together'); Story.together('schoolgate'); hooks.toast('Kalian melangkah masuk bersama! ✨'); }
    return true; }
  function social() {
    if (trans) return;
    if (scene.id === 'kota' && Story.day() >= 2) for (const L of Story.landmarks()) { if (L.flag === 'view:school' && !Story.has('got_letter')) continue; if (Math.hypot(me.x - L.x, me.y - L.y) < L.r) Story.flag(L.flag); }
    if (!remote.on || remote.map !== scene.id) return;
    const dist = Math.hypot(remote.x - me.x, remote.y - me.y);
    let place = scene.id;
    if (scene.id === 'kota') { place = ''; for (const L of Story.landmarks()) if ((L.flag === 'view:plaza' || L.flag === 'view:park') && Math.hypot(me.x - L.x, me.y - L.y) < L.r * 1.4) place = L.flag.slice(5); }
    if (place) { if (dist < 56) { dwell[place] = (dwell[place] || 0) + 0.25; if (dwell[place] >= 5) Story.together(place); } else dwell[place] = 0; }
    if (scene.id === 'school') { if (Story.day() >= 3 && Story.will() >= 1) Story.flag('school_copresent'); if (dist < 56 && Story.chapter() >= 2 && Story.day() >= 5) Story.flag('class_together'); }
  }
  function enter(d) { if (!canEnter(d)) return; fadeTo(() => { outPos = { x:d.x, y:d.y + 10 }; setScene(Scenes.interior(d.id)); me.x = scene.spawn.x; me.y = scene.spawn.y; me.vx = me.vy = 0; me.dir = 'up';
    Guide.flag('enter:' + d.id); hooks.toast('Selamat datang di ' + d.name + (d.id === me.role ? ' — tempat usahamu' : (d.id === 'florist' || d.id === 'mechanic') ? ' — milik pasanganmu' : '')); }); }
  function leave() { fadeTo(() => { setScene(Scenes.city); me.x = outPos.x; me.y = outPos.y; me.vx = me.vy = 0; me.dir = 'down'; }); }

  function openDialog(name, lines) { dialog = { name, lines, i:0 }; showDlg(); }
  function showDlg() { $('dlg-name').textContent = dialog.name; $('dlg-text').textContent = dialog.lines[dialog.i]; $('dlg-hint').textContent = dialog.i < dialog.lines.length - 1 ? 'ketuk / tekan AKSI untuk lanjut ▶' : 'ketuk / tekan AKSI untuk menutup ✔'; $('dlg').classList.remove('hidden'); }
  function act() {
    if (!running || trans || Guide.tutOpen()) return;
    if (sleeping) { if (!dawning) wake(); return; }
    if (dialog) { dialog.i++; if (dialog.i >= dialog.lines.length) { dialog = null; $('dlg').classList.add('hidden'); } else showDlg(); return; }
    if (near) near.run();
  }
  Input.setAction(act); $('sleep-cancel').onclick = () => { if (sleeping && !dawning) wake(); };
  const setZoom = k => { zoomK = clamp(k, 0.7, 1.7); try { localStorage.setItem('pl_zoom', String(zoomK)); } catch (e) {} resize(); snapCam(); hooks.toast && hooks.toast('Zoom: ' + Math.round(zoomK*100) + '%'); };
  $('g-zin').onclick = () => setZoom(zoomK * 1.18); $('g-zout').onclick = () => setZoom(zoomK / 1.18);
  $('g-full').onclick = () => { const el = document.documentElement; if (!document.fullscreenElement) { if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); else hooks.toast && hooks.toast('Browser ini belum mendukung layar penuh. Di iPhone: Bagikan → Tambah ke Layar Utama agar tampil penuh.'); } else if (document.exitFullscreen) document.exitFullscreen(); };
  $('g-fx').onclick = () => { fxOn = !fxOn; try { localStorage.setItem('pl_fx', fxOn ? '1' : '0'); } catch (e) {} hooks.toast && hooks.toast('Efek visual: ' + (fxOn ? 'AKTIF' : 'MODE RINGAN')); };

  function greet() { if (hooks.sendGreet) hooks.sendGreet({ name:me.name }); Story.greet(); hooks.toast('Kamu menyapa ' + remote.name + '. 👋'); }
  function findNear() {
    near = null; let best = Infinity;
    if (remote.on && remote.map === scene.id) { const dd = Math.hypot(remote.x - me.x, remote.y - me.y); if (dd < 30) { best = dd; near = { label:'Sapa ' + remote.name, run:greet }; } }
    for (const o of Story.objects(scene.id)) { const dd = Math.hypot(o.x - me.x, o.y - me.y); if (dd < 22 && dd < best) { best = dd; near = { label:o.label, run:o.run }; } }
    if (scene.id === 'kota') { for (const d of scene.doors) { const dd = Math.hypot(d.x - me.x, d.y + 4 - me.y); if (dd < 24 && dd < best) { best = dd; near = { label:'Masuk ' + d.name, run:() => enter(d) }; } } }
    else for (const a of scene.acts) {
      if (a.kind === 'npc') { const dd = Math.hypot(a.npc.x - me.x, a.npc.y - me.y); if (dd < 26 && dd < best) { best = dd; near = { label:'Bicara: ' + a.name, run:() => { const n = a.npc.n, fb = n.lines || (scene.id === me.role ? n.own : n.other); openDialog(a.name, Story.dialogue(a.npc.key || scene.id, fb)); } }; } }
      else if (a.kind === 'item') { const dd = Scenes.rectDist(me.x, me.y - 3, a.rect); if (dd < 10 && dd < best) { best = dd; const own = scene.id === me.role, work = own && (a.name === 'Meja Rangkai' || a.name === 'Meja Kerja'), cash = own && a.name === 'Meja Kasir';
        const sleep = scene.id.startsWith('house_') && a.name === 'Tempat Tidur';
        near = { label:(work ? 'Bekerja: ' : cash ? 'Buka keuangan: ' : sleep ? 'Tidur: ' : 'Periksa: ') + a.name, run:() => {
          if (work) return Econ.open('bisnis'); if (cash) return Econ.open('saldo');
          if (sleep) return bedAction(a);
          Story.look(a.name);
          if (a.name === 'Bola Kristal' && remote.on && remote.map === 'school' && Story.chapter() >= 3 && Story.day() >= 13) Story.flag('crystal_together');
          if (a.name === 'Kuali Ramuan' && remote.on && remote.map === 'school' && Story.chapter() >= 2 && Story.day() >= 6) Story.flag('brew_together');
          openDialog(a.name, a.lines); } }; } }
      else if (a.kind === 'exit') { const dd = Scenes.rectDist(me.x, me.y - 3, a.rect); if (dd < 8 && dd < best) { best = dd; near = { label:'Keluar bangunan', run:leave }; } }
    }
    const p = $('prompt'); if (near && !dialog) { p.textContent = 'AKSI: ' + near.label; p.classList.remove('hidden'); } else p.classList.add('hidden');
  }

  function step(dt) {
    if (cd > 0) cd -= dt;
    socialT -= dt; if (socialT <= 0) { socialT = 0.25; social(); }
    const frozen = trans || dialog || sleeping || Guide.tutOpen(), a = frozen ? { x:0, y:0 } : Input.axis(); const k = 1 - Math.exp(-16*dt);
    me.vx += (a.x*SPEED - me.vx)*k; me.vy += (a.y*SPEED - me.vy)*k;
    if (Math.abs(me.vx) < 0.5 && a.x === 0) me.vx = 0; if (Math.abs(me.vy) < 0.5 && a.y === 0) me.vy = 0;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(me.vx), Math.abs(me.vy))*dt / 2));
    for (let i = 0; i < n; i++) {
      const nx = me.x + me.vx*dt/n; if (!scene.blocked(nx, me.y)) me.x = nx; else me.vx = 0;
      const ny = me.y + me.vy*dt/n; if (!scene.blocked(me.x, ny)) me.y = ny; else me.vy = 0;
    }
    me.moving = Math.hypot(me.vx, me.vy) > 4;
    if (me.moving) { me.anim += dt*9; me.dir = Math.abs(me.vx) > Math.abs(me.vy) ? (me.vx > 0 ? 'right' : 'left') : (me.vy > 0 ? 'down' : 'up'); } else me.anim = 0;
    if (scene.step) scene.step(dt);
    updateFx(dt);
    // Masuk/keluar otomatis saat berjalan ke pintu
    if (!trans && cd <= 0) {
      if (scene.id === 'kota') { for (const d of scene.doors) if (Math.abs(me.x - d.x) <= 9 && me.y <= d.y + 7 && me.y > d.y - 12 && me.vy < -8) { enter(d); break; } }
      else if (me.y >= scene.exitY && me.x > 6*TS && me.x < 8*TS) leave();
    }
    if (remote.on) { const d = Math.hypot(remote.tx - remote.x, remote.ty - remote.y);
      if (d > 64) { remote.x = remote.tx; remote.y = remote.ty; } else { const kr = 1 - Math.exp(-12*dt); remote.x += (remote.tx - remote.x)*kr; remote.y += (remote.ty - remote.y)*kr; }
      remote.anim = remote.moving ? remote.anim + dt*9 : 0; if (performance.now() - remote.seen > 4000) remote.on = false; }
    const t = camTarget(), kc = 1 - Math.exp(-7*dt); cam.x += (t.tx - cam.x)*kc; cam.y += (t.ty - cam.y)*kc;
    if (sleeping) { near = null; $('prompt').classList.add('hidden'); sleepTick(dt); } else findNear(); if (now - clockT > 1000) { clockT = now; updateClock(); }
    const w = remote.on && remote.map !== scene.id ? 'Pasangan di: ' + (Scenes.buildingName(remote.map) || 'Kota') : ''; if (w !== whereTxt) { whereTxt = w; $('h-where').textContent = w; }
    const nw = performance.now();
    if (hooks.send && (nw - lastSent > (me.moving ? 100 : 1000) || (lastSentMoving && !me.moving))) { lastSent = nw; lastSentMoving = me.moving;
      hooks.send({ x:+me.x.toFixed(1), y:+me.y.toFixed(1), dir:me.dir, mv:me.moving, map:scene.id, sl:sleeping }); }
  }

  // ---------- Grafik: karakter bergaris tepi + aksesori ----------
  function drawChar(c, x, y, label) {
    const fr = Math.floor(c.anim) % 4, st = c.moving ? (fr % 2 ? 1 : -1) : 0, bob = c.moving && fr % 2 ? -1 : 0, X = Math.round(x), Y = Math.round(y);
    const isF = c.role === 'florist', isM = c.role === 'mechanic', O = '#1d1a28';
    const body = c.body || (isF ? '#e87aa6' : '#4a79c9'), hair = c.hair || (isF ? '#7a3b2a' : '#2c2c3a'), skin = c.skin || '#f2cfa5', pants = c.pants || (isM ? '#2f4a7a' : '#4a3a5a');
    const P = (col, rx, ry, w, h, nb) => { ctx.fillStyle = col; ctx.fillRect(X + rx, Y + ry + (nb ? 0 : bob), w, h); };
    const d = c.dir;
    P('rgba(0,0,0,.28)', -5, -2, 10, 3, true); P('rgba(0,0,0,.18)', -4, -3, 8, 1, true);
    // kaki + sepatu
    const ly = st > 0 ? 0 : -1, ry = st > 0 ? -1 : 0;
    P(O, -4, -4 + ly, 4, 4, true); P(O, 0, -4 + ry, 4, 4, true); P(pants, -3, -4 + ly, 2, 3, true); P(pants, 1, -4 + ry, 2, 3, true); P('#2a1f2e', -3, -1 + ly, 2, 1, true); P('#2a1f2e', 1, -1 + ry, 2, 1, true);
    // badan + lengan
    const sw = st; P(O, -6, -11 + (sw > 0 ? 1 : 0), 3, 7); P(O, 3, -11 + (sw < 0 ? 1 : 0), 3, 7); P(O, -5, -12, 10, 10);
    P(body, -4, -11, 8, 8); P(body, -5, -10 + (sw > 0 ? 1 : 0), 1, 5); P(body, 4, -10 + (sw < 0 ? 1 : 0), 1, 5); P(skin, -5, -6 + (sw > 0 ? 1 : 0), 1, 1); P(skin, 4, -6 + (sw < 0 ? 1 : 0), 1, 1);
    P('rgba(0,0,0,.18)', -4, -4, 8, 1);
    if (d !== 'up') {
      if (isF) { P('#fffaf0', -3, -9, 6, 6); P('#e8c9d6', -3, -9, 6, 1); P('#e87aa6', -1, -6, 2, 2); }
      else if (isM) { P('#3a5a9a', -3, -9, 6, 6); P('#2a4478', -3, -9, 1, 3); P('#2a4478', 2, -9, 1, 3); P('#e8c25a', -1, -7, 2, 1); }
      else { P('rgba(255,255,255,.18)', -3, -10, 6, 1); }
    }
    // kepala
    P(O, -5, -19, 10, 9); P(skin, -4, -18, 8, 7);
    if (d === 'up') { P(hair, -4, -19, 8, 8); if (isF) P(hair, -4, -12, 8, 3); }
    else { P(hair, -4, -19, 8, 3); P(hair, -4, -17, 1, 4); P(hair, 3, -17, 1, 4); if (isF) { P(hair, -5, -16, 1, 7); P(hair, 4, -16, 1, 7); } }
    if (isF) { P('#ff8fb8', 1, -20, 3, 2); P('#fff', 2, -20, 1, 1); P('#7ac47a', 0, -19, 1, 1); }
    if (isM) { P('#c9574f', -5, -20, 10, 3); P('#9a3a34', -5, -18, 10, 1); if (d === 'down') P('#9a3a34', -4, -17, 8, 1); else if (d === 'left') P('#9a3a34', -7, -18, 3, 1); else if (d === 'right') P('#9a3a34', 4, -18, 3, 1); }
    // wajah
    if (d === 'down') { P(O, -3, -14, 1, 2); P(O, 2, -14, 1, 2); P('#fff', -3, -14, 1, 1); P('#fff', 2, -14, 1, 1); P('#f2a0a0', -4, -12, 2, 1); P('#f2a0a0', 2, -12, 2, 1); P('#8a3a3a', -1, -11, 2, 1); }
    else if (d === 'left') { P(O, -3, -14, 1, 2); P('#f2a0a0', -4, -12, 2, 1); }
    else if (d === 'right') { P(O, 2, -14, 1, 2); P('#f2a0a0', 2, -12, 2, 1); }
    if (label) { ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#000a'; ctx.fillText(label, X + 0.5, Y - 23 + 0.5 + bob); ctx.fillStyle = '#fff'; ctx.fillText(label, X, Y - 23 + bob); }
  }

  // ---------- Grafik: waktu, cahaya, partikel, hujan ----------
  let clockOffset = (() => { try { return Number(localStorage.getItem('pl_clk')) || 0; } catch (e) { return 0; } })();
  const clockMin = () => (Date.now() / 1000 * 1.5 + clockOffset) % 1440; // 1 detik nyata = 1,5 menit game; bangun tidur = pukul 06:30
  const daylight = m => { const h = m / 60; if (h < 5 || h >= 20.5) return 0; if (h < 7) return (h - 5) / 2; if (h < 18) return 1; return 1 - (h - 18) / 2.5; };
  const isRain = () => Math.floor(Date.now() / 90000) % 6 === 4;
  const mkGlow = (r, g, b) => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${g},${b},.95)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; };
  const glowWarm = mkGlow(255, 214, 130);
  let fxOn = (() => { try { return localStorage.getItem('pl_fx') !== '0'; } catch (e) { return true; } })();
  const parts = [], rainDrops = []; let spawnT = 0, clockT = 0, slowN = 0;
  function updateClock() { $('h-day').textContent = ' · Hari ' + Story.day(); const m = clockMin(), h = Math.floor(m / 60), mi = Math.floor(m % 60); $('h-clock').textContent = (isRain() && scene.id === 'kota' ? '🌧 ' : daylight(m) < 0.3 ? '🌙 ' : '☀ ') + String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); }
  function updateFx(dt) {
    if (scene.id !== 'kota' || !fxOn) { if (parts.length) parts.length = 0; return; }
    const lt = daylight(clockMin()), n = 1 - lt, rain = isRain(); spawnT -= dt;
    if (spawnT <= 0) { spawnT = 0.4;
      if (lt > 0.5 && !rain && parts.length < 30) parts.push({ k:'p', x:cam.x + Math.random()*vw, y:cam.y - 6, vx:6 + Math.random()*8, vy:10 + Math.random()*8, c:['#ffd1e3','#ffffff','#fff3a0'][Math.floor(Math.random()*3)], t:0, ph:Math.random()*6 });
      if (n > 0.5 && parts.filter(p => p.k === 'f').length < 14) parts.push({ k:'f', x:cam.x + Math.random()*vw, y:cam.y + Math.random()*vh, t:0, ph:Math.random()*6, life:7 }); }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt;
      if (p.k === 'p') { p.x += (p.vx + Math.sin(p.t*2 + p.ph)*6)*dt; p.y += p.vy*dt; if (p.y > cam.y + vh + 8 || p.x > cam.x + vw + 20) parts.splice(i, 1); }
      else { p.x += Math.sin(p.t*1.3 + p.ph)*5*dt; p.y += Math.cos(p.t*1.1 + p.ph)*4*dt; if (p.t > p.life) parts.splice(i, 1); } }
    if (rain) { if (!rainDrops.length) for (let i = 0; i < 90; i++) rainDrops.push({ x:Math.random(), y:Math.random(), s:0.9 + Math.random()*0.8 });
      for (const d of rainDrops) { d.y += d.s*dt*1.6; d.x -= d.s*dt*0.25; if (d.y > 1) { d.y -= 1; d.x = Math.random()*1.2; } if (d.x < 0) d.x += 1; } }
  }
  function drawFx() { // ruang dunia
    if (scene.id !== 'kota') return; const n = 1 - daylight(clockMin());
    if (fxOn && n > 0.25 && scene.lights) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, (n - 0.2)*1.2);
      for (const L of scene.lights) { if (L.x < cam.x - 40 || L.x > cam.x + vw + 40 || L.y < cam.y - 40 || L.y > cam.y + vh + 40) continue; ctx.drawImage(glowWarm, L.x - L.r, L.y - L.r, L.r*2, L.r*2); }
      ctx.restore(); }
    if (!fxOn) return;
    for (const p of parts) { if (p.k === 'p') { ctx.fillStyle = p.c; ctx.globalAlpha = 0.9; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1); ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 1, 1, 1); ctx.globalAlpha = 1; }
      else { const a = 0.35 + 0.65*Math.abs(Math.sin(p.t*2.2 + p.ph)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a*0.8; ctx.drawImage(glowWarm, p.x - 4, p.y - 4, 8, 8); ctx.globalAlpha = a; ctx.fillStyle = '#fff7b0'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); ctx.restore(); } }
  }
  function drawAtmos() { // ruang layar: warna waktu + hujan
    if (sleeping) { ctx.fillStyle = 'rgba(8,10,40,' + Math.min(0.55, sleepT*0.4).toFixed(2) + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (scene.id !== 'kota') return; const m = clockMin(), h = m/60, n = 1 - daylight(m), rain = isRain(), k = n*0.85;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    if (k > 0.01) { ctx.fillStyle = `rgb(${(255 - 170*k)|0},${(255 - 155*k)|0},${(255 - 85*k)|0})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    const warm = Math.max(0, 1 - Math.abs(h - 6.2)/1.3, 1 - Math.abs(h - 18.8)/1.5);
    if (warm > 0.02) { ctx.fillStyle = `rgba(255,${(215 - 40*warm)|0},${(170 - 60*warm)|0},${(0.45*warm).toFixed(2)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (rain) { ctx.fillStyle = 'rgba(175,185,205,.55)'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.restore();
    if (rain && fxOn) { ctx.strokeStyle = 'rgba(205,225,255,.55)'; ctx.lineWidth = Math.max(1, scale*0.4); ctx.beginPath();
      for (const d of rainDrops) { const sx = d.x*cv.width, sy = d.y*cv.height; ctx.moveTo(sx, sy); ctx.lineTo(sx - 3*scale*0.5, sy + 7*scale*0.6); } ctx.stroke(); }
  }

  function draw() {
    ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = scene.id === 'kota' ? '#1d2033' : '#120f1c'; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.setTransform(scale,0,0,scale, -Math.round(cam.x*scale), -Math.round(cam.y*scale)); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scene.img, 0, 0); if (scene.animate) scene.animate(ctx, now);
    for (const o of Story.objects(scene.id)) { const ox = Math.round(o.x), oy = Math.round(o.y), bb = Math.sin(now/300)*1.5; ctx.fillStyle = '#0003'; ctx.fillRect(ox-5, oy-1, 10, 3); ctx.fillStyle = '#a0693d'; ctx.fillRect(ox-5, oy-7, 10, 7); ctx.fillStyle = '#c88f5a'; ctx.fillRect(ox-5, oy-7, 10, 2); ctx.fillStyle = '#7d5430'; ctx.fillRect(ox-3, oy-10, 6, 3); ctx.fillStyle = '#fff'; ctx.fillRect(ox+6, Math.round(oy-12+bb), 2, 2); }
    const list = sleeping ? [] : [{ c:me, label:me.name }];
    if (remote.on && remote.map === scene.id) list.push({ c:remote, label:remote.name });
    for (const c of scene.citizens) list.push({ c, label:'' }); for (const n of scene.npcs) list.push({ c:n, label:n.name });
    list.sort((a, b) => a.c.y - b.c.y).forEach(o => drawChar(o.c, o.c.x, o.c.y, o.label));
    drawLying(); drawFx();
    // Penanda tujuan (panah kuning bergoyang)
    const g = Guide.target(); let mx = null, my = 0;
    if (g && !Guide.tutOpen()) { const bob = Math.sin(now/250)*2;
      if (g.obj) { const o = Story.objects(scene.id).find(o => o.id === g.obj); if (o) { mx = o.x; my = o.y - 18 + bob; } }
      else if (g.partner) { if (remote.on && remote.map === scene.id) { mx = remote.x; my = remote.y - 26 + bob; } }
      else if (scene.id === 'kota' && g.door) { const d = scene.doors.find(d => d.id === g.door); if (d) { mx = d.x; my = d.y - 30 + bob; } }
      else if (scene.id === g.door && g.npc) { const nn = scene.npcs.find(n => n.key === (g.npc === true ? scene.id : g.npc)) || scene.npcs[0]; if (nn) { mx = nn.x; my = nn.y - 26 + bob; } } }
    if (mx !== null) { ctx.fillStyle = '#000a'; ctx.beginPath(); ctx.moveTo(mx-6, my-9); ctx.lineTo(mx+6, my-9); ctx.lineTo(mx, my+1); ctx.fill();
      ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.moveTo(mx-5, my-8); ctx.lineTo(mx+5, my-8); ctx.lineTo(mx, my); ctx.fill(); }
    ctx.setTransform(1,0,0,1,0,0);
    if (remote.on && remote.map === scene.id) { const sx = (remote.x - cam.x)*scale, sy = (remote.y - 8 - cam.y)*scale, m = 28;
      if (sx < 0 || sy < 0 || sx > cv.width || sy > cv.height) { const ang = Math.atan2(sy - cv.height/2, sx - cv.width/2);
        const ex = clamp(sx, m, cv.width - m), ey = clamp(sy, m + 60, cv.height - m);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-8,-9); ctx.lineTo(-8,9); ctx.fill(); ctx.restore();
        ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(remote.name, ex, ey - 16); } }
    drawAtmos();
    const vg = ctx.createRadialGradient(cv.width/2, cv.height/2, Math.min(cv.width, cv.height)*0.45, cv.width/2, cv.height/2, Math.max(cv.width, cv.height)*0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,10,30,.28)'); ctx.fillStyle = vg; ctx.fillRect(0,0,cv.width,cv.height);
    if (trans) { const al = trans.phase === 'out' ? trans.t/0.18 : 1 - trans.t/0.18; ctx.fillStyle = `rgba(0,0,0,${clamp(al,0,1)})`; ctx.fillRect(0,0,cv.width,cv.height); }
  }

  function frame(t) { if (!running) return; now = t; const dt = Math.min(0.05, (t - last)/1000 || 0.016); last = t;
    slowN = dt > 0.034 ? slowN + 1 : Math.max(0, slowN - 1); if (slowN > 90 && fxOn) { fxOn = false; slowN = 0; hooks.toast && hooks.toast('Efek visual dimatikan otomatis (mode ringan). Tombol FX untuk menyalakan.'); }
    if (trans) { trans.t += dt; if (trans.phase === 'out' && trans.t >= 0.18) { trans.fn(); trans.phase = 'in'; trans.t = 0; } else if (trans.phase === 'in' && trans.t >= 0.18) trans = null; }
    step(dt); draw(); raf = requestAnimationFrame(frame); }

  return {
    start(opts) { hooks = opts.hooks; Object.assign(me, { role:opts.role, name:opts.name, x:opts.x, y:opts.y, vx:0, vy:0 });
      remote.on = false; remote.role = opts.otherRole; remote.name = opts.otherName; remote.map = 'kota';
      trans = null; dialog = null; sleeping = false; dawning = false; $('sleepui').classList.add('hidden'); $('fadeblk').classList.remove('on'); $('dlg').classList.add('hidden'); outPos = { x:opts.x, y:opts.y };
      scene = Scenes.city; if (!scene.img) scene.img = scene.render(); resize(); snapCam();
      Guide.begin();
      running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); dialog = null; sleeping = false; dawning = false; $('sleepui').classList.add('hidden'); $('fadeblk').classList.remove('on'); $('dlg').classList.add('hidden'); $('prompt').classList.add('hidden'); },
    onGreet(p) { Story.flag('greeted'); hooks.toast((p && p.name || 'Pasanganmu') + ' menyapamu! 👋'); },
    sceneId: () => scene.id,
    together: () => remote.on && remote.map === scene.id && Math.hypot(remote.x - me.x, remote.y - me.y) < 56,
    getPos: () => scene.id === 'kota' ? { x:me.x, y:me.y } : { x:outPos.x, y:outPos.y }, // di dalam bangunan, simpan posisi di depan pintu
    onRemote(p) { remote.sl = !!p.sl; if (p.sl) remote.slAt = performance.now(); remote.tx = p.x; remote.ty = p.y; remote.dir = p.dir; remote.moving = !!p.mv; remote.seen = performance.now();
      if (p.map !== remote.map) { remote.map = p.map || 'kota'; remote.mapAt = performance.now(); remote.x = p.x; remote.y = p.y; }
      if (!remote.on) { remote.on = true; remote.x = p.x; remote.y = p.y; } },
  };
})();

// ======================= MODUL: BACKEND (Supabase) + ALUR UI =======================
const cfgOk = typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('GANTI');
if (!cfgOk) { $('cfgwarn').classList.remove('hidden'); return; }
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let me = null, world = null, channel = null, beat = null, saveT = null, lastOnline = new Set(), members = [], names = {};

const errText = e => (e && e.message && !/JWT|fetch|network|Failed/i.test(e.message)) ? e.message : 'Terjadi kesalahan. Periksa koneksi lalu coba lagi.';
const setNet = ok => { $('net').innerHTML = `<span class="dot ${ok?'on':''}"></span>${ok?'Terhubung':'Terputus — mencoba menyambung…'}`; $('h-net').textContent = ok ? '' : 'TERPUTUS'; };
addEventListener('online', () => setNet(true)); addEventListener('offline', () => setNet(false)); setNet(navigator.onLine);

async function auth(kind) {
  const email = $('a-email').value.trim(), password = $('a-pass').value, name = $('a-name').value.trim();
  if (password.length < 8) return say('a-msg', 'Kata sandi minimal 8 karakter.');
  if (kind === 'signup' && name.length < 2) return say('a-msg', 'Isi nama pemain (min. 2 karakter).');
  const { data, error } = kind === 'signup'
    ? await sb.auth.signUp({ email, password, options: { data: { display_name: name } } })
    : await sb.auth.signInWithPassword({ email, password });
  if (error) return say('a-msg', 'Gagal: ' + error.message);
  if (kind === 'signup' && !data.session) say('a-msg', 'Pendaftaran berhasil. Cek email untuk konfirmasi, lalu masuk.', true);
}
$('b-login').onclick = () => auth('login'); $('b-signup').onclick = () => auth('signup'); $('b-logout').onclick = () => sb.auth.signOut();
sb.auth.onAuthStateChange((_e, s) => { me = s ? s.user : null;
  if (me) { $('who').textContent = me.user_metadata?.display_name || 'Pemain'; showMenu(); } else { leaveWorld(); showView('v-auth'); } });

async function showMenu() {
  leaveWorld(); showView('v-menu'); say('m-msg', '');
  const { data, error } = await sb.from('world_members').select('role, character_role, joined_at, worlds(id, room_code)').order('joined_at', { ascending: false });
  if (error) { $('worlds').textContent = 'Gagal memuat daftar dunia.'; return; }
  $('worlds').innerHTML = data.length ? '' : 'Belum ada dunia.';
  data.forEach(m => { const d = document.createElement('div'); d.className = 'm';
    d.innerHTML = `<span>${esc(m.worlds.room_code)}<br><small>${ROLE[m.character_role]}${m.role==='host'?' · HOST':''}</small></span>`;
    const b = document.createElement('button'); b.textContent = 'BUKA'; b.style.width = '90px'; b.onclick = () => openWorld(m.worlds.id); d.appendChild(b); $('worlds').appendChild(d); });
}
$('b-create').onclick = async () => { $('b-create').disabled = true;
  const { data, error } = await sb.rpc('create_world', { p_character_role: $('c-role').value }); $('b-create').disabled = false;
  if (error) return say('m-msg', errText(error)); openWorld(data.id); };
$('b-join').onclick = async () => { const code = $('j-code').value.trim(); if (!code) return say('m-msg', 'Masukkan kode ruang.');
  const { data, error } = await sb.rpc('join_world', { p_code: code }); if (error) return say('m-msg', errText(error)); openWorld(data.id); };
$('b-back').onclick = showMenu;

async function openWorld(id) {
  const { data, error } = await sb.from('worlds').select('*').eq('id', id).single();
  if (error) return say('m-msg', 'Dunia tidak dapat dibuka.');
  leaveWorld(); world = data; showView('v-world'); $('w-code').textContent = world.room_code;
  await loadMembers(); renderMembers();
  sb.rpc('touch_presence', { p_world: id }); beat = setInterval(() => sb.rpc('touch_presence', { p_world: id }), 30000);
  channel = sb.channel('world:' + id, { config: { presence: { key: me.id }, broadcast: { self: false } } })
    .on('presence', { event: 'sync' }, () => { lastOnline = new Set(Object.keys(channel.presenceState())); renderMembers(); updateHud(); })
    .on('broadcast', { event: 'pos' }, ({ payload }) => { if (payload && payload.id !== me.id) Game.onRemote(payload); })
    .on('broadcast', { event: 'greet' }, ({ payload }) => { if (payload && payload.id !== me.id) Game.onGreet(payload); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'world_members', filter: 'world_id=eq.' + id }, async () => { await loadMembers(); renderMembers(); })
    .subscribe(async s => { setNet(navigator.onLine && s !== 'CLOSED' && s !== 'CHANNEL_ERROR'); if (s === 'SUBSCRIBED') await channel.track({ at: Date.now() }); });
}
async function loadMembers() {
  const { data: ms } = await sb.from('world_members').select('user_id, role, character_role').eq('world_id', world.id).order('slot');
  const { data: ps } = await sb.from('profiles').select('id, display_name');
  members = ms || []; names = Object.fromEntries((ps || []).map(p => [p.id, p.display_name]));
}
function renderMembers() {
  $('w-members').innerHTML = members.map(m => `<div class="m"><span><span class="dot ${lastOnline.has(m.user_id)?'on':''}"></span>${esc(names[m.user_id]||'Pemain')} ${m.user_id===me.id?'(Anda)':''}<br><small>${ROLE[m.character_role]}</small></span>${m.role==='host'?'<span class="tag">HOST</span>':''}</div>`).join('');
  const hostOnline = members.some(m => m.role==='host' && lastOnline.has(m.user_id));
  $('w-wait').className = 'msg'; $('w-wait').textContent = members.length < 2 ? 'Menunggu pemain kedua bergabung dengan kode ruang.' : !hostOnline ? 'Menunggu host untuk melanjutkan cerita utama.' : 'Kedua pemain siap.';
}
function updateHud() {
  const other = members.find(m => m.user_id !== me.id), mine = members.find(m => m.user_id === me.id); if (!mine) return;
  $('h-pn').textContent = other ? ((lastOnline.has(other.user_id) ? '● ' : '○ ') + (names[other.user_id] || 'Pemain')) : '';
  $('h-i1').innerHTML = `${esc(world.room_code)}${mine.role==='host'?' · HOST':''}<br>${other ? esc(names[other.user_id]||'Pemain') + (lastOnline.has(other.user_id) ? ' · online' : ' · offline') : 'Menunggu pemain kedua'}`;
}

const toast = t => Guide.msg(t);
let storyChannel = null;
async function startStory(mine) {
  let server = null; const { data, error } = await sb.rpc('story_load', { p_world: world.id }); if (!error && data) server = data;
  await Guide.init({ role: mine.character_role, isHost: mine.role === 'host', key: 'pl_' + world.id + '_' + me.id + '_e' + (server && server.epoch || 0), server,
    partnerName: () => { const o = members.find(m => m.user_id !== me.id); return o ? names[o.user_id] : null; }, together: () => Game.together(),
    persistFlag: async f => { const { error } = await sb.rpc('story_flag', { p_world: world.id, p_flag: f }); return !error; },
    persistDecision: async (k, v) => { const { data, error } = await sb.rpc('story_decide', { p_world: world.id, p_key: k, p_choice: v }); if (error) throw error; return data; } });
  if (storyChannel) { sb.removeChannel(storyChannel); storyChannel = null; }
  const other = members.find(m => m.user_id !== me.id);
  await Econ.init({ sb, world: world.id, me: me.id, role: mine.character_role, names, partnerId: () => { const o = members.find(m => m.user_id !== me.id); return o && o.user_id; },
    inShop: () => Game.sceneId() === mine.character_role, locked: () => Story.day() < 5, onFlag: f => Story.flag(f), notify: t => Guide.msg(t) });
  if (server) storyChannel = sb.channel('story:' + world.id).on('postgres_changes', { event: '*', schema: 'public', table: 'story_state', filter: 'world_id=eq.' + world.id }, p => { if (p.new) Guide.remoteState(p.new); }).subscribe();
}

$('b-play').onclick = async () => {
  const mine = members.find(m => m.user_id === me.id); if (!mine) return;
  const other = members.find(m => m.user_id !== me.id);
  const { data: cs } = await sb.from('character_states').select('x, y').eq('world_id', world.id).eq('user_id', me.id).single();
  const sp = Scenes.city.spawn(mine.character_role);
  const pos = (cs && (cs.x || cs.y)) ? { x: cs.x, y: cs.y } : sp;
  if (pos.x < 16 || pos.y < 16 || pos.x > (Scenes.city.W-1)*Scenes.TS || pos.y > (Scenes.city.H-1)*Scenes.TS || Scenes.city.blocked(pos.x, pos.y)) { pos.x = sp.x; pos.y = sp.y; }
  await startStory(mine); $('ui').classList.add('hidden'); $('game').classList.remove('hidden'); updateHud();
  Game.start({ role: mine.character_role, name: names[me.id] || 'Saya', x: pos.x, y: pos.y, guideKey: 'pl_' + world.id + '_' + me.id,
    otherRole: other ? other.character_role : 'mechanic', otherName: other ? (names[other.user_id] || 'Pemain') : 'Pemain',
    hooks: { toast, hasPartner: () => members.length >= 2, sendGreet: p => { if (channel) channel.send({ type:'broadcast', event:'greet', payload: { id: me.id, ...p } }); }, send: p => { if (channel) channel.send({ type:'broadcast', event:'pos', payload: { id: me.id, ...p } }); } } });
  let lastSaved = '';
  clearInterval(saveT); saveT = setInterval(savePos, 5000);
  async function savePos() { const p = Game.getPos(), k = Math.round(p.x) + ',' + Math.round(p.y); if (k === lastSaved) return; lastSaved = k;
    const { error } = await sb.from('character_states').update({ x: p.x, y: p.y, updated_at: new Date().toISOString() }).eq('world_id', world.id).eq('user_id', me.id);
    if (error) lastSaved = ''; }
  window.__savePos = savePos;
};
function exitGame() { if (window.__savePos) window.__savePos(); Game.stop(); clearInterval(saveT); Guide.closeAll(); $('game').classList.add('hidden'); $('ui').classList.remove('hidden'); }
$('g-menu').onclick = () => { exitGame(); };
addEventListener('pagehide', () => { if (window.__savePos && world) window.__savePos(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && window.__savePos && world) window.__savePos(); });

function leaveWorld() {
  if (!$('game').classList.contains('hidden')) exitGame();
  Econ.stop(); if (storyChannel) { sb.removeChannel(storyChannel); storyChannel = null; } if (channel) { sb.removeChannel(channel); channel = null; } if (beat) { clearInterval(beat); beat = null; }
  world = null; lastOnline = new Set(); members = []; window.__savePos = null;
}
})();
