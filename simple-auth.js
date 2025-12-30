/**
 * Simple Password Protection
 * Asks for password on page load
 * Version: 7.0.13-SIMPLE
 */

(function() {
    'use strict';
    
    // Password (change this!)
    const CORRECT_PASSWORD = 'gtv2025';
    
    // Check if already authenticated in this session
    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
    
    if (!isAuthenticated) {
        // Ask for password
        const password = prompt('🔒 Wprowadź hasło aby kontynuować:');
        
        if (password === CORRECT_PASSWORD) {
            // Correct password
            sessionStorage.setItem('authenticated', 'true');
            console.log('✅ Zalogowano pomyślnie');
        } else {
            // Wrong password
            alert('❌ Nieprawidłowe hasło!\n\nKontakt: kontakt@gtv.com.pl');
            // Redirect away
            window.location.href = 'https://gtv.com.pl';
        }
    } else {
        console.log('✅ Użytkownik już zalogowany (session)');
    }
    
})();
