// ═══════════════════════════════════════════════════════════════════════
// GAME HUB — live-user-tracker.js
// Include on every page: <script src="live-user-tracker.js"></script>
// Requires Firebase SDK to be loaded first.
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Guard: Firebase must be loaded ──────────────────────────────────────
    if (typeof firebase === 'undefined') {
        console.error('[LiveTracker] Firebase SDK not found. Load it before live-user-tracker.js.');
        return;
    }

    // ── Firebase config ──────────────────────────────────────────────────────
    const firebaseConfig = {
        apiKey: "AIzaSyDhj564xAhZSR-3sxYcR8WFqVABt0PNCcs",
        authDomain: "github-whitelist.firebaseapp.com",
        projectId: "github-whitelist",
        storageBucket: "github-whitelist.firebasestorage.app",
        messagingSenderId: "552172120402",
        appId: "1:552172120402:web:ae23acc18163d3e1ef728b",
        measurementId: "G-R0CWMJ8B8E"
    };

    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    } catch (e) {
        // Already initialized — safe to ignore
    }

    const db = firebase.firestore();

    // ── Session ID (persists for browser tab) ────────────────────────────
    const SESSION_ID = sessionStorage.getItem('liveTrackerSessionId') || (function () {
        const id = 'sess_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now();
        sessionStorage.setItem('liveTrackerSessionId', id);
        return id;
    })();

    // ── Resolve current user ─────────────────────────────────────────────────
    function resolveUser() {
        const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (raw) {
            try { return JSON.parse(raw); } catch (e) { /* ignore */ }
        }
        return {
            username:    'anon_' + Math.random().toString(36).slice(2, 8),
            displayName: 'Anonymous'
        };
    }

    // ── Generate initials for avatar ───────────────────────────────────────
    function getInitials(name) {
        if (!name) return '?';
        return name.trim().split(/\s+/).map(function(w) { return w[0]; })
            .join('').toUpperCase().slice(0, 2);
    }

    // ── Get current activity based on page ───────────────────────────
    function getActivity() {
        const title = document.title || '';
        const path = window.location.pathname || '';
        
        // Check for specific games
        if (title.includes('Baldi') || path.includes('baldi-remaster')) return 'Playing Baldi\'s Basics Classic Remastered';
        if (title.includes('Getting Over It') || path.includes('getting-over-it')) return 'Playing Getting Over It';
        if (title.includes('Hollow Knight') || path.includes('hollow-knight')) return 'Playing Hollow Knight';
        if (title.includes('MinesweeperPlus') || path.includes('minesweeperplus')) return 'Playing MinesweeperPlus';
        if (title.includes('Pizza Tower') || path.includes('pizza-tower')) return 'Playing Pizza Tower';
        if (title.includes('SchoolBoy Runaway') || path.includes('schoolboy-runaway')) return 'Playing SchoolBoy Runaway';
        if (title.includes('Space Invaders') || path.includes('space-invaders')) return 'Playing Space Invaders';
        if (title.includes('Galaga') || path.includes('galaga')) return 'Playing Galaga';
        if (title.includes('Asteroids') || path.includes('asteroids')) return 'Playing Asteroids';
        if (title.includes('2048') || path.includes('2048')) return 'Playing 2048';
        if (title.includes('Sudoku') || path.includes('sudoku')) return 'Playing Sudoku';
        if (title.includes('Minesweeper') || path.includes('minesweeper')) return 'Playing Minesweeper';
        if (title.includes('Cookie Clicker') || path.includes('cookie-clicker')) return 'Playing Cookie Clicker';
        if (title.includes('Retro Bowl') || path.includes('retro-bowl')) return 'Playing Retro Bowl';
        if (title.includes('OVO') || path.includes('ovo')) return 'Playing OVO';
        if (title.includes('A Dance of Fire and Ice') || path.includes('adofai')) return 'Playing A Dance of Fire and Ice';
        
        // Check for specific pages
        if (title.includes('Game Suggestions') || path.includes('suggestions')) return 'Viewing Game Suggestions Forum';
        if (title.includes('Login') || path.includes('login')) return 'Logging in';
        if (title.includes('Game Hub') || path === '/' || path.includes('index')) return 'Browsing Game Hub';
        
        return 'Unknown Activity';
    }

    // ── Start presence tracking ───────────────────────────────────────
    function startPresence() {
        const user = resolveUser();
        const activity = getActivity();
        
        // Create or update presence document
        const presenceRef = db.collection('presence').doc(SESSION_ID);
        const presenceData = {
            user: user,
            activity: activity,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            sessionId: SESSION_ID
        };

        // Set presence with merge to avoid conflicts
        presenceRef.set(presenceData, { merge: true });

        // Set up real-time listener for this session
        presenceRef.onSnapshot(function(doc) {
            if (doc.exists) {
                console.log('[LiveTracker] Presence updated:', doc.data());
            }
        });

        // Clean up old presence documents (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        db.collection('presence').where('timestamp', '<', fiveMinutesAgo).get()
            .then(function(snapshot) {
                snapshot.forEach(function(doc) {
                    doc.ref.delete();
                });
            })
            .catch(function(error) {
                console.error('[LiveTracker] Error cleaning old presence:', error);
            });

        // Update presence every 30 seconds
        setInterval(function() {
            presenceRef.update({
                timestamp: new Date().toISOString(),
                activity: getActivity()
            });
        }, 30000);

        // Clean up on page unload
        window.addEventListener('beforeunload', function() {
            presenceRef.delete();
        });

        console.log('[LiveTracker] Initialized for:', user.username, '| Session:', SESSION_ID);
    }

    // ── Public API ───────────────────────────────────────────────────────
    window.LiveTracker = {
        getSessionId: function() { return SESSION_ID; },
        getCurrentUser: resolveUser,
        getActivity: getActivity
    };

    // Auto-start if not on login page
    if (!window.location.pathname.includes('login') && !window.location.pathname.includes('signup')) {
        startPresence();
    }

})();
