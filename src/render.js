// Soy ağacını tam ekran bir katmanda (Shadow DOM içinde, sayfanın CSS'inden yalıtılmış) çizer.
(function () {
  'use strict';
  const NS = globalThis.SoyAgaci;
  const L = NS.LAYOUT;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const F_NAME = `600 13.5px ${FONT}`;
  const F_SUB = `12px ${FONT}`;
  const F_SMALL = `11px ${FONT}`;
  const LABEL_W = 250; // soldaki kuşak etiketleri için ayrılan alan
  const EDEVLET_URL = 'https://www.turkiye.gov.tr/nvi-alt-ust-soy-bilgisi-sorgulama';

  const C = {
    male: '#2f6bd6', female: '#d2456f', none: '#8a94a3', self: '#0f8a6a', ghost: '#a3acb8',
    text: '#17202b', sub: '#3f4a57', muted: '#6b7683', card: '#ffffff', ghostCard: '#f4f6f8',
    border: '#d6dce4', edge: '#b4bfcc', band: '#eef1f5', twin: '#c98a0c',
  };

  // SVG içi stiller: hem ekrandaki ağaçta hem de SVG dışa aktarımında kullanılır.
  const SVG_CSS = `
    .band{fill:${C.band}} .glabel{font:600 13px ${FONT};fill:${C.sub}} .gsub{font:${F_SMALL};fill:${C.muted}}
    .edge{fill:none;stroke:${C.edge};stroke-width:1.6;stroke-linejoin:round}
    .edge.ghost{stroke-dasharray:4 4}
    .shadow{fill:rgba(15,23,42,.07)}
    .card{fill:${C.card};stroke:${C.border};stroke-width:1.2}
    .stripe{fill:${C.none}} .male .stripe{fill:${C.male}} .female .stripe{fill:${C.female}}
    .name{font:${F_NAME};fill:${C.text}} .l2{font:${F_SUB};fill:${C.sub}} .l3{font:${F_SMALL};fill:${C.muted}}
    .self .card{stroke:${C.self};stroke-width:2.4}
    .chip{fill:${C.self}} .chip.other{fill:#6b7683} .chiptext{font:700 10.5px ${FONT};fill:#fff;letter-spacing:.3px}
    .inferred .card{fill:${C.ghostCard};stroke:${C.ghost};stroke-dasharray:5 4}
    .inferred .stripe{opacity:.45} .inferred .name{fill:#4e5966;font-style:italic}
    .badge{fill:#fff4d9;stroke:${C.twin};stroke-width:1.2} .badgetext{font:700 10.5px ${FONT};fill:${C.twin}}
  `;

  const UI_CSS = `
    :host{all:initial}
    *{box-sizing:border-box}
    .ov{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;font:14px/1.4 ${FONT};color:${C.text};
      background:#f7f8fa radial-gradient(circle,#d9dee6 1px,transparent 1.2px) 0 0/22px 22px;-webkit-font-smoothing:antialiased}
    .bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border-bottom:1px solid #e3e7ec;box-shadow:0 1px 3px rgba(15,23,42,.05);flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:10px;margin-right:auto;min-width:0}
    .brand svg{flex:none}
    .title{font-weight:700;font-size:15px;white-space:nowrap}
    .subtitle{font-size:12.5px;color:${C.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .grp{display:flex;align-items:center;gap:2px;background:#f1f3f6;border-radius:9px;padding:3px}
    button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}
    .btn{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:7px;font-size:13px;font-weight:500;color:#2b3440}
    .btn:hover{background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.1)}
    .btn.icon{width:30px;padding:0;justify-content:center}
    .btn:focus-visible,.search input:focus-visible,.switch input:focus-visible+span{outline:2px solid ${C.self};outline-offset:1px}
    .zoomval{min-width:44px;text-align:center;font-size:12px;color:${C.muted};font-variant-numeric:tabular-nums}
    .search{position:relative;display:flex;align-items:center}
    .search svg{position:absolute;left:9px;color:${C.muted};pointer-events:none}
    .search input{font:inherit;font-size:13px;height:34px;width:190px;padding:0 44px 0 30px;border:1px solid #dde2e8;border-radius:9px;background:#fff;color:${C.text};outline:none}
    .search input:focus{border-color:${C.self}}
    .search .count{position:absolute;right:9px;font-size:11.5px;color:${C.muted};font-variant-numeric:tabular-nums}
    .switch{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#374151;cursor:pointer;user-select:none;padding:0 4px}
    .switch input{position:absolute;opacity:0;width:0;height:0}
    .switch span{position:relative;width:32px;height:18px;border-radius:9px;background:#cfd6df;transition:background .15s;flex:none}
    .switch span::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s}
    .switch input:checked+span{background:${C.self}}
    .switch input:checked+span::after{transform:translateX(14px)}
    .stage{position:relative;flex:1;overflow:hidden;cursor:grab;touch-action:none}
    .stage.dragging{cursor:grabbing}
    .stage svg.tree{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none}
    .node{cursor:pointer}
    .node:hover .card{stroke:#8896a8}
    .node.sel .card{stroke:${C.self};stroke-width:2.8}
    .node.match .card{stroke:#e2a200;stroke-width:2.8}
    .node.twin .card{stroke:${C.twin};stroke-width:2.4}
    .dimmed .node:not(.onpath):not(.match):not(.twin){opacity:.3}
    .dimmed .edge:not(.onpath){opacity:.3}
    .edge.onpath{stroke:${C.self};stroke-width:2.8}
    .node,.edge{transition:opacity .18s}
    .legend{position:absolute;left:14px;bottom:14px;display:flex;gap:14px;align-items:center;background:rgba(255,255,255,.92);border:1px solid #e3e7ec;border-radius:10px;padding:8px 12px;font-size:12px;color:#4b5563;box-shadow:0 2px 8px rgba(15,23,42,.06)}
    .legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
    .hint{position:absolute;right:14px;bottom:14px;font-size:11.5px;color:${C.muted};background:rgba(255,255,255,.85);padding:6px 10px;border-radius:8px}
    .notices{position:absolute;left:50%;top:12px;transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}
    .notice{pointer-events:auto;background:#fff8e6;border:1px solid #f0d58a;color:#7a5a00;font-size:12.5px;padding:7px 12px;border-radius:9px;box-shadow:0 2px 8px rgba(15,23,42,.08)}
    .notice button{text-decoration:underline;color:inherit;font-weight:600;margin-left:6px}
    .panel{position:absolute;top:0;right:0;bottom:0;width:360px;max-width:100%;background:#fff;border-left:1px solid #e3e7ec;box-shadow:-8px 0 24px rgba(15,23,42,.08);
      transform:translateX(100%);transition:transform .22s ease;overflow-y:auto;padding:20px 22px 28px}
    .panel.open{transform:none}
    .panel .x{position:absolute;top:12px;right:12px}
    .panel h2{margin:0 36px 4px 0;font-size:19px;line-height:1.25}
    .panel .rel{font-size:12.5px;color:${C.muted};margin-bottom:14px}
    .tag{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;margin:0 4px 12px 0}
    .tag.m{background:#e8f0fc;color:${C.male}} .tag.f{background:#fce9ef;color:${C.female}}
    .tag.alive{background:#e3f5ef;color:${C.self}} .tag.dead{background:#eef0f3;color:#4b5563} .tag.inf{background:#f1f3f6;color:#4b5563;border:1px dashed ${C.ghost}}
    dl{display:grid;grid-template-columns:118px 1fr;gap:7px 10px;margin:0 0 18px;font-size:13px}
    dt{color:${C.muted}} dd{margin:0;word-break:break-word}
    h3{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${C.muted};margin:18px 0 8px}
    .chain{list-style:none;margin:0;padding:0;border-left:2px solid #e3e7ec;margin-left:6px}
    .chain li{position:relative;padding:0 0 8px 14px}
    .chain li::before{content:"";position:absolute;left:-6px;top:6px;width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #c3cbd5}
    .chain li.cur::before{border-color:${C.self};background:${C.self}}
    .chain button{text-align:left;font-size:13px;padding:0;color:${C.text}}
    .chain button:hover b{text-decoration:underline}
    .chain small{display:block;color:${C.muted};font-size:11.5px}
    .note{font-size:12.5px;background:#f6f8fa;border-radius:8px;padding:10px 12px;color:#374151;margin:0 0 12px}
    .note.warn{background:#fff8e6;color:#6b4f00}
    .primary{white-space:nowrap;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:${C.self};color:#fff;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:600}
    .primary:hover{filter:brightness(1.07)}
    .linkbtn{color:${C.self};font-weight:600;font-size:13px;padding:2px 0}
    .extra{font-size:13px;margin:0;padding-left:18px} .extra li{margin-bottom:6px}
    .empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;cursor:default}
    .welcome{max-width:560px;background:#fff;border:1px solid #e3e7ec;border-radius:16px;padding:28px 30px;box-shadow:0 8px 30px rgba(15,23,42,.08)}
    .welcome svg{width:40px;height:40px}
    .welcome h2{font-size:20px;margin:14px 0 8px} .welcome p{color:#374151;font-size:14px;margin:0 0 16px}
    .primary{text-decoration:none}
    .ghostbtn{display:inline-flex;align-items:center;gap:6px;border:1px solid #d5dbe3;background:#fff;color:#1f2937;border-radius:8px;padding:7px 12px;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer}
    .ghostbtn:hover{border-color:#aab4c0;background:#f8fafb}
    .acts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;align-items:center}
    .note.ok{background:#e8f6f1;color:#0b5e49}
    .danger{color:#b42318}
    .modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;padding:20px;z-index:5}
    .modal-bg[hidden]{display:none}
    .modal{position:relative;background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:calc(100vh - 40px);overflow:auto;padding:24px 26px;box-shadow:0 20px 60px rgba(15,23,42,.25)}
    .modal .mx{position:absolute;top:12px;right:12px}
    .modal h2{font-size:19px;margin:0 36px 6px 0} .lead{color:${C.muted};font-size:13.5px;margin:0 0 16px}
    .opt{border:1px solid #e6eaef;border-radius:12px;padding:12px 14px;margin-bottom:10px}
    .opt h3{margin:0 0 4px;font-size:12px} .opt p{margin:0 0 10px;font-size:13px;color:#374151}
    .opt input[type=file]{font:inherit;font-size:13px}
    .paste{min-height:54px;border:1.5px dashed #c9d1db;border-radius:10px;padding:10px 12px;font-size:13px;color:#374151;outline:none;overflow:hidden;max-height:80px}
    .paste:empty::before{content:attr(data-ph);color:#9aa3ad}
    .paste:focus{border-color:${C.self}}
    .result{margin-top:12px} .preview{font-size:14px;margin-bottom:10px}
    .lists{list-style:none;margin:0 0 16px;padding:0;border:1px solid #e6eaef;border-radius:12px}
    .lists li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-top:1px solid #eef1f4;font-size:14px}
    .lists li:first-child{border-top:0} .lists small{color:${C.muted}}
    @media (max-width:900px){.hint{display:none}.search input{width:140px}.subtitle{display:none}}
  `;

  const ICON = {
    tree: '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect width="26" height="26" rx="7" fill="#0f8a6a"/><g fill="#fff"><rect x="4" y="5" width="7" height="5" rx="1.5"/><rect x="15" y="5" width="7" height="5" rx="1.5"/><rect x="9.5" y="16" width="7" height="5" rx="1.5"/></g><path d="M7.5 10v3h11v-3M13 13v3" stroke="#fff" stroke-width="1.6" fill="none"/></svg>',
    minus: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 8h9M8 3.5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    fit: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10"/></svg>',
    down: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    vert: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5.5" y="1.5" width="5" height="3.5" rx="1"/><rect x="1.5" y="11" width="5" height="3.5" rx="1"/><rect x="9.5" y="11" width="5" height="3.5" rx="1"/><path d="M8 5v3M4 11V8h8v3"/></svg>',
    horiz: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1.5" y="5.5" width="3.5" height="5" rx="1"/><rect x="11" y="1.5" width="3.5" height="5" rx="1"/><rect x="11" y="9.5" width="3.5" height="5" rx="1"/><path d="M5 8h3M11 4H8v8h3"/></svg>',
    list: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.5" cy="4" r=".6" fill="currentColor"/><circle cx="2.5" cy="8" r=".6" fill="currentColor"/><circle cx="2.5" cy="12" r=".6" fill="currentColor"/></svg>',
    target: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>',
    search: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14" stroke-linecap="round"/></svg>',
  };

  // ---------- metin yardımcıları ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tc = (s) => NS.lower(s).replace(/(^|[\s\-/(.])(\S)/g, (m, a, b) => a + b.toLocaleUpperCase('tr-TR'));
  const mctx = document.createElement('canvas').getContext('2d');
  function fitText(text, font, max) {
    mctx.font = font;
    if (mctx.measureText(text).width <= max) return text;
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (mctx.measureText(text.slice(0, mid) + '…').width <= max) lo = mid; else hi = mid - 1;
    }
    return text.slice(0, lo).trimEnd() + '…';
  }
  const textW = (text, font) => ((mctx.font = font), mctx.measureText(text).width);

  const fullName = (n) => tc([n.p.name, n.p.surname].filter(Boolean).join(' '));

  function placeParts(p) {
    const parts = (p.place || '').split('/').map(NS.clean).filter(Boolean);
    const strip = (s) => s.replace(/\s+(MAHALLES[İI]|MAH\.?|K[ÖO]Y[ÜU]|KÖY)$/iu, '');
    if (parts.length >= 3) return tc(`${parts[1]} · ${strip(parts[parts.length - 1])}`);
    if (parts.length === 2) return tc(`${parts[0]} · ${parts[1]}`);
    return tc(p.birthPlace || parts[0] || '');
  }

  // Adı yalnızca başka birinin satırından bilinen kişi için: "Kaynak: Kemal Aydın › Ana Adı" gibi kaynak metni.
  function sourceOf(n) {
    const src = n.p.source;
    const kid = n.parent && n.parent.person && n.parent.gen < n.gen ? n.parent : null;
    const kidName = kid ? fullName(kid) : '';
    if (src === 'father') return kidName ? `${kidName} satırındaki "Baba Adı"` : 'çocuğunun satırındaki "Baba Adı"';
    if (src === 'mother') return kidName ? `${kidName} satırındaki "Ana Adı"` : 'çocuğunun satırındaki "Ana Adı"';
    if (src === 'child') return 'çocuğunun satırındaki anne/baba adı';
    return '';
  }

  function shortSource(n) {
    const kid = n.parent && n.parent.gen < n.gen ? fullName(n.parent) : '';
    const field = n.p.source === 'father' ? 'Baba Adı' : n.p.source === 'mother' ? 'Ana Adı' : '';
    if (kid && field) return `Kaynak: ${kid} › ${field}`;
    return field || n.p.source ? 'Kaynak: çocuğunun satırı' : 'Ağacı bağlamak için eklendi';
  }

  function cardLines(n) {
    const p = n.p;
    if (n.kind !== 'real') {
      return {
        name: fullName(n) || 'Adı bilinmiyor',
        l2: p.name ? 'Yalnızca adı biliniyor' : 'Hiçbir kayıtta geçmiyor',
        l3: shortSource(n),
      };
    }
    const b = p.birth && p.birth.year;
    const d = p.death && p.death.year;
    let l2;
    if (p.alive) l2 = `${b || '?'} doğumlu · Sağ`;
    else if (p.deceased) l2 = `${b || '?'} - ${d || '?'}`;
    else l2 = [b ? `${b} doğumlu` : '', tc(p.status)].filter(Boolean).join(' · ');
    return { name: fullName(n) || 'Adı yok', l2, l3: placeParts(p) };
  }

  function genTitle(g) {
    if (g === 0) return 'Merkez kuşağı';
    if (g === 1) return 'Anne-baba kuşağı';
    if (g === 2) return 'Dede-nine kuşağı';
    if (g > 0) return `${g}. kuşak üst soy`;
    if (g === -1) return 'Çocuk kuşağı';
    if (g === -2) return 'Torun kuşağı';
    return `${-g}. kuşak alt soy`;
  }
  function genSub(g) {
    if (!isFinite(g.min)) return g.nodes.every((n) => n.kind !== 'real') ? 'tahmini' : '';
    return g.min === g.max ? `${g.min} doğumlu` : `${g.min} - ${g.max} doğumlu`;
  }

  // Kartları, bağlantıları ve kuşak şeritlerini tek bir "çizim listesi"ne çevirir; SVG ve PNG aynı listeyi kullanır.
  function scene(model) {
    const { minX, maxX, minY, maxY } = model.bounds;
    const hor = model.horizontal;
    const hw = L.W / 2, hh = L.H / 2;
    let box, bands;
    if (hor) {
      const top = minY - 70;
      box = { x: minX - 24, y: top, w: maxX - minX + 48, h: maxY - top + 24 };
      bands = model.gens.map((g, i) => ({
        g, i, x: g.pos - L.COL / 2 + 6, y: top, w: L.COL - 12, h: maxY - top + 16,
        tx: g.pos - hw, ty1: top + 28, ty2: top + 45, title: genTitle(g.gen), sub: genSub(g),
      }));
    } else {
      const left = minX - LABEL_W;
      box = { x: left, y: minY - 24, w: maxX - left + 40, h: maxY - minY + 48 };
      bands = model.gens.map((g, i) => ({
        g, i, x: left, y: g.pos - L.ROW / 2, w: maxX - left + 40, h: L.ROW,
        tx: left + 24, ty1: g.pos - 2, ty2: g.pos + 15, title: genTitle(g.gen), sub: genSub(g),
      }));
    }
    const edges = model.edges.map((e) => {
      const u = e.upper, w = e.lower;
      let d;
      if (hor) {
        // yaşlı kuşak sağda: yaşlının sol kenarından gencin sağ kenarına
        const x1 = u.x - hw, y1 = u.y, x2 = w.x + hw, y2 = w.y, mx = (x1 + x2) / 2, dy = y2 - y1;
        if (Math.abs(dy) < 1) d = `M${x1} ${y1}H${x2}`;
        else {
          const r = Math.min(10, Math.abs(dy) / 2, (x1 - x2) / 2), s = Math.sign(dy);
          d = `M${x1} ${y1}H${mx + r}Q${mx} ${y1} ${mx} ${y1 + s * r}V${y2 - s * r}Q${mx} ${y2} ${mx - r} ${y2}H${x2}`;
        }
      } else {
        const x1 = u.x, y1 = u.y + hh, x2 = w.x, y2 = w.y - hh, my = (y1 + y2) / 2, dx = x2 - x1;
        if (Math.abs(dx) < 1) d = `M${x1} ${y1}V${y2}`;
        else {
          const r = Math.min(10, Math.abs(dx) / 2, my - y1), s = Math.sign(dx);
          d = `M${x1} ${y1}V${my - r}Q${x1} ${my} ${x1 + s * r} ${my}H${x2 - s * r}Q${x2} ${my} ${x2} ${my + r}V${y2}`;
        }
      }
      return { e, d, ghost: u.kind === 'ghost' || w.kind === 'ghost' };
    });
    const cards = model.nodes.map((n) => {
      const t = cardLines(n);
      const max = L.W - 22 - 12 - (n.twins ? 22 : 0);
      return {
        n, x: n.x - hw, y: n.y - hh,
        name: fitText(t.name, F_NAME, max),
        l2: fitText(t.l2, F_SUB, L.W - 34),
        l3: fitText(t.l3, F_SMALL, L.W - 34),
        full: t.name,
      };
    });
    return { bands, edges, cards, box, chip: model.chip || 'KENDİSİ' };
  }

  // ---------- SVG çizimi ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function drawSVG(vp, sc) {
    vp.textContent = '';
    const gb = el('g', { class: 'bands' }, vp);
    for (const b of sc.bands) {
      if (b.i % 2 === 0) el('rect', { class: 'band', x: b.x, y: b.y, width: b.w, height: b.h, rx: 14 }, gb);
      el('text', { class: 'glabel', x: b.tx, y: b.ty1 }, gb).textContent = b.title;
      if (b.sub) el('text', { class: 'gsub', x: b.tx, y: b.ty2 }, gb).textContent = b.sub;
    }
    const ge = el('g', { class: 'edges' }, vp);
    for (const e of sc.edges) e.el = el('path', { class: 'edge' + (e.ghost ? ' ghost' : ''), d: e.d }, ge);
    const gn = el('g', { class: 'nodes' }, vp);
    for (const c of sc.cards) {
      const n = c.n;
      const cls = ['node', n.gender === 'E' ? 'male' : n.gender === 'K' ? 'female' : '', n.isFocus ? 'self' : '', n.kind !== 'real' ? 'inferred' : ''];
      const g = el('g', { class: cls.filter(Boolean).join(' '), 'data-id': n.id, transform: `translate(${c.x},${c.y})` }, gn);
      el('title', {}, g).textContent = `${c.full}\n${NS.relText(n.rel)}${n.kind === 'real' ? '' : '\nKendi satırı yok' + (sourceOf(n) ? '; adı ' + sourceOf(n) + ' alanından' : '')}`;
      el('rect', { class: 'shadow', x: 0, y: 2, width: L.W, height: L.H, rx: 10 }, g);
      el('rect', { class: 'card', x: 0, y: 0, width: L.W, height: L.H, rx: 10 }, g);
      el('rect', { class: 'stripe', x: 8, y: 10, width: 4, height: L.H - 20, rx: 2 }, g);
      el('text', { class: 'name', x: 22, y: 25 }, g).textContent = c.name;
      el('text', { class: 'l2', x: 22, y: 44 }, g).textContent = c.l2;
      el('text', { class: 'l3', x: 22, y: 59 }, g).textContent = c.l3;
      if (n.isFocus || n.compRoot) {
        const label = n.isFocus ? sc.chip : 'AYRI AİLE';
        const w = textW(label, `700 10.5px ${FONT}`) + 16;
        el('rect', { class: 'chip' + (n.isFocus ? '' : ' other'), x: 14, y: -9, width: w, height: 18, rx: 9 }, g);
        el('text', { class: 'chiptext', x: 22, y: 4 }, g).textContent = label;
      }
      if (n.twins) {
        el('circle', { class: 'badge', cx: L.W - 16, cy: 17, r: 9 }, g);
        el('text', { class: 'badgetext', x: L.W - 16, y: 21, 'text-anchor': 'middle' }, g).textContent = String(n.twins.length + 1);
      }
      n.el = g;
    }
  }

  // ---------- PNG çizimi (canvas; sayfanın güvenlik politikasına takılmamak için görüntü yüklemeden çizer) ----------
  function drawCanvas(sc, title, scale) {
    const pad = 40, head = 64;
    const W = sc.box.w + pad * 2, H = sc.box.h + pad * 2 + head;
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * scale);
    cv.height = Math.round(H * scale);
    const x = cv.getContext('2d');
    x.scale(scale, scale);
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, W, H);
    x.fillStyle = C.text;
    x.font = `700 20px ${FONT}`;
    x.fillText(title, pad, pad + 8);
    x.fillStyle = C.muted;
    x.font = `12.5px ${FONT}`;
    x.fillText(`e-Devlet Alt-Üst Soy Bilgisi listelerinden oluşturuldu · ${new Date().toLocaleDateString('tr-TR')}`, pad, pad + 30);
    x.translate(pad - sc.box.x, pad + head - sc.box.y);

    for (const b of sc.bands) {
      if (b.i % 2 === 0) { x.fillStyle = C.band; x.beginPath(); x.roundRect(b.x, b.y, b.w, b.h, 14); x.fill(); }
      x.fillStyle = C.sub; x.font = `600 13px ${FONT}`; x.fillText(b.title, b.tx, b.ty1);
      if (b.sub) { x.fillStyle = C.muted; x.font = F_SMALL; x.fillText(b.sub, b.tx, b.ty2); }
    }
    x.lineWidth = 1.6;
    x.strokeStyle = C.edge;
    for (const e of sc.edges) {
      x.setLineDash(e.ghost ? [4, 4] : []);
      x.stroke(new Path2D(e.d));
    }
    x.setLineDash([]);
    for (const c of sc.cards) {
      const n = c.n, inf = n.kind !== 'real';
      x.save();
      x.translate(c.x, c.y);
      x.fillStyle = 'rgba(15,23,42,.07)'; x.beginPath(); x.roundRect(0, 2, L.W, L.H, 10); x.fill();
      x.fillStyle = inf ? C.ghostCard : C.card; x.beginPath(); x.roundRect(0, 0, L.W, L.H, 10); x.fill();
      x.setLineDash(inf ? [5, 4] : []);
      x.lineWidth = n.isFocus ? 2.4 : 1.2;
      x.strokeStyle = n.isFocus ? C.self : inf ? C.ghost : C.border;
      x.stroke();
      x.setLineDash([]);
      x.globalAlpha = inf ? 0.45 : 1;
      x.fillStyle = n.gender === 'E' ? C.male : n.gender === 'K' ? C.female : C.none;
      x.beginPath(); x.roundRect(8, 10, 4, L.H - 20, 2); x.fill();
      x.globalAlpha = 1;
      x.fillStyle = inf ? '#4e5966' : C.text; x.font = (inf ? 'italic ' : '') + F_NAME; x.fillText(c.name, 22, 25);
      x.fillStyle = C.sub; x.font = F_SUB; x.fillText(c.l2, 22, 44);
      x.fillStyle = C.muted; x.font = F_SMALL; x.fillText(c.l3, 22, 59);
      if (n.isFocus || n.compRoot) {
        const label = n.isFocus ? sc.chip : 'AYRI AİLE';
        x.font = `700 10.5px ${FONT}`;
        const w = x.measureText(label).width + 16;
        x.fillStyle = n.isFocus ? C.self : '#6b7683'; x.beginPath(); x.roundRect(14, -9, w, 18, 9); x.fill();
        x.fillStyle = '#fff'; x.fillText(label, 22, 4);
      }
      if (n.twins) {
        x.beginPath(); x.arc(L.W - 16, 17, 9, 0, Math.PI * 2);
        x.fillStyle = '#fff4d9'; x.fill(); x.strokeStyle = C.twin; x.lineWidth = 1.2; x.stroke();
        x.fillStyle = C.twin; x.font = `700 10.5px ${FONT}`; x.textAlign = 'center';
        x.fillText(String(n.twins.length + 1), L.W - 16, 21); x.textAlign = 'left';
      }
      x.restore();
    }
    return cv;
  }

  function download(blob, name, root) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    root.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- dosya / pano ayrıştırma ----------
  // Chrome'un "tek dosya" (.mhtml) kaydındaki quoted-printable HTML bölümünü çözer.
  function mhtmlToHtml(text) {
    const parts = text.split(/\r?\n--[^\r\n]+/);
    const part = parts.find((p) => /Content-Type:\s*text\/html/i.test(p)) || text;
    const i = part.search(/\r?\n\r?\n/);
    let body = i >= 0 ? part.slice(i) : part;
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(part)) {
      body = body.replace(/=\r?\n/g, '');
      const bytes = [];
      for (let k = 0; k < body.length; k++) {
        const ch = body[k];
        if (ch === '=' && /^[0-9A-F]{2}$/i.test(body.substr(k + 1, 2))) { bytes.push(parseInt(body.substr(k + 1, 2), 16)); k += 2; }
        else { const code = ch.charCodeAt(0); if (code < 128) bytes.push(code); else for (const b of new TextEncoder().encode(ch)) bytes.push(b); }
      }
      body = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    }
    return body;
  }
  function tsvToHtml(text) {
    const rows = text.split(/\r?\n/).filter((r) => r.trim());
    return '<table>' + rows.map((r) => '<tr>' + r.split('\t').map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>').join('') + '</table>';
  }
  NS.parseHtml = function (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const found = NS.findTable(doc);
    return found ? NS.parseTable(found) : null;
  };

  // ---------- ana görüntüleyici (tam ekran sekme) ----------
  NS.mountViewer = function (app) {
    const host = document.createElement('div');
    host.id = 'soyagaci-viewer-host';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>${UI_CSS}${SVG_CSS}</style>
      <div class="ov">
        <div class="bar">
          <div class="brand">${ICON.tree}<div style="min-width:0"><div class="title">Soy Ağacı</div><div class="subtitle"></div></div></div>
          <label class="search">${ICON.search}<input type="search" placeholder="Kişi ara" aria-label="Kişi ara"><span class="count"></span></label>
          <label class="switch" title="Ağaçtaki en eski kişilerin anne ve babasını, onların kaydındaki Baba Adı ve Ana Adı alanlarından ekler"><input type="checkbox" class="ghosts"><span></span>Bir kuşak daha tahmin et</label>
          <div class="grp"><button class="btn orient" title="Ağacın yönünü değiştir"></button></div>
          <div class="grp">
            <button class="btn icon zout" title="Uzaklaştır (-)">${ICON.minus}</button>
            <span class="zoomval">100%</span>
            <button class="btn icon zin" title="Yakınlaştır (+)">${ICON.plus}</button>
            <button class="btn icon zfit" title="Ekrana sığdır (0)">${ICON.fit}</button>
          </div>
          <div class="grp">
            <button class="btn png" title="Ağacı PNG resmi olarak indir">${ICON.down}PNG</button>
            <button class="btn svg" title="Ağacı SVG (büyütülebilir çizim) olarak indir">${ICON.down}SVG</button>
          </div>
          <div class="grp"><button class="btn lists" title="Eklenen listeler, yedekleme">${ICON.list}Listeler <span class="nlists"></span></button></div>
          <button class="primary addlist" title="Başka bir kişinin soy listesini ekle">${ICON.plus}Liste ekle</button>
        </div>
        <div class="stage">
          <svg class="tree" xmlns="${SVGNS}"><g class="vp"></g></svg>
          <div class="legend">
            <span><i style="background:${C.male}"></i>Erkek</span>
            <span><i style="background:${C.female}"></i>Kadın</span>
            <span><i style="background:#fff;border:2px solid ${C.self}"></i>Merkezdeki kişi</span>
            <span><i style="background:${C.ghostCard};border:1.5px dashed ${C.ghost}"></i>Yalnızca adı biliniyor</span>
          </div>
          <div class="hint">Sürükle: kaydır · Ctrl + tekerlek / iki parmak: yakınlaştır · Karta tıkla: ayrıntı</div>
          <div class="notices"></div>
          <aside class="panel" aria-live="polite"><button class="btn icon x" title="Kapat">${ICON.close}</button><div class="pbody"></div></aside>
        </div>
        <div class="modal-bg" hidden><div class="modal" role="dialog" aria-modal="true"><button class="btn icon mx" title="Kapat">${ICON.close}</button><div class="mbody"></div></div></div>
      </div>`;
    document.body.appendChild(host);

    const $ = (s) => root.querySelector(s);
    const stage = $('.stage'), svg = $('svg.tree'), vp = $('.vp'), panel = $('.panel'), pbody = $('.pbody');
    const searchInput = $('.search input'), countEl = $('.count'), zoomEl = $('.zoomval');
    const modalBg = $('.modal-bg'), mbody = $('.mbody');
    const st = { x: 0, y: 0, k: 1 };
    let graph = null, focusId = null, model = null, sc = null, selected = null, matches = [], matchIdx = -1, anim = 0;
    let horizontal = null; // null: ilk çizimde ekrana göre seçilir

    function apply() {
      vp.setAttribute('transform', `translate(${st.x},${st.y}) scale(${st.k})`);
      zoomEl.textContent = Math.round(st.k * 100) + '%';
    }
    function animateTo(x, y, k) {
      cancelAnimationFrame(anim);
      const from = { ...st }, t0 = performance.now(), dur = 380;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        st.x = from.x + (x - from.x) * e; st.y = from.y + (y - from.y) * e; st.k = from.k + (k - from.k) * e;
        apply();
        if (p < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    function fitScale(b) {
      const r = stage.getBoundingClientRect();
      return Math.max(0.06, Math.min(1.1, (r.width - 40) / b.w, (r.height - 90) / b.h));
    }
    function fit(animated) {
      if (!sc) return;
      const r = stage.getBoundingClientRect();
      const b = sc.box, k = fitScale(b);
      const x = r.width / 2 - (b.x + b.w / 2) * k, y = (r.height - 40) / 2 - (b.y + b.h / 2) * k;
      if (animated) animateTo(x, y, k); else { Object.assign(st, { x, y, k }); apply(); }
    }
    function zoomAt(cx, cy, f) {
      const k = Math.max(0.06, Math.min(3, st.k * f));
      st.x = cx - ((cx - st.x) * k) / st.k;
      st.y = cy - ((cy - st.y) * k) / st.k;
      st.k = k;
      apply();
    }
    function centerOn(n, k) {
      const r = stage.getBoundingClientRect();
      const kk = k || Math.max(st.k, 0.85);
      const visibleW = r.width - (panel.classList.contains('open') ? panel.offsetWidth : 0);
      animateTo(visibleW / 2 - n.x * kk, r.height / 2 - n.y * kk, kk);
    }

    const importName = (id) => { const i = graph.imports.find((x) => x.id === id); return i ? tc(i.ownerName) : ''; };
    const ownerFirst = () => graph.imports.length && graph.find(`${graph.imports[0].id}|`);

    function layout(h) {
      const m = NS.layoutGraph(graph, focusId, { ghosts: $('.ghosts').checked, horizontal: h });
      if (m) { const o = ownerFirst(); m.chip = o && m.self.person.id === o.id ? 'KENDİSİ' : 'MERKEZ'; }
      return m;
    }

    function build(keepSelection) {
      const selPerson = keepSelection && selected ? selected.person.id : null;
      root.querySelectorAll('.empty').forEach((e) => e.remove());
      $('.notices').textContent = '';
      $('.nlists').textContent = graph.imports.length ? `(${graph.imports.length})` : '';
      if (!graph.persons.size) {
        model = sc = null;
        vp.textContent = '';
        $('.subtitle').textContent = 'Henüz liste eklenmedi';
        stage.insertAdjacentHTML('beforeend', `<div class="empty"><div class="welcome">${ICON.tree}<h2>Soy ağacınız burada oluşacak</h2>
          <p>e-Devlet'te <b>Alt-Üst Soy Bilgisi Sorgulama</b> sayfasını açın ve sayfadaki <b>Soy ağacına ekle</b> düğmesine basın.
          Ardından annenizin, babanızın ya da bir akrabanızın listesini ekledikçe ağaç birleşerek büyür.</p>
          <p><a class="primary" href="${EDEVLET_URL}" target="_blank" rel="noopener">e-Devlet sayfasını aç</a> <button class="ghostbtn" data-add>Dosyadan ya da yapıştırarak ekle</button></p></div></div>`);
        stage.querySelector('[data-add]').onclick = () => openAdd(null);
        panel.classList.remove('open');
        return;
      }
      if (horizontal === null) {
        const sv = scene(layout(false)), sh = scene(layout(true));
        horizontal = fitScale(sh.box) > fitScale(sv.box) * 1.15;
      }
      model = layout(horizontal);
      sc = scene(model);
      drawSVG(vp, sc);
      $('.orient').innerHTML = horizontal ? `${ICON.horiz}Yatay` : `${ICON.vert}Dikey`;
      const s = model.stats;
      $('.subtitle').textContent = [
        `Merkez: ${fullName(model.self) || 'Adı bilinmiyor'}`,
        `${s.people} kişi`,
        s.upGens ? `${s.upGens} üst kuşak` : '',
        s.downGens ? `${s.downGens} alt kuşak` : '',
        s.oldest ? `en eski doğum ${s.oldest}` : '',
      ].filter(Boolean).join(' · ');
      const notes = [];
      if (model.families > 1) notes.push([`Ağaçta birbirine bağlanmayan ${model.families} ayrı aile var. Ortak bir akrabanın listesini eklediğinizde birleşirler.`, null]);
      if (graph.extra.length) notes.push([`${graph.extra.length} satır ağaca yerleştirilemedi.`, showExtra]);
      for (const [text, fn] of notes) {
        const d = document.createElement('div');
        d.className = 'notice';
        d.innerHTML = esc(text) + (fn ? '<button type="button">Göster</button>' : '');
        if (fn) d.querySelector('button').onclick = fn;
        $('.notices').appendChild(d);
      }
      selected = null;
      clearMarks();
      if (selPerson && model.nodes.find((n) => n.person.id === selPerson)) select(model.nodes.find((n) => n.person.id === selPerson), false);
      else panel.classList.remove('open');
      runSearch();
    }

    function clearMarks() {
      root.querySelectorAll('.sel,.onpath,.twin').forEach((e) => e.classList.remove('sel', 'onpath', 'twin'));
      svg.classList.toggle('dimmed', matches.length > 0);
    }
    function chainOf(n) {
      const out = [];
      for (let c = n; c; c = c.parent) out.unshift(c);
      return out;
    }
    function select(n, center) {
      clearMarks();
      selected = n;
      if (!n) { panel.classList.remove('open'); return; }
      const chain = new Set(chainOf(n));
      chain.forEach((c) => c.el && c.el.classList.add('onpath'));
      for (const e of sc.edges) if (chain.has(e.e.upper) && chain.has(e.e.lower)) e.el.classList.add('onpath');
      n.el.classList.add('sel');
      (n.twins || []).forEach((t) => t.el.classList.add('twin'));
      svg.classList.add('dimmed');
      renderPanel(n);
      panel.classList.add('open');
      if (center) centerOn(n);
    }
    const row = (label, value) => (value ? `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>` : '');

    function renderPanel(n) {
      const p = n.p, person = n.person;
      const real = n.kind === 'real';
      const name = fullName(n) || 'Adı bilinmiyor';
      const kin = NS.kinName(n.rel, n.gender);
      const rel = NS.relText(n.rel);
      const tags = [];
      if (n.gender === 'E') tags.push('<span class="tag m">Erkek</span>');
      if (n.gender === 'K') tags.push('<span class="tag f">Kadın</span>');
      if (real && p.alive) tags.push('<span class="tag alive">Sağ</span>');
      if (real && p.deceased) tags.push(`<span class="tag dead">${esc(tc(p.status) || 'Ölüm')}</span>`);
      if (!real) tags.push('<span class="tag inf">Kendi satırı yok</span>');
      const head = chainOf(n)[0];
      const center = fullName(head) || 'merkezdeki kişi';
      const relLine = n.isFocus ? 'Ağaç bu kişiye göre çiziliyor'
        : n.compRoot ? 'Merkezdeki kişiyle bağı bulunamayan ayrı bir aile'
        : (n.comp ? center + ' ailesinde: ' : center + ' için: ') + (kin && kin !== rel ? kin + ' · ' : '') + rel;
      let html = `<h2>${esc(name)}</h2><div class="rel">${esc(relLine)}</div>${tags.join('')}`;

      const acts = [];
      if (!n.isFocus && person.id) acts.push(`<button class="primary" data-act="focus">${ICON.target}Ağacı bu kişiye göre çiz</button>`);
      if (person.id && !person.owners.length) acts.push(`<button class="ghostbtn" data-act="add">${ICON.plus}Bu kişinin listesini ekle</button>`);
      if (acts.length) html += `<div class="acts">${acts.join('')}</div>`;
      if (person.owners && person.owners.length) html += `<p class="note ok">Bu kişinin kendi soy listesi ekli.</p>`;

      if (real) {
        let life = '';
        if (p.birth && p.death && p.birth.year && p.death.year) {
          let age = p.death.year - p.birth.year;
          if (p.birth.month && p.death.month && (p.death.month < p.birth.month || (p.death.month === p.birth.month && p.death.day < p.birth.day))) age--;
          life = `${age} yıl`;
        }
        html += '<dl>' +
          row('Doğum', [p.birth && p.birth.text, tc(p.birthPlace)].filter(Boolean).join(' · ')) +
          row('Ölüm', p.death ? p.death.text : p.deceased ? 'Tarih kayıtlı değil' : '') +
          row('Yaşam süresi', life) +
          row('Baba adı', tc(p.father)) +
          row('Ana adı', tc(p.mother)) +
          row('Nüfusa kayıtlı yer', tc(p.place).replace(/\s*\/\s*/g, ' / ')) +
          row('Cilt-Hane-Birey', p.registry) +
          row('Medeni hali', p.marital) +
          row('Geçtiği listeler', person.imports.map(importName).filter(Boolean).map((x) => x + ' listesi').join(', ')) +
          '</dl>';
        if (/^01\/07\//.test(p.birth ? p.birth.text : '') && p.birth.year < 1935) {
          html += '<p class="note">1 Temmuz tarihi eski kayıtlarda çoğunlukla "gün ve ay bilinmiyor" anlamında kullanılır; yıl da yaklaşık olabilir.</p>';
        }
      } else {
        const from = sourceOf(n);
        html += `<p class="note">${esc(from
          ? `Bu kişinin e-Devlet listelerinde kendi satırı yok. Adını ${from} alanından biliyoruz. Bu yüzden soyadı, doğum ve ölüm tarihi bilinmiyor.`
          : 'Bu kişinin hiçbir listede satırı yok ve adı da hiçbir kayıtta geçmiyor. Ağaçtaki iki kişiyi birbirine bağlamak için boş kart olarak eklendi.')}</p>`;
        if (n.kind === 'ghost') html += '<p class="note">Bu kart, üstteki "Bir kuşak daha tahmin et" anahtarı açık olduğu için görünüyor.</p>';
      }
      if (n.twins) {
        html += `<p class="note warn">Bu kişi ağaçta ${n.twins.length + 1} ayrı yerde görünüyor; yani ${esc(name)} merkezdeki kişiye birden fazla hattan bağlı (akraba evliliği).</p>`;
        html += n.twins.map((t) => `<button class="linkbtn" data-go="${esc(t.id)}">Diğer konumu göster: ${esc(NS.relText(t.rel))}</button>`).join('<br>');
      }
      const chain = chainOf(n);
      if (chain.length > 1) {
        html += `<h3>${n.comp ? 'Bu ailenin merkezine uzanan hat' : 'Merkeze uzanan hat'}</h3><ol class="chain">` + chain.map((c) =>
          `<li class="${c === n ? 'cur' : ''}"><button data-go="${esc(c.id)}"><b>${esc(fullName(c) || 'Adı bilinmiyor')}</b><small>${esc(NS.kinName(c.rel, c.gender) || NS.relText(c.rel))}${c.kind === 'real' && c.p.birth ? ' · ' + c.p.birth.year : ''}</small></button></li>`).join('') + '</ol>';
      }
      pbody.innerHTML = html;
      pbody.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => select(model.byId.get(b.dataset.go), true)));
      const f = pbody.querySelector('[data-act=focus]');
      if (f) f.onclick = () => app.onFocus(person.members[0]);
      const a = pbody.querySelector('[data-act=add]');
      if (a) a.onclick = () => openAdd(person);
    }

    function showList(title, sub, items) {
      clearMarks();
      selected = null;
      pbody.innerHTML = `<h2>${esc(title)}</h2><div class="rel">${esc(sub)}</div><ul class="extra">${items}</ul>`;
      pbody.querySelectorAll('[data-focus]').forEach((b) => (b.onclick = () => app.onFocus(b.dataset.focus)));
      panel.classList.add('open');
    }
    function showExtra() {
      showList('Yerleştirilemeyen satırlar', 'Yakınlık derecesi tanınmayan satırlar',
        graph.extra.map((p) => `<li><b>${esc(tc([p.name, p.surname].filter(Boolean).join(' ')))}</b><br><small>${esc(p.relation)} · ${esc(importName(p.imp))} listesi</small></li>`).join(''));
    }
    const byName = (a, b) => NS.fold(a.p.name).localeCompare(NS.fold(b.p.name));

    function runSearch() {
      if (!model) return;
      const q = NS.fold(searchInput.value);
      root.querySelectorAll('.match').forEach((e) => e.classList.remove('match'));
      matches = q ? model.nodes.filter((n) => NS.fold([n.p.name, n.p.surname].join(' ')).includes(q)) : [];
      matches.sort((a, b) => a.y - b.y || a.x - b.x);
      matches.forEach((n) => n.el.classList.add('match'));
      matchIdx = -1;
      countEl.textContent = q ? String(matches.length) : '';
      svg.classList.toggle('dimmed', matches.length > 0 || !!selected);
    }

    // ---------- pencereler: liste ekleme ve listeler ----------
    function openModal(html) {
      mbody.innerHTML = html;
      modalBg.hidden = false;
      const first = mbody.querySelector('input,button,a,[contenteditable]');
      if (first) first.focus();
    }
    function closeModal() { modalBg.hidden = true; mbody.textContent = ''; }
    $('.mx').onclick = closeModal;
    modalBg.addEventListener('pointerdown', (e) => { if (e.target === modalBg) closeModal(); });

    function openAdd(target) {
      const tname = target ? tc([target.p.name, target.p.surname].filter(Boolean).join(' ')) : '';
      openModal(`
        <h2>${target ? esc(tname) + ' için liste ekle' : 'Soy listesi ekle'}</h2>
        <p class="lead">${target ? `${esc(tname)} kişisinin e-Devlet Alt-Üst Soy listesini ekleyin; onun anne-baba tarafı, kardeşleri ve çocukları ağaca bağlanır.` : 'Bir akrabanızın e-Devlet Alt-Üst Soy listesini ekleyin. Ortak kişiler kendiliğinden eşleşir ve ağaç büyür.'}</p>
        <div class="opt"><h3>1 · e-Devlet'ten doğrudan</h3>
          <p>Liste sahibi bu tarayıcıda kendi e-Devlet hesabıyla giriş yapıp sorgulama sayfasını açsın ve sayfadaki <b>Soy ağacına ekle</b> düğmesine bassın.</p>
          <a class="ghostbtn" href="${EDEVLET_URL}" target="_blank" rel="noopener">e-Devlet sayfasını aç</a></div>
        <div class="opt"><h3>2 · Kaydedilmiş sayfa dosyası</h3>
          <p>Liste sahibi sonuç sayfasını Chrome'da <b>Farklı kaydet</b> ile (.html ya da .mhtml) kaydedip size gönderebilir.</p>
          <input type="file" accept=".html,.htm,.mhtml,.mht" class="file"></div>
        <div class="opt"><h3>3 · Tabloyu yapıştır</h3>
          <p>Sonuç tablosunu fareyle baştan sona seçip kopyalayın ve aşağıdaki kutuya yapıştırın.</p>
          <div class="paste" contenteditable="true" data-ph="Buraya yapıştırın (Ctrl+V / Cmd+V)"></div></div>
        <div class="result"></div>`);
      const result = mbody.querySelector('.result');
      const handle = (parsed, source) => {
        if (!parsed || !parsed.people.length) { result.innerHTML = '<p class="note warn">Bu içerikte Alt-Üst Soy tablosu bulunamadı.</p>'; return; }
        const rec = NS.makeImport(parsed, source);
        const self = parsed.people.find((p) => p.path.length === 0);
        const already = graph.imports.find((i) => i.ownerKey && i.ownerKey === rec.ownerKey);
        let warn = '';
        if (target) {
          const tid = NS.identity(target.p);
          if (!self) warn = 'Bu listede "Kendisi" satırı yok.';
          else if (tid && tid !== rec.ownerKey) warn = `Bu listenin sahibi ${tc(rec.ownerName)}, seçtiğiniz kişi ise ${tname}. Yine de eklerseniz iki kişi aynı kişi sayılır.`;
          rec.attachTo = target.members[0];
        }
        result.innerHTML = `<div class="preview"><b>${esc(tc(rec.ownerName))}</b> kişisinin listesi · ${parsed.people.length} kişi${already ? ' · <i>bu liste zaten ekli, yenisiyle değiştirilecek</i>' : ''}</div>
          ${warn ? `<p class="note warn">${esc(warn)}</p>` : ''}<button class="primary go">${ICON.plus}Ağaca ekle</button>`;
        result.querySelector('.go').onclick = async () => { await app.onAdd(rec); closeModal(); };
      };
      mbody.querySelector('.file').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        let text = await file.text();
        if (/\.mht(ml)?$/i.test(file.name) || /^MIME-Version:/im.test(text.slice(0, 500))) text = mhtmlToHtml(text);
        handle(NS.parseHtml(text), 'dosya');
      };
      const paste = mbody.querySelector('.paste');
      paste.addEventListener('paste', (e) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        const txt = e.clipboardData.getData('text/plain');
        paste.textContent = 'Yapıştırıldı.';
        handle(NS.parseHtml(html && /<t[dh][\s>]/i.test(html) ? html : tsvToHtml(txt)), 'yapıştırma');
      });
    }

    function openLists() {
      const items = graph.imports.map((i) => {
        const att = i.attachTo ? graph.find(i.attachTo) : null;
        return `<li><div><b>${esc(tc(i.ownerName))}</b> <small>· ${i.people.length} kişi · ${esc(i.source || '')} · ${new Date(i.addedAt).toLocaleDateString('tr-TR')}</small>
          ${att && att.owners.indexOf(i.id) < 0 ? '' : ''}</div><button class="linkbtn danger" data-del="${esc(i.id)}">Kaldır</button></li>`;
      }).join('');
      openModal(`<h2>Eklenen listeler</h2>
        <p class="lead">Listeler yalnızca bu tarayıcıda saklanır. Başka bir bilgisayara taşımak ya da bir akrabanızla paylaşmak için yedek dosyası indirebilirsiniz.</p>
        <ul class="lists">${items || '<li>Henüz liste yok.</li>'}</ul>
        <div class="acts"><button class="ghostbtn backup">${ICON.down}Yedeği indir</button>
          <label class="ghostbtn">${ICON.plus}Yedekten yükle<input type="file" accept=".json" class="restore" hidden></label>
          ${graph.imports.length ? '<button class="linkbtn danger wipe">Tümünü sil</button>' : ''}</div>`);
      mbody.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
        const i = graph.imports.find((x) => x.id === b.dataset.del);
        if (confirm(`${tc(i.ownerName)} listesi ağaçtan kaldırılsın mı?`)) { await app.onRemove(i.id); openLists(); }
      }));
      mbody.querySelector('.backup').onclick = () => {
        const blob = new Blob([JSON.stringify({ app: 'e-devlet-soy-agaci', version: 1, imports: graph.imports }, null, 1)], { type: 'application/json' });
        download(blob, `soy-agaci-yedek-${new Date().toISOString().slice(0, 10)}.json`, root);
      };
      mbody.querySelector('.restore').onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          if (!Array.isArray(data.imports)) throw new Error('biçim');
          await app.onRestore(data.imports);
          openLists();
        } catch (err) { alert('Yedek dosyası okunamadı.'); }
      };
      const w = mbody.querySelector('.wipe');
      if (w) w.onclick = async () => { if (confirm('Bütün listeler bu tarayıcıdan silinsin mi? Bu işlem geri alınamaz.')) { await app.onRestore(null); closeModal(); } };
    }

    // ---------- olaylar ----------
    $('.addlist').onclick = () => openAdd(null);
    $('.lists').onclick = openLists;
    $('.panel .x').onclick = () => select(null);
    $('.zin').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.25); };
    $('.zout').onclick = () => { const r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 0.8); };
    $('.zfit').onclick = () => fit(true);
    $('.ghosts').onchange = () => { if (graph) { build(true); fit(true); } };
    $('.orient').onclick = () => { if (!graph) return; horizontal = !horizontal; build(true); fit(false); };
    searchInput.oninput = runSearch;
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter' && matches.length) {
        matchIdx = (matchIdx + (e.shiftKey ? -1 : 1) + matches.length) % matches.length;
        countEl.textContent = `${matchIdx + 1}/${matches.length}`;
        select(matches[matchIdx], true);
      }
    };

    const centerName = () => (model ? fullName(model.self) || 'Soy Ağacı' : 'Soy Ağacı');
    const fileBase = () => 'soy-agaci-' + NS.fold(centerName()).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    $('.png').onclick = () => {
      if (!sc) return;
      const pixels = (sc.box.w + 80) * (sc.box.h + 144);
      const scale = Math.max(0.5, Math.min(2, Math.sqrt(120e6 / pixels), 16000 / (sc.box.w + 80), 16000 / (sc.box.h + 144)));
      const cv = drawCanvas(sc, `${centerName()} · Soy Ağacı`, scale);
      cv.toBlob((blob) => blob && download(blob, fileBase() + '.png', root), 'image/png');
    };
    $('.svg').onclick = () => {
      if (!sc) return;
      const b = sc.box, pad = 40;
      const clone = vp.cloneNode(true);
      clone.removeAttribute('transform');
      clone.querySelectorAll('.sel,.onpath,.match,.twin').forEach((e) => e.classList.remove('sel', 'onpath', 'match', 'twin'));
      const out = `<svg xmlns="${SVGNS}" viewBox="${b.x - pad} ${b.y - pad - 50} ${b.w + pad * 2} ${b.h + pad * 2 + 50}" width="${b.w + pad * 2}" height="${b.h + pad * 2 + 50}">` +
        `<style>${SVG_CSS}</style><rect x="${b.x - pad}" y="${b.y - pad - 50}" width="${b.w + pad * 2}" height="${b.h + pad * 2 + 50}" fill="#fff"/>` +
        `<text x="${b.x}" y="${b.y - 36}" style="font:700 20px ${esc(FONT)};fill:${C.text}">${esc(centerName())} · Soy Ağacı</text>` +
        new XMLSerializer().serializeToString(clone) + '</svg>';
      download(new Blob([out], { type: 'image/svg+xml' }), fileBase() + '.svg', root);
    };

    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.panel,.legend,.notice,.hint,.empty')) return;
      drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, moved: false, node: e.target.closest('.node'), id: e.pointerId };
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 4) {
        drag.moved = true;
        stage.classList.add('dragging');
        stage.setPointerCapture(e.pointerId);
        cancelAnimationFrame(anim);
      }
      if (drag.moved) { st.x = drag.sx + dx; st.y = drag.sy + dy; apply(); }
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      stage.classList.remove('dragging');
      if (!drag.moved && model) {
        if (drag.node) select(model.byId.get(drag.node.dataset.id), false);
        else if (selected || panel.classList.contains('open')) select(null);
      }
      drag = null;
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('wheel', (e) => {
      if (e.target.closest('.panel,.empty')) return;
      e.preventDefault();
      cancelAnimationFrame(anim);
      const r = stage.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const d = Math.max(-60, Math.min(60, e.deltaY * (e.deltaMode ? 30 : 1)));
        zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-d * 0.01));
      } else {
        const m = e.deltaMode ? 30 : 1;
        st.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * m;
        st.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * m;
        apply();
      }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      const t = e.composedPath()[0];
      const typing = t && (t.tagName === 'INPUT' || t.isContentEditable);
      if (e.key === 'Escape') {
        if (!modalBg.hidden) closeModal();
        else if (typing && searchInput.value) { searchInput.value = ''; runSearch(); }
        else if (panel.classList.contains('open')) select(null);
        return;
      }
      if (typing || !modalBg.hidden) return;
      const r = stage.getBoundingClientRect();
      if (e.key === '+' || e.key === '=') zoomAt(r.width / 2, r.height / 2, 1.25);
      else if (e.key === '-' || e.key === '_') zoomAt(r.width / 2, r.height / 2, 0.8);
      else if (e.key === '0') fit(true);
      else if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')) { e.preventDefault(); searchInput.focus(); }
    });
    window.addEventListener('resize', () => fit(false));

    return {
      // Yeni veriyle yeniden çizer. refit: görünümü ekrana sığdır.
      update(g, fid, refit) {
        graph = g;
        focusId = fid;
        build(!refit);
        if (refit || !model) fit(false);
      },
      openAdd: () => openAdd(null),
    };
  };
})();
