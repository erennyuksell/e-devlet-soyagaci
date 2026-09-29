// Birden çok soy listesini tek bir aile grafiğinde birleştirir.
// Her liste kendi "Kendisi"ne göre yazılmıştır; önce her listedeki kişiler anne-baba bağlarıyla çözülür,
// sonra aynı kişiler (ad + baba adı + ana adı + doğum tarihi) listeler arasında tek kişiye indirgenir.
(function () {
  'use strict';
  const NS = globalThis.SoyAgaci;

  const UP = /^[FM]*$/;
  const DOWN = /^[SDC]*$/;
  const genderOf = (step) => (step === 'F' || step === 'S' ? 'E' : step === 'M' || step === 'D' ? 'K' : '');
  const WORD = {
    F: ['Babası', 'Babasının'], M: ['Annesi', 'Annesinin'], S: ['Oğlu', 'Oğlunun'], D: ['Kızı', 'Kızının'],
    C: ['Çocuğu', 'Çocuğunun'], B: ['Kardeşi', 'Kardeşinin'],
  };

  // Yakınlık yolunu ("F","B","S" gibi adımlar) Türkçe yakınlık metnine çevirir.
  NS.relText = (rel) =>
    !rel || !rel.length ? 'Kendisi' : rel.map((c, i) => WORD[c][i === rel.length - 1 ? 0 : 1]).join(' ');

  // Bilinen kısa akrabalık adları (amca, teyze, kuzen...). Bulunamazsa boş döner.
  NS.kinName = (rel, gender) => {
    const k = (rel || []).join('');
    const E = gender === 'E', K = gender === 'K';
    const map = {
      '': 'Kendisi', F: 'Babası', M: 'Annesi', FF: 'Dedesi', MF: 'Dedesi', FM: 'Babaannesi', MM: 'Anneannesi',
      B: E ? 'Erkek kardeşi' : K ? 'Kız kardeşi' : 'Kardeşi',
      FB: E ? 'Amcası' : K ? 'Halası' : '', MB: E ? 'Dayısı' : K ? 'Teyzesi' : '',
    };
    if (k in map) return map[k];
    if (/^[SDC]$/.test(k)) return E ? 'Oğlu' : K ? 'Kızı' : 'Çocuğu';
    if (/^[SDC]{2}$/.test(k)) return 'Torunu';
    if (/^B[SDC]$/.test(k)) return 'Yeğeni';
    if (/^[FM]B[SDC]$/.test(k)) return 'Kuzeni';
    if (/^[SDC][FM]$/.test(k)) return 'Eşi';
    if (/^[SDC][FM][FM]$/.test(k)) return E ? 'Kayınpederi' : 'Kayınvalidesi';
    if (/^S[SDC]M$/.test(k)) return 'Gelini';
    if (/^D[SDC]F$/.test(k)) return 'Damadı';
    if (/^[FM]{2}$/.test(k)) return '';
    if (/^[FM]{3}$/.test(k)) return E ? 'Büyük dedesi' : 'Büyük ninesi';
    return '';
  };

  NS.identity = (p) =>
    p && p.name ? [p.name, p.father, p.mother, p.birth && p.birth.text].map((s) => NS.fold(s || '')).join('|') : '';

  function synthetic(step, name, source) {
    return { name: name || '', surname: '', gender: genderOf(step), source };
  }

  // Tek bir listenin satırlarını anne-baba bağlarıyla çözer. Tabloda olmayan ara halkalar "gap" olarak eklenir.
  function resolveImport(imp) {
    const ref = (s) => `${imp.id}|${s}`;
    const up = new Map();
    const down = [];
    const out = [];
    let seq = 0;
    const mk = (key, p, kind) => {
      const n = { ref: ref(UP.test(key) ? key : key + '#' + seq++), key, p, kind, imp: imp.id, gender: p.gender || genderOf(key[key.length - 1]) };
      out.push(n);
      return n;
    };

    const downPeople = [];
    for (const p of imp.people) {
      const key = p.path.join('');
      if (UP.test(key)) { if (!up.has(key)) up.set(key, mk(key, p, 'real')); }
      else if (DOWN.test(key)) downPeople.push(p);
    }
    if (!up.has('')) up.set('', mk('', synthetic('', '', ''), 'gap'));
    const self = up.get('');
    self.owner = true;

    const missing = new Set();
    for (const key of up.keys()) for (let i = 1; i < key.length; i++) if (!up.has(key.slice(0, i))) missing.add(key.slice(0, i));
    for (const key of [...missing].sort((a, b) => a.length - b.length)) {
      const step = key[key.length - 1];
      const child = up.get(key.slice(0, -1));
      const name = child && child.kind === 'real' ? (step === 'F' ? child.p.father : child.p.mother) : '';
      up.set(key, mk(key, synthetic(step, name, name ? (step === 'F' ? 'father' : 'mother') : ''), 'gap'));
    }
    for (const n of up.values()) {
      if (!n.key) continue;
      const child = up.get(n.key.slice(0, -1));
      if (n.key.endsWith('F')) child.fatherRef = n.ref; else child.motherRef = n.ref;
    }

    // Alt soy: "Oğlunun Kızı" hangi oğula bağlanacak? Torunun "Baba Adı" ile oğulun adı eşleştirilir.
    const same = (a, b) => a && b && NS.fold(a) === NS.fold(b);
    function parentFor(key, kidP) {
      const pk = key.slice(0, -1);
      if (!pk) return self;
      const step = pk[pk.length - 1];
      const want = step === 'S' ? kidP.father : step === 'D' ? kidP.mother : '';
      const cands = down.filter((n) => n.key === pk);
      const hit = cands.find((n) => same(n.p.name, want)) || (cands.length === 1 ? cands[0] : null);
      if (hit) return hit;
      const gap = mk(pk, synthetic(step, want, want ? 'child' : ''), 'gap');
      link(gap, parentFor(pk, gap.p));
      down.push(gap);
      return gap;
    }
    function link(kid, parent) {
      if (parent.gender === 'K') kid.motherRef = parent.ref; else kid.fatherRef = parent.ref;
    }
    downPeople.sort((a, b) => a.path.length - b.path.length);
    for (const p of downPeople) {
      const key = p.path.join('');
      const n = mk(key, p, 'real');
      link(n, parentFor(key, p));
      down.push(n);
    }
    return out;
  }

  NS.buildGraph = function (imports) {
    const locals = [];
    for (const imp of imports) locals.push(...resolveImport(imp));
    const byRef = new Map(locals.map((l) => [l.ref, l]));

    // union-find: her grup tek bir gerçek kişiyi temsil eder
    const parent = new Map(locals.map((l) => [l.ref, l.ref]));
    const members = new Map(locals.map((l) => [l.ref, [l]]));
    const find = (r) => { while (parent.get(r) !== r) { parent.set(r, parent.get(parent.get(r))); r = parent.get(r); } return r; };
    const info = (root) => {
      const ms = members.get(root);
      const real = ms.find((m) => m.kind === 'real');
      return { id: real ? NS.identity(real.p) : '', name: (real || ms.find((m) => m.p.name) || ms[0]).p.name || '', gender: (ms.find((m) => m.gender) || {}).gender || '' };
    };
    function compatible(a, b, force) {
      const A = info(a), B = info(b);
      if (A.gender && B.gender && A.gender !== B.gender) return false;
      if (force) return true;
      if (A.id && B.id) return A.id === B.id;
      const na = NS.fold(A.name), nb = NS.fold(B.name);
      return !na || !nb || na === nb || na.startsWith(nb + ' ') || nb.startsWith(na + ' ');
    }
    function union(a, b, force) {
      a = find(a); b = find(b);
      if (a === b || !compatible(a, b, force)) return false;
      parent.set(b, a);
      members.get(a).push(...members.get(b));
      members.delete(b);
      return true;
    }

    // 1) aynı kimlik bilgisine sahip gerçek satırlar
    const byId = new Map();
    for (const l of locals) {
      if (l.kind !== 'real') continue;
      const id = NS.identity(l.p);
      if (!id) continue;
      if (byId.has(id)) union(byId.get(id), l.ref); else byId.set(id, l.ref);
    }
    // 2) kullanıcının "bu liste şu kişiye ait" diye elle bağladıkları
    for (const imp of imports) {
      if (imp.attachTo && byRef.has(imp.attachTo)) union(imp.attachTo, `${imp.id}|`, true);
    }
    // 3) bir kişinin tek babası ve tek annesi olur: aynı kişinin farklı listelerdeki anne/babaları birleştirilir
    for (let changed = true, guard = 0; changed && guard < 50; guard++) {
      changed = false;
      for (const role of ['fatherRef', 'motherRef']) {
        const seen = new Map();
        for (const l of locals) {
          if (!l[role]) continue;
          const c = find(l.ref), p = find(l[role]);
          if (!seen.has(c)) seen.set(c, p);
          else if (find(seen.get(c)) !== p && union(seen.get(c), p)) changed = true;
        }
      }
    }

    const persons = new Map();
    for (const [root, ms] of members) {
      const real = ms.find((m) => m.kind === 'real');
      const named = real || ms.find((m) => m.p.name) || ms[0];
      persons.set(root, {
        id: root,
        kind: real ? 'real' : 'gap',
        p: named.p,
        gender: (ms.find((m) => m.gender) || {}).gender || '',
        members: ms.map((m) => m.ref),
        imports: [...new Set(ms.map((m) => m.imp))],
        owners: ms.filter((m) => m.owner).map((m) => m.imp),
        father: null, mother: null, children: [],
      });
    }
    for (const l of locals) {
      const me = persons.get(find(l.ref));
      if (l.fatherRef && !me.father) me.father = find(l.fatherRef);
      if (l.motherRef && !me.mother) me.mother = find(l.motherRef);
    }
    for (const p of persons.values()) {
      for (const par of [p.father, p.mother]) if (par && persons.get(par) && !persons.get(par).children.includes(p.id)) persons.get(par).children.push(p.id);
    }

    const extra = [];
    for (const imp of imports) {
      for (const u of imp.unplaced || []) extra.push({ ...u, imp: imp.id });
      for (const u of imp.people) {
        const k = u.path.join('');
        if (!UP.test(k) && !DOWN.test(k)) extra.push({ ...u, imp: imp.id });
      }
    }
    return {
      persons,
      find: (ref) => (parent.has(ref) ? persons.get(find(ref)) : null),
      extra,
      imports,
    };
  };
})();
