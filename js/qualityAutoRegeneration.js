/**
 * Quality Auto-Regeneration Module
 * Version: 7.0.4
 * 
 * Automatycznie regeneruje opisy produktów o niskiej jakości
 */

const REGENERATION_CONFIG = {
    // Próg jakości poniżej którego następuje regeneracja
    MIN_QUALITY_THRESHOLD: 60,
    
    // Maksymalna liczba prób regeneracji
    MAX_RETRY_ATTEMPTS: 2,
    
    // Boost dla prompt przy regeneracji
    QUALITY_BOOST_ENABLED: true,
    
    // Czy pokazywać powiadomienia o regeneracji
    SHOW_NOTIFICATIONS: true
};

/**
 * Ulepszone prompty dla lepszej jakości
 */
const QUALITY_BOOSTERS = {
    readability: `
🎯 CZYTELNOŚĆ (PRIORYTET):
- Używaj KRÓTKICH zdań (max 15-20 słów)
- Krótkie akapity (max 3-4 zdania)
- Bullet points dla list funkcji
- Headingi H2/H3 dla sekcji
- Unikaj złożonych konstrukcji gramatycznych
`,
    
    seoOptimization: `
🔍 OPTYMALIZACJA SEO (PRIORYTET):
- Title: 50-60 znaków, keyword na początku
- Meta Description: 150-160 znaków, keyword + CTA
- Użyj keyword 3-5 razy naturalnie w tekście
- Synonimy i long-tail keywords
- Headingi z keywords
`,
    
    semanticQuality: `
🧠 SPÓJNOŚĆ SEMANTYCZNA (PRIORYTET):
- Jedno główne przekaz przez cały opis
- Logiczna struktura: Problem → Rozwiązanie → Korzyści
- Brak powtórzeń tych samych informacji
- Każde zdanie dodaje nową wartość
- Płynne przejścia między sekcjami
`,
    
    engagement: `
💎 ZAANGAŻOWANIE (PRIORYTET):
- Mocne CTA na końcu (np. "Zamów teraz!", "Dodaj do koszyka!")
- Emotional triggers: "innowacyjny", "ekskluzywny", "profesjonalny"
- Storytelling: jak produkt rozwiązuje problem
- Social proof: "Zaufało nam X klientów" (jeśli dostępne)
- Urgency: "Limitowana dostępność" (jeśli prawda)
`
};

/**
 * Główna funkcja: regeneracja niskiej jakości
 */
async function handleLowQualityDescription(product, currentResult, attempt = 1) {
    const qualityScore = currentResult.qualityScore?.overallScore || 0;
    
    // Sprawdź czy jakość jest poniżej progu
    if (qualityScore >= REGENERATION_CONFIG.MIN_QUALITY_THRESHOLD) {
        return currentResult; // Jakość OK, zwróć wynik
    }
    
    // Sprawdź czy nie przekroczono max prób
    if (attempt > REGENERATION_CONFIG.MAX_RETRY_ATTEMPTS) {
        console.warn(`⚠️ Osiągnięto max prób regeneracji (${REGENERATION_CONFIG.MAX_RETRY_ATTEMPTS}) dla produktu:`, product.nazwa);
        return currentResult; // Zwróć ostatni wynik mimo niskiej jakości
    }
    
    console.log(`🔄 REGENERACJA #${attempt} dla produktu "${product.nazwa}" (Quality: ${qualityScore}/100)`);
    
    // Pokaż powiadomienie użytkownikowi
    if (REGENERATION_CONFIG.SHOW_NOTIFICATIONS) {
        showRegenerationNotification(product.nazwa, qualityScore, attempt);
    }
    
    // Identyfikuj problemy
    const issues = identifyQualityIssues(currentResult.qualityScore);
    console.log(`📋 Zidentyfikowane problemy:`, issues);
    
    // Zbuduj ulepszone prompt
    const enhancedPrompt = buildEnhancedPrompt(product, issues);
    
    // Regeneruj z ulepszonym promptem
    try {
        const newResult = await generateWithEnhancedPrompt(product, enhancedPrompt, issues);
        
        const newQualityScore = newResult.qualityScore?.overallScore || 0;
        console.log(`✅ Nowa jakość: ${newQualityScore}/100 (było: ${qualityScore}/100)`);
        
        // Jeśli nadal niska jakość, spróbuj ponownie rekurencyjnie
        if (newQualityScore < REGENERATION_CONFIG.MIN_QUALITY_THRESHOLD && attempt < REGENERATION_CONFIG.MAX_RETRY_ATTEMPTS) {
            return await handleLowQualityDescription(product, newResult, attempt + 1);
        }
        
        return newResult;
        
    } catch (error) {
        console.error(`❌ Błąd regeneracji:`, error);
        return currentResult; // Zwróć oryginalny wynik w razie błędu
    }
}

/**
 * Identyfikuje konkretne problemy jakości
 */
function identifyQualityIssues(qualityScore) {
    const issues = [];
    
    if (!qualityScore || !qualityScore.metrics) {
        return ['all']; // Brak metryk - regeneruj wszystko
    }
    
    const metrics = qualityScore.metrics;
    
    // Sprawdź każdą metrykę
    if (metrics.readability?.score < 70) {
        issues.push('readability');
    }
    if (metrics.seoScore?.score < 70) {
        issues.push('seoOptimization');
    }
    if (metrics.semanticQuality?.score < 70) {
        issues.push('semanticQuality');
    }
    if (metrics.engagementPotential?.score < 70) {
        issues.push('engagement');
    }
    if (metrics.technicalAccuracy?.score < 70) {
        issues.push('technicalAccuracy');
    }
    
    return issues.length > 0 ? issues : ['all'];
}

/**
 * Buduje ulepszone prompt z focus na problemy
 */
function buildEnhancedPrompt(product, issues) {
    let enhancedInstructions = `
⚠️ POPRZEDNIA WERSJA MIAŁA NISKĄ JAKOŚĆ. POPRAW TE OBSZARY:

`;
    
    // Dodaj boosters dla zidentyfikowanych problemów
    issues.forEach(issue => {
        if (QUALITY_BOOSTERS[issue]) {
            enhancedInstructions += QUALITY_BOOSTERS[issue] + '\n';
        }
    });
    
    // Dodaj konkretne wskazówki
    enhancedInstructions += `
📌 KONKRETNE WSKAZÓWKI:

1. **Struktura:**
   - Title (H1): max 60 znaków
   - Intro: 2-3 zdania (problem + rozwiązanie)
   - Funkcje: bullet points (5-7 punktów)
   - Specyfikacja: tabela lub lista
   - Korzyści: 3-4 bullet points
   - CTA: mocne zakończenie z wezwaniem do działania

2. **Język:**
   - Proste, konkretne słowa
   - Aktywna strona czasownika
   - Bez buzzwords i ogólników
   - Bez powtórzeń

3. **SEO:**
   - Keyword w title, meta, H2
   - Natural keyword density 1-2%
   - Long-tail keywords w tekście
   - Alt text dla obrazów (jeśli applicable)

4. **Engagement:**
   - Emotional words: "innowacyjny", "profesjonalny", "niezawodny"
   - Konkretne liczby: "50% szybciej", "3 lata gwarancji"
   - CTA: "Zamów teraz i odbierz gratis!"

---

WYGENERUJ OPIS NAJWYŻSZEJ JAKOŚCI (cel: >80/100):
`;
    
    return enhancedInstructions;
}

/**
 * Generuje opis z ulepszonym promptem
 */
async function generateWithEnhancedPrompt(product, enhancedPrompt, issues) {
    // Pobierz ustawienia
    const settings = window.getGenerationSettings ? window.getGenerationSettings() : {
        language: 'pl',
        style: 'professional',
        mode: 'quality' // WYMUSZAMY tryb jakości przy regeneracji
    };
    
    // Zbuduj kontekst produktu
    const productContext = buildProductContext(product);
    
    // Przygotuj prompt dla Gemini
    const fullPrompt = `
${enhancedPrompt}

${productContext}

JĘZYK: ${settings.language}
STYL: ${settings.style}

WYGENERUJ:
1. Title (max 60 znaków)
2. Meta Description (150-160 znaków)
3. Pełny opis produktu (300-500 słów)
4. Bullet points z funkcjami (5-7 punktów)
5. Call-to-Action

PAMIĘTAJ: Priorytet to ${issues.join(', ')}!
`;
    
    // Wywołaj Gemini API
    const description = await callGeminiAPI(fullPrompt);
    
    // Oceń jakość
    const qualityScore = await evaluateQuality(description);
    
    // Zwróć wynik
    return {
        name: description.title,
        description: description.description,
        qualityScore: qualityScore,
        regenerated: true,
        issues: issues
    };
}

/**
 * Buduje kontekst produktu
 */
function buildProductContext(product) {
    let context = 'DANE PRODUKTU:\n\n';
    
    if (product.nazwa) context += `Nazwa: ${product.nazwa}\n`;
    if (product.indeks) context += `SKU/Indeks: ${product.indeks}\n`;
    if (product.kategoria) context += `Kategoria: ${product.kategoria}\n`;
    if (product.ean) context += `EAN: ${product.ean}\n`;
    if (product.opis) context += `Opis bazowy: ${product.opis}\n`;
    if (product['dodatkowy opis']) context += `Dodatkowy opis: ${product['dodatkowy opis']}\n`;
    if (product['Materiał']) context += `Materiał: ${product['Materiał']}\n`;
    if (product['Długość']) context += `Długość: ${product['Długość']} mm\n`;
    if (product['Szerokość']) context += `Szerokość: ${product['Szerokość']} mm\n`;
    if (product['Wysokość']) context += `Wysokość: ${product['Wysokość']} mm\n`;
    if (product['Kolor']) context += `Kolor: ${product['Kolor']}\n`;
    if (product['Gwarancja']) context += `Gwarancja: ${product['Gwarancja']}\n`;
    
    return context;
}

/**
 * Pokazuje powiadomienie o regeneracji
 */
function showRegenerationNotification(productName, quality, attempt) {
    const message = `🔄 Regeneracja #${attempt}: "${productName}" (Quality: ${quality}/100)`;
    
    // Toast notification
    if (window.settingsPanel && typeof window.settingsPanel.showNotification === 'function') {
        window.settingsPanel.showNotification(message, 'info');
    }
    
    // Console log
    console.log(`%c${message}`, 'background: #4dabf7; color: white; padding: 4px 8px; border-radius: 4px;');
    
    // Opcjonalnie: update UI
    const statusElement = document.getElementById('regeneration-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

/**
 * Wrapper funkcje dla integracji
 */

// Placeholder dla callGeminiAPI (będzie użyta funkcja z app.js)
async function callGeminiAPI(prompt) {
    // Ta funkcja będzie overridden przez app.js
    throw new Error('callGeminiAPI must be implemented in app.js');
}

// Placeholder dla evaluateQuality (będzie użyta funkcja z contentQualityScorer.js)
async function evaluateQuality(description) {
    // Ta funkcja będzie overridden przez app.js
    throw new Error('evaluateQuality must be implemented');
}

/**
 * Export dla global access
 */
window.QualityAutoRegenerator = {
    handleLowQualityDescription,
    identifyQualityIssues,
    buildEnhancedPrompt,
    REGENERATION_CONFIG,
    QUALITY_BOOSTERS
};

console.log('✅ Quality Auto-Regeneration Module V7.0.4 loaded');
console.log('📊 Config:', REGENERATION_CONFIG);
