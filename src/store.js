// Eklenen soy listelerini tarayıcıda saklar (chrome.storage.local). Veri hiçbir sunucuya gitmez.
(function () {
  'use strict';
  const NS = globalThis.SoyAgaci;
  const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  // Eklenti dışında (yerel test sayfası) localStorage'a düşer.
  const area = hasChrome
    ? { get: (k) => chrome.storage.local.get(k), set: (o) => chrome.storage.local.set(o) }
    : {
        get: async (keys) => { const o = {}; for (const k of keys) { try { const v = localStorage.getItem('soyagaci:' + k); if (v) o[k] = JSON.parse(v); } catch (e) { /* yok say */ } } return o; },
        set: async (o) => { for (const k in o) { try { localStorage.setItem('soyagaci:' + k, JSON.stringify(o[k])); } catch (e) { /* yok say */ } } },
      };

  // Ayrıştırılmış tabloyu saklanabilir bir "liste" kaydına çevirir (DOM referansları atılır).
  NS.makeImport = function (parsed, source) {
    const strip = (p) => { const o = { ...p }; delete o.row; return o; };
    const people = parsed.people.map(strip);
    const self = people.find((p) => p.path.length === 0);
    return {
      id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      addedAt: new Date().toISOString(),
      source,
      ownerKey: self ? NS.identity(self) : '',
      ownerName: self ? [self.name, self.surname].filter(Boolean).join(' ') : 'Bilinmeyen',
      people,
      unplaced: parsed.unplaced.map(strip),
      attachTo: null,
    };
  };

  NS.store = {
    async load() {
      const o = await area.get(['imports', 'prefs']);
      return { imports: o.imports || [], prefs: o.prefs || {} };
    },
    // Aynı kişinin listesi daha önce eklendiyse yenisiyle değiştirilir (bağlantısı korunur).
    async addImport(rec) {
      const { imports } = await this.load();
      const old = rec.ownerKey ? imports.find((i) => i.ownerKey === rec.ownerKey) : null;
      if (old) { rec.id = old.id; rec.attachTo = rec.attachTo || old.attachTo; }
      const next = old ? imports.map((i) => (i === old ? rec : i)) : imports.concat(rec);
      await area.set({ imports: next });
      return { replaced: !!old, rec };
    },
    async removeImport(id) {
      const { imports, prefs } = await this.load();
      const next = imports.filter((i) => i.id !== id).map((i) => (i.attachTo && i.attachTo.startsWith(id + '|') ? { ...i, attachTo: null } : i));
      await area.set({ imports: next });
      if (prefs.focus && prefs.focus.startsWith(id + '|')) await this.setPrefs({ focus: null });
    },
    async replaceAll(imports) { await area.set({ imports }); },
    async setPrefs(patch) {
      const { prefs } = await this.load();
      await area.set({ prefs: { ...prefs, ...patch } });
    },
    onChange(cb) {
      if (hasChrome && chrome.storage.onChanged) chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && ch.imports) cb(); });
      else window.addEventListener('storage', (e) => { if (e.key === 'soyagaci:imports') cb(); });
    },
  };
})();
