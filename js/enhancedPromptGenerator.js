/**
 * Enhanced Prompt Generator V7.0.6
 * Generuje ultra-zoptymalizowane prompty dla Gemini
 */

class EnhancedPromptGenerator {
    constructor() {
        this.rules = window.ECOMMERCE_RULES || {};
        console.log('✅ Enhanced Prompt Generator initialized');
    }

    /**
     * Główna funkcja: generuj prompt dla produktu
     */
    generatePrompt(product, language = 'pl', style = 'professional', keywordData = null) {
        // Wykryj profil długości
        const profile = this.detectLengthProfile(product);
        
        // Zbuduj prompt
        const prompt = this.buildUltraOptimizedPrompt(product, language, style, profile, keywordData);
        
        return prompt;
    }

    /**
     * Wykryj profil długości na podstawie produktu
     */
    detectLengthProfile(product) {
        const name = (product.nazwa || product.name || '').toLowerCase();
        const category = (product.kategoria || '').toLowerCase();
        
        // Complex: zestawy, maszyny
        if (name.includes('zestaw') || name.includes('kit') || name.includes('set') ||
            category.includes('zestaw') || category.includes('maszyn')) {
            return 'complex';
        }
        
        // Technical: narzędzia profesjonalne, urządzenia pomiarowe
        if (category.includes('narzędzi') || category.includes('pomiar') || 
            name.includes('profesjonaln') || name.includes('przemysłow')) {
            return 'technical';
        }
        
        // Standard: reszta
        return 'standard';
    }

    /**
     * Buduj ultra-zoptymalizowany prompt
     */
    buildUltraOptimizedPrompt(product, language, style, profile, keywordData) {
        const profileConfig = this.rules.lengthProfiles?.[profile] || this.rules.lengthProfiles?.standard;
        const readabilityRules = this.rules.readability || {};
        const seoRules = this.rules.seoMeta || {};
        const bannedFluff = this.rules.bannedFluff?.phrases || [];
        
        // Dane produktu
        const productContext = this.buildProductContext(product);
        
        // Keywords
        const keywords = keywordData?.keywords || [];
        const mainKeyword = keywords[0] || product.nazwa || '';
        
        const prompt = `
# ULTRA-OPTYMALIZOWANY PROMPT DLA OPISU E-COMMERCE

⚠️ **CRITICAL RULES - VIOLATION = REJECTION:**
1. NO placeholders ("...", "n...", "xx", "[TBD]") - generate COMPLETE text or STOP
2. NO AI-fluff ("wysokiej jakości", "zaawansowane technologie", "intuicyjny design")
3. NO generic bullet points ("szybka dostawa 24h", "profesjonalna jakość") - use ACTUAL product features
4. EVERY bullet point MUST reference REAL data from product context
5. NO truncated sentences - finish ALL sentences properly

## 🎯 CEL
Wygeneruj **SKANOWALNY, CZYTELNY** opis produktu dla karty e-commerce (nie artykuł!).

---

## 📏 PROFIL: ${profileConfig.name.toUpperCase()}
- **Długość:** ${profileConfig.minChars}-${profileConfig.maxChars} znaków (cel: ${profileConfig.targetChars})
- **Typ:** ${profileConfig.description}

---

## 📦 DANE PRODUKTU

${productContext}

---

## 🔍 KEYWORD GŁÓWNY
**"${mainKeyword}"**

Użyj keyword:
- 1× w Title
- 1× w Meta Description
- 1× w pierwszym akapicie
- 1× w H2
- Reszta naturalnie (gęstość 1-2%)

Synonimy (30%): ${keywords.slice(1, 4).join(', ')}

---

## 📝 STRUKTURA WYMAGANA

### 1. **Meta Title** (50-60 znaków)
Format: [Typ produktu] [Marka/Model] [1 cecha]
Priorytet: typ > marka > model > cecha kluczowa > norma

**ZAKAZ:**
- Przymiotniki: "profesjonalny", "niezawodny", "wysokiej jakości"
- Urwania: "..."
- Powtórzenia: "Sprawdź szczegóły"

**Przykład:**
✅ DOBRY: "Kask ochronny DIEMEL EN 397 biały"
❌ ZŁY: "Profesjonalny kask ochronny najwyższej jakości DIEMEL..."

### 2. **Meta Description** (150-160 znaków)
- Zwięzły
- Keyword 1×
- Korzyść + CTA
- BEZ urwań

**Przykład:**
✅ "Kask DIEMEL EN 397 do prac na wysokości. Wytrzymała konstrukcja ABS, wentylacja, regulacja rozmiaru. Zamów teraz!"

### 3. **Wstęp** (2-3 zdania, max 60 słów)
- Krótki
- Keyword w pierwszym zdaniu
- Problem → Rozwiązanie

### 4. **Bullet Points** (5-8 punktów)
**KAŻDY PUNKT:**
- Max 15 słów
- 1 konkretna korzyść/cecha
- Bez filozofii

**Format:**
- ✅ **Wentylacja:** 4 otwory wentylacyjne zapewniają komfort w upale
- ❌ Rewolucyjny system wentylacji gwarantuje optymalną cyrkulację powietrza

### 5. **Sekcje dodatkowe** (jeśli applicable)
- **Specyfikacja:** tabela (jeśli wymiary/parametry)
- **Zastosowanie:** 2-3 zdania
- **Normy:** TYLKO jeśli w danych produktu

### 6. **💡 Dlaczego warto? (OBOWIĄZKOWA SEKCJA SPRZ ZOWA):**
- **Długość:** 3 zdania, max 15 słów każde (~300 znaków)
- **Format:** HTML <h3>💡 Dlaczego warto?</h3> + <p>3 zdania</p>
- **Treść:** Konkretne korzyści liczbowe ("zwiększa komfort o 50%", "redukuje ryzyko o 70%")
- **Ton:** Sprzedażowy ale faktyczny (BEZ patosu!)

**Przykład:**
```html
<h3>💡 Dlaczego warto?</h3>
<p>
Nakolanniki HOGL zwiększają komfort pracy na kolanach nawet o 50%. Redukują ryzyko kontu zji i bólu stawów. Trwają latami dzięki wytrz ymałym materiałom.
</p>
```

### 7. **CTA** (1 zdanie)
Mocne zakończenie: "Zamów teraz!", "Dodaj do koszyka!", "Sprawdź dostępność!"

---

## 🚫 ZAKAZY ABSOLUTNE

### Placeholders:
- ❌ "xx", "...", "Spra...", "nog..."
- ❌ "[placeholder]", "TBD", "N/A"
→ Jeśli brak danych: pomiń sekcję

### AI-Fluff (ZMIEŃ lub USUŃ):
${bannedFluff.map(f => `- ❌ "${f.banned}" → ✅ "${f.replace}"`).join('\n')}

### Marketing-Fluff:
- ❌ "najlepszy na rynku", "unikalny", "bezkonkurencyjny"
- ❌ "absolutnie", "idealny dla każdego", "must-have"

### Normy:
- ❌ NIE sugeruj norm, których nie ma w danych
- ❌ Jeśli EN 397 → NIE pisz o EN 12492 (chyba że w danych)

### Meta Description - ZAKAZ WYMYŚLANIA:
- ❌ **NIE WYMYŚLAJ funkcji/cech** których nie ma w CSV
- ❌ Jeśli produkt to "próbnik napięcia" - NIE dodawaj "testuje ciągłość" bez potwierdzenia w opisie
- ✅ **TYLKO funkcje POTWIERDZONE** w polach: nazwa, opis, opis_dodatkowy
- ✅ Jeśli brak funkcji - opisz GŁÓWNĄ cechę produktu

### Duplikaty:
- ❌ Nie powtarzaj "Sprawdź szczegóły" w połowie i na końcu

---

## 📖 CZYTELNOŚĆ (ULTRA-STRICT)

### Zdania:
- **Max ${readabilityRules.maxWordsPerSentence} słów** per zdanie
- Średnio ${readabilityRules.avgWordsPerSentence} słów
- Proste konstrukcje (podmiot-orzeczenie-dopełnienie)

### Akapity:
- **Max ${readabilityRules.maxWordsPerParagraph} słów** per akapit
- Max ${readabilityRules.maxSentencesPerParagraph} zdania per akapit
- Odstępy między akapitami (nie blok tekstu)

### Listy:
- Min 1 lista punktowana na ekran
- Bullet points: 5-8 punktów

### Język:
- Prosty, konkretny
- Aktywna strona czasownika
- Bez słów 3+ sylab (jeśli możliwe)

---

## 🔢 SPÓJNOŚĆ DANYCH

### Single Source of Truth:
- Liczby tylko z jednego źródła
- Jeśli w bullets: "15 kieszeni" → w opisie MUSI być również "15 kieszeni" (NIE 14!)
- Jeśli w bullets: "450 g" → w opisie MUSI być "450 g" (NIE 350 g!)

### Brakujące dane techniczne:
- ❌ **NIE WYMYŚLAJ** zakresów napięcia (np. 12-1000 V) jeśli nie ma w CSV
- ❌ **NIE WYMYŚLAJ** kategorii CAT (CAT II, CAT III, CAT IV) jeśli nie ma w CSV
- ❌ **NIE WYMYŚLAJ** stopnia ochrony IP (IP20, IP65) jeśli nie ma w CSV
- ✅ Jeśli brak danych: **pomiń pole** lub napisz "Producent nie podaje"
- Jeśli "3 kieszenie" → opisz 3, nie 4
- Jeśli "11 matryc" → lista musi mieć 11 pozycji

### Wymiary:
- Jeśli podane wymiary → użyj DOKŁADNIE tych samych w każdej sekcji
- Format: Długość × Szerokość × Wysokość

---

## 🎨 TON I STYL

**Język:** ${language === 'pl' ? 'Polski' : language === 'en' ? 'English' : 'Deutsch'}
**Styl:** ${style === 'professional' ? 'Profesjonalny (faktyczny, bez patosu)' : style === 'casual' ? 'Casualowy (przystępny)' : 'Techniczny (precyzyjny)'}

**Ton:**
- Faktyczny, nie patetyczny
- Focus na korzyściach, nie filozofii
- "Do codziennej pracy", nie "integralność strukturalna"

---

## ✅ FORMAT WYJŚCIOWY (JSON)

Zwróć JSON:

\`\`\`json
{
  "title": "Meta Title (50-60 znaków)",
  "metaDescription": "Meta Description (150-160 znaków)",
  "description": "Pełny opis HTML (${profileConfig.minChars}-${profileConfig.maxChars} znaków)",
  "bulletPoints": [
    "Punkt 1 (max 15 słów)",
    "Punkt 2",
    "..."
  ],
  "whyWorthIt": "<h3>💡 Dlaczego warto?</h3><p>3 zdania, max 15 słów każde, konkretne korzyści liczbowe</p>",
  "specifications": {
    "Parametr1": "Wartość1",
    "Parametr2": "Wartość2"
  },
  "cta": "Mocne zakończenie (1 zdanie)"
}
\`\`\`

**UWAGA:** Pole "whyWorthIt" jest OBOWIĄZKOWE! Jeśli brak danych - użyj ogólnych korzyści kategorii produktu.

---

## ❌ ZŁY PRZYKŁAD (NIGDY TAK NIE PISZ!)

**Bullet Points ZŁE:**
```
❌ Kompletny zestaw narzędzi eliminujący potrzebę dodatkowych zakupów
❌ Profesjonalna jakość w przystępnej cenie
❌ Szybka dostawa 24h
```
**DLACZEGO ZŁE:** Generyczne, nie mówią NIC o produkcie!

**Opis ZŁY:**
```
Produkt został wykonany z wysokiej jakości materiałów, co zapewnia wyjątkową trwałość i odporność n...
Zaawansowane technologie produkcji pozwoliły osiągnąć doskonałe parametry jakościowe...
Intuicyjny design sprawia, że obsługa produktu jest niezwykle prosta...
```
**DLACZEGO ZŁY:**
- AI-fluff ('wysokiej jakości', 'zaawansowane technologie', 'intuicyjny design')
- Urwane słowa ('n...')
- Brak konkretów!

---

## ✅ DOBRY PRZYKŁAD (Readability 75+, SEO 70+)

**Title:** Kask ochronny DIEMEL EN 397 biały wysokościowy

**Meta:** Kask DIEMEL EN 397 do prac na wysokości. Wytrzymała konstrukcja ABS, wentylacja, regulacja. Kup online!

**Bullet Points DOBRE (bazują na REALNYCH cechach):**
- ✅ **Norma EN 397:2012+A1:2012** - certyfikat bezpieczeństwa dla prac budowlanych
- ✅ **Materiał ABS 450g** - wytrzymała konstrukcja odporna na uderzenia do -30°C
- ✅ **4 otwory wentylacyjne z regulacją** - komfort w upale
- ✅ **6-punktowa więźba + pasek podbródkowy 150-250N** - bezpieczne dopasowanie
- ✅ **Krótki daszek** - lepsza widoczność podczas pracy

**DLACZEGO DOBRE:** Każdy punkt to KONKRETNA cecha z danych produktu!

**Wstęp DOBRY:**
Kask ochronny DIEMEL to praktyczne rozwiązanie dla prac na wysokości. Spełnia normę EN 397:2012+A1:2012. Zapewnia bezpieczeństwo i komfort przez cały dzień.

**Zastosowanie DOBRE:**
Idealny dla branży budowlanej, elektryków, prac wysokościowych. Dopasowanie 53-61 cm.

**CTA:** Zamów kask DIEMEL i pracuj bezpiecznie!

---

## 🎯 TWOJE ZADANIE

Wygeneruj opis według powyższych reguł.

**PAMIĘTAJ:**
- Długość: ${profileConfig.targetChars} znaków (±10%)
- Max 18 słów/zdanie
- Max 60 słów/akapit
- Keyword "${mainKeyword}" gęstość 1-2%
- BEZ AI-fluff
- BEZ placeholders
- BEZ sugerowania norm

---

## 🔍 SELF-CHECK PRZED WYSŁANIEM

Przed zwróceniem odpowiedzi, SPRAWDŹ:

**1. Bullet Points:**
- [ ] Każdy punkt odnosi się do KONKRETNEJ cechy z danych produktu?
- [ ] ZERO generic phrases ("szybka dostawa", "profesjonalna jakość")?
- [ ] Max 15 słów per punkt?

**2. Długi opis:**
- [ ] WSZYSTKIE zdania zakończone kropką (NO "n...", "...")?
- [ ] ZERO AI-fluff phrases?
- [ ] Każde zdanie max 18 słów?

**3. Meta:**
- [ ] Title 50-60 znaków (NO "...")?
- [ ] Description 150-160 znaków (NO "Sprawdź szczegóły i za...")?

Jeśli WSZYSTKO [✓] - wyślij JSON.
Jeśli COŚ [✗] - POPRAW i sprawdź ponownie.

**ROZPOCZNIJ GENEROWANIE:**
`;

        return prompt;
    }

    /**
     * Buduj kontekst produktu
     */
    buildProductContext(product) {
        let context = '';
        
        if (product.nazwa) context += `**Nazwa:** ${product.nazwa}\n`;
        if (product.indeks) context += `**SKU:** ${product.indeks}\n`;
        if (product.kategoria) context += `**Kategoria:** ${product.kategoria}\n`;
        if (product.ean) context += `**EAN:** ${product.ean}\n`;
        if (product.opis) context += `**Opis bazowy:** ${product.opis}\n`;
        if (product['dodatkowy opis']) context += `**Dodatkowy opis:** ${product['dodatkowy opis']}\n`;
        if (product['Materiał']) context += `**Materiał:** ${product['Materiał']}\n`;
        if (product['Długość']) context += `**Długość:** ${product['Długość']} mm\n`;
        if (product['Szerokość']) context += `**Szerokość:** ${product['Szerokość']} mm\n`;
        if (product['Wysokość']) context += `**Wysokość:** ${product['Wysokość']} mm\n`;
        if (product['Kolor']) context += `**Kolor:** ${product['Kolor']}\n`;
        if (product['Gwarancja']) context += `**Gwarancja:** ${product['Gwarancja']}\n`;
        
        return context || '(brak szczegółowych danych - generuj ogólny opis)';
    }
}

// ============================================
// EXPORT
// ============================================
if (typeof window !== 'undefined') {
    window.EnhancedPromptGenerator = EnhancedPromptGenerator;
    window.enhancedPromptGenerator = new EnhancedPromptGenerator();
}

console.log('✅ Enhanced Prompt Generator V7.0.6 loaded');
