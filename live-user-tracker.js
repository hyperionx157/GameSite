// ═══════════════════════════════════════════════════════════════════════════
// DEV PORTAL — live-user-tracker.js
// Include on every page: <script src="live-user-tracker.js"></script>
// Requires Firebase SDK to be loaded first.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Guard: Firebase must be loaded ──────────────────────────────────────
    if (typeof firebase === 'undefined') {
        console.error('[LiveTracker] Firebase SDK not found. Load it before live-user-tracker.js.');
        return;
    }

    // ── Firebase Configuration ───────────────────────────────────────────────────────
    // Always reuse Firebase from Main.js - don't initialize independently
    let db;
    
    if (firebase.apps && firebase.apps.length > 0) {
        // Firebase already initialized in Main.js, just get the database
        db = firebase.firestore();
    } else {
        console.error('[LiveTracker] Firebase not initialized in Main.js');
        return;
    }

    // ── Session ID (persists for the browser tab) ────────────────────────────
    const SESSION_ID = sessionStorage.getItem('liveTrackerSessionId') || (function () {
        const id = 'sess_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now();
        sessionStorage.setItem('liveTrackerSessionId', id);
        return id;
    })();

    // ── Resolve current user ─────────────────────────────────────────────────
    function resolveUser() {
        const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (raw) {
            try { 
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.username || parsed.displayName)) {
                    return parsed;
                }
            } catch (e) { /* ignore */ }
        }
        // Always return a valid user object
        return {
            username:    'anon_' + Math.random().toString(36).slice(2, 8),
            displayName: 'Anonymous'
        };
    }

    let currentUser = resolveUser();

// Safety check - ensure currentUser is never undefined
if (!currentUser || !currentUser.username) {
    currentUser = {
        username:    'anon_' + Math.random().toString(36).slice(2, 8),
        displayName: 'Anonymous'
    };
}

    // Re-resolve whenever auth state changes (works with Firebase Auth)
    if (firebase.auth) {
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                currentUser = {
                    username:    user.email ? user.email.replace('@gamehub.local', '') : user.uid,
                    displayName: user.displayName || 'Unknown'
                };
            }
        });
    }

    // ── Page info ─────────────────────────────────────────────────────────────
    function getActivity() {
        const path  = window.location.pathname.toLowerCase();
        const title = document.title.toLowerCase();
        
        // Check for specific Cloudflare R2 games first (only games in your bucket)
        if (title.includes('baldi') && title.includes('plus')) return 'Playing Baldi\'s Basics Plus';
        if (title.includes('baldi') && title.includes('remaster')) return 'Playing Baldi\'s Basics Classic Remastered';
        if (title.includes('getting over it')) return 'Playing Getting Over It';
        if (title.includes('hollow knight')) return 'Playing Hollow Knight';
        if (title.includes('minesweeperplus')) return 'Playing MinesweeperPlus';
        if (title.includes('pizza tower')) return 'Playing Pizza Tower';
        if (title.includes('schoolboy runaway')) return 'Playing SchoolBoy Runaway';
        if (title.includes('pokemon emerald')) return 'Playing Pokemon Emerald';
        if (title.includes('need for speed')) return 'Playing Need for Speed';
        if (title.includes('call of duty')) return 'Playing Call of Duty';
        
        // Check for HTML5 games
        if (title.includes('getaway shootout')) return 'Playing Getaway Shootout';
        if (title.includes('space invaders')) return 'Playing Space Invaders';
        if (title.includes('galaga')) return 'Playing Galaga';
        if (title.includes('asteroids')) return 'Playing Asteroids';
        if (title.includes('2048')) return 'Playing 2048';
        if (title.includes('sudoku')) return 'Playing Sudoku';
        if (title.includes('minesweeper')) return 'Playing Minesweeper';
        if (title.includes('cookie clicker')) return 'Playing Cookie Clicker';
        if (title.includes('retro bowl')) return 'Playing Retro Bowl';
        if (title.includes('ovo')) return 'Playing OVO';
        if (title.includes('a dance of fire and ice')) return 'Playing A Dance of Fire and Ice';
        if (title.includes('eaglercraft')) return 'Playing Eaglercraft';
        
        // General categories
        if (path.includes('suggestions')) return 'Viewing Content Suggestions Forum';
        if (path.includes('profile') || title.includes('profile'))  return 'Viewing Profile';
        if (path.includes('admin')   || title.includes('admin'))    return 'Admin Panel';
        if (path.includes('login')   || title.includes('login'))    return 'Logging In';
        if (title.includes('dev portal') || path === '/' || path.includes('index') || path === '' || path.endsWith('/')) return 'Browsing Dev Portal';
        return 'Unknown Activity';
    }

    // ── Write presence to Firestore ───────────────────────────────────────────
    async function updatePresence() {
        try {
            await db.collection('liveUsers').doc(SESSION_ID).set({
                username:       currentUser.username    || 'anonymous',
                displayName:    currentUser.displayName || 'Anonymous',
                activity:       getActivity(),
                page:           document.title || 'Unknown',
                url:            window.location.href,
                sessionId:      SESSION_ID,
                lastSeen:       firebase.firestore.FieldValue.serverTimestamp(),
                userAgent:      navigator.userAgent,
                screenResolution: screen.width + 'x' + screen.height
            });
        } catch (e) {
            console.error('[LiveTracker] updatePresence error:', e);
        }
    }

    async function removePresence() {
        try {
            await db.collection('liveUsers').doc(SESSION_ID).delete();
        } catch (e) {
            console.error('[LiveTracker] removePresence error:', e);
        }
    }

    // ── Kick signal listener ─────────────────────────────────────────────────
    db.collection('kickSignals').doc(SESSION_ID).onSnapshot(function (doc) {
        if (!doc.exists || !doc.data().kicked) return;

        const reason = doc.data().reason || 'No reason provided.';
        console.warn('[LiveTracker] Kick signal received:', reason);

        clearInterval(updateInterval);
        removePresence();

        // Show kick overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.92)',
            'color:#fff', 'display:flex', 'flex-direction:column',
            'justify-content:center', 'align-items:center',
            'z-index:999999', 'font-family:Arial,sans-serif',
            'text-align:center', 'padding:2rem'
        ].join(';');
        overlay.innerHTML =
            '<h1 style="color:#e74c3c;font-size:2.5rem;margin-bottom:1rem;">🚫 Kicked</h1>' +
            '<p style="font-size:1.1rem;margin-bottom:0.5rem;">You have been removed by an administrator.</p>' +
            '<p style="color:#aaa;font-size:0.9rem;">Reason: ' + reason + '</p>' +
            '<p style="color:#888;font-size:0.85rem;margin-top:1.5rem;">Redirecting in 5 seconds…</p>';
        document.body.appendChild(overlay);

        setTimeout(function () { window.location.href = 'about:blank'; }, 5000);
    });

    // ── Visibility & unload handlers ─────────────────────────────────────────
    document.addEventListener('visibilitychange', function () {
        updatePresence(); // update on both hide and show
    });

    window.addEventListener('beforeunload', function () {
        clearInterval(updateInterval);
        removePresence();
    });

    window.addEventListener('pagehide', function () {
        clearInterval(updateInterval);
        removePresence();
    });

    // ── Start tracking ────────────────────────────────────────────────────────
    updatePresence();
    const updateInterval = setInterval(updatePresence, 30000);

    // ── Public API ────────────────────────────────────────────────────────────
    window.liveUserTracker = {
        update:         updatePresence,
        remove:         removePresence,
        getSessionId:   function () { return SESSION_ID; },
        getCurrentUser: function () { return currentUser; }
    };

    console.log('[LiveTracker] Initialized for:', currentUser.username, '| Session:', SESSION_ID);

})();
