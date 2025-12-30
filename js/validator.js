/**
 * PRODUCT VALIDATOR V6
 * System walidacji z twardymi regułami i automatycznym scoring
 * Architektura: Draft → Validator → Reducer
 */

// ============================================
// KONFIGURACJA ZAKAZANYCH FRAZ I CLAIMÓW
// ============================================

const FORBIDDEN_PHRASES = {
    // Grupa 1: Ogólna "wata" marketingowa
    fluff: [
        'najwyższe standardy',
        'rygorystyczna kontrola',
        'zaawansowane technologie',
        'najwyższa jakość',
        'światowej klasy',
        'innowacyjne rozwiązania',
        'doskonała jakość',
        'wyjątkowa trwałość',
        'perfekcyjne wykończenie',
        'idealne rozwiązanie'
    ],
    
    // Grupa 2: Claimy bez danych (certyfikaty/normy)
    certificates: [
        'certyfikat iso',
        'atest',
        'zgodność z normami',
        'międzynarodowe normy',
        'certyfikowane materiały',
        'potwierdzone certyfikatem',
        'certyfikat jakości',
        'norma en',
        'norma ce'
    ],
    
    // Grupa 3: Cechy oferty (nie produktu)
    offer_features: [
        'dostawa 24h',
        'szybka dostawa',
        'najlepsza cena',
        'taniej',
        'promocja',
        'gratis',
        'rabat',
        'wyprzedaż',
        'mega okazja',
        'najniższa cena'
    ],
    
    // Grupa 4: Claimy jakościowe bez danych
    quality_claims: [
        'odporna na mechacenie',
        'odporna na odbarwienia',
        'wieloetapowe testy',
        'testowane w laboratorium',
        'potwierdzona trwałość',
        'gwarantowana jakość',
        'sprawdzona jakość',
        'przetestowane materiały'
    ],
    
    // Grupa 5: Placeholdery
    placeholders: [
        /\bxx\b/gi,
        /\bxxx\b/gi,
        /\b__+\b/gi,
        /\btbd\b/gi,
        /\bdo uzupełnienia\b/gi,
        /\bproducent nie podaje\b/gi
    ]
};

// Wagi dla scoring
const PHRASE_WEIGHTS = {
    fluff: 1,
    certificates: 5,      // Wysokie ryzyko prawne
    offer_features: 3,    // Średnie ryzyko + błąd kategoryzacji
    quality_claims: 5,    // Wysokie ryzyko prawne
    placeholders: 10      // Krytyczne - BLOCK publikacji
};

// ============================================
// STRUKTURA DANYCH PRODUKTU
// ============================================

class ProductData {
    constructor(rawData) {
        // Sekcja 1: Podstawowe dane
        this.name = rawData.nazwa || '';
        this.category = rawData.kategoria || '';
        this.sku = rawData.indeks || '';
        this.ean = rawData.ean || '';
        
        // Sekcja 2: Wymiary (ZAWSZE w mm, konwersja do cm w generatorze)
        this.dimensions = {
            length_mm: this.parseNumber(rawData['długość']),
            width_mm: this.parseNumber(rawData['szerokość']),
            height_mm: this.parseNumber(rawData['wysokość']),
            hasDimensions: function() {
                return this.length_mm || this.width_mm || this.height_mm;
            }
        };
        
        // Sekcja 3: Porty i moduły (dla elektroniki)
        this.ports = {
            fixed: [],           // Porty stałe (np. Schuko, USB-C)
            swappable: [],       // Moduły wymienne (np. USB-A, HDMI, RJ45)
            hasSwappable: function() {
                return this.swappable.length > 0;
            }
        };
        
        // Sekcja 4: Materiały i wykończenie
        this.materials = {
            primary: rawData.materiał || '',
            finish: rawData.wykończenie || '',
            coating: rawData.powłoka || ''
        };
        
        // Sekcja 5: Parametry elektryczne (dla elektroniki)
        this.electrical = {
            charging_power_w: this.parseNumber(rawData['moc ładowania']),
            charging_standard: rawData['standard ładowania'] || '',
            voltage: rawData.napięcie || '',
            cable_length_m: this.parseNumber(rawData['długość kabla'])
        };
        
        // Sekcja 6: Parametry mechaniczne (dla narzędzi)
        this.mechanical = {
            material_grade: rawData['gatunek materiału'] || '',  // np. CrV, CrMo
            teeth_count: this.parseNumber(rawData['liczba zębów']),
            drive_sizes: rawData['rozmiary nasadek'] ? 
                rawData['rozmiary nasadek'].split(',').map(s => s.trim()) : [],
            case_features: rawData['cechy walizki'] || ''
        };
        
        // Sekcja 7: Parametry tekstylne (dla odzieży)
        this.textile = {
            composition: rawData.skład || '',              // np. "100% bawełna"
            weight_gsm: this.parseNumber(rawData['gramatura']),
            size_label: rawData.rozmiar || '',
            size_numeric: this.parseNumber(rawData['rozmiar numeryczny']),
            color: rawData.kolor || '',
            finish: rawData['wykończenie tkaniny'] || ''   // np. anti-pilling
        };
        
        // Sekcja 8: Certyfikaty i gwarancje (TYLKO jeśli są w danych)
        this.certificates = rawData.certyfikaty ? 
            rawData.certyfikaty.split(',').map(s => s.trim()) : [];
        this.warranty_months = this.parseNumber(rawData.gwarancja);
        
        // Sekcja 9: Dane oferty (ODDZIELNE od opisu produktu)
        this.offer = {
            shipping_time: rawData['czas dostawy'] || '',
            price: this.parseNumber(rawData.cena),
            promotion: rawData.promocja || '',
            stock: this.parseNumber(rawData.stan)
        };
    }
    
    parseNumber(value) {
        if (!value) return null;
        const num = parseFloat(String(value).replace(',', '.'));
        return isNaN(num) ? null : num;
    }
}

// ============================================
// VALIDATOR - Etap 1: Scoring i detekcja
// ============================================

class ProductValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.score = 0;
        this.maxScore = 100;
    }
    
    validate(description, productData) {
        this.errors = [];
        this.warnings = [];
        this.score = 100; // Zaczynamy od 100, odejmujemy za błędy
        
        // Walidacja 1: Placeholdery (KRYTYCZNE)
        this.checkPlaceholders(description);
        
        // Walidacja 2: Zakazane frazy
        this.checkForbiddenPhrases(description);
        
        // Walidacja 3: Spójność wymiarów
        this.checkDimensionsConsistency(description, productData);
        
        // Walidacja 4: Claimy bez danych
        this.checkUnsupportedClaims(description, productData);
        
        // Walidacja 5: Cechy oferty w opisie
        this.checkOfferFeatures(description);
        
        // Walidacja 6: Meta quality
        this.checkMetaQuality(description);
        
        return {
            isValid: this.errors.length === 0,
            canPublish: this.score >= 70 && this.errors.length === 0,
            score: this.score,
            errors: this.errors,
            warnings: this.warnings
        };
    }
    
    // ============================================
    // WALIDACJA 1: Placeholdery (BLOCK publikacji)
    // ============================================
    checkPlaceholders(description) {
        const text = JSON.stringify(description).toLowerCase();
        const found = [];
        
        FORBIDDEN_PHRASES.placeholders.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                found.push(...matches);
            }
        });
        
        if (found.length > 0) {
            this.errors.push({
                type: 'PLACEHOLDER_DETECTED',
                severity: 'CRITICAL',
                message: `Znaleziono placeholdery: ${found.join(', ')}`,
                action: 'BLOCK_PUBLICATION',
                instances: found
            });
            this.score = 0; // Automatyczny fail
        }
    }
    
    // ============================================
    // WALIDACJA 2: Zakazane frazy
    // ============================================
    checkForbiddenPhrases(description) {
        const text = JSON.stringify(description).toLowerCase();
        
        Object.keys(FORBIDDEN_PHRASES).forEach(category => {
            if (category === 'placeholders') return; // Już sprawdzone
            
            const phrases = FORBIDDEN_PHRASES[category];
            const found = phrases.filter(phrase => text.includes(phrase.toLowerCase()));
            
            if (found.length > 0) {
                const weight = PHRASE_WEIGHTS[category];
                const penalty = found.length * weight;
                this.score -= penalty;
                
                this.warnings.push({
                    type: `FORBIDDEN_${category.toUpperCase()}`,
                    severity: weight >= 5 ? 'HIGH' : 'MEDIUM',
                    message: `Znaleziono ${found.length} zakazanych fraz (${category})`,
                    instances: found,
                    penalty: penalty
                });
            }
        });
    }
    
    // ============================================
    // WALIDACJA 3: Spójność wymiarów
    // ============================================
    checkDimensionsConsistency(description, productData) {
        const text = JSON.stringify(description).toLowerCase();
        const hasDimensions = productData.dimensions.hasDimensions();
        
        // Szukamy wzorców wymiarów w tekście
        const dimensionPatterns = [
            /\d+\s?(mm|milimetr)/gi,
            /\d+\s?x\s?\d+\s?(mm|milimetr)/gi,
            /\d+\s?x\s?\d+\s?x\s?\d+\s?(mm|milimetr)/gi
        ];
        
        const foundDimensions = dimensionPatterns.some(pattern => pattern.test(text));
        
        if (!hasDimensions && foundDimensions) {
            this.errors.push({
                type: 'DIMENSION_INCONSISTENCY',
                severity: 'HIGH',
                message: 'Opis zawiera wymiary, ale dane produktu nie mają dimensions_mm',
                action: 'REMOVE_DIMENSION_REFERENCES'
            });
            this.score -= 15;
        }
        
        // Sprawdź, czy wymiary są w sensownym zakresie
        if (hasDimensions) {
            const dims = productData.dimensions;
            
            // Dla gniazd: minimalna rozsądna wielkość to ~50mm
            if (dims.length_mm && dims.length_mm < 50) {
                this.warnings.push({
                    type: 'DIMENSION_SUSPICIOUS',
                    severity: 'MEDIUM',
                    message: `Podejrzanie małe wymiary: ${dims.length_mm}mm - czy to nie błąd?`,
                    suggestion: 'Sprawdź, czy nie powinno być cm zamiast mm'
                });
            }
        }
    }
    
    // ============================================
    // WALIDACJA 4: Claimy bez danych
    // ============================================
    checkUnsupportedClaims(description, productData) {
        const text = JSON.stringify(description).toLowerCase();
        
        // Claim 1: Certyfikaty
        if (!productData.certificates || productData.certificates.length === 0) {
            FORBIDDEN_PHRASES.certificates.forEach(phrase => {
                if (text.includes(phrase.toLowerCase())) {
                    this.errors.push({
                        type: 'UNSUPPORTED_CERTIFICATE_CLAIM',
                        severity: 'HIGH',
                        message: `Wspomniany "${phrase}" bez danych certificates[]`,
                        action: 'REMOVE_CLAIM'
                    });
                    this.score -= 10;
                }
            });
        }
        
        // Claim 2: Gwarancja
        if (!productData.warranty_months) {
            const warrantyPatterns = [
                /gwarancja \d+/gi,
                /\d+ miesięcy gwarancji/gi,
                /\d+ lat gwarancji/gi
            ];
            
            warrantyPatterns.forEach(pattern => {
                if (pattern.test(text)) {
                    this.warnings.push({
                        type: 'UNSUPPORTED_WARRANTY_CLAIM',
                        severity: 'MEDIUM',
                        message: 'Wspominasz gwarancję bez pola warranty_months',
                        action: 'VERIFY_OR_REMOVE'
                    });
                }
            });
        }
        
        // Claim 3: Odporna na mechacenie/odbarwienia (tylko dla tekstyliów)
        if (productData.textile.composition) {
            FORBIDDEN_PHRASES.quality_claims.forEach(phrase => {
                if (text.includes(phrase.toLowerCase())) {
                    if (!productData.textile.finish || 
                        !productData.textile.finish.toLowerCase().includes('anti-pilling')) {
                        this.errors.push({
                            type: 'UNSUPPORTED_TEXTILE_CLAIM',
                            severity: 'HIGH',
                            message: `Claim "${phrase}" bez danych textile.finish`,
                            action: 'REMOVE_OR_ADD_DATA'
                        });
                        this.score -= 10;
                    }
                }
            });
        }
    }
    
    // ============================================
    // WALIDACJA 5: Cechy oferty w opisie produktu
    // ============================================
    checkOfferFeatures(description) {
        const text = JSON.stringify(description).toLowerCase();
        
        FORBIDDEN_PHRASES.offer_features.forEach(phrase => {
            if (text.includes(phrase.toLowerCase())) {
                this.errors.push({
                    type: 'OFFER_FEATURE_IN_DESCRIPTION',
                    severity: 'HIGH',
                    message: `"${phrase}" to cecha oferty, nie produktu`,
                    action: 'MOVE_TO_OFFER_SECTION'
                });
                this.score -= 8;
            }
        });
    }
    
    // ============================================
    // WALIDACJA 6: Jakość meta
    // ============================================
    checkMetaQuality(description) {
        const metaTitle = description.metaTitle || '';
        const metaDescription = description.metaDescription || '';
        
        // Meta Title: 45-60 znaków
        if (metaTitle.length > 60) {
            this.errors.push({
                type: 'META_TITLE_TOO_LONG',
                severity: 'HIGH',
                message: `Meta Title ma ${metaTitle.length} znaków (max 60)`,
                action: 'TRUNCATE_ON_WORD'
            });
            this.score -= 5;
        }
        
        if (metaTitle.length < 45) {
            this.warnings.push({
                type: 'META_TITLE_TOO_SHORT',
                severity: 'LOW',
                message: `Meta Title ma ${metaTitle.length} znaków (min 45)`,
                action: 'EXPAND'
            });
        }
        
        // Meta Description: 140-165 znaków
        if (metaDescription.length > 165) {
            this.errors.push({
                type: 'META_DESCRIPTION_TOO_LONG',
                severity: 'HIGH',
                message: `Meta Description ma ${metaDescription.length} znaków (max 165)`,
                action: 'TRUNCATE_ON_WORD'
            });
            this.score -= 5;
        }
        
        if (metaDescription.length < 140) {
            this.warnings.push({
                type: 'META_DESCRIPTION_TOO_SHORT',
                severity: 'LOW',
                message: `Meta Description ma ${metaDescription.length} znaków (min 140)`,
                action: 'EXPAND'
            });
        }
        
        // Sprawdź ucięcie (...)
        if (metaTitle.includes('...') || metaDescription.includes('...')) {
            this.errors.push({
                type: 'META_TRUNCATED',
                severity: 'CRITICAL',
                message: 'Meta zawiera "..." - źle ucięte',
                action: 'REGENERATE_WITHOUT_ELLIPSIS'
            });
            this.score -= 10;
        }
    }
}

// ============================================
// REDUCER - Etap 2: Automatyczne poprawki
// ============================================

class DescriptionReducer {
    constructor(productData) {
        this.productData = productData;
    }
    
    reduce(description, validationResult) {
        let reduced = JSON.parse(JSON.stringify(description)); // Deep copy
        
        // Redukcja 1: Usuń placeholdery
        reduced = this.removePlaceholders(reduced);
        
        // Redukcja 2: Usuń zakazane frazy
        reduced = this.removeForbiddenPhrases(reduced, validationResult);
        
        // Redukcja 3: Napraw wymiary
        reduced = this.fixDimensions(reduced);
        
        // Redukcja 4: Napraw meta
        reduced = this.fixMeta(reduced);
        
        // Redukcja 5: Wymień watę na konkretne dane
        reduced = this.replaceFluffWithData(reduced);
        
        return reduced;
    }
    
    removePlaceholders(desc) {
        const stringified = JSON.stringify(desc);
        let cleaned = stringified;
        
        FORBIDDEN_PHRASES.placeholders.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        // Usuń frazy typu "Producent nie podaje..."
        cleaned = cleaned.replace(/Producent nie podaje[^.]*\./gi, '');
        
        return JSON.parse(cleaned);
    }
    
    removeForbiddenPhrases(desc, validationResult) {
        let stringified = JSON.stringify(desc);
        
        validationResult.warnings.forEach(warning => {
            if (warning.instances) {
                warning.instances.forEach(phrase => {
                    const regex = new RegExp(phrase, 'gi');
                    stringified = stringified.replace(regex, '');
                });
            }
        });
        
        // Cleanup: usuń podwójne spacje i puste zdania
        stringified = stringified.replace(/\s{2,}/g, ' ');
        stringified = stringified.replace(/\.\s*\./g, '.');
        
        return JSON.parse(stringified);
    }
    
    fixDimensions(desc) {
        // Jeśli brak wymiarów w danych, usuń wszystkie wzmianki o mm
        if (!this.productData.dimensions.hasDimensions()) {
            let stringified = JSON.stringify(desc);
            
            // Usuń frazy z wymiarami
            stringified = stringified.replace(/\d+\s?x\s?\d+\s?x?\s?\d*\s?mm/gi, '');
            stringified = stringified.replace(/wymiary?:?\s*\d+[^.]*mm/gi, '');
            
            // Zamień na neutralne
            stringified = stringified.replace(
                /kompaktowa konstrukcja o wymiarach[^.]*/gi,
                'kompaktowa konstrukcja ułatwia montaż w blacie'
            );
            
            return JSON.parse(stringified);
        }
        
        return desc;
    }
    
    fixMeta(desc) {
        // Meta Title: max 60 znaków, tnij na słowie
        if (desc.metaTitle && desc.metaTitle.length > 60) {
            desc.metaTitle = this.truncateOnWord(desc.metaTitle, 60);
        }
        
        // Meta Description: max 165 znaków, tnij na słowie
        if (desc.metaDescription && desc.metaDescription.length > 165) {
            desc.metaDescription = this.truncateOnWord(desc.metaDescription, 165);
        }
        
        // Usuń ... jeśli są
        desc.metaTitle = (desc.metaTitle || '').replace(/\.{2,}/g, '');
        desc.metaDescription = (desc.metaDescription || '').replace(/\.{2,}/g, '');
        
        return desc;
    }
    
    truncateOnWord(text, maxLength) {
        if (text.length <= maxLength) return text;
        
        // Znajdź ostatnią spację przed limitem
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > 0) {
            return truncated.substring(0, lastSpace);
        }
        
        return truncated;
    }
    
    replaceFluffWithData(desc) {
        // Jeśli opis jest pełen ogólników, zastąp sekcją ze specyfikacją
        const fluffCount = this.countFluff(JSON.stringify(desc));
        
        if (fluffCount > 5) {
            // Dodaj sekcję "Specyfikacja" na podstawie danych
            const specSection = this.generateSpecSection();
            
            if (specSection) {
                desc.longDescription = (desc.longDescription || '') + '\n\n' + specSection;
            }
        }
        
        return desc;
    }
    
    countFluff(text) {
        let count = 0;
        FORBIDDEN_PHRASES.fluff.forEach(phrase => {
            if (text.toLowerCase().includes(phrase.toLowerCase())) {
                count++;
            }
        });
        return count;
    }
    
    generateSpecSection() {
        const sections = [];
        
        sections.push('<h3>Specyfikacja techniczna</h3>');
        sections.push('<ul>');
        
        // Wymiary
        if (this.productData.dimensions.hasDimensions()) {
            const d = this.productData.dimensions;
            const dims = [d.length_mm, d.width_mm, d.height_mm]
                .filter(x => x)
                .map(x => x / 10) // mm → cm
                .join(' × ');
            sections.push(`<li><strong>Wymiary:</strong> ${dims} cm</li>`);
        }
        
        // Materiał
        if (this.productData.materials.primary) {
            sections.push(`<li><strong>Materiał:</strong> ${this.productData.materials.primary}</li>`);
        }
        
        // Ładowanie (dla elektroniki)
        if (this.productData.electrical.charging_power_w) {
            sections.push(`<li><strong>Moc ładowania:</strong> ${this.productData.electrical.charging_power_w}W</li>`);
        }
        
        if (this.productData.electrical.charging_standard) {
            sections.push(`<li><strong>Standard:</strong> ${this.productData.electrical.charging_standard}</li>`);
        }
        
        // Porty
        if (this.productData.ports.fixed.length > 0) {
            sections.push(`<li><strong>Porty stałe:</strong> ${this.productData.ports.fixed.join(', ')}</li>`);
        }
        
        if (this.productData.ports.swappable.length > 0) {
            sections.push(`<li><strong>Moduły wymienne:</strong> ${this.productData.ports.swappable.join(', ')}</li>`);
        }
        
        // Skład (dla tekstyliów)
        if (this.productData.textile.composition) {
            sections.push(`<li><strong>Skład:</strong> ${this.productData.textile.composition}</li>`);
        }
        
        if (this.productData.textile.weight_gsm) {
            sections.push(`<li><strong>Gramatura:</strong> ${this.productData.textile.weight_gsm} g/m²</li>`);
        }
        
        // Gwarancja
        if (this.productData.warranty_months) {
            sections.push(`<li><strong>Gwarancja:</strong> ${this.productData.warranty_months} miesięcy</li>`);
        }
        
        sections.push('</ul>');
        
        return sections.length > 3 ? sections.join('\n') : null;
    }
}

// ============================================
// EXPORT
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ProductData,
        ProductValidator,
        DescriptionReducer,
        FORBIDDEN_PHRASES,
        PHRASE_WEIGHTS
    };
}
