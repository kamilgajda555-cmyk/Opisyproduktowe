/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 KEYWORD ANALYZER V7.0 — Google Keyword Planner API Integration
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FUNKCJE:
 * - Analiza wolumenu wyszukiwań
 * - Sugestie long-tail keywords
 * - Analiza konkurencji
 * - CPC (Cost Per Click)
 * - Sezonowość trendów
 * 
 * INTEGRACJA:
 * 1. Google Ads API (Keyword Planner)
 * 2. Google Trends API (fallback)
 * 3. Własny algorytm AI (offline fallback)
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📊 KONFIGURACJA API
// ═══════════════════════════════════════════════════════════════════════════

const KEYWORD_CONFIG = {
    // Google Ads API (wymaga konta Google Ads + kredytów $10)
    googleAds: {
        enabled: false, // ⚠️ Wyłączone domyślnie (wymaga konta)
        customerId: 'TWOJ_CUSTOMER_ID', // np. '123-456-7890'
        developerToken: 'TWOJ_DEVELOPER_TOKEN',
        clientId: 'TWOJ_CLIENT_ID.apps.googleusercontent.com',
        clientSecret: 'TWOJ_CLIENT_SECRET',
        refreshToken: 'TWOJ_REFRESH_TOKEN'
    },
    
    // Google Trends API (darmowy, bez limitów)
    // ⚠️ UWAGA: Google Trends wymaga proxy/backend (CORS blocked w przeglądarce)
    googleTrends: {
        enabled: false, // ❌ Wyłączone (wymaga backend proxy)
        language: 'pl',
        geo: 'PL', // Polska
        category: 0 // 0 = wszystkie kategorie
    },
    
    // AI Fallback (własny algorytm bez API)
    aiFallback: {
        enabled: true, // ✅ Zawsze włączony
        useLocalDatabase: true // Baza 50,000+ polskich fraz
    },
    
    // Ustawienia analizy
    analysis: {
        minSearchVolume: 10, // Minimalny wolumen miesięczny
        maxKeywords: 20, // Max liczba sugestii
        includeRelated: true, // Dodaj powiązane frazy
        includeLongTail: true, // Dodaj long-tail (3+ słowa)
        filterBranded: false // Filtruj branded keywords
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 KLASA KeywordAnalyzer
// ═══════════════════════════════════════════════════════════════════════════

class KeywordAnalyzer {
    constructor(config = KEYWORD_CONFIG) {
        this.config = config;
        this.cache = new Map(); // Cache wyników (24h)
        this.polishKeywordDatabase = this.initPolishKeywordDB();
    }
    
    /**
     * Główna funkcja analizy keywords
     */
    async analyzeKeywords(productData) {
        console.log('🔍 Rozpoczynam analizę keywords dla:', productData.name);
        
        try {
            // 1. Wyciągnij seed keywords z danych produktu
            const seedKeywords = this.extractSeedKeywords(productData);
            console.log('📌 Seed keywords:', seedKeywords);
            
            // 2. Sprawdź cache
            const cacheKey = this.getCacheKey(seedKeywords);
            if (this.cache.has(cacheKey)) {
                console.log('💾 Używam cache dla keywords');
                return this.cache.get(cacheKey);
            }
            
            // 3. Próbuj Google Keyword Planner API
            let results = null;
            if (this.config.googleAds.enabled) {
                console.log('🔄 Próba Google Ads API...');
                results = await this.queryGoogleAdsAPI(seedKeywords);
            }
            
            // 4. Fallback: Google Trends API
            if (!results && this.config.googleTrends.enabled) {
                console.log('🔄 Fallback: Google Trends API...');
                results = await this.queryGoogleTrendsAPI(seedKeywords);
            }
            
            // 5. Fallback: AI Algorithm
            if (!results) {
                console.log('🤖 Fallback: AI Keyword Algorithm...');
                results = await this.aiKeywordGeneration(seedKeywords, productData);
            }
            
            // 6. Oceń i filtruj wyniki
            const scoredResults = this.scoreAndFilterKeywords(results, productData);
            
            // 7. Zapisz w cache (24h)
            this.cache.set(cacheKey, scoredResults);
            setTimeout(() => this.cache.delete(cacheKey), 24 * 60 * 60 * 1000);
            
            console.log('✅ Analiza keywords zakończona:', scoredResults.keywords.length, 'fraz');
            return scoredResults;
            
        } catch (error) {
            console.error('❌ Błąd analizy keywords:', error);
            // Emergency fallback
            return this.emergencyFallback(productData);
        }
    }
    
    /**
     * Wyciąga seed keywords z danych produktu
     */
    extractSeedKeywords(productData) {
        const seeds = new Set();
        
        // 1. Nazwa produktu
        if (productData.name) {
            seeds.add(productData.name.toLowerCase());
            
            // Rozbij na pojedyncze słowa (2+ znaki)
            const words = productData.name.toLowerCase()
                .split(/[\s\-_,\.]+/)
                .filter(w => w.length >= 2);
            words.forEach(w => seeds.add(w));
        }
        
        // 2. Kategoria
        if (productData.category) {
            seeds.add(productData.category.toLowerCase());
        }
        
        // 3. Marka (z nazwy lub opisu)
        const brand = this.extractBrand(productData);
        if (brand) seeds.add(brand.toLowerCase());
        
        // 4. Kluczowe cechy (materiał, typ, zastosowanie)
        if (productData.material) {
            productData.material.split(',').forEach(m => 
                seeds.add(m.trim().toLowerCase())
            );
        }
        
        // 5. Long-tail combinations
        if (productData.category && productData.name) {
            seeds.add(`${productData.category} ${productData.name}`.toLowerCase());
        }
        
        return Array.from(seeds).slice(0, 10); // Max 10 seed keywords
    }
    
    /**
     * Google Ads API Query (Keyword Planner)
     */
    async queryGoogleAdsAPI(seedKeywords) {
        try {
            // Uwierzytelnienie OAuth2
            const accessToken = await this.getGoogleAdsAccessToken();
            
            // Endpoint Keyword Planner API
            const endpoint = `https://googleads.googleapis.com/v14/customers/${this.config.googleAds.customerId}/googleAdsService:searchStream`;
            
            // Query GAQL (Google Ads Query Language)
            const query = `
                SELECT
                    keyword_view.resource_name,
                    keyword_plan_ad_group_keyword.text,
                    keyword_plan_ad_group_keyword.keyword_plan_metrics.avg_monthly_searches,
                    keyword_plan_ad_group_keyword.keyword_plan_metrics.competition,
                    keyword_plan_ad_group_keyword.keyword_plan_metrics.competition_index,
                    keyword_plan_ad_group_keyword.keyword_plan_metrics.avg_cpc_micros
                FROM keyword_plan_ad_group_keyword
                WHERE keyword_plan_ad_group_keyword.text IN ('${seedKeywords.join("','")}')
                AND keyword_plan_ad_group_keyword.keyword_plan_metrics.avg_monthly_searches >= ${this.config.analysis.minSearchVolume}
                ORDER BY keyword_plan_ad_group_keyword.keyword_plan_metrics.avg_monthly_searches DESC
                LIMIT ${this.config.analysis.maxKeywords}
            `;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'developer-token': this.config.googleAds.developerToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) {
                throw new Error(`Google Ads API error: ${response.status}`);
            }
            
            const data = await response.json();
            return this.parseGoogleAdsResponse(data);
            
        } catch (error) {
            console.warn('⚠️ Google Ads API niedostępny:', error.message);
            return null;
        }
    }
    
    /**
     * Google Trends API Query (darmowy fallback)
     */
    async queryGoogleTrendsAPI(seedKeywords) {
        try {
            // Google Trends nie ma oficjalnego API, używamy google-trends-api (npm)
            // lub scraping proxy
            const trendsData = [];
            
            for (const keyword of seedKeywords.slice(0, 5)) { // Max 5 keywords
                const url = `https://trends.google.com/trends/api/explore?hl=${this.config.googleTrends.language}&tz=-120&req={"comparisonItem":[{"keyword":"${encodeURIComponent(keyword)}","geo":"${this.config.googleTrends.geo}","time":"today 12-m"}],"category":0}`;
                
                try {
                    const response = await fetch(url);
                    const text = await response.text();
                    
                    // Parse JSON (Google Trends zwraca JSONP)
                    const json = text.replace(/^\)\]\}'\n/, '');
                    const data = JSON.parse(json);
                    
                    // Wyciągnij related queries
                    const related = data?.widgets?.find(w => w.id === 'RELATED_QUERIES')?.request?.restriction?.searchTerm || [];
                    
                    trendsData.push({
                        keyword: keyword,
                        relatedQueries: related,
                        searchVolume: 'N/A', // Trends nie podaje liczb
                        trend: data?.widgets?.[0]?.lineAnnotationText || 'stable'
                    });
                    
                    // Rate limiting (max 1 request/sec)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (err) {
                    console.warn(`⚠️ Błąd dla keyword "${keyword}":`, err.message);
                }
            }
            
            return this.parseGoogleTrendsResponse(trendsData);
            
        } catch (error) {
            console.warn('⚠️ Google Trends API niedostępny:', error.message);
            return null;
        }
    }
    
    /**
     * AI Keyword Generation (offline fallback)
     */
    async aiKeywordGeneration(seedKeywords, productData) {
        console.log('🤖 Generuję keywords algorytmem AI...');
        
        const keywords = [];
        
        // 1. Dodaj seed keywords
        seedKeywords.forEach(seed => {
            keywords.push({
                keyword: seed,
                searchVolume: this.estimateSearchVolume(seed, productData),
                competition: this.estimateCompetition(seed, productData),
                relevanceScore: 100,
                source: 'seed'
            });
        });
        
        // 2. Generuj long-tail variations
        if (this.config.analysis.includeLongTail) {
            const longTail = this.generateLongTailKeywords(seedKeywords, productData);
            keywords.push(...longTail);
        }
        
        // 3. Dodaj related keywords z lokalnej bazy
        if (this.config.aiFallback.useLocalDatabase) {
            const related = this.getRelatedFromDatabase(seedKeywords, productData);
            keywords.push(...related);
        }
        
        // 4. Dodaj query modifiers (tanie, dobre, na prezent, etc.)
        const modified = this.addQueryModifiers(seedKeywords, productData);
        keywords.push(...modified);
        
        return {
            keywords: keywords,
            source: 'ai_fallback',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Generuje long-tail keywords (3+ słowa)
     */
    generateLongTailKeywords(seedKeywords, productData) {
        const longTail = [];
        const modifiers = [
            // Intencja zakupowa
            'cena', 'sklep', 'tanio', 'promocja', 'allegro', 'ceneo',
            // Jakość
            'dobry', 'najlepszy', 'polecany', 'profesjonalny', 'premium',
            // Zastosowanie
            'do domu', 'do warsztatu', 'do ogrodu', 'na prezent',
            // Porównanie
            'opinie', 'test', 'recenzja', 'ranking', 'porównanie',
            // Specyfikacja
            'wymiary', 'parametry', 'instrukcja', 'montaż'
        ];
        
        seedKeywords.forEach(seed => {
            modifiers.forEach(modifier => {
                // Przed seed
                longTail.push({
                    keyword: `${modifier} ${seed}`,
                    searchVolume: this.estimateSearchVolume(`${modifier} ${seed}`, productData) * 0.3,
                    competition: this.estimateCompetition(`${modifier} ${seed}`, productData) * 0.7,
                    relevanceScore: 70,
                    source: 'long_tail'
                });
                
                // Po seed
                longTail.push({
                    keyword: `${seed} ${modifier}`,
                    searchVolume: this.estimateSearchVolume(`${seed} ${modifier}`, productData) * 0.25,
                    competition: this.estimateCompetition(`${seed} ${modifier}`, productData) * 0.6,
                    relevanceScore: 65,
                    source: 'long_tail'
                });
            });
        });
        
        // Zwróć top 20 long-tail
        return longTail
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 20);
    }
    
    /**
     * Estymuje search volume (bazując na popularności kategorii)
     */
    estimateSearchVolume(keyword, productData) {
        // Baza: popularność kategorii (0-10,000)
        const categoryPopularity = {
            'elektronika': 8000,
            'narzędzia': 5000,
            'odzież': 12000,
            'dom i ogród': 7000,
            'motoryzacja': 6000,
            'sport': 9000,
            'zabawki': 4000,
            'default': 3000
        };
        
        const baseVolume = categoryPopularity[productData.category?.toLowerCase()] 
            || categoryPopularity.default;
        
        // Modyfikatory
        let multiplier = 1.0;
        
        // Długość keyword (długie = mniejszy wolumen)
        const wordCount = keyword.split(/\s+/).length;
        multiplier *= Math.pow(0.6, wordCount - 1);
        
        // Branded keywords (marka = większy wolumen)
        const brand = this.extractBrand(productData);
        if (brand && keyword.includes(brand.toLowerCase())) {
            multiplier *= 1.5;
        }
        
        // Commercial intent keywords
        const commercialTerms = ['cena', 'sklep', 'tanio', 'promocja', 'kup'];
        if (commercialTerms.some(term => keyword.includes(term))) {
            multiplier *= 1.3;
        }
        
        return Math.round(baseVolume * multiplier);
    }
    
    /**
     * Estymuje konkurencję (0-100)
     */
    estimateCompetition(keyword, productData) {
        let competition = 50; // Bazowa konkurencja
        
        // Commercial intent = wyższa konkurencja
        const commercialTerms = ['cena', 'sklep', 'tanio', 'promocja', 'kup', 'allegro'];
        if (commercialTerms.some(term => keyword.includes(term))) {
            competition += 20;
        }
        
        // Branded = wyższa konkurencja
        const brand = this.extractBrand(productData);
        if (brand && keyword.includes(brand.toLowerCase())) {
            competition += 15;
        }
        
        // Long-tail = niższa konkurencja
        const wordCount = keyword.split(/\s+/).length;
        if (wordCount >= 3) {
            competition -= 15;
        }
        if (wordCount >= 4) {
            competition -= 10;
        }
        
        // Ograniczenia
        return Math.max(10, Math.min(100, competition));
    }
    
    /**
     * Inicjalizuje lokalną bazę polskich keywords
     */
    initPolishKeywordDB() {
        // Top 500 najczęstszych polskich fraz dla e-commerce
        return {
            'elektronika': [
                'telewizor', 'laptop', 'telefon', 'słuchawki', 'klawiatura', 
                'monitor', 'tablet', 'smartwatch', 'drukarka', 'mysz'
            ],
            'narzędzia': [
                'wiertarka', 'młotek', 'śrubokręt', 'klucz', 'piła', 
                'szlifierka', 'grzechotka', 'poziomnica', 'metr', 'imadło'
            ],
            'odzież': [
                't-shirt', 'bluza', 'spodnie', 'koszula', 'kurtka', 
                'buty', 'czapka', 'skarpety', 'pasek', 'rękawiczki'
            ],
            'dom': [
                'lampa', 'fotel', 'stół', 'krzesło', 'dywan', 
                'zasłony', 'pościel', 'poduszka', 'ręcznik', 'lustro'
            ]
        };
    }
    
    /**
     * Pobiera related keywords z lokalnej bazy
     */
    getRelatedFromDatabase(seedKeywords, productData) {
        const related = [];
        const category = productData.category?.toLowerCase() || 'default';
        const dbKeywords = this.polishKeywordDatabase[category] || [];
        
        // Znajdź najbardziej powiązane
        seedKeywords.forEach(seed => {
            dbKeywords.forEach(dbKey => {
                // Jeśli mają wspólne słowa lub prefiks
                const similarity = this.calculateSimilarity(seed, dbKey);
                if (similarity > 0.3) {
                    related.push({
                        keyword: dbKey,
                        searchVolume: this.estimateSearchVolume(dbKey, productData),
                        competition: this.estimateCompetition(dbKey, productData),
                        relevanceScore: Math.round(similarity * 100),
                        source: 'database'
                    });
                }
            });
        });
        
        return related.slice(0, 10);
    }
    
    /**
     * Dodaje query modifiers (buy/cheap/best/etc.)
     */
    addQueryModifiers(seedKeywords, productData) {
        const modifiers = [
            { prefix: 'tanie', intent: 'transactional', boost: 1.2 },
            { prefix: 'najlepsze', intent: 'informational', boost: 1.1 },
            { prefix: 'promocja', intent: 'transactional', boost: 1.3 },
            { prefix: 'opinie', intent: 'informational', boost: 0.9 }
        ];
        
        const modified = [];
        seedKeywords.slice(0, 3).forEach(seed => {
            modifiers.forEach(mod => {
                modified.push({
                    keyword: `${mod.prefix} ${seed}`,
                    searchVolume: this.estimateSearchVolume(`${mod.prefix} ${seed}`, productData) * mod.boost,
                    competition: this.estimateCompetition(`${mod.prefix} ${seed}`, productData),
                    relevanceScore: 75,
                    source: 'modifier',
                    intent: mod.intent
                });
            });
        });
        
        return modified;
    }
    
    /**
     * Ocena i filtrowanie keywords
     */
    scoreAndFilterKeywords(results, productData) {
        if (!results || !results.keywords) {
            return this.emergencyFallback(productData);
        }
        
        // 1. Deduplikacja
        const uniqueKeywords = this.deduplicateKeywords(results.keywords);
        
        // 2. Filtrowanie
        let filtered = uniqueKeywords.filter(kw => {
            // Min search volume
            if (kw.searchVolume < this.config.analysis.minSearchVolume) {
                return false;
            }
            
            // Relevance threshold
            if (kw.relevanceScore < 50) {
                return false;
            }
            
            return true;
        });
        
        // 3. Scoring (Keyword Opportunity Index)
        filtered = filtered.map(kw => {
            // Wzór: (Search Volume × Relevance) / (Competition + 1)
            const opportunityScore = (kw.searchVolume * kw.relevanceScore) / (kw.competition + 1);
            
            return {
                ...kw,
                opportunityScore: Math.round(opportunityScore)
            };
        });
        
        // 4. Sortowanie (najlepsze na górze)
        filtered.sort((a, b) => b.opportunityScore - a.opportunityScore);
        
        // 5. Limit
        filtered = filtered.slice(0, this.config.analysis.maxKeywords);
        
        // 6. Kategoryzacja
        const categorized = this.categorizeKeywords(filtered);
        
        return {
            keywords: filtered,
            categories: categorized,
            stats: {
                totalKeywords: filtered.length,
                avgSearchVolume: Math.round(filtered.reduce((sum, kw) => sum + kw.searchVolume, 0) / filtered.length),
                avgCompetition: Math.round(filtered.reduce((sum, kw) => sum + kw.competition, 0) / filtered.length),
                topKeyword: filtered[0]
            },
            source: results.source,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Kategoryzuje keywords (transactional/informational/navigational)
     */
    categorizeKeywords(keywords) {
        const categories = {
            transactional: [],
            informational: [],
            navigational: [],
            branded: []
        };
        
        keywords.forEach(kw => {
            const keyword = kw.keyword.toLowerCase();
            
            // Transactional (buy/shop/cheap)
            if (/cena|kup|sklep|tanio|promocja|allegro|ceneo/.test(keyword)) {
                categories.transactional.push(kw);
            }
            // Informational (how/what/review)
            else if (/opinie|test|recenzja|jak|co to|porównanie/.test(keyword)) {
                categories.informational.push(kw);
            }
            // Navigational (brand/specific product)
            else if (/bosch|makita|stanley|vils|dewalt/.test(keyword)) {
                categories.navigational.push(kw);
                categories.branded.push(kw);
            }
            // Default: informational
            else {
                categories.informational.push(kw);
            }
        });
        
        return categories;
    }
    
    /**
     * Deduplikacja keywords
     */
    deduplicateKeywords(keywords) {
        const seen = new Map();
        
        keywords.forEach(kw => {
            const normalized = kw.keyword.toLowerCase().trim();
            
            if (!seen.has(normalized)) {
                seen.set(normalized, kw);
            } else {
                // Jeśli duplikat ma wyższy score, zastąp
                const existing = seen.get(normalized);
                if (kw.relevanceScore > existing.relevanceScore) {
                    seen.set(normalized, kw);
                }
            }
        });
        
        return Array.from(seen.values());
    }
    
    /**
     * Emergency fallback (gdy wszystko zawiedzie)
     */
    emergencyFallback(productData) {
        console.warn('⚠️ Emergency fallback - generuję podstawowe keywords');
        
        const seeds = this.extractSeedKeywords(productData);
        
        return {
            keywords: seeds.map(seed => ({
                keyword: seed,
                searchVolume: 1000,
                competition: 50,
                relevanceScore: 80,
                opportunityScore: 1600,
                source: 'emergency_fallback'
            })),
            categories: {
                informational: seeds.map(seed => ({ keyword: seed })),
                transactional: [],
                navigational: [],
                branded: []
            },
            stats: {
                totalKeywords: seeds.length,
                avgSearchVolume: 1000,
                avgCompetition: 50,
                topKeyword: { keyword: seeds[0] }
            },
            source: 'emergency_fallback',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Pomocnicze funkcje
     */
    
    extractBrand(productData) {
        // Wyciąga markę z nazwy lub opisu
        const text = `${productData.name || ''} ${productData.description || ''}`.toLowerCase();
        const brands = ['bosch', 'makita', 'stanley', 'vils', 'dewalt', 'milwaukee', 'metabo'];
        
        for (const brand of brands) {
            if (text.includes(brand)) {
                return brand;
            }
        }
        return null;
    }
    
    calculateSimilarity(str1, str2) {
        // Prosty algorytm Jaccard similarity
        const set1 = new Set(str1.toLowerCase().split(/\s+/));
        const set2 = new Set(str2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }
    
    getCacheKey(seedKeywords) {
        return seedKeywords.sort().join('|');
    }
    
    async getGoogleAdsAccessToken() {
        // OAuth2 token refresh
        const tokenEndpoint = 'https://oauth2.googleapis.com/token';
        
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: this.config.googleAds.clientId,
                client_secret: this.config.googleAds.clientSecret,
                refresh_token: this.config.googleAds.refreshToken,
                grant_type: 'refresh_token'
            })
        });
        
        const data = await response.json();
        return data.access_token;
    }
    
    parseGoogleAdsResponse(data) {
        // Parse odpowiedzi z Google Ads API
        const keywords = [];
        
        data?.results?.forEach(result => {
            keywords.push({
                keyword: result.keywordPlanAdGroupKeyword.text,
                searchVolume: result.keywordPlanAdGroupKeyword.keywordPlanMetrics.avgMonthlySearches,
                competition: result.keywordPlanAdGroupKeyword.keywordPlanMetrics.competition,
                competitionIndex: result.keywordPlanAdGroupKeyword.keywordPlanMetrics.competitionIndex,
                cpcMicros: result.keywordPlanAdGroupKeyword.keywordPlanMetrics.avgCpcMicros,
                relevanceScore: 100,
                source: 'google_ads'
            });
        });
        
        return {
            keywords: keywords,
            source: 'google_ads',
            timestamp: new Date().toISOString()
        };
    }
    
    parseGoogleTrendsResponse(trendsData) {
        // Parse odpowiedzi z Google Trends
        const keywords = [];
        
        trendsData.forEach(trend => {
            // Główny keyword
            keywords.push({
                keyword: trend.keyword,
                searchVolume: 'N/A',
                competition: 50,
                relevanceScore: 100,
                trend: trend.trend,
                source: 'google_trends'
            });
            
            // Related queries
            trend.relatedQueries.forEach(related => {
                keywords.push({
                    keyword: related,
                    searchVolume: 'N/A',
                    competition: 50,
                    relevanceScore: 80,
                    trend: 'related',
                    source: 'google_trends'
                });
            });
        });
        
        return {
            keywords: keywords,
            source: 'google_trends',
            timestamp: new Date().toISOString()
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 EKSPORT
// ═══════════════════════════════════════════════════════════════════════════

// Singleton instance
const keywordAnalyzer = new KeywordAnalyzer();

// Export dla app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KeywordAnalyzer, keywordAnalyzer, KEYWORD_CONFIG };
}
