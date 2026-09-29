// e-Devlet Alt-Üst Soy sayfasında tabloyu bulur; tablonun üstüne "Soy ağacına ekle" şeridi ve sağ alta kısayol düğmesi ekler.
(function () {
  'use strict';
  const NS = globalThis.SoyAgaci;
  if (NS.started) return;
  NS.started = true;

  const GREEN = '#0f8a6a';
  const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
  const TREE_ICON = '<svg width="18" height="18" viewBox="0 0 26 26" aria-hidden="true"><g fill="currentColor"><rect x="3" y="4" width="8" height="6" rx="1.8"/><rect x="15" y="4" width="8" height="6" rx="1.8"/><rect x="9" y="16" width="8" height="6" rx="1.8"/></g><path d="M7 10v3h12v-3M13 13v3" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>';

  function openViewer() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) chrome.runtime.sendMessage({ type: 'open-viewer' });
    else window.open('viewer.html', '_blank'); // yerel test sayfası
  }

  function inject(found) {
    const parsed = NS.parseTable(found);
    const rec = NS.makeImport(parsed, 'e-Devlet');

    const banner = document.createElement('div');
    banner.id = 'soyagaci-banner';
    banner.style.cssText = 'margin:0 0 14px;';
    const sr = banner.attachShadow({ mode: 'open' });
    sr.innerHTML = `
      <style>
        :host{all:initial;display:block}
        .b{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:12px;background:linear-gradient(90deg,#e8f6f1,#f3faf7);
          border:1px solid #bfe3d6;font:14px/1.4 ${FONT};color:#13352b;flex-wrap:wrap}
        .ic{flex:none;width:36px;height:36px;border-radius:10px;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center}
        .t{flex:1;min-width:220px} .t b{display:block;font-size:14.5px} .t span{font-size:12.5px;color:#3d5f54}
        .btns{display:flex;gap:8px}
        button{font:600 13.5px/1 ${FONT};border-radius:9px;padding:10px 16px;cursor:pointer;white-space:nowrap;border:1px solid ${GREEN}}
        .main{background:${GREEN};color:#fff} .sec{background:#fff;color:${GREEN}}
        button:hover{filter:brightness(1.06)} button:focus-visible{outline:2px solid #0b5e49;outline-offset:2px}
        button[hidden]{display:none}
      </style>
      <div class="b"><div class="ic">${TREE_ICON}</div>
        <div class="t"><b class="title"></b><span class="sub"></span></div>
        <div class="btns"><button type="button" class="sec open">Soy ağacını aç</button><button type="button" class="main add">Soy ağacına ekle</button></div></div>`;
    const title = sr.querySelector('.title'), sub = sr.querySelector('.sub');
    const addBtn = sr.querySelector('.add'), openBtn = sr.querySelector('.open');
    const who = rec.ownerName ? rec.ownerName.toLocaleLowerCase('tr-TR').replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toLocaleUpperCase('tr-TR')) : 'Bu kişi';

    async function refresh() {
      const { imports } = await NS.store.load();
      const has = imports.find((i) => i.ownerKey && i.ownerKey === rec.ownerKey);
      title.textContent = has ? `${who} listesi soy ağacında` : `${who} listesini soy ağacına ekleyin`;
      sub.textContent = has
        ? `${parsed.people.length} kişi. Yeniden eklerseniz ağaçtaki liste bu sayfadakiyle güncellenir.`
        : `${parsed.people.length} kişi bulundu. Ortak kişiler önceki listelerle kendiliğinden birleşir. Veriler yalnızca bu tarayıcıda saklanır.`;
      addBtn.textContent = has ? 'Güncelle' : 'Soy ağacına ekle';
      openBtn.hidden = !imports.length;
    }
    addBtn.onclick = async () => {
      addBtn.disabled = true;
      await NS.store.addImport(NS.makeImport(parsed, 'e-Devlet'));
      await refresh();
      addBtn.disabled = false;
      openViewer();
    };
    openBtn.onclick = openViewer;
    refresh();

    const anchor = found.table.closest('.resultContainer') || found.table;
    anchor.parentNode.insertBefore(banner, anchor);

    const fab = document.createElement('div');
    fab.id = 'soyagaci-fab';
    fab.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host{all:initial;position:fixed;right:22px;bottom:22px;z-index:2147483000}
        button{display:flex;align-items:center;gap:8px;font:600 13.5px ${FONT};background:${GREEN};color:#fff;border:0;border-radius:24px;
          padding:11px 16px 11px 13px;cursor:pointer;box-shadow:0 6px 18px rgba(15,138,106,.35)}
        button:hover{filter:brightness(1.08)} button:focus-visible{outline:2px solid #0b5e49;outline-offset:2px}
      </style>
      <button type="button" title="Soy ağacını aç">${TREE_ICON}Soy Ağacı</button>`;
    fab.shadowRoot.querySelector('button').onclick = async () => {
      const { imports } = await NS.store.load();
      if (!imports.length) await NS.store.addImport(NS.makeImport(parsed, 'e-Devlet'));
      refresh();
      openViewer();
    };
    document.body.appendChild(fab);

    const printStyle = document.createElement('style');
    printStyle.textContent = '@media print{#soyagaci-banner,#soyagaci-fab{display:none!important}}';
    document.head.appendChild(printStyle);
  }

  function tryInit() {
    const found = NS.findTable(document);
    if (!found) return false;
    inject(found);
    return true;
  }

  if (!tryInit()) {
    const mo = new MutationObserver(() => { if (tryInit()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 60000);
  }
})();
