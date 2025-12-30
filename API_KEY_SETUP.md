# 🔑 JAK SKONFIGUROWAĆ KLUCZ API GEMINI

## ⚠️ WAŻNE: Klucz API NIE MOŻE BYĆ W REPOZYTORIUM!

Klucz API Gemini jest **prywatny** i **nie powinien** być commitowany do GitHub!

---

## 📝 INSTRUKCJA KROK PO KROKU

### **KROK 1: Wygeneruj klucz API**

1. Otwórz: https://aistudio.google.com/app/apikey
2. Zaloguj się kontem Google
3. Kliknij: **"Create API Key"**
4. Skopiuj klucz (zaczyna się od `AIza...`)

---

### **KROK 2: Wklej klucz w aplikacji**

#### **OPCJA A: Przy pierwszym uruchomieniu (NAJŁATWIEJSZA)**

1. Otwórz aplikację: https://kamilgajda555-cmyk.github.io/Opisyproduktowe/
2. **Pojawi się okienko** z prośbą o klucz API
3. **Wklej swój klucz** i kliknij OK
4. Klucz zostanie zapisany w **localStorage** (tylko w Twojej przeglądarce!)

#### **OPCJA B: Ręczne wpisanie w Console (ZAAWANSOWANE)**

1. Otwórz aplikację
2. Naciśnij **F12** (DevTools)
3. Przejdź do zakładki **Console**
4. Wpisz:
   ```javascript
   localStorage.setItem('gemini_api_key', 'AIza_TWOJ_NOWY_KLUCZ_TUTAJ');
   ```
5. Naciśnij **Enter**
6. Odśwież stronę (**F5**)

---

### **KROK 3: Sprawdź czy działa**

1. Wgraj plik CSV z produktami
2. Wybierz produkt
3. Kliknij: **"Generuj opisy"**
4. Sprawdź Console (F12):
   - ✅ Powinno być: `✅ API Key configured: AIza...`
   - ❌ Jeśli jest: `❌ BRAK KLUCZA API GEMINI!` → powtórz KROK 2

---

## 🔒 BEZPIECZEŃSTWO

### **Co zostało zrobione:**

1. **Klucz API usunięty z kodu** (app.js)
2. **Dodano `.env` do `.gitignore`** → klucze nie będą commitowane
3. **localStorage** przechowuje klucz lokalnie w przeglądarce
4. **Stary klucz zablokowany** przez Google (wyciek wykryty)

### **Dla deweloperów:**

Jeśli chcesz **lokalnie** używać klucza bez okienka:

1. Stwórz plik: `js/api-key.js` (lokalnie, NIE commituj!)
2. Wklej:
   ```javascript
   const API_KEY = 'AIza_TWOJ_KLUCZ';
   ```
3. Dodaj w `index.html` przed `app.js`:
   ```html
   <script src="js/api-key.js"></script>
   ```
4. Plik `js/api-key.js` jest w `.gitignore` → bezpieczny!

---

## ❓ FAQ

### **Q: Co jeśli zapomniałem klucza?**
A: Kliknij w Console:
```javascript
console.log(localStorage.getItem('gemini_api_key'));
```

### **Q: Jak zmienić klucz?**
A: Usuń stary i wpisz nowy:
```javascript
localStorage.removeItem('gemini_api_key');
// Odśwież stronę, pojawi się okienko
```

### **Q: Czy mój klucz jest bezpieczny?**
A: TAK! Jest przechowywany TYLKO w Twojej przeglądarce (localStorage), nie w repozytorium GitHub.

---

## 🚨 CO ZROBIĆ JEŚLI KLUCZ WYCIEKŁ?

1. **Natychmiast usuń stary klucz:** https://aistudio.google.com/app/apikey
2. **Wygeneruj nowy klucz**
3. **Sprawdź GitHub commits:** czy klucz był w commitach?
4. Jeśli tak → **GitHub ma funkcję usuwania sekretów z historii**

---

© 2025 GTV Poland | V7.0.17  
"Bezpieczeństwo API to priorytet!"
