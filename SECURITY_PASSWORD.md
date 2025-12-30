# 🔐 Zabezpieczenie Hasłem - Dokumentacja

## 🎯 **Przegląd**

Aplikacja Generator Opisów Produktów jest zabezpieczona hasłem przed nieautoryzowanym dostępem.

---

## 🔑 **Domyślne Hasło**

```
Hasło: gtv2025
```

**⚠️ ZMIEŃ TO HASŁO natychmiast po pierwszym użyciu!**

---

## 📋 **Jak działa zabezpieczenie?**

### **1. Ekran logowania**
- Przy pierwszym wejściu na stronę pojawia się ekran logowania
- Użytkownik musi wprowadzić hasło
- Hasło jest weryfikowane lokalnie (SHA-256 hash)

### **2. Sesja użytkownika**
- Po poprawnym zalogowaniu sesja jest zapisywana w Session Storage
- Sesja trwa do zamknięcia przeglądarki
- Przy następnym uruchomieniu przeglądarki: ponowne logowanie

### **3. Bezpieczeństwo**
- Hasło NIE jest przechowywane w kodzie (tylko hash SHA-256)
- Niemożliwe do odczytania z kodu źródłowego
- Brak połączenia z serwerem - wszystko działa lokalnie

---

## 🔧 **Jak zmienić hasło?**

### **Metoda 1: Online Generator (NAJPROSTSZE)**

1. **Wejdź na generator SHA-256:**
   ```
   https://emn178.github.io/online-tools/sha256.html
   ```

2. **Wpisz swoje nowe hasło** (np. `mojeSuperHaslo123`)

3. **Skopiuj wygenerowany hash** (długi ciąg znaków)
   ```
   Przykład: a8f5f167f44f4964e6c998dee827110c
   ```

4. **Edytuj `auth.js` na GitHubie:**
   - Znajdź linię:
     ```javascript
     const PASSWORD_HASH = 'a8f5f167f44f4964e6c998dee827110c5595f69930cd30c6f8b4c1c3';
     ```
   - Zamień hash na nowy
   - Commit: `Update password`

5. **Poczekaj 2-3 minuty** (GitHub Pages rebuild)

6. **Gotowe!** Nowe hasło działa

---

### **Metoda 2: Konsola przeglądarki**

**Dla zaawansowanych użytkowników:**

```javascript
async function generatePasswordHash(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('Nowy hash:', hashHex);
}

// Użyj:
generatePasswordHash('twoje_nowe_haslo');
```

**Kroki:**
1. Otwórz konsolę przeglądarki (F12)
2. Wklej powyższy kod
3. Wywołaj: `generatePasswordHash('twoje_nowe_haslo')`
4. Skopiuj hash z konsoli
5. Zamień w `auth.js`

---

## 👥 **Multi-user (wiele haseł)**

### **Jeśli chcesz różne hasła dla różnych użytkowników:**

**Edytuj `auth.js`:**

```javascript
// Zamiast jednego hasha:
const PASSWORD_HASH = 'hash1';

// Użyj tablicy:
const ALLOWED_PASSWORD_HASHES = [
    'hash_uzytkownik_1',  // Admin
    'hash_uzytkownik_2',  // User 1
    'hash_uzytkownik_3',  // User 2
];

// I zmień walidację:
if (ALLOWED_PASSWORD_HASHES.includes(enteredPasswordHash)) {
    // OK
}
```

---

## 🚨 **Troubleshooting**

### **Problem: Hasło nie działa**

**Rozwiązanie:**
1. Sprawdź czy hash jest poprawny
2. Wyczyść cache przeglądarki (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+F5)
4. Sprawdź Console (F12) - czy są błędy?

---

### **Problem: Ekran logowania się nie pojawia**

**Rozwiązanie:**
1. Sprawdź czy `auth.js` jest w root repozytorium
2. Sprawdź Console (F12) - szukaj błędów
3. Sprawdź czy `<script src="auth.js"></script>` jest w `index.html`
4. Hard refresh (Ctrl+F5)

---

### **Problem: Zapomniałem hasła**

**Rozwiązanie:**
1. Nie ma problemu! Możesz ustawić nowe hasło
2. Wygeneruj nowy hash (Metoda 1 powyżej)
3. Zamień w `auth.js`
4. Poczekaj 2-3 min (rebuild)
5. Użyj nowego hasła

---

## 🔒 **Najlepsze praktyki bezpieczeństwa**

### **1. Zmień domyślne hasło**
- ❌ NIE używaj `gtv2025`
- ✅ Użyj silnego, unikalnego hasła
- ✅ Min. 12 znaków, wielkie/małe litery, cyfry, znaki specjalne

### **2. Udostępniaj hasło bezpiecznie**
- ❌ NIE wysyłaj emailem/Slackiem/SMS
- ✅ Przekaż osobiście
- ✅ Użyj zaszyfrowanego komunikatora (Signal, WhatsApp)
- ✅ Użyj menedżera haseł (1Password, Bitwarden)

### **3. Rotacja haseł**
- ✅ Zmień hasło co 3 miesiące
- ✅ Zmień hasło gdy ktoś opuszcza zespół
- ✅ Zmień hasło gdy podejrzewasz wyciek

### **4. Private repository**
- ✅ Ustaw repo jako Private na GitHubie
- ✅ Tylko zespół ma dostęp do kodu
- ✅ Hasło + Private repo = 2 warstwy ochrony

---

## 📚 **Dodatkowe zasoby**

- **GitHub repo:** https://github.com/kamilgajda555-cmyk/Opisyproduktowe
- **Aplikacja:** https://kamilgajda555-cmyk.github.io/Opisyproduktowe/
- **SHA-256 Generator:** https://emn178.github.io/online-tools/sha256.html
- **Dokumentacja:** README.md, SETUP_SIMPLIFIED.md

---

## 📞 **Wsparcie**

**GTV Poland**
- 🌐 Web: https://gtv.com.pl
- 📧 Email: kontakt@gtv.com.pl
- 📱 Tel: +48 XX XXX XX XX

---

## 🎯 **Szybki Start**

1. **Otwórz aplikację:** https://kamilgajda555-cmyk.github.io/Opisyproduktowe/
2. **Wprowadź hasło:** `gtv2025`
3. **Zmień hasło** (patrz: Metoda 1)
4. **Gotowe!** Aplikacja zabezpieczona

---

© 2025 GTV Poland | Powered by Google Gemini 2.5 Pro
