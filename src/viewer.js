// Tam ekran soy ağacı sayfası: saklanan listeleri yükler, birleştirir, çizer; listeler değişince yeniden çizer.
(function () {
  'use strict';
  const NS = globalThis.SoyAgaci;

  const viewer = NS.mountViewer({
    async onFocus(ref) {
      await NS.store.setPrefs({ focus: ref });
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
    const graph = NS.buildGraph(imports);
    let focus = prefs.focus && graph.find(prefs.focus);
    if (!focus && imports.length) focus = graph.find(`${imports[0].id}|`);
    viewer.update(graph, focus ? focus.id : null, refit);
  }

  NS.store.onChange(() => render(false));
  render(true);
})();
