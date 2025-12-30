/**
 * Prosty system autoryzacji dla aplikacji
 * Dodaj ten plik PRZED app.js w index.html
 */

(function() {
    'use strict';
    
    // ========== KONFIGURACJA HASEŁ ==========
    // Dodaj tutaj hasła dla zespołu
    const VALID_PASSWORDS = [
        'GTV2025!',           // Hasło główne
        'ProductGen123',      // Hasło alternatywne
        'TeamGTV2025'         // Hasło dla zespołu
    ];
    
    // Nazwa sesji (localStorage key)
    const SESSION_KEY = 'gtv_app_authenticated';
    
    // Czas sesji w godzinach (0 = bez limitu)
    const SESSION_HOURS = 24;
    
    // ========== KOD AUTORYZACJI ==========
    
    // Sprawdź czy użytkownik jest zalogowany
    function isAuthenticated() {
        const session = localStorage.getItem(SESSION_KEY);
        
        if (!session) return false;
        
        try {
            const data = JSON.parse(session);
            const now = Date.now();
            
            // Sprawdź czy sesja nie wygasła
            if (SESSION_HOURS > 0 && data.expires < now) {
                localStorage.removeItem(SESSION_KEY);
                return false;
            }
            
            return data.authenticated === true;
        } catch (e) {
            return false;
        }
    }
    
    // Ustaw sesję
    function setAuthenticated() {
        const expires = SESSION_HOURS > 0 
            ? Date.now() + (SESSION_HOURS * 60 * 60 * 1000)
            : 0;
            
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            authenticated: true,
            expires: expires,
            timestamp: Date.now()
        }));
    }
    
    // Wyloguj
    function logout() {
        localStorage.removeItem(SESSION_KEY);
        location.reload();
    }
    
    // Sprawdź hasło
    function checkPassword(password) {
        return VALID_PASSWORDS.includes(password);
    }
    
    // Pokaż ekran logowania
    function showLoginScreen() {
        // Ukryj główną aplikację
        document.body.style.display = 'none';
        
        // Utwórz ekran logowania
        const loginHTML = `
            <div id="auth-screen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                z-index: 999999;
            ">
                <div style="
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    padding: 48px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                ">
                    <div style="margin-bottom: 32px;">
                        <div style="
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            border-radius: 50%;
                            margin: 0 auto 20px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-lock" style="font-size: 36px; color: white;"></i>
                        </div>
                        <h1 style="
                            font-size: 28px;
                            font-weight: 700;
                            color: #333;
                            margin: 0 0 8px 0;
                        ">Generator Opisów AI</h1>
                        <p style="
                            color: #666;
                            font-size: 15px;
                            margin: 0;
                        ">GTV Poland - Dostęp dla zespołu</p>
                    </div>
                    
                    <form id="auth-form" style="margin-bottom: 24px;">
                        <input 
                            type="password" 
                            id="auth-password"
                            placeholder="Wprowadź hasło"
                            autocomplete="off"
                            style="
                                width: 100%;
                                padding: 14px 16px;
                                border: 2px solid #e0e0e0;
                                border-radius: 8px;
                                font-size: 16px;
                                box-sizing: border-box;
                                transition: all 0.3s;
                                margin-bottom: 16px;
                            "
                            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102,126,234,0.1)'"
                            onblur="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'"
                        >
                        
                        <button 
                            type="submit"
                            style="
                                width: 100%;
                                padding: 14px;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                border: none;
                                border-radius: 8px;
                                color: white;
                                font-size: 16px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s;
                            "
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(102,126,234,0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                        >
                            <i class="fas fa-sign-in-alt"></i> Zaloguj się
                        </button>
                    </form>
                    
                    <div id="auth-error" style="
                        color: #f44336;
                        font-size: 14px;
                        margin-top: 12px;
                        display: none;
                        padding: 12px;
                        background: #ffebee;
                        border-radius: 6px;
                    "></div>
                    
                    <p style="
                        color: #999;
                        font-size: 13px;
                        margin: 24px 0 0 0;
                    ">
                        <i class="fas fa-info-circle"></i> 
                        Nie masz hasła? Skontaktuj się z administratorem.
                    </p>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loginHTML);
        
        // Obsługa formularza
        const form = document.getElementById('auth-form');
        const passwordInput = document.getElementById('auth-password');
        const errorDiv = document.getElementById('auth-error');
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const password = passwordInput.value;
            
            if (checkPassword(password)) {
                // Hasło poprawne
                setAuthenticated();
                
                // Usuń ekran logowania
                document.getElementById('auth-screen').remove();
                
                // Pokaż aplikację
                document.body.style.display = '';
                
                console.log('✅ Zalogowano pomyślnie');
            } else {
                // Hasło niepoprawne
                errorDiv.textContent = '❌ Nieprawidłowe hasło. Spróbuj ponownie.';
                errorDiv.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
                
                // Animacja shake
                passwordInput.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    passwordInput.style.animation = '';
                }, 500);
            }
        });
        
        // Focus na input
        setTimeout(() => passwordInput.focus(), 100);
    }
    
    // Dodaj przycisk wylogowania
    function addLogoutButton() {
        const logoutBtn = document.createElement('button');
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Wyloguj';
        logoutBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.9);
            border: 2px solid #667eea;
            border-radius: 8px;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            color: #667eea;
            cursor: pointer;
            z-index: 10000;
            transition: all 0.3s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        logoutBtn.onmouseover = function() {
            this.style.background = '#667eea';
            this.style.color = 'white';
        };
        
        logoutBtn.onmouseout = function() {
            this.style.background = 'rgba(255,255,255,0.9)';
            this.style.color = '#667eea';
        };
        
        logoutBtn.onclick = logout;
        
        document.body.appendChild(logoutBtn);
    }
    
    // Inicjalizacja
    document.addEventListener('DOMContentLoaded', function() {
        if (!isAuthenticated()) {
            showLoginScreen();
        } else {
            console.log('✅ Użytkownik zalogowany');
            addLogoutButton();
        }
    });
    
    // Eksport funkcji globalnie
    window.GTV_Auth = {
        logout: logout,
        isAuthenticated: isAuthenticated
    };
    
})();

// CSS dla animacji
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);
