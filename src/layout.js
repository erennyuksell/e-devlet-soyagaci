// Aile grafiğini seçili "odak" kişiye göre yerleştirir:
// odağın bütün ataları, her atanın öbür çocukları (amca, hala, dayı, teyze) ve onların soyu (kuzenler),
// odağın kardeşleri ve odağın kendi soyu (çocuklar, torunlar).
(function () {
  'use strict';
  const NS = globalThis.SoyAgaci;

  const L = (NS.LAYOUT = {
    W: 212, H: 68, V_GAP: 62,
    GAP_NEAR: 14, GAP_FAR: 34, // dikey: eşler/kardeşler arası ve farklı aileler arası
    H_GAP_NEAR: 10, H_GAP_FAR: 24, // yatay yerleşimde aynı boşluklar
  });
  L.ROW = L.H + L.V_GAP;
  L.COL = L.W + 72;

  const birthKey = (p) => (p && p.birth ? p.birth.year * 10000 + (p.birth.month || 0) * 100 + (p.birth.day || 0) : 1e9);
  const byBirth = (a, b) => birthKey(a.p) - birthKey(b.p) || (a.p.order || 0) - (b.p.order || 0);

  NS.layoutGraph = function (graph, focusId, opts) {
    const hor = !!(opts && opts.horizontal);
    const size = hor ? L.H : L.W;
    const NEAR = hor ? L.H_GAP_NEAR : L.GAP_NEAR;
    const FAR = hor ? L.H_GAP_FAR : L.GAP_FAR;
    const P = graph.persons;
    const focus = P.get(focusId) || P.values().next().value;

    // Odağın bütün ataları: bunlar yan kol (amca, kuzen) olarak değil, yalnızca kendi ata konumlarında çizilir.
    const placed = new Map(); // kişi id -> ağaçtaki kartları
    const ancestors = new Set();
    (function up(p) {
      for (const id of [p.father, p.mother]) if (id && !ancestors.has(id) && P.get(id)) { ancestors.add(id); up(P.get(id)); }
    })(focus || { });
    const free = (c) => c && !placed.has(c.id) && !ancestors.has(c.id);

    const occs = [];
    const edges = [];
    let comp = 0; // 0: merkezdeki kişinin ailesi; 1, 2...: ona hiç bağlanmayan ayrı aileler

    function occ(person, gen, rel, via) {
      const o = { id: 'o' + occs.length, person, p: person.p, kind: person.kind, gender: person.gender, gen, rel, parent: via || null, b: 0, kids: [], comp };
      occs.push(o);
      if (person.id) { if (!placed.has(person.id)) placed.set(person.id, []); placed.get(person.id).push(o); }
      return o;
    }
    const shift = (cards, s) => { for (const c of cards) c.b += s; };

    // Bir bloğu (moving) sabit bloğun (fixed) yanına, hiçbir kuşak satırında çakışmayacak ve
    // istenen konuma (s0) en yakın olacak şekilde yerleştirir. lim ile yön kısıtlanabilir.
    function place(fixed, moving, s0, lim) {
      const min = lim && lim.min != null ? lim.min : -Infinity;
      const max = lim && lim.max != null ? lim.max : Infinity;
      const rows = (cards) => {
        const m = new Map();
        for (const c of cards) { if (!m.has(c.gen)) m.set(c.gen, []); m.get(c.gen).push(c.b); }
        for (const v of m.values()) v.sort((a, b) => a - b);
        return m;
      };
      const rf = rows(fixed), rm = rows(moving);
      const shared = [...rm.keys()].filter((g) => rf.has(g));
      const ok = (s) => {
        for (const g of shared) {
          const a = rf.get(g), b = rm.get(g);
          let i = 0, j = 0;
          while (i < a.length && j < b.length) {
            const d = b[j] + s - a[i];
            if (Math.abs(d) < size + NEAR - 0.01) return false;
            if (d < 0) j++; else i++;
          }
        }
        return true;
      };
      const cands = new Set([s0]);
      for (const g of shared) for (const x of rf.get(g)) for (const y of rm.get(g)) {
        cands.add(x + size + FAR - y);
        cands.add(x - size - FAR - y);
      }
      const list = [...cands].filter((s) => s >= min - 0.01 && s <= max + 0.01).sort((a, b) => Math.abs(a - s0) - Math.abs(b - s0));
      for (const s of list) if (ok(s)) return s;
      // son çare: tamamen sağa ya da sola it
      let hi = -Infinity, lo = Infinity, mhi = -Infinity, mlo = Infinity;
      for (const c of fixed) { hi = Math.max(hi, c.b); lo = Math.min(lo, c.b); }
      for (const c of moving) { mhi = Math.max(mhi, c.b); mlo = Math.min(mlo, c.b); }
      const right = Math.max(min, hi - mlo + size + FAR), left = Math.min(max, lo - mhi - size - FAR);
      if (max < Infinity) return left;
      if (min > -Infinity) return right;
      return Math.abs(right - s0) <= Math.abs(left - s0) ? right : left;
    }

    // Bir kişinin ve bütün soyunun (çocuklar, torunlar...) klasik ağaç yerleşimi.
    function downTree(person, gen, rel, via) {
      const root = occ(person, gen, rel, via);
      (function grow(o) {
        const kids = o.person.children.map((id) => P.get(id)).filter(free).sort(byBirth);
        for (const c of kids) {
          const k = occ(c, o.gen - 1, [...o.rel, c.gender === 'K' ? 'D' : c.gender === 'E' ? 'S' : 'C'], o);
          o.kids.push(k);
          edges.push({ upper: o, lower: k });
        }
        o.kids.forEach(grow);
      })(root);
      tidy(root);
      const cards = [];
      (function collect(o, b) { o.b = b; cards.push(o); for (const k of o.kids) collect(k, b + k._off); })(root, 0);
      return { root, cards };
    }

    function tidy(root) {
      const half = size / 2;
      (function rec(n) {
        if (!n.kids.length) return { l: [-half], r: [half] };
        const cs = n.kids.map(rec);
        const offs = [0], l = cs[0].l.slice(), r = cs[0].r.slice();
        for (let i = 1; i < cs.length; i++) {
          const c = cs[i];
          let s = -Infinity;
          for (let d = 0; d < Math.min(r.length, c.l.length); d++) s = Math.max(s, r[d] + (d === 0 ? NEAR : FAR) - c.l[d]);
          offs.push(s);
          c.l.forEach((lv, d) => {
            if (d < l.length) { l[d] = Math.min(l[d], s + lv); r[d] = Math.max(r[d], s + c.r[d]); }
            else { l.push(s + lv); r.push(s + c.r[d]); }
          });
        }
        const mid = (offs[0] + offs[offs.length - 1]) / 2;
        n.kids.forEach((k, i) => (k._off = offs[i] - mid));
        return { l: [-half, ...l.map((v) => v - mid)], r: [half, ...r.map((v) => v - mid)] };
      })(root);
    }

    function ghost(child, step) {
      const name = step === 'F' ? child.p.father : child.p.mother;
      return {
        id: null, kind: 'ghost', gender: step === 'F' ? 'E' : 'K', children: [],
        p: { name, surname: '', source: step === 'F' ? 'father' : 'mother' },
      };
    }

    // Odak ya da bir ata için: kendisi + kardeşleri (soylarıyla) + anne-babasının bloğu.
    // role: 'F' babalar kardeşlerini sola, 'M' anneler sağa açar; odakta büyükler sola, küçükler sağa.
    function unit(person, gen, rel, role, via) {
      let R, root;
      if (!rel.length) { const d = downTree(person, 0, [], null); R = d.cards; root = d.root; }
      else { root = occ(person, gen, rel, via); R = [root]; }

      const fam = [person.father, person.mother].filter(Boolean);
      const sibs = [...new Set(fam.flatMap((id) => (P.get(id) ? P.get(id).children : [])))]
        .map((id) => P.get(id)).filter((s) => free(s) && s.id !== person.id).sort(byBirth);
      const mine = birthKey(person.p);
      const left = sibs.filter((s) => (rel.length ? role === 'F' : birthKey(s.p) < mine)).reverse();
      const right = sibs.filter((s) => !left.includes(s));
      const sibRoots = [];
      for (const [list, side] of [[left, -1], [right, 1]]) {
        for (const s of list) {
          const blk = downTree(s, gen, [...rel, 'B'], root);
          const row = R.filter((c) => c.gen === gen).map((c) => c.b);
          const edge = side < 0 ? Math.min(...row) - size - NEAR : Math.max(...row) + size + NEAR;
          const sh = place(R, blk.cards, edge, side < 0 ? { max: edge } : { min: edge });
          shift(blk.cards, sh);
          R = R.concat(blk.cards);
          sibRoots.push(blk.root);
        }
      }

      if (gen > 60) return { cards: R, root };
      let f = person.father && P.get(person.father);
      let m = person.mother && P.get(person.mother);
      if (opts && opts.ghosts && person.kind === 'real') {
        if (!f && person.p.father) f = ghost(person, 'F');
        if (!m && person.p.mother) m = ghost(person, 'M');
      }
      let PU = null, fo = null, mo = null;
      if (f) { const u = unit(f, gen + 1, [...rel, 'F'], 'F', root); PU = u.cards; fo = u.root; }
      if (m) {
        const u = unit(m, gen + 1, [...rel, 'M'], 'M', root);
        mo = u.root;
        if (PU) {
          const s0 = fo.b + size + NEAR - mo.b;
          shift(u.cards, place(PU, u.cards, s0, { min: s0 }));
          PU = PU.concat(u.cards);
        } else PU = u.cards;
      }
      if (PU) {
        const center = fo && mo ? (fo.b + mo.b) / 2 : (fo || mo).b;
        shift(PU, place(R, PU, root.b - center));
        R = R.concat(PU);
      }
      for (const [po, pp] of [[fo, f], [mo, m]]) {
        if (!po) continue;
        edges.push({ upper: po, lower: root });
        for (const s of sibRoots) if (pp.id && (s.person.father === pp.id || s.person.mother === pp.id)) edges.push({ upper: po, lower: s });
      }
      return { cards: R, root };
    }

    if (!focus) return null;
    let all = unit(focus, 0, [], null, null).cards;
    const self = occs[0];
    self.isFocus = true;

    // Kan bağı olmayan ama bağlantılı kişiler (eşler, eşlerin aileleri): ağaçtaki bir çocuğun henüz çizilmemiş
    // anne ya da babası bulunur, onun bloğu (ataları ve kardeşleriyle) çocuğun üstüne yerleştirilir.
    // Aynı şekilde çizilmiş birinin çizilmemiş çocukları da altına eklenir. Eklenecek kimse kalmayana kadar sürer.
    function attachConnected() {
      for (let i = 0; i < occs.length; i++) {
        const o = occs[i], per = o.person;
        if (!per.id) continue;
        for (const [pid, step] of [[per.father, 'F'], [per.mother, 'M']]) {
          const pp = pid && P.get(pid);
          if (!pp || placed.has(pp.id)) continue;
          const u = unit(pp, o.gen + 1, [...o.rel, step], step, o);
          shift(u.cards, place(all, u.cards, o.b - u.root.b));
          all = all.concat(u.cards);
          edges.push({ upper: u.root, lower: o });
        }
        for (const cid of per.children) {
          const c = P.get(cid);
          if (!c || placed.has(c.id) || ancestors.has(c.id)) continue;
          const d = downTree(c, o.gen - 1, [...o.rel, c.gender === 'K' ? 'D' : c.gender === 'E' ? 'S' : 'C'], o);
          shift(d.cards, place(all, d.cards, o.b));
          all = all.concat(d.cards);
          edges.push({ upper: o, lower: d.root });
        }
      }
    }
    attachConnected();

    // Hiçbir bağı olmayan listeler ayrı bir aile olarak sağa çizilir; kuşakları doğum yılına göre hizalanır.
    const focusYear = focus.p.birth && focus.p.birth.year;
    const ownerOrder = new Map((graph.imports || []).map((imp, i) => [`${imp.id}|`, i]));
    for (let guard = 0; guard < 200; guard++) {
      const rest = [...P.values()].filter((p) => p.kind === 'real' && !placed.has(p.id));
      if (!rest.length) break;
      const owners = rest.filter((p) => p.owners.length)
        .sort((a, b) => Math.min(...a.members.map((m) => ownerOrder.get(m) ?? 1e9)) - Math.min(...b.members.map((m) => ownerOrder.get(m) ?? 1e9)));
      const start = owners[0] || rest.sort(byBirth)[rest.length - 1];
      const y = start.p.birth && start.p.birth.year;
      const gen = focusYear && y ? Math.round((focusYear - y) / 28) : 0;
      comp++;
      const u = unit(start, gen, [], null, null);
      u.root.compRoot = true;
      let hi = -Infinity, lo = Infinity;
      for (const c of all) hi = Math.max(hi, c.b);
      for (const c of u.cards) lo = Math.min(lo, c.b);
      const s0 = hi - lo + size + FAR * 4;
      shift(u.cards, place(all, u.cards, s0, { min: s0 }));
      all = all.concat(u.cards);
      attachConnected();
    }

    for (const o of occs) {
      if (hor) { o.x = o.gen * L.COL; o.y = o.b; } else { o.x = o.b; o.y = -o.gen * L.ROW; }
      const list = o.person.id ? placed.get(o.person.id) : null;
      if (list && list.length > 1) o.twins = list.filter((t) => t !== o);
    }

    const gens = new Map();
    for (const o of occs) {
      if (!gens.has(o.gen)) gens.set(o.gen, { gen: o.gen, pos: hor ? o.x : o.y, nodes: [], min: Infinity, max: -Infinity });
      const g = gens.get(o.gen);
      g.nodes.push(o);
      const y = o.kind === 'real' && o.p.birth && o.p.birth.year;
      if (y) { g.min = Math.min(g.min, y); g.max = Math.max(g.max, y); }
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const o of occs) {
      minX = Math.min(minX, o.x - L.W / 2); maxX = Math.max(maxX, o.x + L.W / 2);
      minY = Math.min(minY, o.y - L.H / 2); maxY = Math.max(maxY, o.y + L.H / 2);
    }
    const shown = new Set(occs.filter((o) => o.kind === 'real').map((o) => o.person.id));
    const years = occs.filter((o) => o.kind === 'real' && o.p.birth).map((o) => o.p.birth.year);
    const outside = [...P.values()].filter((p) => p.kind === 'real' && !placed.has(p.id));
    return {
      nodes: occs,
      byId: new Map(occs.map((o) => [o.id, o])),
      edges,
      gens: [...gens.values()].sort((a, b) => b.gen - a.gen),
      bounds: { minX, maxX, minY, maxY },
      horizontal: hor,
      self,
      outside,
      families: comp + 1,
      stats: {
        people: shown.size,
        upGens: Math.max(0, ...occs.map((o) => o.gen)),
        downGens: Math.max(0, ...occs.map((o) => -o.gen)),
        oldest: years.length ? Math.min(...years) : null,
      },
    };
  };
})();
