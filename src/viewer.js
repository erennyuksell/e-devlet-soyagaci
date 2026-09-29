// Tam ekran soy ağacı sayfası: saklanan listeleri yükler, birleştirir, çizer; listeler değişince yeniden çizer.
(function () {
  'use strict';
  const NS = globalThis.SoyAgaci;

  const viewer = NS.mountViewer({
    async onFocus(ref) {
      await NS.store.setPrefs({ focus: ref });
      render(true);
    },
    // Listeler penceresinden: o listenin sahibini merkeze al. Başka bir liste tek başına gösteriliyorsa filtre kalkar.
    async onFocusList(id) {
      const { prefs } = await NS.store.load();
      await NS.store.setPrefs({ focus: `${id}|`, only: prefs.only && prefs.only !== id ? null : prefs.only || null });
      render(true);
    },
    // id: yalnız bu listeyi göster; null: bütün listeleri birleşik göster
    async onShowOnly(id) {
      await NS.store.setPrefs(id ? { only: id, focus: `${id}|` } : { only: null });
      render(true);
    },
    async onAdd(rec) {
      await NS.store.addImport(rec);
      render(false);
    },
    async onRemove(id) {
      await NS.store.removeImport(id);
      render(false);
    },
    // imports === null: hepsini sil; aksi halde yedekteki listeleri mevcutlarla birleştir
    async onRestore(imports) {
      if (imports === null) { await NS.store.replaceAll([]); await NS.store.setPrefs({ focus: null }); render(true); return; }
      for (const rec of imports) if (rec && Array.isArray(rec.people)) await NS.store.addImport(rec);
      render(false);
    },
  });

  async function render(refit) {
    const { imports, prefs } = await NS.store.load();
    const only = prefs.only && imports.some((i) => i.id === prefs.only) ? prefs.only : null;
    const shown = only ? imports.filter((i) => i.id === only) : imports;
    const graph = NS.buildGraph(shown);
    let focus = prefs.focus && graph.find(prefs.focus);
    if (!focus && shown.length) focus = graph.find(`${shown[0].id}|`);
    viewer.update(graph, focus ? focus.id : null, refit, { all: imports, only });
  }

  NS.store.onChange(() => render(false));
  render(true);
})();
