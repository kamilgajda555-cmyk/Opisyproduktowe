/**
 * TWO-STAGE GENERATION PROMPTS
 * V7.0.17-TWO-STAGE
 * 
 * ETAP 1: Generacja treści (opis + bullets + whyWorthIt)
 * ETAP 2: Walidacja i format (JSON + meta + SEO)
 */

const TwoStagePrompts = {
    /**
     * ETAP 1: Generacja wysokiej jakości treści
     * Gemini koncentruje się TYLKO na treści, nie na formacie
     */
    buildStage1Prompt(productContext, mainKeyword, profileConfig) {
        return `# ETAP 1: GENERACJA TREŚCI PRODUKTU

## 🎯 HIERARCHIA REGUŁ (od najważniejszej):

1. **Brak halucynacji danych** - NIE wymyślaj parametrów technicznych!
2. **Zakończone zdania** - NO "...", "n...", "[TBD]"
3. **Konkretne dane** - każdy bullet bazuje na REALNYCH cechach
4. **Spójność liczbowa** - te same liczby w całym opisie

---

## 📦 DANE PRODUKTU

${productContext}

---

## 🔍 KEYWORD: "${mainKeyword}"

Użyj naturalnie (gęstość 1-2%) w opisie.

---

## 📝 TWOJE ZADANIE

Wygeneruj TYLKO treść (NIE JSON, NIE meta tags):

### 1. **Wstęp** (2-3 zdania, max 60 słów)
- Keyword w pierwszym zdaniu
- Problem → Rozwiązanie
- Konkretny, nie ogólnikowy

### 2. **Bullet Points** (5-8 punktów)
**KAŻDY PUNKT:**
- Max 15 słów
- 1 konkretna cecha/korzyść
- Bazuje na REALNYCH danych z produktu
- Format: **Cecha:** Opis korzyści

**ZAKAZ:**
- ❌ "szybka dostawa 24h"
- ❌ "profesjonalna jakość"
- ❌ "kompletny zestaw"
→ TYLKO konkretne cechy produktu!

**Przykład DOBRY:**
- ✅ **Materiał ABS 450g:** wytrzymała konstrukcja odporna na uderzenia do -30°C
- ✅ **4 otwory wentylacyjne:** komfort w upale podczas długiej pracy

### 3. **Sekcje HTML** (jeśli applicable)

Wygeneruj HTML z sekcjami:

\`\`\`html
<h2>Główny tytuł</h2>
<p>Wstęp...</p>

<h3>Funkcje</h3>
<p>Opis funkcji...</p>

<h3>Zastosowanie</h3>
<p>Gdzie używać...</p>

<h3>Specyfikacja</h3>
<table>
  <tr><td>Parametr</td><td>Wartość</td></tr>
</table>
\`\`\`

**Długość HTML:** ${profileConfig.minChars}-${profileConfig.maxChars} znaków
**Docelowo:** ~${profileConfig.targetChars} znaków

### 4. **💡 Dlaczego warto?** (OBOWIĄZKOWA)

**3 zdania, max 15 słów każde**

**JEŚLI BRAK TWARDYCH DANYCH:**
- ✅ Użyj ostrożnych porównań: "zwiększa komfort podczas długiej pracy"
- ✅ Ogólne korzyści: "trwa latami dzięki wytrzymałym materiałom"
- ❌ **NIE wymyślaj procentów!** ("zwiększa o 50%")

**Format HTML:**
\`\`\`html
<h3>💡 Dlaczego warto?</h3>
<p>
Zdanie 1 z konkretną korzyścią. Zdanie 2 o trwałości lub komforcie. Zdanie 3 podsumowujące.
</p>
\`\`\`

### 5. **CTA** (1 zdanie)
"Zamów teraz!", "Sprawdź dostępność!"

---

## 🚫 ZAKAZY ABSOLUTNE

### Placeholders:
- ❌ "...", "xx", "[TBD]", "n..."
→ Jeśli brak danych: **pomiń sekcję**

### AI-Fluff:
- ❌ "wysokiej jakości", "zaawansowane technologie"
- ❌ "najlepszy na rynku", "idealny dla każdego"

### Dane techniczne:
- ❌ **NIE WYMYŚLAJ** zakresów napięcia, kategorii CAT, IP
- ✅ Jeśli brak danych: "Producent nie podaje" lub **pomiń**

### Czytelność:
- **Max 18 słów/zdanie**
- **Max 60 słów/akapit**
- Proste konstrukcje

---

## 📤 FORMAT WYJŚCIOWY

Zwróć TYLKO treść w formacie:

\`\`\`
BULLET_POINTS:
- Punkt 1
- Punkt 2
...

HTML_DESCRIPTION:
<h2>Tytuł</h2>
<p>Treść...</p>
<h3>💡 Dlaczego warto?</h3>
<p>3 zdania...</p>

CTA:
Zamów teraz!
\`\`\`

**NIE generuj JSON! NIE generuj meta tags!**

**ROZPOCZNIJ GENEROWANIE:**
`;
    },

    /**
     * ETAP 2: Walidacja i format JSON + meta
     */
    buildStage2Prompt(bulletPoints, htmlDescription, cta, productName, category, mainKeyword) {
        return `# ETAP 2: WALIDACJA I FORMAT

## 📦 WYGENEROWANA TREŚĆ (ETAP 1)

**Bullet Points:**
${bulletPoints.join('\n')}

**HTML Description:**
${htmlDescription}

**CTA:**
${cta}

---

## 🎯 TWOJE ZADANIE

Zwaliduj i sformatuj treść do JSON:

### 1. **Walidacja**

Sprawdź:
- [ ] Wszystkie zdania zakończone (NO "...")?
- [ ] ZERO AI-fluff?
- [ ] Każdy bullet bazuje na REALNYCH danych?
- [ ] HTML poprawny (zamknięte tagi)?

Jeśli coś [✗] - **POPRAW** przed formatowaniem!

### 2. **Generacja Meta Tags**

**Meta Title (50-60 znaków):**
Format: [Typ produktu] [Marka/Model] [1 cecha]

**Przykład:** "Kask DIEMEL EN 397 biały wysokościowy"

**ZAKAZ:**
- ❌ "profesjonalny", "wysokiej jakości"
- ❌ "..."

**Meta Description (150-160 znaków):**
- Keyword "${mainKeyword}" 1×
- Korzyść + CTA
- BEZ urwań

**Przykład:** "${productName} z ${mainKeyword}. Wytrzymała konstrukcja, komfort, bezpieczeństwo. Zamów online!"

### 3. **Specyfikacja (jeśli są parametry)**

Wyciągnij z HTML sekcji <table> lub <h3>Specyfikacja</h3>:

\`\`\`json
{
  "Parametr1": "Wartość1",
  "Parametr2": "Wartość2"
}
\`\`\`

---

## 📤 FORMAT WYJŚCIOWY (JSON)

Zwróć JSON:

\`\`\`json
{
  "title": "Meta Title (50-60 znaków)",
  "metaDescription": "Meta Description (150-160 znaków)",
  "description": "${htmlDescription}",
  "bulletPoints": ${JSON.stringify(bulletPoints)},
  "specifications": {
    "Parametr1": "Wartość1"
  },
  "cta": "${cta}"
}
\`\`\`

**ROZPOCZNIJ FORMATOWANIE:**
`;
    }
};

// Export dla Node.js i browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwoStagePrompts;
} else {
    window.TwoStagePrompts = TwoStagePrompts;
}

console.log('✅ Two-Stage Prompts V7.0.17 loaded');
