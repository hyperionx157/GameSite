// ═══════════════════════════════════════════════════════════════════
// DEV PORTAL — settings.js
// Handles: Tab Cloaking, Color Theme, Panic Button, Special Themes
// ═══════════════════════════════════════════════════════════════════

// Ensure Firebase is initialized before trying to use it
if (typeof firebase === 'undefined') {
    console.error('[Settings] Firebase not loaded!');
} else {
    if (!firebase.apps.length) {
        const firebaseConfig = {
            apiKey: "AIzaSyDhj564xAhZSR-3sxYcR8WFqVABt0PNCcs",
            authDomain: "github-whitelist.firebaseapp.com",
            projectId: "github-whitelist",
            storageBucket: "github-whitelist.firebasestorage.app",
            messagingSenderId: "552172120402",
            appId: "1:552172120402:web:ae23acc18163d3e1ef728b",
            measurementId: "G-R0CWMJ8B8E"
        };
        firebase.initializeApp(firebaseConfig);
    }
}

(function () {
    'use strict';

    // ── Storage keys ────────────────────────────────────────────────
    var KEY_CLOAK       = 'gh_cloak';
    var KEY_THEME       = 'gh_theme';
    var KEY_PANIC_KEY   = 'gh_panic_key';
    var KEY_PANIC_URL   = 'gh_panic_url';
    var KEY_SPECIAL_THEME = 'gh_special_theme';

    // ── Special Themes ────────────────────────────────────────────────
    const SPECIAL_THEMES = {
        miku: {
            name: 'miku',
            cssClass: 'theme-miku',
            images: true,
            colors: {
                accent: '#39c5bb',
                accent2: '#e5b3c2',
                bg: '#1a2a2a',
                surface: '#2a3a3a',
                surface2: '#3a4a4a'
            }
        },
        cyberpunk: {
            name: 'cyberpunk',
            cssClass: 'theme-cyberpunk',
            images: true,
            colors: {
                accent: '#ff00ff',
                accent2: '#00ffff',
                bg: '#0a0a0a',
                surface: '#1a1a2e',
                surface2: '#2a2a4a'
            }
        },
        darkmatter: {
            name: 'darkmatter',
            cssClass: 'theme-darkmatter',
            images: true,
            colors: {
                accent: '#8b5cf6',
                accent2: '#a855f7',
                bg: '#050510',
                surface: '#0a0a20',
                surface2: '#101030'
            }
        }
    };

    function applySpecialTheme(themeName, save) {
        const theme = SPECIAL_THEMES[themeName];
        if (!theme) return false;
        
        const root = document.documentElement;
        
        // Remove any existing special theme classes
        Object.keys(SPECIAL_THEMES).forEach(t => {
            root.classList.remove(SPECIAL_THEMES[t].cssClass);
        });
        
        // Add new theme class
        root.classList.add(theme.cssClass);
        
        // Apply colors
        if (theme.colors) {
            root.style.setProperty('--accent', theme.colors.accent);
            root.style.setProperty('--accent2', theme.colors.accent2);
            root.style.setProperty('--bg', theme.colors.bg);
            root.style.setProperty('--surface', theme.colors.surface);
            root.style.setProperty('--surface2', theme.colors.surface2);
        }
        
        if (save !== false) {
            localStorage.setItem(KEY_SPECIAL_THEME, themeName);
            // Also remove regular theme when special theme is applied
            localStorage.removeItem(KEY_THEME);
        }
        
        return true;
    }

    function removeSpecialTheme() {
        const root = document.documentElement;
        Object.keys(SPECIAL_THEMES).forEach(t => {
            root.classList.remove(SPECIAL_THEMES[t].cssClass);
        });
        localStorage.removeItem(KEY_SPECIAL_THEME);
    }

    function initSpecialThemes() {
        const specialCards = document.querySelectorAll('.special-theme-card');
        specialCards.forEach(card => {
            card.addEventListener('click', () => {
                specialCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                const themeName = card.getAttribute('data-theme');
                applySpecialTheme(themeName);
                
                // Also remove any regular theme selection
                document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
            });
        });
    }

    function loadSavedSpecialTheme() {
        const savedTheme = localStorage.getItem(KEY_SPECIAL_THEME);
        if (savedTheme && SPECIAL_THEMES[savedTheme]) {
            applySpecialTheme(savedTheme, false);
            const activeCard = document.querySelector(`.special-theme-card[data-theme="${savedTheme}"]`);
            if (activeCard) activeCard.classList.add('active');
            return true;
        }
        return false;
    }

    // ── Tab switching ────────────────────────────────────────────────
    document.querySelectorAll('.settings-nav-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tabId = this.getAttribute('data-tab');

            document.querySelectorAll('.settings-nav-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            document.querySelectorAll('.settings-tab').forEach(function (t) {
                t.classList.remove('active-tab');
            });

            this.classList.add('active');
            var tab = document.getElementById(tabId);
            if (tab) tab.classList.add('active-tab');
        });
    });

    // ══════════════════════════════════════════════════════════════════
    // TAB CLOAKING
    // ══════════════════════════════════════════════════════════════════

    function applyCloak(title, faviconSrc, faviconType, save) {
        if (title) document.title = title;

        var existing = document.getElementById('gh-dynamic-favicon');
        if (existing) existing.remove();

        if (faviconSrc) {
            var link = document.createElement('link');
            link.id   = 'gh-dynamic-favicon';
            link.rel  = 'icon';

            if (faviconType === 'emoji') {
                var canvas  = document.createElement('canvas');
                canvas.width = canvas.height = 64;
                var ctx = canvas.getContext('2d');
                ctx.font = '52px serif';
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(faviconSrc, 32, 36);
                link.href = canvas.toDataURL('image/png');
            } else {
                link.href = faviconSrc;
            }
            document.head.appendChild(link);
        }

        if (save !== false) {
            localStorage.setItem(KEY_CLOAK, JSON.stringify({
                title: title,
                favicon: faviconSrc,
                faviconType: faviconType
            }));
        }

        updateCloakStatus(title);
    }

    function removeCloak() {
        localStorage.removeItem(KEY_CLOAK);
        document.title = 'Settings — Dev Portal';
        var existing = document.getElementById('gh-dynamic-favicon');
        if (existing) existing.remove();
        applyCloak('Settings — Dev Portal', '📁', 'emoji', false);
        updateCloakStatus(null);
        document.querySelectorAll('.cloak-card').forEach(function (c) {
            c.classList.remove('active');
        });
        var defaultCard = document.querySelector('.cloak-card[data-title="Dev Portal"]');
        if (defaultCard) defaultCard.classList.add('active');
    }

    function updateCloakStatus(title) {
        var statusEl = document.getElementById('cloakStatus');
        var textEl   = document.getElementById('cloakStatusText');
        if (!statusEl) return;

        var stored = localStorage.getItem(KEY_CLOAK);
        if (stored) {
            var data = JSON.parse(stored);
            if (data.title && data.title !== 'Dev Portal') {
                statusEl.style.display = 'flex';
                if (textEl) textEl.textContent = data.title;
                return;
            }
        }
        statusEl.style.display = 'none';
    }

    document.querySelectorAll('.cloak-card').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('.cloak-card').forEach(function (c) { c.classList.remove('active'); });
            this.classList.add('active');

            var title       = this.getAttribute('data-title');
            var favicon     = this.getAttribute('data-favicon');
            var faviconType = this.getAttribute('data-favicon-type');
            applyCloak(title, favicon, faviconType);
        });
    });

    var applyCustomBtn = document.getElementById('applyCustomCloak');
    if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', function () {
            var title   = document.getElementById('customCloakTitle').value.trim();
            var favicon = document.getElementById('customCloakFavicon').value.trim();
            if (!title && !favicon) { alert('Enter at least a title or favicon URL.'); return; }
            document.querySelectorAll('.cloak-card').forEach(function (c) { c.classList.remove('active'); });
            applyCloak(title || document.title, favicon || null, 'url');
        });
    }

    var removeCloakBtn = document.getElementById('removeCloakBtn');
    if (removeCloakBtn) removeCloakBtn.addEventListener('click', removeCloak);

    function loadSavedCloak() {
        var stored = localStorage.getItem(KEY_CLOAK);
        if (stored) {
            try {
                var data = JSON.parse(stored);
                applyCloak(data.title, data.favicon, data.faviconType, false);
                document.querySelectorAll('.cloak-card').forEach(function (c) {
                    if (c.getAttribute('data-title') === data.title) c.classList.add('active');
                });
                updateCloakStatus(data.title);
            } catch (e) { }
        } else {
            var defaultCard = document.querySelector('.cloak-card[data-title="Dev Portal"]');
            if (defaultCard) defaultCard.classList.add('active');
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // COLOR THEME
    // ══════════════════════════════════════════════════════════════════

    function applyTheme(vars, save, themeKey) {
        var root = document.documentElement;
        if (vars.accent)   root.style.setProperty('--accent',   vars.accent);
        if (vars.accent2)  root.style.setProperty('--accent2',  vars.accent2);
        if (vars.bg)       root.style.setProperty('--bg',       vars.bg);
        if (vars.surface)  root.style.setProperty('--surface',  vars.surface);
        if (vars.surface2) root.style.setProperty('--surface2', vars.surface2);
        if (vars.border)   root.style.setProperty('--border',   vars.border);

        if (save !== false) {
            localStorage.setItem(KEY_THEME, JSON.stringify({ vars: vars, key: themeKey || 'custom' }));
            // Remove special theme when regular theme is applied
            localStorage.removeItem(KEY_SPECIAL_THEME);
        }
    }

    document.querySelectorAll('.theme-card').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.remove('active'); });
            document.querySelectorAll('.special-theme-card').forEach(function (c) { c.classList.remove('active'); });
            this.classList.add('active');

            var vars = {
                accent:   this.getAttribute('data-accent'),
                accent2:  this.getAttribute('data-accent2'),
                bg:       this.getAttribute('data-bg'),
                surface:  this.getAttribute('data-surface'),
                surface2: this.getAttribute('data-surface2'),
                border:   this.getAttribute('data-border')
            };
            applyTheme(vars, true, this.getAttribute('data-theme'));

            var picker = document.getElementById('customAccentColor');
            var hex    = document.getElementById('customAccentHex');
            if (picker) picker.value = vars.accent;
            if (hex)    hex.value   = vars.accent;
        });
    });

    var colorPicker = document.getElementById('customAccentColor');
    var colorHex    = document.getElementById('customAccentHex');

    if (colorPicker) {
        colorPicker.addEventListener('input', function () {
            if (colorHex) colorHex.value = this.value;
        });
    }
    if (colorHex) {
        colorHex.addEventListener('input', function () {
            var val = this.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val) && colorPicker) colorPicker.value = val;
        });
    }

    var applyCustomThemeBtn = document.getElementById('applyCustomTheme');
    if (applyCustomThemeBtn) {
        applyCustomThemeBtn.addEventListener('click', function () {
            var color = colorPicker ? colorPicker.value : '#9b59b6';
            var accent2 = shadeColor(color, -15);
            document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.remove('active'); });
            document.querySelectorAll('.special-theme-card').forEach(function (c) { c.classList.remove('active'); });
            applyTheme({ accent: color, accent2: accent2 }, true, 'custom');
        });
    }

    function shadeColor(hex, percent) {
        var num = parseInt(hex.replace('#', ''), 16);
        var r   = Math.min(255, Math.max(0, (num >> 16) + percent * 2.55 | 0));
        var g   = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent * 2.55 | 0));
        var b   = Math.min(255, Math.max(0, (num & 0xff) + percent * 2.55 | 0));
        return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
    }

    function loadSavedTheme() {
        // Check special theme first
        if (loadSavedSpecialTheme()) return;
        
        var stored = localStorage.getItem(KEY_THEME);
        if (stored) {
            try {
                var data = JSON.parse(stored);
                applyTheme(data.vars, false, data.key);

                document.querySelectorAll('.theme-card').forEach(function (c) {
                    if (c.getAttribute('data-theme') === data.key) c.classList.add('active');
                });

                if (data.vars.accent) {
                    var picker = document.getElementById('customAccentColor');
                    var hex    = document.getElementById('customAccentHex');
                    if (picker) picker.value = data.vars.accent;
                    if (hex)    hex.value   = data.vars.accent;
                }
            } catch (e) { }
        } else {
            var defaultCard = document.querySelector('.theme-card[data-theme="purple"]');
            if (defaultCard) defaultCard.classList.add('active');
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PANIC BUTTON
    // ══════════════════════════════════════════════════════════════════

    var panicKeyDisplay = document.getElementById('panicKeyDisplay');
    var listening       = false;

    if (panicKeyDisplay) {
        panicKeyDisplay.addEventListener('focus', function () {
            listening = true;
            this.placeholder = 'Press any key now...';
            this.style.borderColor = '#e74c3c';
        });
        panicKeyDisplay.addEventListener('blur', function () {
            listening = false;
            this.placeholder = 'Click and press a key...';
            this.style.borderColor = '';
        });
        panicKeyDisplay.addEventListener('keydown', function (e) {
            if (!listening) return;
            e.preventDefault();
            var key = e.key;
            var display = key === ' ' ? 'Space' : key;
            this.value = display;
            this.blur();
        });
    }

    var clearPanicKeyBtn = document.getElementById('clearPanicKey');
    if (clearPanicKeyBtn) {
        clearPanicKeyBtn.addEventListener('click', function () {
            if (panicKeyDisplay) panicKeyDisplay.value = '';
        });
    }

    var selectedPanicUrl = '';
    document.querySelectorAll('.panic-preset-card').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('.panic-preset-card').forEach(function (c) { c.classList.remove('active'); });
            this.classList.add('active');
            selectedPanicUrl = this.getAttribute('data-url');
            var customInput = document.getElementById('customPanicUrl');
            if (customInput) customInput.value = '';
        });
    });

    var savePanicBtn = document.getElementById('savePanicSettings');
    if (savePanicBtn) {
        savePanicBtn.addEventListener('click', function () {
            var key = panicKeyDisplay ? panicKeyDisplay.value.trim() : '';
            var customUrl = document.getElementById('customPanicUrl');
            var url = (customUrl && customUrl.value.trim()) ? customUrl.value.trim() : selectedPanicUrl;

            if (!key) { alert('Please set a panic key first.'); return; }
            if (!url) { alert('Please choose or enter a redirect URL.'); return; }

            localStorage.setItem(KEY_PANIC_KEY, key);
            localStorage.setItem(KEY_PANIC_URL, url);
            updatePanicStatus();
            alert('Panic settings saved! Press ' + key + ' anywhere in the hub to trigger it.');
        });
    }

    function updatePanicStatus() {
        var key = localStorage.getItem(KEY_PANIC_KEY);
        var url = localStorage.getItem(KEY_PANIC_URL);
        var keyEl = document.getElementById('panicKeyStatus');
        var urlEl = document.getElementById('panicUrlStatus');
        if (keyEl) keyEl.textContent = key || 'Not set';
        if (urlEl) urlEl.textContent = url || 'Not set';
    }

    function loadSavedPanic() {
        var key = localStorage.getItem(KEY_PANIC_KEY);
        var url = localStorage.getItem(KEY_PANIC_URL);

        if (key && panicKeyDisplay) panicKeyDisplay.value = key;

        if (url) {
            selectedPanicUrl = url;
            document.querySelectorAll('.panic-preset-card').forEach(function (card) {
                if (card.getAttribute('data-url') === url) card.classList.add('active');
            });
            var matched = document.querySelector('.panic-preset-card.active');
            if (!matched) {
                var customInput = document.getElementById('customPanicUrl');
                if (customInput) customInput.value = url;
            }
        }
        updatePanicStatus();
    }

    // ── Init all ─────────────────────────────────────────────────────
    loadSavedCloak();
    loadSavedTheme();
    loadSavedPanic();
    initSpecialThemes();

})();

// ══════════════════════════════════════════════════════════════════════
// SHARED UTILITIES — loaded on every page
// ══════════════════════════════════════════════════════════════════════

(function applyPersistedSettings() {
    // Theme
    var savedTheme = localStorage.getItem('gh_theme');
    var savedSpecialTheme = localStorage.getItem('gh_special_theme');
    
    if (savedSpecialTheme) {
        const SPECIAL_THEMES = {
            miku: 'theme-miku',
            cyberpunk: 'theme-cyberpunk',
            darkmatter: 'theme-darkmatter'
        };
        const themeClass = SPECIAL_THEMES[savedSpecialTheme];
        if (themeClass) document.documentElement.classList.add(themeClass);
    } else if (savedTheme) {
        try {
            var data = JSON.parse(savedTheme);
            var root = document.documentElement;
            var v    = data.vars;
            if (v.accent)   root.style.setProperty('--accent',   v.accent);
            if (v.accent2)  root.style.setProperty('--accent2',  v.accent2);
            if (v.bg)       root.style.setProperty('--bg',       v.bg);
            if (v.surface)  root.style.setProperty('--surface',  v.surface);
            if (v.surface2) root.style.setProperty('--surface2', v.surface2);
            if (v.border)   root.style.setProperty('--border',   v.border);
        } catch (e) {}
    }

    // Tab cloak
    var savedCloak = localStorage.getItem('gh_cloak');
    if (savedCloak) {
        try {
            var cData = JSON.parse(savedCloak);
            if (cData.title) document.title = cData.title;
            if (cData.favicon) {
                var link = document.createElement('link');
                link.id  = 'gh-dynamic-favicon';
                link.rel = 'icon';
                if (cData.faviconType === 'emoji') {
                    var canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 64;
                    var ctx = canvas.getContext('2d');
                    ctx.font = '52px serif';
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(cData.favicon, 32, 36);
                    link.href = canvas.toDataURL('image/png');
                } else {
                    link.href = cData.favicon;
                }
                document.head.appendChild(link);
            }
        } catch (e) {}
    }

    // Panic key
    document.addEventListener('keydown', function (e) {
        var panicKey = localStorage.getItem('gh_panic_key');
        var panicUrl = localStorage.getItem('gh_panic_url');
        if (!panicKey || !panicUrl) return;
        if (e.key === panicKey) {
            window.location.replace(panicUrl);
        }
    });
})();