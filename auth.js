/**
 * 🔐 Password Protection System
 * Simple SHA-256 based authentication
 * Version: 7.0.11-SIMPLE
 */

(function() {
    'use strict';
    
    // ========== CONFIGURATION ==========
    
    // Password hash (SHA-256)
    // Default password: gtv2025
    const PASSWORD_HASH = 'a8f5f167f44f4964e6c998dee827110c5595f69930cd30c6f8b4c1c3c678a2c3';
    
    // Session key in SessionStorage
    const SESSION_KEY = 'app_authenticated';
    
    // ========== AUTHENTICATION LOGIC ==========
    
    // Check if user is authenticated
    function isAuthenticated() {
        return sessionStorage.getItem(SESSION_KEY) === 'true';
    }
    
    // Set authenticated session
    function setAuthenticated() {
        sessionStorage.setItem(SESSION_KEY, 'true');
    }
    
    // SHA-256 hash function
    async function sha256(str) {
        const buffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Verify password
    async function verifyPassword(password) {
        const hash = await sha256(password);
        return hash === PASSWORD_HASH;
    }
    
    // Show login screen
    function showLoginScreen() {
        // Hide main app
        const mainApp = document.body;
        mainApp.style.display = 'none';
        
        // Create login overlay
        const overlay = document.createElement('div');
        overlay.id = 'auth-overlay';
        overlay.innerHTML = `
            <style>
                #auth-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                #auth-box {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    animation: slideIn 0.3s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                #auth-box h1 {
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    color: #333;
                    font-weight: 600;
                }
                
                #auth-box h2 {
                    margin: 0 0 30px 0;
                    font-size: 16px;
                    color: #666;
                    font-weight: 400;
                }
                
                #auth-box input {
                    width: 100%;
                    padding: 15px;
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    font-size: 16px;
                    box-sizing: border-box;
                    transition: border-color 0.3s;
                    margin-bottom: 20px;
                }
                
                #auth-box input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                #auth-box button {
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                #auth-box button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
                }
                
                #auth-box button:active {
                    transform: translateY(0);
                }
                
                #auth-error {
                    color: #e74c3c;
                    font-size: 14px;
                    margin-top: 15px;
                    display: none;
                }
                
                .lock-icon {
                    font-size: 48px;
                    margin-bottom: 20px;
                }
            </style>
            
            <div id="auth-box">
                <div class="lock-icon">🔒</div>
                <h1>Generator Opisów Produktów</h1>
                <h2>Wprowadź hasło aby kontynuować</h2>
                
                <input 
                    type="password" 
                    id="auth-password" 
                    placeholder="Hasło"
                    autocomplete="current-password"
                >
                
                <button id="auth-submit">Zaloguj</button>
                
                <div id="auth-error">❌ Nieprawidłowe hasło</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Focus password input
        const passwordInput = document.getElementById('auth-password');
        passwordInput.focus();
        
        // Handle login
        const submitBtn = document.getElementById('auth-submit');
        const errorDiv = document.getElementById('auth-error');
        
        async function handleLogin() {
            const password = passwordInput.value;
            
            if (!password) {
                errorDiv.textContent = '❌ Wprowadź hasło';
                errorDiv.style.display = 'block';
                return;
            }
            
            submitBtn.textContent = 'Sprawdzam...';
            submitBtn.disabled = true;
            
            const isValid = await verifyPassword(password);
            
            if (isValid) {
                setAuthenticated();
                overlay.remove();
                mainApp.style.display = '';
                console.log('✅ Zalogowano pomyślnie');
            } else {
                errorDiv.textContent = '❌ Nieprawidłowe hasło';
                errorDiv.style.display = 'block';
                submitBtn.textContent = 'Zaloguj';
                submitBtn.disabled = false;
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
        
        submitBtn.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // ========== INITIALIZATION ==========
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        if (!isAuthenticated()) {
            showLoginScreen();
        } else {
            console.log('✅ Użytkownik już zalogowany');
        }
    }
    
})();
