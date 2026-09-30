# e-Devlet Soy Ağacı (Chrome eklentisi)

e-Devlet "Alt-Üst Soy Bilgisi Sorgulama" sonucundaki satır satır listeyi görsel bir soy ağacına çevirir.
Birden fazla kişinin listesini (anne, baba, amca, teyze...) ekledikçe ortak kişiler eşleşir ve ağaç büyür.

## Kurulum

1. [Releases](https://github.com/erennyuksell/e-devlet-soyagaci/releases/latest) sayfasından `e-devlet-soy-agaci-x.y.z.zip` dosyasını indirip bir klasöre çıkarın. Klasörü silmeyin; eklenti oradan çalışır.
2. Chrome'da `chrome://extensions` adresini açın.
3. Sağ üstten **Geliştirici modu**nu açın.
4. **Paketlenmemiş öğe yükle** düğmesine basıp zip'ten çıkan klasörü (içinde `manifest.json` olan) seçin.

## Kullanım

1. e-Devlet'te **Alt-Üst Soy Bilgisi Sorgulama** sayfasını açın. Tablonun üstünde yeşil bir şerit çıkar.
2. **Soy ağacına ekle** düğmesine basın. Ağaç kendi tam ekran sekmesinde açılır. Araç çubuğundaki eklenti simgesi de bu sekmeyi açar.
3. Ağacı büyütmek için bir akrabanın listesini ekleyin:
   - Kişi bu tarayıcıda kendi e-Devlet hesabıyla aynı sayfayı açıp **Soy ağacına ekle**'ye basabilir, ya da
   - sonuç sayfasını Chrome'da **Farklı kaydet** ile `.html`/`.mhtml` olarak kaydedip size gönderebilir; siz **Liste ekle** penceresinden dosyayı seçersiniz, ya da
   - tabloyu kopyalayıp **Liste ekle** penceresindeki kutuya yapıştırabilirsiniz.
   Ağaçta bir kişiye tıklayıp **Bu kişinin listesini ekle** derseniz liste doğrudan o kişiye bağlanır.
4. Bütün listelerdeki herkes tek ağaçta görünür. Bir kişiye tıklayıp **Ağacı bu kişiye göre çiz** demek yalnızca bakış açısını değiştirir: akrabalık adları ("Amcası", "Eşi") o kişiye göre yazılır ve onun ataları ortaya alınır.

## Ağaçta ne görünür

- Merkezdeki kişinin bütün ataları.
- Her atanın öbür çocukları ve onların soyu: amca, hala, dayı, teyze, kuzenler, yeğenler.
- Merkezdeki kişinin kardeşleri, çocukları ve torunları.
- Kan bağı olmayan ama bağlantılı kişiler: örneğin kuzeninizin eşinin listesi eklendiyse eş ve onun ailesi, ortak çocuğun üstüne bağlanır.
- Hiçbir ortak kişisi olmayan bir liste "AYRI AİLE" etiketiyle aynı ekranın kenarına çizilir.
- **Yalnızca adı bilinen** kişiler kesik çizgili kartla gösterilir. Bu kişilerin listede kendi satırı yoktur; adları çocuklarının satırındaki "Baba Adı" / "Ana Adı" alanından gelir. Örnek: bir kişinin satırında "Ana Adı: LEYLA" yazıyor ama Leyla'nın kendi satırı yoksa, Leyla o kişinin annesi olarak ağaca eklenir. "Bir kuşak daha tahmin et" anahtarı bu kişileri en üst kuşak için de ekler.
- Aynı kişi iki farklı yoldan geliyorsa (akraba evliliği) kartında sayı rozeti çıkar.

## Kişiler nasıl eşleşiyor

İki listedeki satır, **ad + baba adı + ana adı + doğum tarihi** aynıysa tek kişi sayılır. Bir kişinin tek babası ve tek annesi olduğu için, eşleşen kişilerin anne ve babaları da kendiliğinden birleşir.

## Gizlilik

- Eklenti hiçbir sunucuya istek göndermez. Listeler yalnızca bu tarayıcıda (`chrome.storage.local`) saklanır.
- **Listeler** penceresinden tek tek kaldırabilir, hepsini silebilir ya da yedek dosyası (`.json`) indirip başka bir bilgisayara taşıyabilirsiniz.
- Eklenti yalnızca adresinde "soy" geçen `turkiye.gov.tr` sayfalarında çalışır.

## Dosyalar

| Dosya | Görevi |
| --- | --- |
| `src/parse.js` | e-Devlet tablosunu okur, "Annesinin Babası" gibi yakınlık metnini yola çevirir |
| `src/graph.js` | Listeleri tek aile grafiğinde birleştirir |
| `src/layout.js` | Seçili kişiye göre ata, yan kol ve alt soy yerleşimini hesaplar |
| `src/render.js` | Tam ekran görüntüleyici: çizim, arama, ayrıntı paneli, PNG/SVG, liste pencereleri |
| `src/store.js` | Listelerin tarayıcıda saklanması |
| `src/content.js` | e-Devlet sayfasındaki "Soy ağacına ekle" şeridi |
| `src/viewer.js`, `viewer.html` | Tam ekran soy ağacı sekmesi |
| `src/background.js` | Sekmeyi açan arka plan betiği |
| `test/sample.html` | Kurgusal örnek liste (alt soy ve akraba evliliği içerir) |
