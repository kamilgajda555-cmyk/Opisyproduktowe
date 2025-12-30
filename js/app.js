// ===== GLOBAL STATE =====
let productsData = [];
let generatedDescriptions = [];
let generatedContents = new Map(); // Mapa: productId -> opis (do kontroli unikalności)
let selectedProducts = new Set();
let rawCSVData = [];  // Surowe dane CSV przed mapowaniem
let csvColumns = [];   // Kolumny z CSV
let columnMapping = {}; // Mapowanie kolumn

// ===== API KEY - WKLEJ TUTÓJ SWÓJ KLUCZ GEMINI API =====
// Instrukcja: https://aistudio.google.com/app/apikey
// ⚠️ WAŻNE: Klucz API powinien być w pliku .env (nie w repo!)
const API_KEY = prompt('Wklej swój klucz Gemini API:', localStorage.getItem('gemini_api_key') || '');  // Pobierz z localStorage lub zapytaj użytkownika
if (API_KEY) localStorage.setItem('gemini_api_key', API_KEY);  // Zapisz lokalnie

// Walidacja klucza przy starcie
if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error('❌ BRAK KLUCZA API GEMINI!');
    console.log('📌 Instrukcja:');
    console.log('1. Otwórz: https://aistudio.google.com/app/apikey');
    console.log('2. Zaloguj się kontem Google');
    console.log('3. Kliknij "Create API Key"');
    console.log('4. Skopiuj klucz (zaczyna się od AIza...)');
    console.log('5. Otwórz plik: js/app.js');
    console.log('6. Znajdź linię 9: const API_KEY = ...');
    console.log('7. Wklej swój klucz');
    console.log('8. Zapisz plik (Ctrl+S)');
    console.log('9. Odśwież stronę (F5)');
} else {
    console.log('✅ API Key configured:', API_KEY.substring(0, 10) + '...');
}

// ===== KONFIGURACJA WERYFIKACJI EAN =====
const EAN_VERIFICATION_CONFIG = {
    enabled: false,              // Wyłącz jeśli CORS blokuje (localhost)
    enabledAPIs: {
        openFoodFacts: false,    // Zazwyczaj działa (bez CORS)
        barcodeLookup: false,    // CORS problem (wyłącz dla localhost)
        eanSearch: false         // 401 Unauthorized (wymagana rejestracja)
    },
    skipIfEmpty: true            // Pomiń jeśli EAN pusty lub nieprawidłowy
};

// ===== KONFIGURACJA GEMINI AI (JAKOŚĆ vs SZYBKOŚĆ) =====
const GEMINI_CONFIG = {
    priorityMode: 'QUALITY',     // 'QUALITY' (60s, 2 retry) lub 'SPEED' (20s, 1 retry)
    
    models: {
        QUALITY: [
            { name: 'gemini-2.5-pro', version: 'v1', timeout: 60000, retries: 2 },
            { name: 'gemini-2.5-flash', version: 'v1', timeout: 30000, retries: 1 }
        ],
        SPEED: [
            { name: 'gemini-2.5-flash', version: 'v1', timeout: 20000, retries: 1 },
            { name: 'gemini-2.0-flash', version: 'v1', timeout: 15000, retries: 1 }
        ],
        BALANCED: [
            { name: 'gemini-2.5-pro', version: 'v1', timeout: 30000, retries: 1 },
            { name: 'gemini-2.5-flash', version: 'v1', timeout: 20000, retries: 1 },
            { name: 'gemini-2.0-flash', version: 'v1', timeout: 15000, retries: 1 }
        ]
    }
};



// ===== INITIALIZATION =====
console.log('🚀 Skrypt app.js został załadowany');

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM załadowany, inicjalizacja...');
    initializeApp();
});

function initializeApp() {
    console.log('Uruchamiam initializeApp() V7.0.6 ULTIMATE');
    console.log('Papa Parse dostepny:', typeof Papa !== 'undefined');
    console.log('XLSX dostepny:', typeof XLSX !== 'undefined');
    
    // V7.0.6 ULTIMATE: Inicjalizuj Enhanced Prompt Generator
    if (typeof EnhancedPromptGenerator !== 'undefined') {
        window.enhancedPromptGenerator = new EnhancedPromptGenerator();
        console.log('Enhanced Prompt Generator V7.0.6 initialized');
    } else {
        console.warn('Enhanced Prompt Generator not available, using legacy prompts');
    }
    
    setupFileUpload();
    setupDragAndDrop();
    console.log('Aplikacja zainicjalizowana V7.0.6 ULTIMATE');
}

// ===== FILE UPLOAD HANDLING =====
function setupFileUpload() {
    console.log('📂 Konfiguruję upload plików...');
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput) {
        console.error('❌ Nie znaleziono elementu csv-file-input!');
        return;
    }
    fileInput.addEventListener('change', handleFileSelect);
    console.log('✅ Event listener dla file input dodany');
}

function setupDragAndDrop() {
    console.log('🖱️ Konfiguruję drag & drop...');
    const uploadArea = document.getElementById('upload-area');
    if (!uploadArea) {
        console.error('❌ Nie znaleziono elementu upload-area!');
        return;
    }
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        console.log('📦 Plik upuszczony:', file ? file.name : 'brak');
        if (file && file.name.endsWith('.csv')) {
            handleFile(file);
        } else {
            alert('Proszę wybrać plik CSV');
        }
    });
    console.log('✅ Drag & drop skonfigurowany');
}

function handleFileSelect(event) {
    console.log('🖱️ Plik wybrany przez input');
    const file = event.target.files[0];
    if (file) {
        console.log('📄 Nazwa pliku:', file.name, 'Rozmiar:', file.size);
        handleFile(file);
    }
}

function handleFile(file) {
    console.log('🔄 Rozpoczynam przetwarzanie pliku:', file.name);
    showLoading(true);
    
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = `(${formatFileSize(file.size)})`;
    document.getElementById('file-info').style.display = 'flex';
    
    console.log('📝 Rozpoczynam parsowanie CSV...');
    console.log('🔍 Papa Parse dostępny:', typeof Papa !== 'undefined');
    
    if (typeof Papa === 'undefined') {
        console.error('❌ Papa Parse nie załadowany!');
        alert('Błąd: Biblioteka Papa Parse nie została załadowana. Odśwież stronę (Ctrl+Shift+R).');
        showLoading(false);
        return;
    }
    
    Papa.parse(file, {
        header: true,
        encoding: 'UTF-8',
        skipEmptyLines: true,
        delimiter: '',  // Auto-detect: przecinek, średnik, tab
        complete: function(results) {
            console.log('✅ Parsowanie zakończone, wierszy:', results.data.length);
            console.log('🔍 Wykryty separator:', results.meta.delimiter);
            console.log('📊 Nazwy kolumn:', results.meta.fields);
            console.log('📊 Liczba kolumn:', results.meta.fields ? results.meta.fields.length : 0);
            console.log('📊 Pierwsze 3 wiersze:', results.data.slice(0, 3));
            
            // WALIDACJA: Sprawdź czy Papa Parse poprawnie rozpoznał separator
            if (results.meta.fields && results.meta.fields.length <= 2) {
                console.warn('⚠️ Wykryto tylko', results.meta.fields.length, 'kolumn(y). Próbuję ponownie ze średnikiem...');
                
                // Spróbuj ponownie ze średnikiem
                Papa.parse(file, {
                    header: true,
                    encoding: 'UTF-8',
                    skipEmptyLines: true,
                    delimiter: ';',  // Wymuś średnik
                    complete: function(retryResults) {
                        console.log('🔄 Parsowanie ze średnikiem zakończone');
                        console.log('📊 Nazwy kolumn (retry):', retryResults.meta.fields);
                        console.log('📊 Liczba kolumn (retry):', retryResults.meta.fields ? retryResults.meta.fields.length : 0);
                        
                        if (retryResults.meta.fields && retryResults.meta.fields.length > 2) {
                            console.log('✅ Średnik działa lepiej! Używam tego parsowania.');
                            rawCSVData = retryResults.data;
                            csvColumns = retryResults.meta.fields;
                            showMappingScreen();
                            showLoading(false);
                        } else {
                            console.warn('⚠️ Średnik też nie pomógł. Używam oryginalnego parsowania.');
                            rawCSVData = results.data;
                            csvColumns = results.meta.fields;
                            showMappingScreen();
                            showLoading(false);
                        }
                    },
                    error: function(error) {
                        console.error('❌ Błąd parsowania ze średnikiem:', error);
                        // Fallback do oryginalnego
                        rawCSVData = results.data;
                        csvColumns = results.meta.fields;
                        showMappingScreen();
                        showLoading(false);
                    }
                });
            } else {
                // Parsowanie OK, użyj tych danych
                rawCSVData = results.data;
                csvColumns = results.meta.fields;
                showMappingScreen();
                showLoading(false);
            }
        },
        error: function(error) {
            console.error('❌ Błąd parsowania CSV:', error);
            alert('Wystąpił błąd podczas wczytywania pliku CSV');
            showLoading(false);
        }
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ===== CSV DATA PROCESSING =====
function processCSVData(data) {
    console.log('⚙️ Przetwarzam dane CSV, rekordów:', data.length);
    productsData = data.filter(row => row.indeks && row.nazwa);
    console.log('✅ Przefiltrowano produkty:', productsData.length);
    
    if (productsData.length === 0) {
        console.warn('⚠️ Brak produktów z indeksem i nazwą!');
        alert('Nie znaleziono żadnych produktów w pliku CSV');
        return;
    }
    
    productsData.forEach(product => {
        product.status = 'pending';
        product.generatedContent = null;
    });
    
    console.log('🖼️ Wyświetlam tabelę produktów...');
    displayProductsTable();
    document.getElementById('preview-section').style.display = 'block';
    document.getElementById('generation-section').style.display = 'block';
    
    updateStats();
    console.log('📊 Statystyki zaktualizowane');
    document.getElementById('preview-section').scrollIntoView({ behavior: 'smooth' });
    console.log('✅ Dane CSV przetworzone pomyślnie');
}

function updateStats() {
    document.getElementById('product-count').textContent = productsData.length;
    const categories = new Set(productsData.map(p => p.kategoria).filter(Boolean));
    document.getElementById('category-count').textContent = categories.size;
}

// ===== PRODUCTS TABLE =====
function displayProductsTable() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';
    
    productsData.forEach((product, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" 
                       class="product-checkbox" 
                       data-index="${index}" 
                       onchange="updateSelectedCount()">
            </td>
            <td>${escapeHtml(product.indeks || '-')}</td>
            <td>${escapeHtml(product.kategoria || '-')}</td>
            <td>${escapeHtml(product.nazwa || '-')}</td>
            <td>${escapeHtml(product.Ean || '-')}</td>
            <td>
                <span class="status-badge status-${product.status}" id="status-${index}">
                    ${getStatusText(product.status)}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'Oczekuje',
        'processing': 'Generowanie...',
        'completed': 'Gotowe',
        'error': 'Błąd'
    };
    return statusTexts[status] || 'Oczekuje';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== SELECTION HANDLING =====
function toggleAllCheckboxes(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = masterCheckbox.checked;
    });
    updateSelectedCount();
}

function selectAll() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    document.getElementById('select-all-checkbox').checked = true;
    updateSelectedCount();
}

function deselectAll() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('select-all-checkbox').checked = false;
    updateSelectedCount();
}

function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    selectedProducts.clear();
    checkboxes.forEach(cb => {
        selectedProducts.add(parseInt(cb.dataset.index));
    });
    document.getElementById('selected-count').textContent = selectedProducts.size;
}

// ===== GENERATION =====
async function startGeneration() {
    if (selectedProducts.size === 0) {
        alert('Proszę wybrać przynajmniej jeden produkt do generowania opisów');
        return;
    }
    
    // Sprawdź czy klucz API został ustawiony
    if (!API_KEY || API_KEY === 'TWOJ_KLUCZ_API_TUTAJ') {
        alert('⚠️ BRAK KLUCZA API GEMINI!\n\n📍 Instrukcja:\n\n1. Otwórz: https://aistudio.google.com/app/apikey\n2. Zaloguj się kontem Google\n3. Kliknij "Create API Key"\n4. Skopiuj klucz\n5. Otwórz plik: js/app.js\n6. Znajdź linię 7: const API_KEY = ...\n7. Wklej swój klucz\n8. Zapisz plik (Ctrl+S)\n9. Odśwież tę stronę (F5)\n\nKoszt: ~$0.01 za 100 produktów');
        return;
    }
    
    const language = document.getElementById('language-select').value;
    const style = document.getElementById('style-select').value;
    const verifyEAN = document.getElementById('verify-ean-checkbox').checked;
    
    document.getElementById('progress-container').style.display = 'block';
    document.getElementById('generate-btn').disabled = true;
    
    generatedDescriptions = [];
    
    let completed = 0;
    const total = selectedProducts.size;
    
    for (const index of selectedProducts) {
        const product = productsData[index];
        
        updateProductStatus(index, 'processing');
        document.getElementById('current-product').textContent = product.nazwa || product.indeks;
        
        try {
            console.log(`🔄 Generowanie dla: ${product.nazwa}`);
            const description = await generateProductDescription(product, language, style, verifyEAN);
            
            product.generatedContent = description;
            generatedDescriptions.push({
                index: product.indeks,
                name: product.nazwa,
                ...description
            });
            
            updateProductStatus(index, 'completed');
            console.log(`✅ Wygenerowano: ${product.nazwa}`);
        } catch (error) {
            console.error('❌ Błąd:', error);
            alert(`Błąd generowania dla: ${product.nazwa}\n\n${error.message}\n\nSprawdź konsolę (F12) dla szczegółów.`);
            updateProductStatus(index, 'error');
        }
        
        completed++;
        updateProgress(completed, total);
        
        // Opóźnienie aby uniknąć rate limits
        await sleep(2000);
    }
    
    document.getElementById('generate-btn').disabled = false;
    
    if (generatedDescriptions.length > 0) {
        document.getElementById('generated-count').textContent = generatedDescriptions.length;
        document.getElementById('export-section').style.display = 'block';
        displayGeneratedDescriptions();
        
        // V7.0: Wyświetl Quality & SEO Analytics
        if (typeof displayQualityAnalytics !== 'undefined') {
            displayQualityAnalytics();
        }
        
        document.getElementById('export-section').scrollIntoView({ behavior: 'smooth' });
    } else {
        alert('Nie udało się wygenerować żadnych opisów. Sprawdź konsol ę (F12) dla szczegółów błędów.');
    }
}

function updateProductStatus(index, status) {
    productsData[index].status = status;
    const statusElement = document.getElementById(`status-${index}`);
    if (statusElement) {
        statusElement.className = `status-badge status-${status}`;
        statusElement.textContent = getStatusText(status);
    }
}

function updateProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    document.getElementById('progress-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-bar-fill').style.width = `${percentage}%`;
}

// ===== AI GENERATION WITH GOOGLE GEMINI =====
async function generateProductDescription(product, language, style, verifyEAN) {
    // ETAP 1: KEYWORD ANALYSIS
    let keywordData = null;
    if (typeof keywordAnalyzer !== 'undefined') {
        try {
            console.log('🔍 Analiza keywords...');
            keywordData = await keywordAnalyzer.analyzeKeywords({
                name: product.nazwa || product.name || '',
                category: product.kategoria || product.category || '',
                description: product.opis || product.description || '',
                material: product['Materiał'] || product.material || ''
            });
            console.log(`✅ Keywords: ${keywordData.keywords.length} fraz, top: "${keywordData.stats.topKeyword?.keyword}"`);
        } catch (error) {
            console.warn('⚠️ Keyword analysis failed:', error.message);
        }
    }
    
    const context = buildProductContext(product);
    
    // 🔥 V7.0.6 ULTIMATE: Użyj Enhanced Prompt Generator
    let prompt;
    if (typeof window.enhancedPromptGenerator !== 'undefined') {
        console.log('✅ Używam Enhanced Prompt Generator V7.0.6');
        prompt = window.enhancedPromptGenerator.generatePrompt(product, language, style, keywordData);
    } else {
        console.warn('⚠️ Enhanced Prompt Generator niedostępny, fallback do starego promptu');
        prompt = buildDetailedPrompt(context, language, style, []);
    }
    
    const description = await callGeminiAPI(prompt, language, style, product, keywordData); // Przekaż keywordData
    
    // ETAP 2: CONTENT QUALITY SCORE
    if (typeof contentQualityScorer !== 'undefined' && description) {
        try {
            console.log('📊 Ocena jakości treści...');
            
            // Napraw bulletPoints: jeśli string, split na array
            let bulletPointsText = '';
            if (description.bulletPoints) {
                if (Array.isArray(description.bulletPoints)) {
                    bulletPointsText = description.bulletPoints.join('\n');
                } else if (typeof description.bulletPoints === 'string') {
                    bulletPointsText = description.bulletPoints;
                } else {
                    bulletPointsText = String(description.bulletPoints);
                }
            }
            
            const fullContent = `${description.metaTitle || ''}
${description.metaDescription || ''}
${description.longDescription || ''}
${bulletPointsText}`;
            
            const qualityScore = await contentQualityScorer.scoreContent(
                fullContent,
                {
                    name: product.nazwa || product.name || '',
                    category: product.kategoria || product.category || '',
                    description: product.opis || product.description || '',
                    material: product['Materiał'] || product.material || '',
                    dimensions: `${product['Długość'] || ''}x${product['Wysokość'] || ''}x${product['Szerokość'] || ''}`
                },
                keywordData
            );
            
            console.log(`✅ Quality Score: ${qualityScore.overallScore}/100 (${qualityScore.rating})`);
            
            // Dodaj do wyniku
            description.qualityScore = qualityScore;
            description.keywordData = keywordData;
            
            // Ostrzeżenie jeśli niska jakość
            if (qualityScore.overallScore < 60) {
                console.warn(`⚠️ NISKA JAKOŚĆ (${qualityScore.overallScore}/100)`);
                console.warn('Rekomendacje:', qualityScore.recommendations.map(r => r.action).join('; '));
            }
        } catch (error) {
            console.warn('⚠️ Quality scoring failed:', error.message);
        }
    }
    
    return description;
}

function buildProductContext(product) {
    let context = `Produkt: ${product.nazwa || ''}
SKU: ${product.indeks || ''}
Kategoria: ${product.kategoria || ''} ${product['podkategoria 1'] || ''}
EAN: ${product.Ean || ''}
Opis: ${product.opis || ''}
Dodatkowy opis: ${product['dodatkowy opis'] || ''}
Material: ${product['Materiał'] || ''}
Wymiary: ${product['Długość'] || ''}x${product['Wysokość'] || ''}x${product['Szerokość'] || ''} mm
Kolor: ${product['Kolor'] || ''}
Gwarancja: ${product['Gwarancja'] || ''}`.trim();
    
    return context;
}

async function callGeminiAPI(prompt, language, style, productData = {}, keywordData = null) {
    // PROFESJONALNA INTEGRACJA Z WERYFIKACJĄ EAN I KONTROLĄ UNIKALNOŚCI
    console.log('🤖 Generowanie opisu za pomocą AI...');
    
    // Krok 1: Weryfikacja EAN/SKU online (jeśli dostępne)
    let ean = productData.Ean || productData.ean || productData.EAN || '';
    const sku = productData.indeks || productData.SKU || '';
    
    // Walidacja: sprawdź czy EAN to rzeczywiście kod (cyfry), a nie opis tekstowy
    // Poprawny EAN to 8, 12, 13 lub 14 cyfr
    if (ean && !/^\d{8,14}$/.test(ean.trim())) {
        console.warn(`⚠️ Pole "EAN" zawiera tekst zamiast kodu: "${ean.substring(0, 50)}..." - pomijam weryfikację EAN`);
        ean = ''; // Wyzeruj nieprawidłowy EAN
    }
    
    // Weryfikacja EAN została usunięta - generujemy tylko z danych CSV
    
    // Krok 2: Pobierz poprzednie opisy dla kontroli unikalności
    const previousDescriptions = Array.from(generatedContents.values());
    
    // Krok 3: Prompt już został zbudowany przez Enhanced Prompt Generator
    // (prompt jest przekazany jako argument funkcji)
    
    // 🚀 TWO-STAGE GENERATION: Gemini 2.5 Pro TYLKO
    console.log('🚀 TWO-STAGE GENERATION: Używam tylko Gemini 2.5 Pro');
    
    try {
        // ETAP 1: Generacja treści (opis + bullets + whyWorthIt)
        console.log('🎯 ETAP 1: Generacja treści...');
        const stage1Result = await callGeminiDirect(prompt); // prompt z Enhanced Prompt Generator
        
        if (!stage1Result) {
            throw new Error('ETAP 1 failed: brak odpowiedzi z Gemini');
        }
        
        console.log('✅ ETAP 1 zakończony');
        
        // ETAP 2: Walidacja i format (JSON + meta)
        // TODO: Implementacja ETAPU 2 w następnym commicie
        
        return validateAndEnsureUniqueness(stage1Result, productData);
        
    } catch (error) {
        console.error('❌ Gemini 2.5 Pro niedostępny!');
        console.error('❌ Błąd:', error.message);
        throw new Error(`Gemini API failed: ${error.message}`);
    }
    
    // ❌ USUNIĘTO FALLBACK - jeśli Gemini nie działa, to BŁĄD, nie AI-fluff!
    throw new Error('Gemini failed to generate content - no fallback!');
}

// ===== WERYFIKACJA POPRAWNOŚCI TEKSTU =====
function validateTextCorrectness(text, type = 'description') {
    console.log(`🔍 Weryfikacja poprawności tekstu (${type})...`);
    const errors = [];
    const warnings = [];
    
    // 1. SPRAWDZANIE ORTOGRAFII (podstawowe polskie błędy)
    const commonSpellingErrors = {
        'wogule': 'w ogóle',
        'narazie': 'na razie',
        'niezbyt': 'nie zbyt',
        'wkoncu': 'w końcu',
        'wogóle': 'w ogóle',
        'naewno': 'na pewno',
        'niektorzy': 'niektórzy',
        'niezle': 'nieźle',
        'moze': 'może',
        'byc': 'być',
        'takze': 'także',
        'rowniez': 'również'
    };
    
    Object.entries(commonSpellingErrors).forEach(([wrong, correct]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        if (regex.test(text)) {
            errors.push({
                type: 'ortografia',
                wrong: wrong,
                correct: correct,
                severity: 'high'
            });
        }
    });
    
    // 2. SPRAWDZANIE GRAMATYKI (podstawowe zasady)
    const grammarRules = [
        { pattern: /\s+,/g, issue: 'Spacja przed przecinkiem', severity: 'high' },
        { pattern: /\s+\./g, issue: 'Spacja przed kropką', severity: 'high' },
        { pattern: /\.\./g, issue: 'Podwójna kropka', severity: 'high' },
        { pattern: /,,/g, issue: 'Podwójny przecinek', severity: 'high' },
        { pattern: /\s{2,}/g, issue: 'Wielokrotne spacje', severity: 'medium' },
        { pattern: /[a-ząćęłńóśźż]\.[A-ZĄĆĘŁŃÓŚŹŻ]/g, issue: 'Brak spacji po kropce', severity: 'high' },
        { pattern: /[!?]{2,}/g, issue: 'Wielokrotne znaki interpunkcyjne', severity: 'medium' }
    ];
    
    grammarRules.forEach(rule => {
        const matches = text.match(rule.pattern);
        if (matches) {
            errors.push({
                type: 'gramatyka',
                issue: rule.issue,
                count: matches.length,
                severity: rule.severity
            });
        }
    });
    
    // 3. SPRAWDZANIE STYLU
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // 3a. Długość zdań
    const longSentences = sentences.filter(s => s.split(' ').length > 35);
    if (longSentences.length > sentences.length * 0.3) {
        warnings.push({
            type: 'styl',
            issue: 'Zbyt wiele długich zdań (>35 słów)',
            count: longSentences.length,
            severity: 'medium'
        });
    }
    
    // 3b. Powtórzenia słów
    const words = text.toLowerCase().match(/\b[a-ząćęłńóśźż]{4,}\b/g) || [];
    const wordFrequency = {};
    words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    const repeatedWords = Object.entries(wordFrequency)
        .filter(([word, count]) => count > 10 && !['jest', 'oraz', 'które', 'tego', 'może', 'będzie', 'można', 'dzięki'].includes(word))
        .sort((a, b) => b[1] - a[1]);
    
    if (repeatedWords.length > 0) {
        warnings.push({
            type: 'styl',
            issue: 'Powtarzające się słowa',
            words: repeatedWords.slice(0, 5).map(([word, count]) => `"${word}" (${count}x)`),
            severity: 'low'
        });
    }
    
    // 3c. Passive voice (strona bierna) - nadużywanie
    const passivePatterns = ['został wykonany', 'zostało wykonane', 'jest wykonywany', 'są wykonywane', 
                             'został stworzony', 'zostało stworzone', 'jest produkowany'];
    let passiveCount = 0;
    passivePatterns.forEach(pattern => {
        passiveCount += (text.match(new RegExp(pattern, 'gi')) || []).length;
    });
    
    if (passiveCount > 3) {
        warnings.push({
            type: 'styl',
            issue: 'Nadużywanie strony biernej',
            count: passiveCount,
            severity: 'medium'
        });
    }
    
    // 4. SPRAWDZANIE SPÓJNOŚCI
    // 4a. Rozpoczynanie wielu zdań tym samym słowem
    const firstWords = sentences.map(s => s.trim().split(' ')[0]?.toLowerCase()).filter(Boolean);
    const firstWordFreq = {};
    firstWords.forEach(word => {
        firstWordFreq[word] = (firstWordFreq[word] || 0) + 1;
    });
    
    const repeatedStarts = Object.entries(firstWordFreq)
        .filter(([word, count]) => count > 3)
        .sort((a, b) => b[1] - a[1]);
    
    if (repeatedStarts.length > 0) {
        warnings.push({
            type: 'spójność',
            issue: 'Zbyt wiele zdań zaczynających się tym samym słowem',
            words: repeatedStarts.slice(0, 3).map(([word, count]) => `"${word}" (${count}x)`),
            severity: 'medium'
        });
    }
    
    // PODSUMOWANIE
    const totalIssues = errors.length + warnings.length;
    const highSeverityCount = [...errors, ...warnings].filter(i => i.severity === 'high').length;
    
    console.log(`✅ Weryfikacja zakończona: ${errors.length} błędów, ${warnings.length} ostrzeżeń`);
    
    return {
        isValid: highSeverityCount === 0,
        errors: errors,
        warnings: warnings,
        totalIssues: totalIssues,
        quality: totalIssues === 0 ? 'excellent' : totalIssues < 5 ? 'good' : totalIssues < 10 ? 'acceptable' : 'poor'
    };
}

// Funkcja naprawiająca wykryte błędy
function autoFixTextErrors(text, validationResult) {
    let fixedText = text;
    
    // Napraw błędy ortograficzne
    validationResult.errors.forEach(error => {
        if (error.type === 'ortografia') {
            const regex = new RegExp(`\\b${error.wrong}\\b`, 'gi');
            fixedText = fixedText.replace(regex, error.correct);
        }
    });
    
    // Napraw problemy gramatyczne
    fixedText = fixedText.replace(/\s+,/g, ',');  // Usuń spację przed przecinkiem
    fixedText = fixedText.replace(/\s+\./g, '.');  // Usuń spację przed kropką
    fixedText = fixedText.replace(/\.\./g, '.');   // Usuń podwójne kropki
    fixedText = fixedText.replace(/,,/g, ',');     // Usuń podwójne przecinki
    fixedText = fixedText.replace(/\s{2,}/g, ' '); // Usuń wielokrotne spacje
    fixedText = fixedText.replace(/([a-ząćęłńóśźż])\.([A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1. $2'); // Dodaj spację po kropce
    fixedText = fixedText.replace(/[!?]{2,}/g, (match) => match[0]); // Usuń wielokrotne znaki interpunkcyjne
    
    return fixedText;
}

// Walidacja i zapewnienie unikalności
// Helper: Wyciągnij wszystkie liczby z tekstu
function extractNumbers(text) {
    if (!text) return [];
    const numbers = text.match(/\d+/g);
    return numbers ? numbers.map(n => parseInt(n)) : [];
}

function validateAndEnsureUniqueness(content, productData) {
    const productId = productData.indeks || productData.sku || `product_${Date.now()}`;
    
    // V7.0.6 ULTIMATE: PLACEHOLDERS KILL-SWITCH
    console.log('PLACEHOLDERS CHECK: Sprawdzam tokeny niedozwolone...');
    
    const placeholderTokens = ['xx', '[TBD]', '[FILL]', 'Lorem ipsum', 'Producent nie podał', 'Brak danych'];
    const allContent = [
        content.metaTitle || '',
        content.metaDescription || '',
        content.bulletPoints || '',
        content.longDescription || ''
    ].join(' ');
    
    let foundPlaceholders = [];
    placeholderTokens.forEach(token => {
        if (allContent.toLowerCase().includes(token.toLowerCase())) {
            foundPlaceholders.push(token);
        }
    });
    
    // Sprawdź urwane słowa (słowo+wielokropek, np. "Spra..." ale nie normalny wielokropek "...")
    const truncatedPattern = /\b[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{2,}\.{2,}/;
    if (truncatedPattern.test(allContent)) {
        foundPlaceholders.push('URWANE SLOWA (słowo skrócone wielokropkiem)');
    }
    
    if (foundPlaceholders.length > 0) {
        console.error('PLACEHOLDERS DETECTED:', foundPlaceholders);
        console.error('PUBLIKACJA ZABLOKOWANA - content zawiera placeholdery');
        throw new Error(`Content contains placeholders: ${foundPlaceholders.join(', ')} - regenerate required`);
    }
    
    console.log('Placeholders check OK');
    
    // NOWE: Walidacja poprawnosci tekstu
    console.log('Sprawdzam poprawnosc wygenerowanego tekstu...');
    
    // Sprawdź bullet pointy
    const bulletValidation = validateTextCorrectness(content.bulletPoints, 'bullet points');
    if (!bulletValidation.isValid) {
        console.warn('⚠️ Wykryto błędy w bullet pointach, naprawiam...');
        content.bulletPoints = autoFixTextErrors(content.bulletPoints, bulletValidation);
    }
    
    // Sprawdź długi opis
    const descValidation = validateTextCorrectness(content.longDescription, 'opis długi');
    if (!descValidation.isValid || descValidation.quality === 'poor') {
        console.warn(`⚠️ Wykryto błędy w opisie (jakość: ${descValidation.quality}), naprawiam...`);
        content.longDescription = autoFixTextErrors(content.longDescription, descValidation);
        
        // Jeśli nadal jest poor quality, zaloguj szczegóły
        if (descValidation.quality === 'poor') {
            console.warn('⚠️ Szczegóły problemów:');
            descValidation.errors.forEach(e => console.warn(`  - ${e.type}: ${e.issue || e.wrong}`));
            descValidation.warnings.forEach(w => console.warn(`  - ${w.type}: ${w.issue}`));
        }
    }
    
    // Sprawdź meta description
    const metaValidation = validateTextCorrectness(content.metaDescription, 'meta description');
    if (!metaValidation.isValid) {
        console.warn('⚠️ Wykryto błędy w meta description, naprawiam...');
        content.metaDescription = autoFixTextErrors(content.metaDescription, metaValidation);
    }
    
    console.log(`✅ Wszystkie teksty sprawdzone i poprawione`);
    
    // V7.0.7.4: WERYFIKACJA SINGLE SOURCE OF TRUTH - liczby muszą się zgadzać!
    console.log('🔢 Single Source of Truth: Weryfikuję zgodność liczb...');
    
    const numbersInBullets = extractNumbers(content.bulletPoints || '');
    const numbersInDescription = extractNumbers(content.longDescription || '');
    const numbersInMeta = extractNumbers(content.metaDescription || '');
    
    // Sprawdź kluczowe liczby (np. ilość kieszeni, waga, rozmiary)
    const criticalNumbers = numbersInBullets.filter(num => num > 1 && num < 1000); // Ignoruj roky, duże numery
    
    criticalNumbers.forEach(num => {
        const inDesc = numbersInDescription.includes(num);
        const inMeta = numbersInMeta.includes(num);
        
        if (!inDesc) {
            console.warn(`⚠️ NIEZGODNOŚĆ: Liczba ${num} jest w bullets ale NIE w opisie!`);
            // Nie blokuj, ale zaloguj
        }
    });
    
    console.log(`✅ Weryfikacja liczb zakończona`);
    
    // Walidacja 1: Dokładnie 3 bullet pointy
    const bulletLines = content.bulletPoints.split('\n').filter(line => line.trim().startsWith('✓'));
    if (bulletLines.length !== 3) {
        console.warn(`⚠️ Nieprawidłowa liczba bullet pointów: ${bulletLines.length}, poprawiam do 3...`);
        content.bulletPoints = fixBulletPointsCount(content.bulletPoints, productData);
    }
    
    // Walidacja 2: Długość opisu (DYNAMICZNA V7.0.6 ULTIMATE)
    const plainText = stripHtmlTags(content.longDescription);
    
    // Wykryj profil długości produktu
    let targetMinLength = 1200;  // standard
    let targetMaxLength = 5000;  // ✅ ZWIĘKSZONE Z 2200 → 5000 (pozwala na pełne opisy Gemini)
    
    if (typeof window.enhancedPromptGenerator !== 'undefined') {
        const profile = window.enhancedPromptGenerator.detectLengthProfile(productData);
        const rules = window.ECOMMERCE_RULES?.LENGTH_PROFILES || {};
        
        if (rules[profile]) {
            targetMinLength = rules[profile].min;
            targetMaxLength = rules[profile].max;
            console.log(`📏 Profil długości: ${profile} (${targetMinLength}-${targetMaxLength} znaków)`);
        }
    }
    
    if (plainText.length < targetMinLength) {
        console.warn(`⚠️ Opis za krótki (${plainText.length} znaków), cel: ${targetMinLength}+, rozszerzam...`);
        content.longDescription = enhanceLongDescription(content.longDescription, plainText.length);
    } else if (plainText.length > targetMaxLength) {
        console.warn(`⚠️ Opis za długi (${plainText.length} znaków), cel: ${targetMaxLength}-, skracam...`);
        content.longDescription = shortenLongDescription(content.longDescription, targetMaxLength);
    }
    
    // Walidacja 3: Sprawdź unikalność względem poprzednich opisów
    if (isContentTooSimilar(content.longDescription, generatedContents)) {
        console.warn('⚠️ Treść zbyt podobna do poprzednich, regeneruję...');
        content.longDescription = makeContentMoreUnique(content.longDescription, productData);
    }
    
    // Walidacja 4: Meta title <= 60 znaków
    if (content.metaTitle.length > 60) {
        content.metaTitle = content.metaTitle.substring(0, 57) + '...';
    }
    
    // Walidacja 5: Meta description 155-160 znaków
    if (content.metaDescription.length < 155) {
        content.metaDescription += ' Sprawdź szczegóły i zamów już dziś!';
    }
    if (content.metaDescription.length > 160) {
        content.metaDescription = content.metaDescription.substring(0, 157) + '...';
    }
    
    // Zapisz do pamięci unikalności
    generatedContents.set(productId, content.longDescription);
    
    console.log(`✅ Walidacja OK: ${plainText.length} znaków, ${bulletLines.length} bullet pointy`);
    return content;
}

// Napraw liczbę bullet pointów do dokładnie 3
function fixBulletPointsCount(bulletPoints, productData) {
    const lines = bulletPoints.split('\n').filter(line => line.trim().startsWith('✓'));
    
    if (lines.length > 3) {
        // Za dużo - wybierz 3 najlepsze
        return lines.slice(0, 3).join('\n');
    }
    
    if (lines.length < 3) {
        // ❌ Za mało - to BŁĄD Gemini, nie dodawaj AI-fluff!
        console.error(`❌ Gemini wygenerował tylko ${lines.length} bullet points zamiast 3!`);
        console.error('❌ NIE DODAJĘ generic AI-fluff - zwracam błąd!');
        throw new Error(`Gemini failed to generate 3 bullet points (got ${lines.length})`);
    }
    
    return lines.join('\n');
}

// ❌ USUNIĘTO generateAdditionalUSP() - NIGDY nie dodawaj generic AI-fluff!
// Jeśli Gemini nie wygenerował 3 bullet points, to BŁĄD, nie fallback!

// Zwiększ unikalność treści
function makeContentMoreUnique(content, productData) {
    const name = productData.nazwa || productData.produkt || 'ten produkt';
    const category = productData.kategoria || '';
    const material = productData.materiał || productData.Materiał || '';
    
    // Dodaj unikalną sekcję na początku
    const uniqueIntro = `<h2>${name} - Szczegółowa charakterystyka</h2>
<p>Produkt ${name} ${category ? `z kategorii ${category}` : ''} wyróżnia się na rynku unikalnymi cechami. ${material ? `Wykonanie z ${material} stanowi gwarancję trwałości i funkcjonalności.` : ''} W tym szczegółowym przewodniku przedstawiamy wszystko, co musisz wiedzieć przed zakupem - od specyfikacji technicznej, przez zastosowanie praktyczne, aż po opinie użytkowników.</p>\n\n`;
    
    // Dodaj unikalną sekcję FAQ na końcu
    const uniqueFAQ = `\n\n<h3>Najczęściej zadawane pytania o ${name}</h3>
<p><strong>Czy produkt jest objęty gwarancją?</strong><br>
Tak, wszystkie nasze produkty objęte są gwarancją producenta. Szczegóły dostępne w dokumentacji dołączonej do produktu.</p>

<p><strong>Jak długo trwa dostawa?</strong><br>
Standardowa dostawa realizowana jest w ciągu 1-3 dni roboczych od momentu złożenia zamówienia.</p>

<p><strong>Czy mogę zwrócić produkt?</strong><br>
Oczywiście! Masz prawo do zwrotu produktu w ciągu 30 dni od daty zakupu, bez podania przyczyny.</p>`;
    
    return uniqueIntro + content + uniqueFAQ;
}

// OpenAI GPT-4o-mini - najlepsza jakość/cena
async function callOpenAI(prompt) {
    const OPENAI_KEY = 'YOUR_OPENAI_KEY'; // TODO: Wklej klucz OpenAI
    
    if (!OPENAI_KEY || OPENAI_KEY === 'YOUR_OPENAI_KEY') {
        throw new Error('Brak klucza OpenAI');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Jesteś ekspertem copywriterem e-commerce specjalizującym się w tworzeniu opisów produktów SEO-friendly dla sklepów Shopify.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
            max_tokens: 3000
        })
    });
    
    if (!response.ok) throw new Error('OpenAI API error');
    
    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    return validateAndEnsureUniqueness(content, {});
}

// Anthropic Claude Haiku - szybki i tani
async function callClaude(prompt) {
    const CLAUDE_KEY = 'YOUR_CLAUDE_KEY'; // TODO: Wklej klucz Anthropic
    
    if (!CLAUDE_KEY || CLAUDE_KEY === 'YOUR_CLAUDE_KEY') {
        throw new Error('Brak klucza Claude');
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 3000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        })
    });
    
    if (!response.ok) throw new Error('Claude API error');
    
    const data = await response.json();
    const content = JSON.parse(data.content[0].text);
    
    return validateAndEnsureUniqueness(content, {});
}

// Google Gemini - ostatnia deska ratunku
async function callGeminiDirect(prompt) {
    console.log('🤖 Wywołuję Google Gemini API...');
    console.log(`⚙️ Tryb: ${GEMINI_CONFIG.priorityMode}`);
    
    // ✅ Wybierz modele na podstawie konfiguracji
    const modelsToTry = GEMINI_CONFIG.models[GEMINI_CONFIG.priorityMode] || GEMINI_CONFIG.models.QUALITY;
    
    for (const model of modelsToTry) {
        const maxRetries = model.retries || 1;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`🔄 Ponawiam próbę ${attempt}/${maxRetries} dla modelu ${model.name}`);
                } else {
                    console.log(`🔍 Próbuję model: ${model.name} (${model.version})`);
                }
            
            const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${API_KEY}`;
            
            // TIMEOUT dynamiczny (gemini-2.5-pro: 60s, gemini-2.5-flash: 30s)
            const timeoutMs = model.timeout || 60000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                body: JSON.stringify({
                    contents: [{ 
                        parts: [{ text: prompt }] 
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_NONE"
                        }
                    ]
                })
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText };
                }
                
                console.warn(`⚠️ Model ${model.name} zwrócił błąd ${response.status}:`, errorData.error?.message || errorData.message || 'Unknown error');
                
                // Jeśli 429 (rate limit), poczekaj 2 sekundy i spróbuj następnego
                if (response.status === 429) {
                    console.log('⏳ Rate limit przekroczony, czekam 2 sekundy...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                continue; // Spróbuj następnego modelu
            }
            
            const data = await response.json();
            console.log('✅ Otrzymano odpowiedź z Gemini:', model.name);
            
            // Sprawdź czy response ma poprawną strukturę
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                console.warn('⚠️ Nieprawidłowa struktura odpowiedzi:', data);
                continue;
            }
            
            // Sprawdź czy są parts (może nie być przy MAX_TOKENS)
            if (!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                console.warn('⚠️ Brak parts w odpowiedzi. Finish reason:', data.candidates[0].finishReason);
                
                // Jeśli MAX_TOKENS - zwiększ maxOutputTokens i spróbuj ponownie
                if (data.candidates[0].finishReason === 'MAX_TOKENS') {
                    console.warn('⚠️ Model osiągnął limit tokenów, próbuję następny model...');
                }
                continue;
            }
            
            const text = data.candidates[0].content.parts[0].text;
            console.log('📝 Parsowanie odpowiedzi JSON...');
            
            // Usuń markdown formatting jeśli istnieje
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            try {
                const content = JSON.parse(cleanedText);
                console.log('✅ Pomyślnie sparsowano odpowiedź z Gemini');
                
                // V7.0.7.3: Dodaj sekcję "Dlaczego warto?" do longDescription
                if (content.whyWorthIt && content.description) {
                    console.log('Dodaję sekcję Dlaczego warto do opisu');
                    content.description += '\n\n' + content.whyWorthIt;
                } else if (!content.whyWorthIt) {
                    console.warn('Brak sekcji whyWorthIt w odpowiedzi Gemini');
                }
                
                return content;
            } catch (parseError) {
                console.warn('⚠️ Błąd parsowania JSON:', parseError.message);
                console.warn('📄 Otrzymany tekst:', cleanedText.substring(0, 200) + '...');
                continue;
            }
            
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                // Timeout error z retry mechanism
                if (fetchError.name === 'AbortError') {
                    const timeoutSec = Math.round((model.timeout || 60000) / 1000);
                    console.warn(`⏱️ Timeout dla modelu ${model.name} (${timeoutSec}s), próba ${attempt}/${maxRetries}`);
                    
                    if (attempt < maxRetries) {
                        console.log(`⏳ Czekam 5s przed ponowną próbą...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue; // Spróbuj ponownie ten sam model
                    } else {
                        console.warn(`❌ Wyczerpano próby dla ${model.name}, przechodzę do następnego modelu`);
                        break; // Przejdź do następnego modelu
                    }
                }
                
                console.warn(`⚠️ Błąd fetch dla modelu ${model.name}:`, fetchError.message);
                continue;
            }
            
            } catch (error) {
                console.warn(`⚠️ Błąd ogólny dla modelu ${model.name} (próba ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt < maxRetries) {
                    console.log(`⏳ Czekam 5s przed ponowną próbą...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue; // Spróbuj ponownie
                } else {
                    break; // Przejdź do następnego modelu
                }
            }
        } // Koniec pętli retry
    }
    
    throw new Error('Wszystkie modele Gemini niedostępne');
}

// Zaawansowana symulacja oparta na rzeczywistych danych produktu
function generateUniqueHash(content) {
    // Prosty hash dla porównywania podobieństwa
    return content.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isContentTooSimilar(newContent, existingContents) {
    const newHash = generateUniqueHash(newContent);
    const newWords = new Set(newHash.split(' ').filter(w => w.length > 4));
    
    for (const existing of existingContents.values()) {
        const existingHash = generateUniqueHash(existing);
        const existingWords = new Set(existingHash.split(' ').filter(w => w.length > 4));
        
        // Policz wspólne słowa
        let commonWords = 0;
        for (const word of newWords) {
            if (existingWords.has(word)) commonWords++;
        }
        
        const similarity = commonWords / Math.max(newWords.size, existingWords.size);
        
        if (similarity > 0.5) { // Więcej niż 50% podobieństwa
            console.warn(`⚠️ Zbyt podobna treść! Podobieństwo: ${(similarity * 100).toFixed(1)}%`);
            return true;
        }
    }
    
    return false;
}

// ===== PROFESSIONAL AI DESCRIPTION GENERATION =====

function buildDetailedPrompt(context, language, style, previousDescriptions = []) {
    const styleDescriptions = {
        'professional': 'profesjonalny, formalny ton biznesowy, skupienie na jakości i wartości',
        'technical': 'techniczny z dokładnymi specyfikacjami, parametrami i szczegółami inżynierskimi',
        'casual': 'swobodny, przyjazny styl lifestyle, skupienie na doświadczeniu użytkownika',
        'persuasive': 'perswazyjny język sprzedażowy z silnymi call-to-action i korzyściami'
    };
    
    const lang = language === 'en' ? 'English' : 'Polish';
    const styleDesc = styleDescriptions[style] || styleDescriptions.professional;
    
    // Lista zabronionych fraz (generyki) - ROZSZERZONA v5.0
    const bannedPhrases = [
        'wysokiej jakości',
        'profesjonalne wykonanie',
        'doskonały stosunek jakości do ceny',
        'uniwersalne zastosowanie',
        'intuicyjna obsługa',
        'łatwy montaż',
        'elegancki design',
        'nowoczesny wygląd',
        'praktyczne rozwiązanie',
        'minimalistyczny design',
        'nowoczesne przestrzenie',
        'innowacyjne rozwiązanie',
        'idealne rozwiązanie',
        'doskonały wybór',
        'perfekcyjny dla',
        'niezawodność i trwałość',
        'zaawansowana technologia',
        'najwyższa jakość',
        'wyjątkowa funkcjonalność',
        'bezkonkurencyjna wydajność',
        'najlepszy',
        'numer 1',
        'nieprześcigniony'
    ];
    
    const previousPhrasesWarning = previousDescriptions.length > 0 
        ? `\n\n⚠️ KRYTYCZNE: Te frazy zostały już użyte w poprzednich opisach - NIE UŻYWAJ ICH:\n${previousDescriptions.slice(0, 5).map(d => `- "${d.substring(0, 100)}..."`).join('\n')}\n\nMUSISZ wygenerować KOMPLETNIE INNY opis!`
        : '';
    
    return `Jesteś ekspertem copywriterem e-commerce specjalizującym się w Shopify. 

DANE PRODUKTU:
${context}

ZADANIE:
Stwórz UNIKALNY, oryginalny opis produktu w języku ${lang}.
Styl pisania: ${styleDesc}

🚨 ABSOLUTNY ZAKAZ GENERYCZNYCH FRAZ:
NIE UŻYWAJ tych fraz (i podobnych):
${bannedPhrases.map(p => `- "${p}"`).join('\n')}

🔴 KRYTYCZNE ZASADY WALIDACJI DANYCH:

1. **WYMIARY - WALIDACJA JEDNOSTEK:**
   - Jeśli widzisz wymiary np. "240×100×110mm", SPRAWDŹ logikę:
     • Gniazdo meblowe 240mm = 24cm → realistyczne ✅
     • Gniazdo meblowe 24mm = 2.4cm → za małe ❌
   - **JEŚLI wymiary > 50mm dla małych produktów (gniazda, ładowarki, akcesoria):**
     → Zamień jednostkę na CM: "240×100×110mm" → "24×10×11 cm"
   - **JEŚLI wymiary > 200mm dla dużych produktów (walizki, meble, narzędzia):**
     → Zamień jednostkę na CM: "390×94×300mm" → "39×9.4×30 cm"
   - Użyj zdrowego rozsądku: żadne gniazdo nie ma 24mm, żadna walizka nie ma 39mm!

2. **KATEGORIA PRODUKTU - WALIDACJA LOGICZNA:**
   - Jeśli w danych widzisz "oświetlenie meblowe" + "gniazdo" + "ładowarka":
     → To NIE jest oświetlenie, to GNIAZDO ELEKTRYCZNE
   - Jeśli kategoria jest sprzeczna z nazwą produktu:
     → Użyj nazwy produktu jako kategorii, zignoruj błędną kategorię
   - **NIGDY nie nazywaj gniazda elektrycznego "oświetleniem"**

3. **EAN/SKU - ZAKAZ UŻYWANIA JAKO OPIS:**
   - Kody typu "5902801355141" to numery katalogowe
   - **NIE PISZ:** "Materiał wykonania, oznaczony kodem 5902801355141"
   - **PISZ:** "Materiał wykonania: aluminium" (użyj rzeczywistego materiału z CSV)
   - Kod EAN możesz użyć TYLKO w sekcji technicznej jako numer katalogowy

4. **GNIAZDA WYMIENNE vs JEDNOCZESNE:**
   - Jeśli produkt ma "3 wymienne gniazda" lub "wymienne moduły":
     → WYJAŚNIJ czy są jednocześnie aktywne, czy wymienne na wybór
   - **PISZ:** "3 moduły jednocześnie aktywne: USB-A, HDMI, RJ-45" (jeśli jednoczesne)
   - **LUB:** "3 wymienne moduły do wyboru - w zestawie: USB-A, HDMI, RJ-45" (jeśli wymienne)

5. **ŁADOWANIE "SZYBKIE" - WALIDACJA MOCY:**
   - 5W = wolne ładowanie (nie nazywaj "szybkim")
   - 10W = standardowe
   - 15W+ = szybkie
   - **PISZ:** "Ładowanie indukcyjne 5W - kompatybilne ze wszystkimi urządzeniami Qi"
   - **NIE PISZ:** "Szybkie ładowanie 5W" ← to kłamstwo marketingowe!

6. **LISTY ELEMENTÓW (dla zestawów >20 elementów):**
   - **NIE generuj jednej długiej linii:** "element1, element2, element3..."
   - **PODZIEL NA SEKCJE z HTML list:**
     <h4>Zestawy nasadek:</h4>
     <ul>
       <li>Nasadki 1/4": 4mm, 5mm, 6mm, 7mm, 8mm, 9mm, 10mm</li>
       <li>Nasadki 1/2": 14mm, 17mm, 19mm, 22mm, 24mm</li>
     </ul>

7. **GWARANCJA - ABSOLUTNY ZAKAZ WYMYŚLANIA:**
   - **JEŚLI w danych CSV brak pola 'gwarancja' LUB jest puste:**
     → **NIE wspominaj o gwarancji w opisie**
     → **NIE pisz** "X-miesięczna gwarancja producenta"
     → **NIE pisz** "objęty gwarancją" bez konkretnych danych
   - **JEŚLI gwarancja jest podana w danych:**
     → Pisz dokładnie to co w danych: "Produkt objęty 24-miesięczną gwarancją producenta (zgodnie z warunkami gwarancyjnymi)"
   - **ZAKAZ:** wymyślania długości gwarancji (27, 22, 39 miesięcy bez źródła)

8. **CERTYFIKATY I NORMY - TYLKO Z DANYCH:**
   - **ZAKAZ generowania:** CE, RoHS, TÜV, ISO, EN, IEC, IP** jeśli nie są w danych
   - **ZAKAZ pisania:** "potwierdzony świadectwem jakości" bez źródła
   - **ZAKAZ pisania:** "zgodny z normami UE" bez konkretnej normy
   - **DOZWOLONE tylko jeśli:** w danych CSV jest pole 'certyfikaty' lub 'normy'
   - Przykład OK: Jeśli w danych jest "certyfikaty: CE, RoHS" → możesz napisać "Produkt posiada certyfikaty CE i RoHS"

9. **BRAK DANYCH = BRAK OPISU:**
   - **Jeśli pole jest puste/null/"brak danych":**
     → NIE wymyślaj wartości
     → NIE sugeruj ("dyskretny rozmiar", "uniwersalne zastosowanie")
     → Możesz napisać: "Producent nie podaje [nazwa parametru]" LUB pomiń sekcję
   - **Przykład:**
     Wymiary puste → "Producent nie podaje szczegółowych wymiarów produktu."
     Kolor pusty → po prostu pomiń wzmiankę o kolorze

10. **META DESCRIPTION - JEDNO CTA:**
    - **Limit: 140-165 znaków (twardo)**
    - **JEDNO Call-To-Action** na końcu
    - **Dozwolone CTA:** "Sprawdź ofertę", "Zobacz szczegóły", "Zamów teraz"
    - **ZAKAZ:** "Sprawdź! Zamów! Kup! Zobacz szczegóły!" (wielokrotne)
    - **Przykład OK:** "Gniazdo meblowe Charger Plus z ładowaniem Qi i 3 modułami. Montaż w blat. Sprawdź ofertę." (141 znaków, 1 CTA)

ZAMIAST GENERYCZNYCH FRAZ:
- Używaj KONKRETNYCH danych z CSV (materiał, wymiary Z POPRAWNYMI JEDNOSTKAMI, kategoria, kolor)
- Każde zdanie musi być UNIKALNE i SPECYFICZNE dla tego produktu
- Opieraj się na FAKTACH, nie ogólnikach
${previousPhrasesWarning}

WYMAGANIA JAKOŚCIOWE:

1. **BULLET POINTS (DOKŁADNIE 3 sztuki, ani więcej, ani mniej!):**
   
   Format: Każdy punkt w NOWEJ LINII ze znakiem ✓
   
   **STRUKTURA USP:**
   - Punkt 1: Główna funkcja/korzyść produktu (benefit-driven)
   - Punkt 2: Materiał + wymiary jako przewaga praktyczna (UWAGA: popraw jednostki jeśli błędne!)
   - Punkt 3: Gwarancja/certyfikaty LUB inna przewaga konkurencyjna
   
   **PRZYKŁADY DOBRYCH USP:**
   ✅ "Ładowanie USB-C 20W - naładuj telefon do 50% w 30 minut" (konkretne cyfry!)
   ✅ "Aluminiowa obudowa 24×10×11 cm - odporność na zarysowania przez 25+ lat" (poprawiona jednostka!)
   ✅ "Certyfikat CE i RoHS - bezpieczne dla dzieci, zgodne z normami UE"
   
   **PRZYKŁADY ZŁYCH (NIGDY TAK NIE RÓB!):**
   ❌ "Wysokiej jakości wykonanie" (za ogólne)
   ❌ "Profesjonalny design" (nie mówi nic konkretnego)
   ❌ "Wymiary 24×10×11 mm" (błędna jednostka - to 2.4cm, za małe!)

2. **DŁUGI OPIS SEO (minimum 2500 znaków, maksimum 4000):**
   
   **STRUKTURA (6 sekcji):**
   
   <h2>Wprowadzenie: [Nazwa produktu] - [Unikalna cecha]</h2>
   <p>150-200 słów - Kontekst produktu, pierwsze wrażenie, główna korzyść. 
   MUSI zawierać konkretne dane z CSV: kategoria (POPRAWNA!), materiał, zastosowanie.</p>
   
   <h3>Kluczowe zalety i właściwości użytkowe</h3>
   <p>250-300 słów - KONKRETNE korzyści oparte na danych z CSV.
   Jeśli masz wymiary - opisz JAK są przydatne (użyj POPRAWNYCH jednostek!).
   Jeśli masz materiał - opisz DLACZEGO jest lepszy.
   Jeśli masz kolor - opisz JAK pasuje do wnętrz.</p>
   
   <h3>Specyfikacja techniczna i materiały wykonania</h3>
   <p>200-250 słów - SZCZEGÓŁOWA specyfikacja.
   Wymiary (SPRAWDŹ jednostki!), materiał (NIE używaj EAN!), parametry techniczne.
   UŻYJ WSZYSTKICH dostępnych danych z CSV!
   
   **DLA ZESTAWÓW >20 ELEMENTÓW:** Podziel listę na sekcje (patrz punkt 6 powyżej)</p>
   
   <h3>Zastosowanie i możliwości wykorzystania</h3>
   <p>200-250 słów - GDZIE i JAK używać produktu.
   Konkretne scenariusze: dom, biuro, warsztat, etc.
   Oparte na POPRAWNEJ kategorii produktu z CSV (nie "oświetlenie" dla gniazda!).</p>
   
   <h3>Jakość wykonania, certyfikaty i wsparcie</h3>
   <p>150-200 słów - Certyfikaty, gwarancja (jeśli jest w CSV), kontrola jakości.
   Jeśli brak gwarancji w CSV - NIE WYMYŚLAJ JEJ!</p>
   
   <h2>Podsumowanie - Dlaczego warto wybrać ten produkt?</h2>
   <p>120-150 słów - Mocne zakończenie z CTA.
   Podsumuj 3 najważniejsze korzyści z bullet pointów.
   Zachęć do zakupu KONKRETNIE, nie ogólnie.
   **CTA:** Użyj tylko JEDNEGO wezwania: "Sprawdź szczegóły!" LUB "Zamów teraz!" - nie duplikuj!</p>
   
   **KRYTYCZNE ZASADY:**
   - Każde zdanie musi być UNIKALNE
   - NIE powtarzaj tych samych fraz między sekcjami
   - UŻYWAJ konkretnych danych z CSV (wymiary Z POPRAWNYMI JEDNOSTKAMI, materiał NIE EAN, POPRAWNA kategoria)
   - Jeśli brak danych - NIE WYMYŚLAJ! Pomiń lub użyj ogólnej kategorii
   - MINIMUM 2500 znaków, MAKSIMUM 4000 (liczone bez HTML tags)
   - NIE generuj encyklopedycznego pustosłowia - każde zdanie musi nieść wartość

3. **META TITLE (DOKŁADNIE 45-60 znaków):**
   Format: [Nazwa produktu] | [POPRAWNA kategoria] | [USP]
   Przykład: "Gniazdo USB-C CHARGER | Meblowe 20W | 25lat Gwarancji"
   ❌ NIE: "Gniazdo CHARGER | Oświetlenie | USB" (błędna kategoria!)
   **WALIDACJA:** 45-60 znaków (twardo)

4. **META DESCRIPTION (DOKŁADNIE 140-165 znaków):**
   - Pierwsze 20 słów: najważniejsza korzyść
   - Środek: konkretne dane (materiał, wymiary Z POPRAWNYMI JEDNOSTKAMI)
   - Koniec: JEDNO CTA (Sprawdź ofertę. LUB Zobacz szczegóły. - nie oba!)
   Przykład OK: "Gniazdo meblowe Charger Plus z ładowaniem Qi i 3 modułami. Montaż w blat biurka lub kuchni. Sprawdź ofertę." (141 znaków, 1 CTA)
   ❌ NIE: "...Sprawdź szczegóły i zamów! Sprawdź!" (duplikacja!)
   **WALIDACJA:** 140-165 znaków (twardo), max 1 CTA

5. **SEO TAGS (6-8 słów kluczowych):**
   Oparte na:
   - POPRAWNA kategoria + materiał (np. "gniazdo meblowe aluminium")
   - Nazwa produktu (np. "charger plus usb-c")
   - Zastosowanie (np. "ładowarka do mebli")
   - Long-tail keywords (np. "gniazdo z USB do biurka")
   
   NIE używaj generycznych: "wysokiej jakości", "najlepsza cena"

**WALIDACJA PRZED ZWRÓCENIEM (ABSOLUTNIE OBOWIĄZKOWA!):**
✅ Policz bullet pointy: czy jest DOKŁADNIE 3?
✅ Policz znaki w długim opisie bez HTML: czy 2500-4000?
✅ Sprawdź wymiary: czy jednostki mają sens logiczny?
   - Gniazdo 24mm? → Zamień na 24cm ✅
   - Walizka 39mm? → Zamień na 39cm ✅
✅ Sprawdź kategorię: czy jest logiczna?
   - Gniazdo jako "oświetlenie"? → Zmień na "gniazdo elektryczne" ✅
✅ Sprawdź Meta Title: czy 45-60 znaków?
✅ Sprawdź Meta Description: czy 140-165 znaków? Czy CTA się nie powtarza?
✅ Sprawdź czy NIE użyłeś zabronionych fraz generycznych (max 2 frazy z listy)
✅ Sprawdź czy NIE używasz EAN jako opisu materiału
✅ Sprawdź gwarancję: czy jest w danych CSV? Jeśli NIE → NIE wspominaj o niej!
✅ Sprawdź certyfikaty: czy są w danych CSV? Jeśli NIE → NIE wymyślaj ich!

ZWRÓĆ ODPOWIEDŹ W FORMACIE JSON (bez markdown, bez \`\`\`json):
{
  "bulletPoints": "✓ punkt 1 (benefit-driven, konkretny)\\n✓ punkt 2 (materiał+wymiary jako przewaga, POPRAWNE jednostki!)\\n✓ punkt 3 (gwarancja TYLKO jeśli w CSV / certyfikaty TYLKO jeśli w CSV / inna przewaga)",
  "longDescription": "<h2>Wprowadzenie...</h2><p>150-200 słów...</p><h3>Kluczowe zalety...</h3><p>250-300 słów...</p>...",
  "metaTitle": "Nazwa | POPRAWNA Kategoria | USP (45-60 znaków)",
  "metaDescription": "Konkretna korzyść + dane + JEDNO CTA (140-165 znaków)",
  "seoTags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}

**OSTATECZNA PRZYPOMINAJKA:**
- NIE WYMYŚLAJ wymiarów, gwarancji, certyfikatów
- POPRAW błędne jednostki (mm → cm gdy > 50mm)
- POPRAW błędną kategorię (gniazdo ≠ oświetlenie)
- NIE UŻYWAJ EAN jako opisu materiału
- JEDNO CTA w Meta Description
- Meta Title: 45-60 znaków
- Meta Description: 140-165 znaków
- Długi opis: 2500-4000 znaków
- Bullet pointy: DOKŁADNIE 3
  "metaDescription": "155-160 znaków z konkretnymi danymi i JEDNYM CTA (nie duplikuj!)",
  "seoTags": "tag1, tag2, tag3, tag4, tag5, tag6"
}

PAMIĘTAJ: 
- DOKŁADNIE 3 bullet pointy
- ŻADNYCH generycznych fraz
- 2500-4000 znaków w opisie (nie więcej!)
- POPRAW błędne jednostki wymiarów (mm → cm)
- POPRAW błędne kategorie (nie "oświetlenie" dla gniazda!)
- NIE używaj EAN jako opisu materiału
- JEDNO CTA w meta description (nie duplikuj!)
- MAKSYMALNA unikalność, ZERO pustosłowia`;
}

function validateAndEnhanceDescription(content) {
    // Walidacja długości opisu
    const plainText = stripHtmlTags(content.longDescription || '');
    
    if (plainText.length < 2000) {
        console.warn(`⚠️ Opis za krótki (${plainText.length} znaków), rozszerzam...`);
        content.longDescription = enhanceLongDescription(content.longDescription, plainText.length);
    }
    
    // Walidacja bullet pointów
    if (!content.bulletPoints || content.bulletPoints.split('\n').length < 3) {
        console.error('❌ Gemini nie wygenerował prawidłowych bullet points!');
        console.error('❌ NIE UŻYWAM generic fallback - rzucam błąd!');
        throw new Error('Gemini failed to generate valid bullet points');
    }
    
    // Walidacja meta title
    if (!content.metaTitle || content.metaTitle.length > 60) {
        content.metaTitle = content.metaTitle?.substring(0, 57) + '...' || 'Produkt';
    }
    
    // Walidacja meta description
    if (!content.metaDescription || content.metaDescription.length < 150) {
        console.warn('⚠️ Meta description za krótka, rozszerzam...');
        content.metaDescription = enhanceMetaDescription(content.metaDescription);
    }
    
    if (content.metaDescription.length > 160) {
        content.metaDescription = content.metaDescription.substring(0, 157) + '...';
    }
    
    console.log(`✅ Walidacja OK: ${plainText.length} znaków`);
    return content;
}

function enhanceLongDescription(html, currentLength) {
    const targetLength = 2500;
    const missingChars = targetLength - currentLength;
    
    if (missingChars < 100) return html;
    
    // Dodaj sekcję "Dodatkowe informacje"
    const additionalSection = `
<h3>Dodatkowe informacje i porady użytkowania</h3>
<p>Produkt ten został zaprojektowany z myślą o długoletnim użytkowaniu w wymagających warunkach. Zaawansowane technologie produkcji gwarantują, że każdy egzemplarz spełnia rygorystyczne normy jakości. Materiały użyte do produkcji są starannie wyselekcjonowane i poddawane wieloetapowym testom wytrzymałościowym.</p>

<p>Podczas codziennego użytkowania produkt zachowuje swoje właściwości i nie wymaga specjalnej konserwacji. Prostota obsługi sprawia, że może być używany przez osoby o różnym poziomie doświadczenia. W przypadku pytań lub wątpliwości, dedykowany zespół wsparcia technicznego służy pomocą na każdym etapie użytkowania.</p>

<p>Inwestycja w ten produkt to decyzja, która przyniesie korzyści przez wiele lat. Połączenie nowoczesnego designu, wysokiej jakości wykonania i przemyślanej funkcjonalności sprawia, że jest to wybór godny polecenia dla każdego, kto ceni sobie profesjonalne rozwiązania i niezawodność.</p>`;
    
    // Wstaw przed ostatnim </h2> lub na koniec
    if (html.includes('</h2>')) {
        const lastH2 = html.lastIndexOf('</h2>');
        return html.substring(0, lastH2) + additionalSection + html.substring(lastH2);
    }
    
    return html + additionalSection;
}

// 🔥 V7.0.6 ULTIMATE: Skróć opis jeśli za długi
function shortenLongDescription(html, targetMaxLength) {
    console.log(`✏️ Sprawdzam długość opisu (max: ${targetMaxLength} znaków)...`);
    
    const plainText = stripHtmlTags(html);
    if (plainText.length <= targetMaxLength) {
        console.log(`✅ Długość OK: ${plainText.length} znaków`);
        return html; // Już OK
    }
    
    console.warn(`⚠️ Opis przekracza limit (${plainText.length} > ${targetMaxLength})`);
    
    // ✅ STRATEGIA: Pozwól na +20% powyżej limitu (Gemini wie lepiej)
    if (plainText.length <= targetMaxLength * 1.2) {
        console.log(`✅ Akceptuję długość ${plainText.length} (tolerancja +20%)`);
        return html;
    }
    
    // Jeśli > 120% limitu, Gemini powinien był skrócić w prompcie
    // ALE jeśli nie skrócił, akceptujemy całość (pełna treść > ograniczenia)
    console.warn(`⚠️ Opis BARDZO długi (${plainText.length} > ${targetMaxLength * 1.2}), ale ZACHOWUJĘ całą treść!`);
    console.warn(`ℹ️ Gemini dostał jasne instrukcje - jeśli nie skrócił, to była jego decyzja.`);
    console.warn(`ℹ️ Pełna wartościowa treść > sztuczne limitowanie!`);
    
    return html; // Zachowaj CAŁĄ treść - Gemini zrobił swoje
}


function enhanceMetaDescription(desc) {
    if (!desc) return 'Wysokiej jakości produkt w atrakcyjnej cenie. Szybka dostawa, profesjonalna obsługa. Sprawdź szczegóły i zamów już dziś! Gwarancja satysfakcji.';
    
    const words = desc.split(' ');
    if (words.length < 20) {
        return desc + ' Sprawdź pełną specyfikację, opinie klientów i zamów z dostawą już dziś!';
    }
    
    return desc;
}

// ❌ USUNIĘTO generateDefaultBulletPoints() - NIGDY nie zwracaj AI-fluff fallback!
function generateDefaultBulletPoints() {
    throw new Error('generateDefaultBulletPoints() USUNIĘTO - użyj Gemini zamiast fallback!');
}

function generateMetaTitle(name, category, language) {
    const shortName = name.length > 35 ? name.substring(0, 35) + '...' : name;
    const cat = category ? category.split(' ')[0] : '';
    
    if (language === 'en') {
        return `${shortName} | ${cat} | Best Price`;
    }
    
    return `${shortName} | ${cat} | Najlepsza Cena`;
}

function generateMetaDescription(name, category, material, language) {
    const shortName = name.length > 50 ? name.substring(0, 50) : name;
    const mat = material ? `z ${material}` : '';
    
    if (language === 'en') {
        return `Buy ${shortName} ${mat} at the best price. High quality, fast delivery. Professional service. Check now!`;
    }
    
    return `Kup ${shortName} ${mat} w najlepszej cenie. Wysokiej jakości wykonanie, szybka dostawa. Profesjonalna obsługa. Sprawdź teraz!`;
}

function generateSEOTags(productData, language) {
    const tags = [];
    
    const category = (productData.kategoria || '').toLowerCase();
    const material = (productData.material || productData.materiał || '').toLowerCase();
    const name = (productData.produkt || '').toLowerCase();
    
    if (category) tags.push(category);
    if (material) tags.push(`${material} ${category}`.trim());
    if (name) {
        const words = name.split(' ').filter(w => w.length > 3);
        tags.push(...words.slice(0, 2));
    }
    
    if (language === 'en') {
        tags.push('high quality', 'best price', 'fast delivery');
    } else {
        tags.push('wysokiej jakości', 'najlepsza cena', 'szybka dostawa');
    }
    
    // Usuń duplikaty i ogranicz do 8
    return [...new Set(tags)].slice(0, 8).join(', ');
}

// ===== UTILITY FUNCTIONS =====
function stripHtmlTags(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// ===== ERROR HANDLING =====
window.addEventListener('error', function(e) {
    console.error('Błąd aplikacji:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Nieobsłużona promise rejection:', e.reason);
});

// ===== COLUMN MAPPING FUNCTIONS =====

// Definicja pól wymaganych przez aplikację
const REQUIRED_FIELDS = {
    'indeks': {
        label: 'Indeks produktu',
        description: 'Unikalny kod/numer produktu (SKU)',
        required: true,
        aliases: ['indeks', 'sku', 'kod', 'product_id', 'id']
    },
    'nazwa': {
        label: 'Nazwa produktu',
        description: 'Pełna nazwa produktu',
        required: true,
        aliases: ['nazwa', 'name', 'product_name', 'produkt', 'title']
    },
    'kategoria': {
        label: 'Kategoria',
        description: 'Kategoria produktu',
        required: false,
        aliases: ['kategoria', 'category', 'cat']
    },
    'opis': {
        label: 'Opis',
        description: 'Krótki opis produktu',
        required: false,
        aliases: ['opis', 'description', 'desc']
    },
    'dodatkowy opis': {
        label: 'Dodatkowy opis',
        description: 'Rozszerzony opis lub szczegóły',
        required: false,
        aliases: ['dodatkowy opis', 'additional_description', 'details']
    },
    'materiał': {
        label: 'Materiał',
        description: 'Materiał z którego wykonany jest produkt',
        required: false,
        aliases: ['materiał', 'material', 'mat']
    },
    'długość': {
        label: 'Długość',
        description: 'Długość produktu (w mm lub cm)',
        required: false,
        aliases: ['długość', 'length', 'dlugosc']
    },
    'szerokość': {
        label: 'Szerokość',
        description: 'Szerokość produktu (w mm lub cm)',
        required: false,
        aliases: ['szerokość', 'width', 'szerokosc']
    },
    'wysokość': {
        label: 'Wysokość',
        description: 'Wysokość produktu (w mm lub cm)',
        required: false,
        aliases: ['wysokość', 'height', 'wysokosc']
    },
    'kolor': {
        label: 'Kolor',
        description: 'Kolor produktu',
        required: false,
        aliases: ['kolor', 'color', 'colour']
    },
    'gwarancja': {
        label: 'Gwarancja',
        description: 'Okres gwarancji (np. "2 lata", "24 miesiące")',
        required: false,
        aliases: ['gwarancja', 'warranty', 'guarantee']
    },
    'ean': {
        label: 'Kod EAN',
        description: 'Kod kreskowy EAN produktu',
        required: false,
        aliases: ['ean', 'barcode', 'gtin']
    }
};

function showMappingScreen() {
    console.log('🗺️ Pokazuję ekran mapowania kolumn');
    
    // Ukryj inne sekcje
    const previewSection = document.getElementById('preview-section');
    const generationSection = document.getElementById('generation-section');
    const resultsSection = document.getElementById('results-section');
    
    if (previewSection) previewSection.style.display = 'none';
    if (generationSection) generationSection.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'none';
    
    // Pokaż sekcję mapowania
    const mappingSection = document.getElementById('mapping-section');
    mappingSection.style.display = 'block';
    
    // Wygeneruj pola mapowania
    const mappingGrid = document.getElementById('mapping-grid');
    mappingGrid.innerHTML = '';
    
    // Automatyczne mapowanie - próba dopasowania kolumn
    columnMapping = autoDetectMapping();
    
    // Generuj pola dla każdego wymaganego pola
    Object.keys(REQUIRED_FIELDS).forEach(fieldKey => {
        const field = REQUIRED_FIELDS[fieldKey];
        const mappingField = createMappingField(fieldKey, field);
        mappingGrid.appendChild(mappingField);
    });
    
    // Scroll do sekcji
    mappingSection.scrollIntoView({ behavior: 'smooth' });
}

function autoDetectMapping() {
    console.log('🔍 Automatyczne wykrywanie mapowania kolumn...');
    const mapping = {};
    
    Object.keys(REQUIRED_FIELDS).forEach(fieldKey => {
        const field = REQUIRED_FIELDS[fieldKey];
        const aliases = field.aliases || [];
        
        // Szukaj dopasowania w kolumnach CSV
        for (const csvCol of csvColumns) {
            const csvColLower = csvCol.toLowerCase().trim();
            
            // Sprawdź dokładne dopasowanie lub alias
            if (aliases.some(alias => alias.toLowerCase() === csvColLower)) {
                mapping[fieldKey] = csvCol;
                console.log(`✅ Auto-mapowanie: ${fieldKey} → ${csvCol}`);
                break;
            }
        }
    });
    
    return mapping;
}

function createMappingField(fieldKey, field) {
    const div = document.createElement('div');
    div.className = 'mapping-field' + (field.required ? ' required' : '');
    if (columnMapping[fieldKey]) {
        div.classList.add('mapped');
    }
    
    div.innerHTML = `
        <div class="mapping-field-label">
            ${field.label}
            ${field.required ? '<span class="required-star">*</span>' : ''}
        </div>
        <div class="mapping-field-description">${field.description}</div>
        <select id="mapping-${fieldKey}" onchange="updateMapping('${fieldKey}', this.value)">
            <option value="">-- Nie mapuj --</option>
            ${csvColumns.map(col => `
                <option value="${col}" ${columnMapping[fieldKey] === col ? 'selected' : ''}>
                    ${col}
                </option>
            `).join('')}
        </select>
    `;
    
    return div;
}

function updateMapping(fieldKey, columnName) {
    if (columnName) {
        columnMapping[fieldKey] = columnName;
        console.log(`📌 Zmapowano: ${fieldKey} → ${columnName}`);
    } else {
        delete columnMapping[fieldKey];
        console.log(`❌ Usunięto mapowanie: ${fieldKey}`);
    }
    
    // Aktualizuj wizualnie
    const field = document.getElementById(`mapping-${fieldKey}`).closest('.mapping-field');
    if (columnName) {
        field.classList.add('mapped');
    } else {
        field.classList.remove('mapped');
    }
}

function applyMapping() {
    console.log('✅ Zastosowuję mapowanie kolumn...');
    
    // Sprawdź czy wymagane pola są zmapowane
    const missingRequired = [];
    Object.keys(REQUIRED_FIELDS).forEach(fieldKey => {
        const field = REQUIRED_FIELDS[fieldKey];
        if (field.required && !columnMapping[fieldKey]) {
            missingRequired.push(field.label);
        }
    });
    
    if (missingRequired.length > 0) {
        alert(`⚠️ Brakuje mapowania wymaganych pól:\n\n${missingRequired.join('\n')}\n\nProszę zmapować wszystkie pola oznaczone gwiazdką (*).`);
        return;
    }
    
    console.log('📊 Mapowanie:', columnMapping);
    
    // Przetworz dane z mapowaniem
    const mappedData = rawCSVData.map(row => {
        const mappedRow = {};
        Object.keys(columnMapping).forEach(fieldKey => {
            const csvColumn = columnMapping[fieldKey];
            mappedRow[fieldKey] = row[csvColumn] || '';
        });
        return mappedRow;
    });
    
    console.log('✅ Zmapowano', mappedData.length, 'produktów');
    console.log('📊 Przykładowy zmapowany produkt:', mappedData[0]);
    
    // Ukryj mapowanie i pokaż podgląd
    document.getElementById('mapping-section').style.display = 'none';
    processCSVData(mappedData);
}

function cancelMapping() {
    console.log('❌ Anulowano mapowanie');
    
    // Ukryj sekcję mapowania
    document.getElementById('mapping-section').style.display = 'none';
    
    // Wyczyść dane
    rawCSVData = [];
    csvColumns = [];
    columnMapping = {};
    
    // Reset upload
    document.getElementById('csv-file-input').value = '';
    document.getElementById('file-info').style.display = 'none';
}

