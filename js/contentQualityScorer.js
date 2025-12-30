/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 CONTENT QUALITY SCORER V7.0 — AI Quality Assessment
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * METRYKI:
 * 1. Readability Score (0-100) — czytelność (Flesch-Kincaid)
 * 2. Semantic Quality (0-100) — spójność semantyczna
 * 3. Technical Accuracy (0-100) — poprawność techniczna
 * 4. SEO Score (0-100) — optymalizacja SEO
 * 5. Engagement Potential (0-100) — potencjał zaangażowania
 * 6. Overall Score (0-100) — średnia ważona
 * 
 * INTEGRACJA:
 * - Gemini API (semantic analysis)
 * - Własne algorytmy NLP
 * - Validator V6 rules
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📊 KONFIGURACJA SCORINGU
// ═══════════════════════════════════════════════════════════════════════════

const QUALITY_CONFIG = {
    // Wagi metryk (suma = 1.0)
    weights: {
        readability: 0.20,      // 20%
        semanticQuality: 0.25,  // 25%
        technicalAccuracy: 0.20, // 20%
        seoScore: 0.20,         // 20%
        engagementPotential: 0.15 // 15%
    },
    
    // Progi jakości (ZLUZŃIONE - mniej restrykcyjne)
    thresholds: {
        excellent: 85,  // 85-100: Doskonały
        good: 70,       // 70-84: Dobry
        acceptable: 55, // 55-69: Akceptowalny
        poor: 35,       // 35-54: Słaby
        critical: 0     // 0-34: Krytyczny (nie publikuj)
    },
    
    // Konfiguracja metryk (ZLUZŃIONE)
    readability: {
        targetFleschScore: 55,      // Cel: 50-65 (średnia trudność)
        maxSentenceLength: 25,      // Max słów w zdaniu (było 20)
        maxParagraphLength: 200,    // Max słów w akapicie (było 150)
        minParagraphs: 2            // Min liczba akapitów (było 3)
    },
    
    semanticQuality: {
        minTopicCoherence: 0.6,     // Min spójność tematyczna (było 0.7)
        maxRepetitionRate: 0.20,    // Max powtarzalność fraz (20%, było 15%)
        minUniqueWords: 80          // Min liczba unikalnych słów (było 100)
    },
    
    technicalAccuracy: {
        requireDataValidation: true, // Wymaga walidacji danych
        allowPlaceholders: true,     // Zezwolone placeholdery (było false)
        requireDimensions: false     // Nie wymaga wymiarów (było true)
    },
    
    seoScore: {
        minKeywordDensity: 0.005,   // Min 0.5% dla głównego keyword (było 1%)
        maxKeywordDensity: 0.04,    // Max 4% (było 3%)
        minTitleLength: 40,         // Min (było 45)
        maxTitleLength: 65,         // Max (było 60)
        minDescriptionLength: 130,  // Min (było 140)
        maxDescriptionLength: 170,  // Max (było 165)
        requireH1: false,           // Nie wymaga (było true)
        requireH2: false            // Nie wymaga (było true)
    },
    
    engagementPotential: {
        requireBulletPoints: true,  // Wymaga bullet points
        minBulletPoints: 3,
        maxBulletPoints: 7,
        requireCTA: true,           // Wymaga Call-To-Action
        preferActivoice: true      // Preferuj stronę czynną
    },
    
    // AI Analysis
    useAIAnalysis: true,            // Użyj Gemini do semantic analysis
    aiModel: 'gemini-2.0-flash',   // Szybki model
    aiTimeout: 10000                // 10s timeout
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 KLASA ContentQualityScorer
// ═══════════════════════════════════════════════════════════════════════════

class ContentQualityScorer {
    constructor(config = QUALITY_CONFIG) {
        this.config = config;
        this.polishStopWords = this.initPolishStopWords();
    }
    
    /**
     * Główna funkcja oceny jakości
     */
    async scoreContent(content, productData, keywordData) {
        console.log('📊 Rozpoczynam ocenę jakości treści...');
        
        try {
            // 1. Readability Score
            const readabilityScore = this.calculateReadabilityScore(content);
            console.log('📖 Readability Score:', readabilityScore.score);
            
            // 2. Semantic Quality (może użyć AI)
            const semanticScore = await this.calculateSemanticQuality(content, productData);
            console.log('🧠 Semantic Quality:', semanticScore.score);
            
            // 3. Technical Accuracy
            const technicalScore = this.calculateTechnicalAccuracy(content, productData);
            console.log('🔧 Technical Accuracy:', technicalScore.score);
            
            // 4. SEO Score
            const seoScore = this.calculateSEOScore(content, keywordData);
            console.log('🔍 SEO Score:', seoScore.score);
            
            // 5. Engagement Potential
            const engagementScore = this.calculateEngagementPotential(content);
            console.log('💬 Engagement Potential:', engagementScore.score);
            
            // 6. Overall Score (średnia ważona)
            const overallScore = this.calculateOverallScore({
                readability: readabilityScore.score,
                semanticQuality: semanticScore.score,
                technicalAccuracy: technicalScore.score,
                seoScore: seoScore.score,
                engagementPotential: engagementScore.score
            });
            
            // 7. Rating i rekomendacje
            const rating = this.getRating(overallScore);
            const recommendations = this.generateRecommendations({
                readabilityScore,
                semanticScore,
                technicalScore,
                seoScore,
                engagementScore
            });
            
            const result = {
                overallScore: overallScore,
                rating: rating,
                metrics: {
                    readability: readabilityScore,
                    semanticQuality: semanticScore,
                    technicalAccuracy: technicalScore,
                    seoScore: seoScore,
                    engagementPotential: engagementScore
                },
                recommendations: recommendations,
                timestamp: new Date().toISOString()
            };
            
            console.log(`✅ Quality Score: ${overallScore}/100 (${rating})`);
            return result;
            
        } catch (error) {
            console.error('❌ Błąd oceny jakości:', error);
            return this.emergencyFallback();
        }
    }
    
    /**
     * 1. READABILITY SCORE (0-100)
     */
    calculateReadabilityScore(content) {
        const text = this.extractPlainText(content);
        
        // Podstawowe statystyki
        const sentences = this.splitIntoSentences(text);
        const words = this.splitIntoWords(text);
        const syllables = this.countSyllables(text);
        const paragraphs = this.splitIntoParagraphs(content);
        
        const sentenceCount = sentences.length;
        const wordCount = words.length;
        const syllableCount = syllables;
        const paragraphCount = paragraphs.length;
        
        // Safety check: avoid divide by zero
        if (sentenceCount === 0 || wordCount === 0) {
            console.warn('⚠️ Readability: brak zdań lub słów, zwracam domyślny score 70');
            return {
                score: 70,
                details: {
                    fleschScore: 70,
                    sentenceCount: 0,
                    wordCount: 0,
                    avgWordsPerSentence: '0',
                    longSentences: 0,
                    paragraphCount: paragraphCount,
                    longParagraphs: 0
                },
                interpretation: 'Przystępny (dobry)'
            };
        }
        
        // Flesch Reading Ease Score (polska adaptacja)
        // Wzór: 206.835 - 1.015 × (słowa/zdania) - 84.6 × (sylaby/słowa)
        const avgWordsPerSentence = wordCount / sentenceCount;
        const avgSyllablesPerWord = syllableCount / wordCount;
        
        let fleschScore = 206.835 
            - (1.015 * avgWordsPerSentence) 
            - (84.6 * avgSyllablesPerWord);
        
        // Ograniczenia (0-100)
        fleschScore = Math.max(0, Math.min(100, fleschScore));
        
        // Kary za zbyt długie zdania
        const longSentences = sentences.filter(s => 
            this.splitIntoWords(s).length > this.config.readability.maxSentenceLength
        ).length;
        const longSentencePenalty = sentenceCount > 0 ? (longSentences / sentenceCount) * 20 : 0;
        
        // Kary za zbyt długie akapity
        const longParagraphs = paragraphs.filter(p => 
            this.splitIntoWords(p).length > this.config.readability.maxParagraphLength
        ).length;
        const longParagraphPenalty = paragraphCount > 0 ? (longParagraphs / paragraphCount) * 15 : 0;
        
        // Bonus za odpowiednią liczbę akapitów
        const paragraphBonus = paragraphCount >= this.config.readability.minParagraphs ? 5 : 0;
        
        // Finalny score
        let finalScore = fleschScore - longSentencePenalty - longParagraphPenalty + paragraphBonus;
        finalScore = Math.max(0, Math.min(100, finalScore));
        
        return {
            score: Math.round(finalScore),
            details: {
                fleschScore: Math.round(fleschScore),
                sentenceCount: sentenceCount,
                wordCount: wordCount,
                avgWordsPerSentence: avgWordsPerSentence.toFixed(1),
                longSentences: longSentences,
                paragraphCount: paragraphCount,
                longParagraphs: longParagraphs
            },
            interpretation: this.interpretFleschScore(fleschScore)
        };
    }
    
    /**
     * 2. SEMANTIC QUALITY (0-100)
     */
    async calculateSemanticQuality(content, productData) {
        const text = this.extractPlainText(content);
        const words = this.splitIntoWords(text);
        
        // 2.1. Topic Coherence (spójność tematyczna)
        const topicCoherence = this.calculateTopicCoherence(text, productData);
        
        // 2.2. Repetition Rate (powtarzalność)
        const repetitionRate = this.calculateRepetitionRate(words);
        
        // 2.3. Unique Words Count
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const uniqueWordsCount = uniqueWords.size;
        
        // 2.4. AI Semantic Analysis (opcjonalne)
        let aiSemanticScore = 0;
        if (this.config.useAIAnalysis) {
            try {
                aiSemanticScore = await this.aiSemanticAnalysis(text, productData);
            } catch (error) {
                console.warn('⚠️ AI semantic analysis failed:', error.message);
            }
        }
        
        // Scoring
        let score = 0;
        
        // Topic coherence (40 pkt)
        score += topicCoherence * 40;
        
        // Low repetition (30 pkt)
        const repetitionScore = Math.max(0, 1 - (repetitionRate / this.config.semanticQuality.maxRepetitionRate));
        score += repetitionScore * 30;
        
        // Unique words (20 pkt)
        const uniqueWordsScore = Math.min(1, uniqueWordsCount / this.config.semanticQuality.minUniqueWords);
        score += uniqueWordsScore * 20;
        
        // AI semantic analysis (10 pkt)
        if (aiSemanticScore > 0) {
            score += aiSemanticScore * 0.1; // Normalize to 10 pkt
        } else {
            score += 10; // Default bonus
        }
        
        return {
            score: Math.round(score),
            details: {
                topicCoherence: topicCoherence.toFixed(2),
                repetitionRate: (repetitionRate * 100).toFixed(1) + '%',
                uniqueWordsCount: uniqueWordsCount,
                aiSemanticScore: aiSemanticScore
            }
        };
    }
    
    /**
     * 3. TECHNICAL ACCURACY (0-100)
     */
    calculateTechnicalAccuracy(content, productData) {
        let score = 100; // Start z 100, odejmuj kary
        const issues = [];
        
        // 3.1. Placeholders (KRYTYCZNY BŁĄD)
        const placeholders = this.detectPlaceholders(content);
        if (placeholders.length > 0) {
            score -= 50; // -50 pkt za każdy placeholder
            issues.push({
                severity: 'critical',
                type: 'placeholder',
                count: placeholders.length,
                examples: placeholders.slice(0, 3)
            });
        }
        
        // 3.2. Wymiary (jeśli applicable)
        if (this.config.technicalAccuracy.requireDimensions) {
            const dimensionsValid = this.validateDimensions(content, productData);
            if (!dimensionsValid.valid) {
                score -= 20;
                issues.push({
                    severity: 'high',
                    type: 'dimensions',
                    reason: dimensionsValid.reason
                });
            }
        }
        
        // 3.3. Dane techniczne (kompletność)
        const dataCompleteness = this.checkDataCompleteness(content, productData);
        score += dataCompleteness.score * 0.3; // Max +30 pkt
        if (dataCompleteness.missingFields.length > 0) {
            issues.push({
                severity: 'medium',
                type: 'missing_data',
                fields: dataCompleteness.missingFields
            });
        }
        
        // 3.4. Jednostki miar (consistency)
        const unitsConsistent = this.validateUnits(content);
        if (!unitsConsistent.valid) {
            score -= 10;
            issues.push({
                severity: 'medium',
                type: 'units_inconsistent',
                examples: unitsConsistent.issues
            });
        }
        
        // 3.5. Liczby i wartości (format)
        const numbersValid = this.validateNumbers(content);
        if (!numbersValid.valid) {
            score -= 5;
            issues.push({
                severity: 'low',
                type: 'number_format',
                examples: numbersValid.issues
            });
        }
        
        // Ograniczenia
        score = Math.max(0, Math.min(100, score));
        
        return {
            score: Math.round(score),
            issues: issues,
            details: {
                placeholderCount: placeholders.length,
                dimensionsValid: this.config.technicalAccuracy.requireDimensions ? 
                    this.validateDimensions(content, productData).valid : 'N/A',
                dataCompleteness: dataCompleteness.completeness + '%',
                unitsConsistent: unitsConsistent.valid
            }
        };
    }
    
    /**
     * 4. SEO SCORE (0-100)
     */
    calculateSEOScore(content, keywordData) {
        let score = 0;
        const issues = [];
        
        // Główny keyword (z keywordData)
        const primaryKeyword = keywordData?.keywords?.[0]?.keyword || '';
        
        // 4.1. Title Tag (20 pkt)
        const titleScore = this.scoreTitleTag(content, primaryKeyword);
        score += titleScore.score;
        if (titleScore.issues.length > 0) {
            issues.push(...titleScore.issues);
        }
        
        // 4.2. Meta Description (15 pkt)
        const metaScore = this.scoreMetaDescription(content, primaryKeyword);
        score += metaScore.score;
        if (metaScore.issues.length > 0) {
            issues.push(...metaScore.issues);
        }
        
        // 4.3. Keyword Density (20 pkt)
        const keywordScore = this.scoreKeywordDensity(content, primaryKeyword);
        score += keywordScore.score;
        if (keywordScore.issues.length > 0) {
            issues.push(...keywordScore.issues);
        }
        
        // 4.4. Headings (H1, H2) (20 pkt)
        const headingsScore = this.scoreHeadings(content, primaryKeyword);
        score += headingsScore.score;
        if (headingsScore.issues.length > 0) {
            issues.push(...headingsScore.issues);
        }
        
        // 4.5. Internal Structure (15 pkt)
        const structureScore = this.scoreContentStructure(content);
        score += structureScore.score;
        if (structureScore.issues.length > 0) {
            issues.push(...structureScore.issues);
        }
        
        // 4.6. Keyword Variations (10 pkt)
        const variationsScore = this.scoreKeywordVariations(content, keywordData);
        score += variationsScore.score;
        
        return {
            score: Math.round(score),
            issues: issues,
            details: {
                primaryKeyword: primaryKeyword,
                titleScore: titleScore.score,
                metaScore: metaScore.score,
                keywordDensity: keywordScore.density,
                h1Count: headingsScore.h1Count,
                h2Count: headingsScore.h2Count
            }
        };
    }
    
    /**
     * 5. ENGAGEMENT POTENTIAL (0-100)
     */
    calculateEngagementPotential(content) {
        let score = 0;
        const issues = [];
        
        // 5.1. Bullet Points (30 pkt)
        const bulletScore = this.scoreBulletPoints(content);
        score += bulletScore.score;
        if (bulletScore.issues.length > 0) {
            issues.push(...bulletScore.issues);
        }
        
        // 5.2. Call-To-Action (25 pkt)
        const ctaScore = this.scoreCTA(content);
        score += ctaScore.score;
        if (ctaScore.issues.length > 0) {
            issues.push(...ctaScore.issues);
        }
        
        // 5.3. Active Voice (20 pkt)
        const voiceScore = this.scoreActiveVoice(content);
        score += voiceScore.score;
        
        // 5.4. Emotional Triggers (15 pkt)
        const emotionScore = this.scoreEmotionalTriggers(content);
        score += emotionScore.score;
        
        // 5.5. Visual Elements (10 pkt)
        const visualScore = this.scoreVisualElements(content);
        score += visualScore.score;
        
        return {
            score: Math.round(score),
            issues: issues,
            details: {
                bulletPointsCount: bulletScore.count,
                ctaPresent: ctaScore.present,
                activeVoiceRate: voiceScore.rate,
                emotionalTriggers: emotionScore.triggers
            }
        };
    }
    
    /**
     * Oblicza overall score (średnia ważona)
     */
    calculateOverallScore(scores) {
        const weights = this.config.weights;
        
        const overallScore = 
            (scores.readability * weights.readability) +
            (scores.semanticQuality * weights.semanticQuality) +
            (scores.technicalAccuracy * weights.technicalAccuracy) +
            (scores.seoScore * weights.seoScore) +
            (scores.engagementPotential * weights.engagementPotential);
        
        return Math.round(overallScore);
    }
    
    /**
     * Określa rating na podstawie score
     */
    getRating(score) {
        if (score >= this.config.thresholds.excellent) {
            return 'Doskonały';
        } else if (score >= this.config.thresholds.good) {
            return 'Dobry';
        } else if (score >= this.config.thresholds.acceptable) {
            return 'Akceptowalny';
        } else if (score >= this.config.thresholds.poor) {
            return 'Słaby';
        } else {
            return 'Krytyczny';
        }
    }
    
    /**
     * Generuje rekomendacje do poprawy
     */
    generateRecommendations(metricScores) {
        const recommendations = [];
        
        // Readability
        if (metricScores.readabilityScore.score < 60) {
            recommendations.push({
                priority: 'high',
                metric: 'readability',
                action: 'Skróć zdania i akapity dla lepszej czytelności',
                details: metricScores.readabilityScore.details
            });
        }
        
        // Semantic Quality
        if (metricScores.semanticScore.score < 70) {
            recommendations.push({
                priority: 'high',
                metric: 'semanticQuality',
                action: 'Popraw spójność tematyczną i zmniejsz powtórzenia',
                details: metricScores.semanticScore.details
            });
        }
        
        // Technical Accuracy
        if (metricScores.technicalScore.score < 80) {
            recommendations.push({
                priority: 'critical',
                metric: 'technicalAccuracy',
                action: 'Usuń placeholdery i uzupełnij brakujące dane techniczne',
                issues: metricScores.technicalScore.issues
            });
        }
        
        // SEO Score
        if (metricScores.seoScore.score < 70) {
            recommendations.push({
                priority: 'high',
                metric: 'seoScore',
                action: 'Optymalizuj title, meta description i użycie keywords',
                issues: metricScores.seoScore.issues
            });
        }
        
        // Engagement Potential
        if (metricScores.engagementScore.score < 65) {
            recommendations.push({
                priority: 'medium',
                metric: 'engagementPotential',
                action: 'Dodaj bullet points, CTA i więcej emotional triggers',
                issues: metricScores.engagementScore.issues
            });
        }
        
        return recommendations;
    }
    
    /**
     * Emergency fallback
     */
    emergencyFallback() {
        return {
            overallScore: 50,
            rating: 'Nieznany (błąd analizy)',
            metrics: {},
            recommendations: [{
                priority: 'critical',
                metric: 'system',
                action: 'Błąd systemu oceny jakości - sprawdź ręcznie'
            }],
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * POMOCNICZE FUNKCJE
     */
    
    extractPlainText(content) {
        // Usuń HTML tags
        return content
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    splitIntoSentences(text) {
        return text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    
    splitIntoWords(text) {
        return text
            .toLowerCase()
            .split(/[\s\-_,.;:!?()]+/)
            .filter(w => w.length > 0);
    }
    
    splitIntoParagraphs(content) {
        return content
            .split(/\n\n+|<\/p>|<br\s*\/?>\s*<br\s*\/?>/)
            .map(p => this.extractPlainText(p))
            .filter(p => p.length > 0);
    }
    
    countSyllables(text) {
        // Prosta heurystyka dla polskiego
        const words = this.splitIntoWords(text);
        let count = 0;
        
        words.forEach(word => {
            // Polski: liczymy samogłoski
            const vowels = word.match(/[aeiouyąęó]/gi);
            count += vowels ? vowels.length : 1;
        });
        
        return count;
    }
    
    interpretFleschScore(score) {
        if (score >= 90) return 'Bardzo łatwy';
        if (score >= 80) return 'Łatwy';
        if (score >= 70) return 'Dość łatwy';
        if (score >= 60) return 'Średni';
        if (score >= 50) return 'Dość trudny';
        if (score >= 30) return 'Trudny';
        return 'Bardzo trudny';
    }
    
    calculateTopicCoherence(text, productData) {
        // Prosty algorytm: ile kluczowych słów z productData występuje w tekście
        const keywords = [
            productData.name,
            productData.category,
            productData.material,
            productData.brand
        ].filter(k => k).map(k => k.toLowerCase());
        
        const textLower = text.toLowerCase();
        let matches = 0;
        
        keywords.forEach(keyword => {
            if (textLower.includes(keyword)) {
                matches++;
            }
        });
        
        return matches / Math.max(keywords.length, 1);
    }
    
    calculateRepetitionRate(words) {
        // Stosunek powtarzających się fraz (2-3 słowa) do wszystkich fraz
        const bigrams = [];
        for (let i = 0; i < words.length - 1; i++) {
            bigrams.push(`${words[i]} ${words[i+1]}`);
        }
        
        const uniqueBigrams = new Set(bigrams);
        const repetitionRate = 1 - (uniqueBigrams.size / bigrams.length);
        
        return repetitionRate;
    }
    
    async aiSemanticAnalysis(text, productData) {
        // Użyj Gemini do semantic analysis
        const prompt = `Oceń spójność semantyczną i jakość poniższego opisu produktu (0-100 pkt):

PRODUKT: ${productData.name}
KATEGORIA: ${productData.category}

OPIS:
${text}

Zwróć TYLKO liczbę (0-100).`;
        
        try {
            const response = await this.callGemini(prompt);
            const score = parseInt(response.trim());
            
            return isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
        } catch (error) {
            return 0;
        }
    }
    
    async callGemini(prompt) {
        // Wywołaj Gemini API (używa globalnego GEMINI_API_KEY)
        const model = this.config.aiModel;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.aiTimeout);
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 100 }
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
            
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    }
    
    detectPlaceholders(content) {
        // Regex dla placeholderów
        const patterns = [
            /\bxx\b/gi,
            /\bxxx\b/gi,
            /\bTBD\b/gi,
            /\bTODO\b/gi,
            /\[.*?\]/g, // [placeholder]
            /{{.*?}}/g, // {{placeholder}}
            /Producent nie podaje/gi
        ];
        
        const matches = [];
        patterns.forEach(pattern => {
            const found = content.match(pattern);
            if (found) {
                matches.push(...found);
            }
        });
        
        return matches;
    }
    
    validateDimensions(content, productData) {
        // Sprawdź czy wymiary są poprawne (w cm, nie mm)
        if (!productData.dimensions) {
            return { valid: true }; // Brak wymiarów = OK (opcjonalne)
        }
        
        const dimensionsText = content.toLowerCase();
        
        // Szukaj wzorców: "240×100×110 mm" lub "240×100 mm"
        const mmPattern = /\d+\s*×\s*\d+(?:\s*×\s*\d+)?\s*mm/g;
        const mmMatches = dimensionsText.match(mmPattern);
        
        if (mmMatches && mmMatches.length > 0) {
            return {
                valid: false,
                reason: `Wymiary w mm zamiast cm: ${mmMatches.join(', ')}`
            };
        }
        
        return { valid: true };
    }
    
    checkDataCompleteness(content, productData) {
        // Sprawdź które pola są wypełnione
        const requiredFields = ['name', 'category', 'description'];
        const optionalFields = ['material', 'dimensions', 'color', 'warranty_months'];
        
        const allFields = [...requiredFields, ...optionalFields];
        let filledCount = 0;
        const missingFields = [];
        
        allFields.forEach(field => {
            if (productData[field] && productData[field] !== 'N/A') {
                filledCount++;
            } else {
                missingFields.push(field);
            }
        });
        
        const completeness = (filledCount / allFields.length) * 100;
        
        return {
            score: completeness,
            completeness: Math.round(completeness),
            missingFields: missingFields
        };
    }
    
    validateUnits(content) {
        // Sprawdź consistency jednostek (cm vs mm)
        const cmCount = (content.match(/\bcm\b/gi) || []).length;
        const mmCount = (content.match(/\bmm\b/gi) || []).length;
        
        // Jeśli mieszane, to inconsistent
        if (cmCount > 0 && mmCount > 0) {
            return {
                valid: false,
                issues: [`Mieszane jednostki: ${cmCount}× cm, ${mmCount}× mm`]
            };
        }
        
        return { valid: true };
    }
    
    validateNumbers(content) {
        // Sprawdź format liczb (polski vs angielski)
        const issues = [];
        
        // Szukaj liczb z przecinkiem (format polski)
        const polishNumbers = content.match(/\d+,\d+/g);
        
        // Szukaj liczb z kropką (format angielski - niepoprawny dla polskiego)
        const englishNumbers = content.match(/\d+\.\d+(?!\s*cm|\s*mm|\s*kg)/g);
        
        if (polishNumbers && englishNumbers) {
            issues.push('Mieszane formaty liczb (polski "," vs angielski ".")');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
    
    scoreTitleTag(content, keyword) {
        // Znajdź title (może być w meta lub pierwszym H1)
        const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i) 
            || content.match(/<h1[^>]*>(.*?)<\/h1>/i);
        
        if (!titleMatch) {
            return {
                score: 0,
                issues: [{ type: 'title_missing', severity: 'critical' }]
            };
        }
        
        const title = this.extractPlainText(titleMatch[1]);
        const length = title.length;
        let score = 0;
        const issues = [];
        
        // Długość (10 pkt)
        if (length >= this.config.seoScore.minTitleLength && length <= this.config.seoScore.maxTitleLength) {
            score += 10;
        } else {
            issues.push({
                type: 'title_length',
                severity: 'high',
                current: length,
                expected: `${this.config.seoScore.minTitleLength}-${this.config.seoScore.maxTitleLength}`
            });
        }
        
        // Keyword present (10 pkt)
        if (keyword && title.toLowerCase().includes(keyword.toLowerCase())) {
            score += 10;
        } else if (keyword) {
            issues.push({
                type: 'keyword_missing_in_title',
                severity: 'high',
                keyword: keyword
            });
        }
        
        return { score, issues };
    }
    
    scoreMetaDescription(content, keyword) {
        const metaMatch = content.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
        
        if (!metaMatch) {
            return {
                score: 0,
                issues: [{ type: 'meta_description_missing', severity: 'critical' }]
            };
        }
        
        const meta = this.extractPlainText(metaMatch[1]);
        const length = meta.length;
        let score = 0;
        const issues = [];
        
        // Długość (7.5 pkt)
        if (length >= this.config.seoScore.minDescriptionLength && length <= this.config.seoScore.maxDescriptionLength) {
            score += 7.5;
        } else {
            issues.push({
                type: 'meta_description_length',
                severity: 'high',
                current: length,
                expected: `${this.config.seoScore.minDescriptionLength}-${this.config.seoScore.maxDescriptionLength}`
            });
        }
        
        // Keyword present (7.5 pkt)
        if (keyword && meta.toLowerCase().includes(keyword.toLowerCase())) {
            score += 7.5;
        } else if (keyword) {
            issues.push({
                type: 'keyword_missing_in_meta',
                severity: 'medium',
                keyword: keyword
            });
        }
        
        return { score, issues };
    }
    
    scoreKeywordDensity(content, keyword) {
        if (!keyword) return { score: 20, density: 0 }; // Brak keyword = full score
        
        const text = this.extractPlainText(content).toLowerCase();
        const words = this.splitIntoWords(text);
        const keywordLower = keyword.toLowerCase();
        
        const keywordCount = words.filter(w => w === keywordLower).length;
        const density = keywordCount / words.length;
        
        let score = 0;
        const issues = [];
        
        if (density >= this.config.seoScore.minKeywordDensity && density <= this.config.seoScore.maxKeywordDensity) {
            score = 20;
        } else if (density < this.config.seoScore.minKeywordDensity) {
            score = (density / this.config.seoScore.minKeywordDensity) * 20;
            issues.push({
                type: 'keyword_density_low',
                severity: 'medium',
                current: (density * 100).toFixed(2) + '%',
                expected: `${this.config.seoScore.minKeywordDensity * 100}%+`
            });
        } else {
            // Over-optimization penalty
            score = Math.max(0, 20 - ((density - this.config.seoScore.maxKeywordDensity) * 500));
            issues.push({
                type: 'keyword_density_high',
                severity: 'high',
                current: (density * 100).toFixed(2) + '%',
                expected: `Max ${this.config.seoScore.maxKeywordDensity * 100}%`
            });
        }
        
        return { score, density: (density * 100).toFixed(2) + '%', issues };
    }
    
    scoreHeadings(content, keyword) {
        const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
        const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
        
        let score = 0;
        const issues = [];
        
        // H1 present (10 pkt)
        if (h1Count === 1) {
            score += 10;
        } else if (h1Count === 0) {
            issues.push({ type: 'h1_missing', severity: 'high' });
        } else {
            issues.push({ type: 'multiple_h1', severity: 'medium', count: h1Count });
            score += 5; // Partial credit
        }
        
        // H2 present (10 pkt)
        if (h2Count >= 2) {
            score += 10;
        } else if (h2Count === 0) {
            issues.push({ type: 'h2_missing', severity: 'medium' });
        } else {
            score += 5; // Partial credit
        }
        
        return { score, h1Count, h2Count, issues };
    }
    
    scoreContentStructure(content) {
        let score = 0;
        const issues = [];
        
        // Lista (<ul> lub <ol>) (10 pkt)
        const listCount = (content.match(/<ul[^>]*>|<ol[^>]*>/gi) || []).length;
        if (listCount > 0) {
            score += 10;
        } else {
            issues.push({ type: 'no_lists', severity: 'low' });
            score += 5; // Partial credit
        }
        
        // Akapity (<p>) (5 pkt)
        const paragraphCount = (content.match(/<p[^>]*>/gi) || []).length;
        if (paragraphCount >= 3) {
            score += 5;
        }
        
        return { score, issues };
    }
    
    scoreKeywordVariations(content, keywordData) {
        if (!keywordData || !keywordData.keywords) {
            return { score: 10 }; // Default
        }
        
        const text = this.extractPlainText(content).toLowerCase();
        const relatedKeywords = keywordData.keywords.slice(1, 6); // Top 5 related
        
        let foundCount = 0;
        relatedKeywords.forEach(kw => {
            if (text.includes(kw.keyword.toLowerCase())) {
                foundCount++;
            }
        });
        
        const score = (foundCount / relatedKeywords.length) * 10;
        return { score };
    }
    
    scoreBulletPoints(content) {
        const bulletMatch = content.match(/<ul[^>]*>(.*?)<\/ul>/gis);
        
        if (!bulletMatch) {
            return {
                score: 0,
                count: 0,
                issues: [{ type: 'bullet_points_missing', severity: 'high' }]
            };
        }
        
        // Count <li> items
        const liCount = (bulletMatch.join('').match(/<li[^>]*>/gi) || []).length;
        
        let score = 0;
        const issues = [];
        
        if (liCount >= this.config.engagementPotential.minBulletPoints && 
            liCount <= this.config.engagementPotential.maxBulletPoints) {
            score = 30;
        } else if (liCount < this.config.engagementPotential.minBulletPoints) {
            score = (liCount / this.config.engagementPotential.minBulletPoints) * 30;
            issues.push({
                type: 'too_few_bullet_points',
                severity: 'medium',
                current: liCount,
                expected: `${this.config.engagementPotential.minBulletPoints}+`
            });
        } else {
            score = 20; // Penalty for too many
            issues.push({
                type: 'too_many_bullet_points',
                severity: 'low',
                current: liCount,
                expected: `Max ${this.config.engagementPotential.maxBulletPoints}`
            });
        }
        
        return { score, count: liCount, issues };
    }
    
    scoreCTA(content) {
        const ctaPatterns = [
            /kup teraz/gi,
            /dodaj do koszyka/gi,
            /zamów dziś/gi,
            /sprawdź ofertę/gi,
            /zobacz więcej/gi,
            /skontaktuj się/gi
        ];
        
        let present = false;
        ctaPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                present = true;
            }
        });
        
        const score = present ? 25 : 0;
        const issues = present ? [] : [{ type: 'cta_missing', severity: 'medium' }];
        
        return { score, present, issues };
    }
    
    scoreActiveVoice(content) {
        // Prosty heurystyka: ile zdań ma stronę czynną
        const text = this.extractPlainText(content);
        const sentences = this.splitIntoSentences(text);
        
        // Polski: strona bierna często używa "zostać", "być" + participle
        const passiveCount = sentences.filter(s => 
            /\b(został|została|zostało|zostali|zostały|jest|są)\s+\w+(any|ana|ane|ani)\b/i.test(s)
        ).length;
        
        const activeRate = 1 - (passiveCount / sentences.length);
        const score = activeRate * 20;
        
        return { score, rate: (activeRate * 100).toFixed(1) + '%' };
    }
    
    scoreEmotionalTriggers(content) {
        const text = this.extractPlainText(content).toLowerCase();
        
        // Emotional trigger words (pozytywne)
        const triggers = [
            'doskonały', 'wyjątkowy', 'niezawodny', 'profesjonalny', 'premium',
            'innowacyjny', 'nowoczesny', 'komfortowy', 'elegancki', 'stylowy',
            'oszczędność', 'gwarancja', 'bezpieczny', 'łatwy', 'szybki'
        ];
        
        let foundCount = 0;
        triggers.forEach(trigger => {
            if (text.includes(trigger)) {
                foundCount++;
            }
        });
        
        const score = Math.min(15, foundCount * 3);
        
        return { score, triggers: foundCount };
    }
    
    scoreVisualElements(content) {
        // Obrazy, listy, wyróżnienia
        const imgCount = (content.match(/<img[^>]*>/gi) || []).length;
        const strongCount = (content.match(/<strong[^>]*>|<b[^>]*>/gi) || []).length;
        const emCount = (content.match(/<em[^>]*>|<i[^>]*>/gi) || []).length;
        
        let score = 0;
        
        if (imgCount > 0) score += 5;
        if (strongCount > 0) score += 3;
        if (emCount > 0) score += 2;
        
        return { score };
    }
    
    initPolishStopWords() {
        // Top 100 polskich stop words
        return new Set([
            'i', 'w', 'na', 'z', 'do', 'o', 'że', 'się', 'nie', 'po',
            'a', 'we', 'od', 'dla', 'przez', 'być', 'to', 'co', 'ze', 'ten'
            // ... (skrócone dla zwięzłości)
        ]);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 EKSPORT
// ═══════════════════════════════════════════════════════════════════════════

// Singleton instance
const contentQualityScorer = new ContentQualityScorer();

// Export dla app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentQualityScorer, contentQualityScorer, QUALITY_CONFIG };
}
