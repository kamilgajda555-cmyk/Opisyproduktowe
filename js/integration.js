/**
 * Integration Module - Connect frontendEnhancements.js with app.js
 * Version: 7.0.3
 */

// ============================================
// INTEGRATION WITH BATCH PROCESSOR
// ============================================

/**
 * Hook into batch generation start
 */
function onBatchGenerationStart(products) {
    if (window.progressDashboard) {
        window.progressDashboard.startProcessing(products.length);
    }
}

/**
 * Hook into single product generation start
 */
function onProductGenerationStart(product) {
    if (window.progressDashboard) {
        window.progressDashboard.updateProduct('start');
    }
}

/**
 * Hook into single product generation complete
 */
function onProductGenerationComplete(product, result, duration) {
    if (window.progressDashboard) {
        const quality = result.qualityScore?.overallScore || 0;
        window.progressDashboard.updateProduct('complete', quality, duration / 1000);
    }
    
    if (window.historyLog && window.settingsPanel?.settings?.saveHistory) {
        window.historyLog.addEntry(product, result);
    }
}

/**
 * Hook into batch generation complete
 */
function onBatchGenerationComplete(results) {
    // Calculate average quality
    const avgQuality = results.reduce((sum, r) => {
        return sum + (r.qualityScore?.overallScore || 0);
    }, 0) / results.length;
    
    // Show conversion metrics
    if (window.conversionMetrics) {
        window.conversionMetrics.calculate(results.length, avgQuality);
    }
    
    // Auto export if enabled
    if (window.settingsPanel?.settings?.autoExport) {
        setTimeout(() => {
            if (confirm('Generowanie zakończone! Czy chcesz teraz wyeksportować wyniki?')) {
                exportToExcel();
            }
        }, 1000);
    }
}

/**
 * Hook into product row click in table
 */
function onProductRowClick(product) {
    if (window.productPreview && window.settingsPanel?.settings?.showPreview) {
        window.productPreview.show(product);
    }
}

/**
 * Apply settings to generation
 */
function getGenerationSettings() {
    if (window.settingsPanel) {
        return window.settingsPanel.getSettings();
    }
    return {
        language: 'pl',
        style: 'professional',
        mode: 'balanced',
        verifyEAN: true
    };
}

// ============================================
// EXPORT FUNCTIONS (for global access)
// ============================================

window.onBatchGenerationStart = onBatchGenerationStart;
window.onProductGenerationStart = onProductGenerationStart;
window.onProductGenerationComplete = onProductGenerationComplete;
window.onBatchGenerationComplete = onBatchGenerationComplete;
window.onProductRowClick = onProductRowClick;
window.getGenerationSettings = getGenerationSettings;

console.log('✅ Frontend integration module loaded');
