// ===== BATCH PROCESSING =====
class BatchProcessor {
    constructor(config = {}) {
        this.batchSize = config.batchSize || 5;        // 5 równoległych
        this.pauseBetween = config.pauseBetween || 2000; // 2s przerwa
        this.retryOnError = config.retryOnError || 3;    // 3 próby
        this.onProgress = config.onProgress || (() => {});
        this.onComplete = config.onComplete || (() => {});
        this.onError = config.onError || (() => {});
        
        this.queue = [];
        this.results = [];
        this.errors = [];
        this.isProcessing = false;
    }
    
    // Dodaj produkty do kolejki
    addProducts(products) {
        this.queue = products.map((product, index) => ({
            product,
            index,
            attempts: 0,
            status: 'pending'
        }));
    }
    
    // Rozpocznij przetwarzanie
    async start() {
        if (this.isProcessing) {
            throw new Error('Batch już się przetwarza');
        }
        
        this.isProcessing = true;
        this.results = [];
        this.errors = [];
        
        const startTime = Date.now();
        let processed = 0;
        const totalProducts = this.queue.length;
        
        // Przetwarzaj w batchach
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            
            // Równoległe przetwarzanie batch
            const promises = batch.map(item => 
                this.processProduct(item)
                    .then(result => {
                        this.results.push({ ...item, result, status: 'success' });
                        processed++;
                    })
                    .catch(error => {
                        item.attempts++;
                        
                        // Retry logic
                        if (item.attempts < this.retryOnError) {
                            console.warn(`⚠️ Błąd dla produktu ${item.index}, próba ${item.attempts}/${this.retryOnError}`);
                            this.queue.push(item); // Dodaj na koniec kolejki
                        } else {
                            this.errors.push({ ...item, error: error.message });
                            processed++;
                            this.onError(item, error);
                        }
                    })
            );
            
            await Promise.all(promises);
            
            // Progress callback
            const progress = {
                processed,
                total: totalProducts,
                percentage: Math.round((processed / totalProducts) * 100),
                errors: this.errors.length,
                remaining: this.queue.length,
                eta: this.calculateETA(startTime, processed, totalProducts)
            };
            
            this.onProgress(progress);
            
            // Przerwa między batchami
            if (this.queue.length > 0) {
                await this.pause(this.pauseBetween);
            }
        }
        
        this.isProcessing = false;
        
        // Complete callback
        this.onComplete({
            results: this.results,
            errors: this.errors,
            totalTime: Date.now() - startTime
        });
        
        return {
            success: this.results,
            errors: this.errors
        };
    }
    
    // Przetwórz pojedynczy produkt
    async processProduct(item) {
        const { product } = item;
        
        // Wywołaj główną funkcję generowania
        const description = await generateProductDescription(
            product,
            'pl',
            'professional',
            false // skipEANVerification dla batch
        );
        
        return description;
    }
    
    // Oblicz ETA
    calculateETA(startTime, processed, total) {
        if (processed === 0) return 'Obliczanie...';
        
        const elapsed = Date.now() - startTime;
        const avgTime = elapsed / processed;
        const remaining = total - processed;
        const etaMs = avgTime * remaining;
        
        const minutes = Math.floor(etaMs / 60000);
        const seconds = Math.floor((etaMs % 60000) / 1000);
        
        return `${minutes}m ${seconds}s`;
    }
    
    // Pauza
    pause(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Zatrzymaj przetwarzanie
    stop() {
        this.queue = [];
        this.isProcessing = false;
    }
}

// Dodaj BatchProcessor do window dla globalnego dostępu
if (typeof window !== 'undefined') {
    window.BatchProcessor = BatchProcessor;
}
