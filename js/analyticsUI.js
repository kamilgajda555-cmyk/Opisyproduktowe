/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 QUALITY & SEO ANALYTICS UI — V7.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Funkcje do wyświetlania wyników analizy jakości i SEO w UI
 */

// Funkcja do wyświetlenia dashboardu analytics
function displayQualityAnalytics() {
    const analyticsSection = document.getElementById('quality-analytics');
    if (!analyticsSection) {
        console.warn('⚠️ Element quality-analytics nie znaleziony');
        return;
    }
    
    // Zbierz wszystkie wyniki z quality scores
    // generatedDescriptions to array obiektów z app.js
    const results = (generatedDescriptions || [])
        .filter(desc => desc && desc.qualityScore && desc.keywordData);
    
    if (results.length === 0) {
        analyticsSection.style.display = 'none';
        return;
    }
    
    analyticsSection.style.display = 'block';
    
    // Oblicz statystyki
    const avgQualityScore = Math.round(
        results.reduce((sum, r) => sum + r.qualityScore.overallScore, 0) / results.length
    );
    
    const avgSeoScore = Math.round(
        results.reduce((sum, r) => sum + r.qualityScore.metrics.seoScore.score, 0) / results.length
    );
    
    const totalKeywords = results.reduce((sum, r) => 
        sum + (r.keywordData?.keywords?.length || 0), 0
    );
    
    const avgReadability = Math.round(
        results.reduce((sum, r) => sum + r.qualityScore.metrics.readability.score, 0) / results.length
    );
    
    // Wypełnij stat cards
    document.getElementById('avg-quality-score').textContent = avgQualityScore + '/100';
    document.getElementById('avg-seo-score').textContent = avgSeoScore + '/100';
    document.getElementById('total-keywords').textContent = totalKeywords;
    document.getElementById('avg-readability').textContent = avgReadability + '/100';
    
    // Wypełnij tabelę
    const tableBody = document.getElementById('quality-table-body');
    tableBody.innerHTML = '';
    
    results.forEach((result, index) => {
        // result.name pochodzi z generatedDescriptions (app.js linia 363)
        const productName = result.name || result.index || `Produkt ${index + 1}`;
        const qualityScore = result.qualityScore.overallScore;
        const seoScore = result.qualityScore.metrics.seoScore.score;
        const readabilityScore = result.qualityScore.metrics.readability.score;
        const keywordCount = result.keywordData?.keywords?.length || 0;
        const topKeyword = result.keywordData?.stats?.topKeyword?.keyword || 'N/A';
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #dee2e6';
        
        row.innerHTML = `
            <td style="padding: 0.75rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${productName}">${productName}</td>
            <td style="padding: 0.75rem; text-align: center;">
                <span class="score-badge" style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; ${getScoreBadgeStyle(qualityScore)}">${qualityScore}/100</span>
            </td>
            <td style="padding: 0.75rem; text-align: center;">
                <span class="score-badge" style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; ${getScoreBadgeStyle(seoScore)}">${seoScore}/100</span>
            </td>
            <td style="padding: 0.75rem; text-align: center;">
                <span class="score-badge" style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; ${getScoreBadgeStyle(readabilityScore)}">${readabilityScore}/100</span>
            </td>
            <td style="padding: 0.75rem; text-align: center;">${keywordCount}</td>
            <td style="padding: 0.75rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${topKeyword}">${topKeyword}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Helper: Określ styl badge na podstawie score
function getScoreBadgeStyle(score) {
    if (score >= 90) {
        return 'background: #28a745; color: white;'; // Zielony (doskonały)
    } else if (score >= 75) {
        return 'background: #5cb85c; color: white;'; // Jasny zielony (dobry)
    } else if (score >= 60) {
        return 'background: #ffc107; color: #212529;'; // Żółty (akceptowalny)
    } else if (score >= 40) {
        return 'background: #fd7e14; color: white;'; // Pomarańczowy (słaby)
    } else {
        return 'background: #dc3545; color: white;'; // Czerwony (krytyczny)
    }
}

// Funkcja do exportu analytics do CSV
function exportAnalyticsToCSV() {
    // generatedDescriptions to array z app.js
    const results = (generatedDescriptions || [])
        .filter(desc => desc && desc.qualityScore && desc.keywordData);
    
    if (results.length === 0) {
        alert('Brak danych do exportu');
        return;
    }
    
    // Nagłówki CSV
    const headers = [
        'Produkt',
        'Quality Score',
        'Rating',
        'SEO Score',
        'Readability',
        'Semantic Quality',
        'Technical Accuracy',
        'Engagement Potential',
        'Keywords Count',
        'Top Keyword',
        'Top Keyword Volume',
        'Recommendations'
    ];
    
    // Wiersze danych
    const rows = results.map(result => {
        // result.name pochodzi z generatedDescriptions
        const productName = result.name || result.index || 'N/A';
        const qs = result.qualityScore;
        const kd = result.keywordData;
        
        return [
            productName,
            qs.overallScore,
            qs.rating,
            qs.metrics.seoScore.score,
            qs.metrics.readability.score,
            qs.metrics.semanticQuality.score,
            qs.metrics.technicalAccuracy.score,
            qs.metrics.engagementPotential.score,
            kd?.keywords?.length || 0,
            kd?.stats?.topKeyword?.keyword || 'N/A',
            kd?.stats?.topKeyword?.searchVolume || 'N/A',
            qs.recommendations.map(r => r.action).join('; ')
        ];
    });
    
    // Zbuduj CSV
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(';'))
        .join('\n');
    
    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
    
    link.href = URL.createObjectURL(blob);
    link.download = `Quality_Analytics_${timestamp}.csv`;
    link.click();
    
    console.log('✅ Export analytics do CSV zakończony');
}

// Dodaj do globalnego scope
if (typeof window !== 'undefined') {
    window.displayQualityAnalytics = displayQualityAnalytics;
    window.exportAnalyticsToCSV = exportAnalyticsToCSV;
}
