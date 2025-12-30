/**
 * E-commerce Content Generator Ruleset V7.0.6 ULTIMATE
 * Radykalne poprawki dla opisów sklepowych
 */

const ECOMMERCE_RULES = {
    // ============================================
    // 1. DŁUGOŚĆ OPISÓW (profile)
    // ============================================
    lengthProfiles: {
        'standard': {
            name: 'Standard E-commerce',
            minChars: 1200,
            maxChars: 2500,  // +300 dla "Dlaczego warto?"
            targetChars: 2100,  // 1800 + 300
            description: 'Karty produktów, większość e-commerce (+ sekcja sprzedażowa)'
        },
        'technical': {
            name: 'Techniczne/B2B',
            minChars: 2200,
            maxChars: 3800,  // +300 dla "Dlaczego warto?"
            targetChars: 3100,  // 2800 + 300
            description: 'Produkty techniczne, narzędzia profesjonalne (+ sekcja sprzedażowa)'
        },
        'complex': {
            name: 'Złożone (zestawy)',
            minChars: 3500,
            maxChars: 5300,  // +300 dla "Dlaczego warto?"
            targetChars: 4500,  // 4200 + 300
            description: 'Zestawy narzędzi, maszyny, urządzenia wielofunkcyjne'
        }
    },

    // ============================================
    // 2. STRUKTURA SKANOWALNA
    // ============================================
    scanability: {
        maxLinesPerParagraph: 4,        // Max 3-4 linijki na akapit
        minBulletListsPerScreen: 1,     // Min 1 lista punktowana na ekran
        maxSentenceLength: 20,          // Max 20 słów w zdaniu
        maxParagraphWords: 80,          // Max 80 słów w akapicie
        requireBulletPoints: true,      // Wymaga bullet points
        minBulletPoints: 5,             // Min 5 punktów
        maxBulletPoints: 10             // Max 10 punktów
    },

    // ============================================
    // 3. PLACEHOLDERS KILL-SWITCH
    // ============================================
    placeholders: {
        // Tokeny do wykrycia
        bannedTokens: [
            'xx', 'XX',
            '...', '…',
            '[placeholder]', '[PLACEHOLDER]',
            'TBD', 'tbd',
            'N/A', 'n/a',
            'TODO', 'todo',
            'FIXME', 'fixme'
        ],
        
        // Regex dla urwanych słów
        truncatedWordPattern: /\b\w+\.\.\.\s/g,  // "Spra... ", "nog... "
        
        // Akcja przy wykryciu
        action: 'block',  // 'block' lub 'autocorrect'
        
        // Auto-korekta
        autoCorrect: {
            'xx': '',
            '...': '',
            'TBD': 'do uzupełnienia',
            'N/A': 'nie dotyczy'
        }
    },

    // ============================================
    // 4. META TITLE / META DESCRIPTION
    // ============================================
    seoMeta: {
        title: {
            minLength: 50,
            maxLength: 60,
            targetLength: 55,
            // Algorytm skracania (priorytet)
            priority: [
                'productType',      // 1. Typ produktu
                'brand',            // 2. Marka
                'model',            // 3. Model
                'keyFeature',       // 4. 1 kluczowa cecha
                'norm'              // 5. Norma (jeśli applicable)
            ],
            // Usuń najpierw (przy skracaniu)
            removeFirst: [
                'profesjonalny',
                'niezawodny',
                'wysokiej jakości',
                'nowoczesny',
                'zaawansowany'
            ]
        },
        
        description: {
            minLength: 150,
            maxLength: 160,
            targetLength: 155,
            // Bez urwań
            noTruncation: true,
            // Zakaz duplikatów
            bannedDuplicates: [
                'Sprawdź szczegóły',
                'Zobacz więcej',
                'Kup teraz'
            ]
        }
    },

    // ============================================
    // 5. NORMY - REGUŁA STRICT
    // ============================================
    norms: {
        // Dozwolone normy (tylko jeśli w danych produktu)
        allowedSources: ['productData'],
        
        // Zakaz sugerowania norm
        noInference: true,
        
        // Przykłady zakazanych inferencji
        bannedInferences: [
            {
                if: 'EN 397',
                thenNot: ['EN 12492', 'EN 50365']
            },
            {
                if: 'CE',
                thenNot: ['EN', 'ISO', 'ANSI']
            }
        ],
        
        // Jeśli brak norm - nie wymyślaj
        ifMissing: {
            action: 'omit',  // Pomiń sekcję norm
            message: null    // Nie pisz "może spełniać..."
        }
    },

    // ============================================
    // 6. SINGLE SOURCE OF TRUTH
    // ============================================
    dataConsistency: {
        // Reguła: liczby tylko z jednego źródła
        singleSource: true,
        
        // Checker spójności
        checks: [
            {
                type: 'count',
                rule: 'jeśli "3 kieszenie" to nie może być 4',
                implementation: 'countInText === countInList'
            },
            {
                type: 'list',
                rule: 'jeśli "11 matryc" to lista musi mieć 11 pozycji',
                implementation: 'listLength === mentionedCount'
            },
            {
                type: 'dimensions',
                rule: 'wymiary w różnych sekcjach muszą się zgadzać',
                implementation: 'dimensionsConsistent'
            }
        ],
        
        // Akcja przy niespójności
        onInconsistency: 'fix_or_fail'  // Napraw lub zwróć błąd
    },

    // ============================================
    // 7. SŁOWNIK ZAKAZANYCH WYPEŁNIACZY
    // ============================================
    bannedFluff: {
        // Lista AI-fluff do usunięcia lub zastąpienia
        phrases: [
            {
                banned: 'stanowi fundamentalne narzędzie',
                replace: 'to praktyczne narzędzie'
            },
            {
                banned: 'instrument inżynieryjny',
                replace: 'narzędzie pomiarowe'
            },
            {
                banned: 'integralność strukturalna',
                replace: 'wytrzymała konstrukcja'
            },
            {
                banned: 'strategiczny wybór',
                replace: 'dobry wybór'
            },
            {
                banned: 'optymalne rozwiązanie',
                replace: 'sprawdzone rozwiązanie'
            },
            {
                banned: 'zaawansowana technologia',
                replace: 'nowoczesna technologia'
            },
            {
                banned: 'najwyższej klasy',
                replace: 'wysokiej jakości'
            },
            {
                banned: 'niezrównana wydajność',
                replace: 'wysoka wydajność'
            },
            {
                banned: 'absolutnie niezbędny',
                replace: 'przydatny'
            },
            {
                banned: 'rewolucyjne podejście',
                replace: 'nowe podejście'
            }
        ],
        
        // Zakaz "marketingowych" fraz
        marketingBanned: [
            'najlepszy na rynku',
            'unikalny',
            'jedyny w swoim rodzaju',
            'bezkonkurencyjny',
            'niezastąpiony',
            'absolutnie',
            'idealny dla każdego',
            'must-have'
        ],
        
        // Zamienniki bardziej sklepowe
        preferredStyle: {
            tone: 'factual',        // Faktyczny, nie patetyczny
            language: 'simple',     // Prosty język
            focus: 'benefits'       // Focus na korzyściach, nie filozofii
        }
    },

    // ============================================
    // 8. KEYWORD DENSITY - NATURAL
    // ============================================
    keywordRules: {
        // Gęstość keyword
        minDensity: 0.008,      // 0.8% (było 0.5%)
        maxDensity: 0.025,      // 2.5% (było 4%)
        targetDensity: 0.015,   // 1.5%
        
        // Rozmieszczenie
        placement: {
            title: 1,           // 1× w title
            metaDesc: 1,        // 1× w meta description
            firstParagraph: 1,  // 1× w pierwszym akapicie
            h2: 1,              // 1× w H2
            throughout: 'natural' // Reszta naturalnie
        },
        
        // Synonimy i warianty
        useSynonyms: true,
        synonymRatio: 0.3       // 30% synonimów zamiast głównego keyword
    },

    // ============================================
    // 9. READABILITY RULES (ULTRA-STRICT)
    // ============================================
    readability: {
        // Flesch Reading Ease: cel 60-70 (średnia trudność)
        targetFleschScore: 65,
        minFleschScore: 55,
        
        // Zdania
        maxWordsPerSentence: 18,    // Max 18 słów (było 25)
        avgWordsPerSentence: 15,    // Średnio 15 słów
        
        // Akapity
        maxWordsPerParagraph: 60,   // Max 60 słów (było 200)
        maxSentencesPerParagraph: 4, // Max 4 zdania
        
        // Sylaby
        maxAvgSyllablesPerWord: 2.0, // Max 2 sylaby średnio
        
        // Struktura
        requireShortIntro: true,    // Wymaga krótkiego wstępu (2-3 zdania)
        requireBulletLists: true,   // Wymaga list punktowanych
        requireWhitespace: true     // Wymaga odstępów (nie blok tekstu)
    },

    // ============================================
    // 10. VALIDATION PIPELINE
    // ============================================
    validation: {
        steps: [
            'checkPlaceholders',        // 1. Sprawdź placeholdery
            'checkLength',              // 2. Sprawdź długość
            'checkReadability',         // 3. Sprawdź czytelność
            'checkSEO',                 // 4. Sprawdź SEO
            'checkConsistency',         // 5. Sprawdź spójność danych
            'checkFluff',               // 6. Sprawdź AI-fluff
            'checkNorms',               // 7. Sprawdź normy
            'checkKeywordDensity'       // 8. Sprawdź keyword density
        ],
        
        // Akcja przy niepowodzeniu
        onFailure: 'regenerate',    // Regeneruj automatycznie
        maxRetries: 2               // Max 2 próby
    }
};

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ECOMMERCE_RULES };
}

if (typeof window !== 'undefined') {
    window.ECOMMERCE_RULES = ECOMMERCE_RULES;
}

console.log('✅ E-commerce Content Rules V7.0.6 ULTIMATE loaded');
console.log('📏 Profile długości:', Object.keys(ECOMMERCE_RULES.lengthProfiles));
console.log('🚫 Banned fluff phrases:', ECOMMERCE_RULES.bannedFluff.phrases.length);
console.log('📊 Readability: max', ECOMMERCE_RULES.readability.maxWordsPerSentence, 'słów/zdanie');
