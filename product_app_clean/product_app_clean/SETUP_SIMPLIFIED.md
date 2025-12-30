# ⚡ SETUP - Uproszczona Wersja (Jeden Klucz API)

**Wersja:** V7.0.9 SIMPLIFIED  
**Czas setup:** 2 minuty ⏱️

---

## 🎯 SZYBKI START

### **KROK 1: Wklej Klucz API**

1. **Otwórz plik:** `js/app.js`
2. **Znajdź linię 11:**
   ```javascript
   const API_KEY = 'YOUR_GEMINI_API_KEY_HERE';  // <-- WKLEJ KLUCZ TUTAJ
   ```
3. **Wklej swój klucz Gemini API:**
   ```javascript
   const API_KEY = 'AIzaSyBDg3l3L-4nD-TDlpZLcw-n2lOhLUa7Eh8';  // Twój klucz
   ```
4. **Zapisz plik** (Ctrl+S)

---

### **KROK 2: Deploy Online**

#### **OPCJA A: Netlify Drop (NAJŁATWIEJSZA - 30 sekund)**

```bash
1. Przeciągnij folder product_app/ na:
   👉 https://app.netlify.com/drop

2. Poczekaj 30 sekund ⏳

3. GOTOWE! 🎉
   URL: https://random-name.netlify.app
```

#### **OPCJA B: GitHub Pages (5 minut)**

```bash
1. GitHub → New repository → "product-generator"
2. Upload pliki (drag & drop)
3. Settings → Pages → Enable (Branch: main)
4. Poczekaj 2-3 min
5. GOTOWE! 🎉
   URL: https://TWOJA_NAZWA.github.io/product-generator/
```

---

### **KROK 3: Test Aplikacji**

1. **Otwórz URL aplikacji**
2. **Wgraj CSV:**
   - Kliknij "Wybierz plik CSV"
   - Wybierz ProductReport (pl) 2025-12-29.csv
3. **Generuj opis:**
   - Zaznacz 1 produkt
   - Kliknij "Generuj opisy"
   - Czekaj ~20s
4. **Sprawdź wynik:**
   - ✅ Quality Score: 75-85/100
   - ✅ Brak placeholders
   - ✅ Brak AI-fluff

---

## 🔑 JAK UZYSKAĆ KLUCZ GEMINI API?

### **Instrukcja:**

1. **Otwórz:** https://aistudio.google.com/app/apikey
2. **Zaloguj się** kontem Google
3. **Kliknij:** "Create API Key"
4. **Skopiuj klucz** (zaczyna się od `AIza...`)
5. **Wklej** w `js/app.js` (linia 11)
6. **Zapisz** plik (Ctrl+S)
7. **Deploy** aplikację (Netlify / GitHub Pages)

---

## 💡 WAŻNE

### **✅ Jeden klucz dla wszystkich**
- Wszyscy użytkownicy używają tego samego klucza API
- Klucz wklejony w kodzie (`js/app.js`)
- Brak modalu, brak konfiguracji - aplikacja działa od razu

### **⚠️ Bezpieczeństwo**

#### **Dla internal use (zespół GTV Poland):**
```
✅ OK - hardcoded klucz w kodzie
✅ Repozytorium PRIVATE na GitHub
✅ Zespół ma dostęp do kodu
```

#### **Dla public use (zewnętrzni użytkownicy):**
```
⚠️ NIE używaj hardcoded klucza w public repo!
⚠️ Klucz będzie widoczny dla wszystkich
→ Rozwiązanie: Backend proxy lub funkcje serverless
```

---

## 🚀 DEPLOY OPTIONS

### **1. Netlify Drop (Najprostsze)**
```
⏱️ Czas: 30 sekund
💰 Koszt: DARMOWY
🎯 Best for: Szybki start
```

### **2. GitHub Pages**
```
⏱️ Czas: 5 minut
💰 Koszt: DARMOWY
🎯 Best for: Internal teams
```

### **3. Cloudflare Pages**
```
⏱️ Czas: 2 minuty
💰 Koszt: DARMOWY (unlimited!)
🎯 Best for: Production
```

---

## 🐛 TROUBLESHOOTING

### **Problem: "BRAK KLUCZA API GEMINI" w console**
```bash
Rozwiązanie:
1. Otwórz js/app.js
2. Sprawdź linię 11: const API_KEY = '...'
3. Upewnij się że klucz zaczyna się od AIza...
4. Zapisz plik (Ctrl+S)
5. Odśwież stronę (F5)
```

### **Problem: Gemini API error 401/403**
```bash
Rozwiązanie:
1. Sprawdź klucz API (czy poprawny?)
2. Sprawdź limity: https://aistudio.google.com/app/apikey
3. Sprawdź czy klucz nie wygasł
```

### **Problem: Aplikacja nie ładuje się**
```bash
Rozwiązanie:
1. Ctrl + F5 (Hard Refresh)
2. Sprawdź console (F12) - błędy JS?
3. Sprawdź czy wszystkie pliki wgrane (index.html, js/, css/)
```

---

## 📊 PORÓWNANIE: V7.0.8 vs V7.0.9

| **Feature** | **V7.0.8 (Modal)** | **V7.0.9 (Simplified)** |
|------------|-------------------|------------------------|
| **Setup time** | 5 min (każdy user) | 2 min (raz) ✅ |
| **API Key** | Każdy własny | Jeden wspólny ✅ |
| **Modal** | TAK (przy starcie) | NIE ✅ |
| **LocalStorage** | TAK | NIE ✅ |
| **Konfiguracja** | Każdy user | Tylko admin ✅ |
| **Best for** | Public apps | Internal teams ✅ |

**Rekomendacja dla GTV Poland:** V7.0.9 Simplified ✅

---

## 📞 WSPARCIE

**GTV Poland**  
- 🌐 Web: https://gtv.com.pl  
- 📧 Email: kontakt@gtv.com.pl  
- ☎️ Tel: +48 XX XXX XX XX  

---

## 🎉 TO WSZYSTKO!

**Setup w 2 kroki:**
1. ✅ Wklej klucz API w `js/app.js` (linia 11)
2. ✅ Deploy na Netlify/GitHub Pages

**Aplikacja gotowa!** 🚀

---

© 2025 GTV Poland | Powered by Google Gemini 2.5 Pro
