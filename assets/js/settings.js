// ═══════════════════════════════════════════════════════════════════
// DEV PORTAL — settings.js
// Handles: Tab Cloaking, Color Theme, Panic Button
// ═══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Storage keys ────────────────────────────────────────────────
    var KEY_CLOAK       = 'gh_cloak';
    var KEY_THEME       = 'gh_theme';
    var KEY_PANIC_KEY   = 'gh_panic_key';
    var KEY_PANIC_URL   = 'gh_panic_url';

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

    // Apply a cloak: changes title + favicon in the current tab
    function applyCloak(title, faviconSrc, faviconType, save) {
        if (title) document.title = title;

        // Remove existing dynamic favicon
        var existing = document.getElementById('gh-dynamic-favicon');
        if (existing) existing.remove();

        if (faviconSrc) {
            var link = document.createElement('link');
            link.id   = 'gh-dynamic-favicon';
            link.rel  = 'icon';

            if (faviconType === 'emoji') {
                // Draw emoji onto a canvas and use as data URL
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
        // Restore to Dev Portal defaults
        document.title = 'Settings — Dev Portal';
        var existing = document.getElementById('gh-dynamic-favicon');
        if (existing) existing.remove();
        // Add back the default emoji favicon
        applyCloak('Settings — Dev Portal', '📁', 'emoji', false);
        updateCloakStatus(null);
        document.querySelectorAll('.cloak-card').forEach(function (c) {
            c.classList.remove('active');
        });
        // Mark default active
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

    // Preset cloak cards
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

    // Custom cloak
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

    // Remove cloak button
    var removeCloakBtn = document.getElementById('removeCloakBtn');
    if (removeCloakBtn) removeCloakBtn.addEventListener('click', removeCloak);

    // ── Load saved cloak ─────────────────────────────────────────────
    function loadSavedCloak() {
        var stored = localStorage.getItem(KEY_CLOAK);
        if (stored) {
            try {
                var data = JSON.parse(stored);
                applyCloak(data.title, data.favicon, data.faviconType, false);
                // Highlight matching preset card
                document.querySelectorAll('.cloak-card').forEach(function (c) {
                    if (c.getAttribute('data-title') === data.title) c.classList.add('active');
                });
                updateCloakStatus(data.title);
            } catch (e) { /* ignore bad data */ }
        } else {
            // Default: mark Dev Portal card active
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
        }
    }

    // Preset theme cards
    document.querySelectorAll('.theme-card').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.remove('active'); });
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

            // Sync color picker
            var picker = document.getElementById('customAccentColor');
            var hex    = document.getElementById('customAccentHex');
            if (picker) picker.value = vars.accent;
            if (hex)    hex.value   = vars.accent;
        });
    });

    // Custom color picker
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
            // Darken by ~15% for accent2
            var accent2 = shadeColor(color, -15);
            document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.remove('active'); });
            applyTheme({ accent: color, accent2: accent2 }, true, 'custom');
        });
    }

    // Darken/lighten a hex color
    function shadeColor(hex, percent) {
        var num = parseInt(hex.replace('#', ''), 16);
        var r   = Math.min(255, Math.max(0, (num >> 16) + percent * 2.55 | 0));
        var g   = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent * 2.55 | 0));
        var b   = Math.min(255, Math.max(0, (num & 0xff) + percent * 2.55 | 0));
        return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
    }

    // ── Load saved theme ─────────────────────────────────────────────
    function loadSavedTheme() {
        var stored = localStorage.getItem(KEY_THEME);
        if (stored) {
            try {
                var data = JSON.parse(stored);
                applyTheme(data.vars, false, data.key);

                // Highlight the matching card
                document.querySelectorAll('.theme-card').forEach(function (c) {
                    if (c.getAttribute('data-theme') === data.key) c.classList.add('active');
                });

                // Sync picker
                if (data.vars.accent) {
                    var picker = document.getElementById('customAccentColor');
                    var hex    = document.getElementById('customAccentHex');
                    if (picker) picker.value = data.vars.accent;
                    if (hex)    hex.value   = data.vars.accent;
                }
            } catch (e) { /* ignore */ }
        } else {
            // Default purple active
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
            // Prettify display
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

    // Preset panic destination cards
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

    // Save panic settings
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

    // ── Load saved panic settings ────────────────────────────────────
    function loadSavedPanic() {
        var key = localStorage.getItem(KEY_PANIC_KEY);
        var url = localStorage.getItem(KEY_PANIC_URL);

        if (key && panicKeyDisplay) panicKeyDisplay.value = key;

        if (url) {
            selectedPanicUrl = url;
            // Highlight matching preset
            document.querySelectorAll('.panic-preset-card').forEach(function (card) {
                if (card.getAttribute('data-url') === url) card.classList.add('active');
            });
            // If no preset matches, put in custom field
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

})();


// ══════════════════════════════════════════════════════════════════════
// SHARED UTILITIES — loaded on every page (index.html + settings.html)
// Theme and panic key must apply on ALL pages, not just settings.html
// ══════════════════════════════════════════════════════════════════════

// Apply saved theme vars on page load (runs on index.html too via shared import)
(function applyPersistedSettings() {
    // Theme
    var savedTheme = localStorage.getItem('gh_theme');
    if (savedTheme) {
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

    // Panic key — listen on this page
    document.addEventListener('keydown', function (e) {
        var panicKey = localStorage.getItem('gh_panic_key');
        var panicUrl = localStorage.getItem('gh_panic_url');
        if (!panicKey || !panicUrl) return;
        if (e.key === panicKey) {
            window.location.replace(panicUrl);
        }
    });
})();
