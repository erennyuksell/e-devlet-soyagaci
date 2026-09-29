// e-Devlet "Alt-Üst Soy Bilgisi" tablosunu okur ve her satırı bir kişi kaydına çevirir.
(function () {
  'use strict';
  const NS = (globalThis.SoyAgaci = globalThis.SoyAgaci || {});

  const clean = (s) => (s || '').replace(/[ \s]+/g, ' ').trim();
  const lower = (s) => clean(s).toLocaleLowerCase('tr-TR');
  // Türkçe karakterleri ASCII'ye indirger; "BABASI" ile "Babası" aynı sonucu verir.
  const fold = (s) =>
    lower(s).replace(/[ıİ]/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's')
      .replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');

  NS.clean = clean;
  NS.lower = lower;
  NS.fold = fold;

  // <br> ve blok öğeleri boşluk sayarak hücre metnini çıkarır ("ORDU<br>01/07/1861" -> "ORDU 01/07/1861").
  function cellText(el) {
    let out = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) out += c.data;
        else if (c.nodeType === 1) {
          const tag = c.tagName;
          if (tag === 'BR') { out += ' '; continue; }
          if (tag === 'SCRIPT' || tag === 'STYLE') continue;
          const block = /^(DIV|P|LI|UL|OL|H\d)$/.test(tag);
          if (block) out += ' ';
          walk(c);
          if (block) out += ' ';
        }
      }
    })(el);
    return clean(out);
  }

  // Sütunları başlık metninden bulur; sıra değişse de çalışır. Sıra önemli: "Soyadı" "Adı"dan önce denenir.
  const COLUMNS = [
    ['relation', /yakinlik/],
    ['registry', /cilt|hane/],
    ['surname', /soyad/],
    ['father', /baba\s*ad/],
    ['mother', /^(ana|anne)\s*ad/],
    ['birth', /dogum/],
    ['place', /mahalle|koy|ilce/],
    ['marital', /medeni/],
    ['status', /durum/],
    ['gender', /^c$|^cins/],
    ['order', /^sira( no)?$/],
    ['name', /^adi?$/],
  ];

  function mapHeader(row) {
    const map = {};
    let col = 0;
    for (const cell of row.cells) {
      const t = fold(cellText(cell));
      for (const [key, re] of COLUMNS) {
        if (!(key in map) && re.test(t)) { map[key] = col; break; }
      }
      col += cell.colSpan || 1;
    }
    return map;
  }

  function rowValues(row) {
    const vals = [];
    for (const cell of row.cells) {
      vals.push(cellText(cell));
      for (let i = 1; i < (cell.colSpan || 1); i++) vals.push('');
    }
    return vals;
  }

  NS.findTable = function (doc) {
    for (const table of doc.querySelectorAll('table')) {
      const rows = Array.from(table.rows);
      for (let i = 0; i < rows.length && i < 10; i++) {
        const map = mapHeader(rows[i]);
        if ('relation' in map && 'name' in map) return { table, headerIndex: i, map };
      }
    }
    return null;
  };

  // Yakınlık kelimeleri: F baba, M anne (yukarı); S oğul, D kız, C evlatlık (aşağı).
  const STEP = {
    babasi: 'F', babasinin: 'F',
    annesi: 'M', annesinin: 'M', anasi: 'M', anasinin: 'M',
    oglu: 'S', oglunun: 'S',
    kizi: 'D', kizinin: 'D',
    evlatligi: 'C', evlatliginin: 'C',
  };

  NS.parseRelation = function (text) {
    const words = fold(text).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    if (words.length === 1 && words[0] === 'kendisi') return [];
    const path = [];
    for (const w of words) {
      const s = STEP[w];
      if (!s) return null;
      path.push(s);
    }
    return path;
  };

  function parseDate(s) {
    const m = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(s);
    if (m) {
      return {
        text: `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`,
        year: +m[3], month: +m[2], day: +m[1], raw: m[0],
      };
    }
    const y = /\b(1[4-9]\d\d|20\d\d)\b/.exec(s);
    return y ? { text: y[1], year: +y[1], month: 0, day: 0, raw: y[0] } : null;
  }
  NS.parseDate = parseDate;

  const dash = (s) => (/^[-–—]*$/.test(s) ? '' : s);

  NS.parseTable = function (found) {
    const { table, headerIndex, map } = found;
    const people = [];
    const unplaced = [];
    Array.from(table.rows).slice(headerIndex + 1).forEach((row) => {
      const v = rowValues(row);
      const get = (k) => (k in map ? clean(v[map[k]] || '') : '');
      const relation = get('relation');
      if (!relation || /yakinlik/.test(fold(relation))) return; // açıklama ve tekrar eden başlık satırları
      const path = NS.parseRelation(relation);

      const birthRaw = get('birth');
      const birth = parseDate(birthRaw);
      const statusRaw = get('status');
      const death = parseDate(statusRaw);
      const status = clean((death ? statusRaw.replace(death.raw, '') : statusRaw).replace(/[\s\-–—]+$/, ''));
      const sf = fold(status);
      const deceased = /olum|olu\b|vefat|oldu/.test(sf);

      const g = fold(get('gender'));
      let gender = g.startsWith('e') ? 'E' : g.startsWith('k') ? 'K' : '';
      if (!gender && path && path.length) {
        const last = path[path.length - 1];
        gender = last === 'F' || last === 'S' ? 'E' : last === 'M' || last === 'D' ? 'K' : '';
      }

      const person = {
        order: parseInt(get('order'), 10) || people.length + unplaced.length + 1,
        gender,
        relation,
        path,
        name: dash(get('name')),
        surname: dash(get('surname')),
        father: dash(get('father')),
        mother: dash(get('mother')),
        birthPlace: dash(clean(birth ? birthRaw.replace(birth.raw, '') : birthRaw)),
        birth,
        place: dash(get('place')),
        registry: dash(get('registry')),
        marital: dash(get('marital')),
        status: dash(status),
        death,
        deceased,
        alive: !deceased && /sag/.test(sf),
        row,
      };
      (path ? people : unplaced).push(person);
    });
    return { people, unplaced };
  };
})();
