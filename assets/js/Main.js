// ═══════════════════════════════════════════════════════════════════
// DEV PORTAL — Main.js
// ═══════════════════════════════════════════════════════════════════

// ── Config ─────────────────────────────────────────────────────────
const CLOUDFLARE_R2_BASE = 'https://assets.hyperionx15.com/';

const GAME_URLS = {
    'baldi-plus':        CLOUDFLARE_R2_BASE + 'baldi-plus/index.html',
    'baldi-remaster':    CLOUDFLARE_R2_BASE + 'baldi-remaster/index.html',
    'getting-over-it':   CLOUDFLARE_R2_BASE + 'getting-over-it/index.html',
    'hollow-knight':     CLOUDFLARE_R2_BASE + 'hollow-knight-main/index.html',
    'minesweeperplus':   CLOUDFLARE_R2_BASE + 'minesweeperplus/MinesweeperPlus.html',
    'pizza-tower':       CLOUDFLARE_R2_BASE + 'pizza-tower/index.html',
    'omori-fixed':       CLOUDFLARE_R2_BASE + 'omori-fixed/index.html',
    'ddlc-web':          CLOUDFLARE_R2_BASE + 'ddlc-web-main/index.html',
    'undertale-yellow':  CLOUDFLARE_R2_BASE + 'undertale-yellow/index.html',
    'schoolboy-runaway': CLOUDFLARE_R2_BASE + 'schoolboy-runaway/index.html',
    'pokemon-emerald':   'games/EmuGames/Pokemon - Emerald Version (U).html',
    'need-for-speed':    'games/EmuGames/Need for Speed - Most Wanted (USA, Europe) (En,Fr,De,It).html',
    'call-of-duty':      'games/EmuGames/Call of Duty - Modern Warfare 3 - Defiance (USA).html',
    'space-invaders':    'https://www.crazygames.com/embed/space-invaders',
    'galaga':            'https://www.retrogames.com/play-online/galaga.html',
    'asteroids':         'https://www.crazygames.com/embed/asteroids',
    '2048':              'https://www.crazygames.com/embed/2048',
    'sudoku':            'https://www.crazygames.com/embed/sudoku',
    'minesweeper':       'https://www.crazygames.com/embed/minesweeper',
    'cookie-clicker':    'games/html5/cookieclicker.html',
    'retro-bowl':        'games/html5/retrobowl.html',
    'ovo':               'games/html5/ovo.html',
    'adofai':            'games/html5/adofai.html',
    'getaway-shootout':  'games/html5/getaway-shootout.html',
    'eaglercraft':       'games/html5/eaglercraft.html'
};

// ── Firebase db — assigned inside DOMContentLoaded ──────────────────
// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyDhj564xAhZSR-3sxYcR8WFqVABt0PNCcs",
    authDomain: "github-whitelist.firebaseapp.com",
    projectId: "github-whitelist",
    storageBucket: "github-whitelist.firebasestorage.app",
    messagingSenderId: "552172120402",
    appId: "1:552172120402:web:ae23acc18163d3e1ef728b",
    measurementId: "G-R0CWMJ8B8E"
};

// Initialize Firebase
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error('[Main] Firebase initialization error:', e);
}

// live-user-tracker.js (loaded WITHOUT defer) already calls
// firebase.initializeApp(). Main.js loads WITH defer, so by
// DOMContentLoaded the SDK is ready. We just grab Firestore.
var db = firebase.firestore();

// ── Globals ─────────────────────────────────────────────────────────
var currentUserData = null;
var currentSection  = 'home';
var sideMenuOpen    = true;
var miniMenuOpen    = false;
var gameChatOpen    = false;
var currentItemKey = null;
var allMessages     = [];

// ── Helpers ─────────────────────────────────────────────────────────
function getInitials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(function(w){ return w[0]; })
        .join('').toUpperCase().slice(0, 2);
}
function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
function fmtTime(dateStr) {
    var d = new Date(dateStr), now = new Date();
    var m = Math.floor((now - d) / 60000);
    if (m < 1)    return 'just now';
    if (m < 60)   return m + 'm ago';
    if (m < 1440) return Math.floor(m / 60) + 'h ago';
    return Math.floor(m / 1440) + 'd ago';
}
function titleCase(str) {
    return str.replace(/-/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}
function showEl(id, display) {
    var e = document.getElementById(id);
    if (e) e.style.display = display || 'block';
}
function hideEl(id) {
    var e = document.getElementById(id);
    if (e) e.style.display = 'none';
}

// ── Section switching ────────────────────────────────────────────────
function switchSection(name) {
    currentSection = name;

    document.querySelectorAll('.side-nav-btn').forEach(function(btn){
        btn.classList.toggle('active', btn.getAttribute('data-section') === name);
    });
    document.querySelectorAll('.content-section').forEach(function(s){
        s.classList.remove('active-section');
    });

    var map = { home:'sectionHome', library:'sectionLibrary', tools:'sectionTools', forum:'sectionForum', chat:'sectionChat' };
    var target = document.getElementById(map[name]);
    if (target) target.classList.add('active-section');

    var titles = { home:'Home', library:'Library', tools:'Tools', forum:'Feedback', chat:'Live Chat' };
    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[name] || name;

    if (name === 'forum') loadSuggestions();

    if (window.innerWidth <= 540) {
        var sm = document.getElementById('sideMenu');
        if (sm) sm.classList.remove('mobile-open');
    }
}
window.switchSection = switchSection;

// ── Side menu toggle ─────────────────────────────────────────────────
function toggleSideMenu() {
    var sm = document.getElementById('sideMenu');
    var mc = document.getElementById('mainContent');
    if (!sm) return;
    if (window.innerWidth <= 540) {
        sm.classList.toggle('mobile-open');
        return;
    }
    sideMenuOpen = !sideMenuOpen;
    sm.classList.toggle('hidden', !sideMenuOpen);
    if (mc) mc.classList.toggle('full-width', !sideMenuOpen);
}

// ── Game loading — fullscreen overlay ───────────────────────────────
function loadItem(itemKey) {
    var url = GAME_URLS[itemKey];
    if (!url) { alert('Game not found!'); return; }

    currentItemKey = itemKey;

    var frame   = document.getElementById('itemFrame');
    var overlay = document.getElementById('gameOverlay');
    var titleEl = document.getElementById('miniMenuItemTitle');
    if (!frame || !overlay) return;

    frame.src = url;
    if (titleEl) titleEl.textContent = '▶ ' + titleCase(itemKey);

    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    hideMiniMenu();
    hideGameChat();
    document.title = titleCase(itemKey) + ' — Dev Portal';
}

// ── Mini menu ────────────────────────────────────────────────────────
function showMiniMenu() {
    var m = document.getElementById('gameMiniMenu');
    if (m) { m.style.display = 'block'; miniMenuOpen = true; }
}
function hideMiniMenu() {
    var m = document.getElementById('gameMiniMenu');
    if (m) { m.style.display = 'none'; miniMenuOpen = false; }
}
function toggleMiniMenu() { miniMenuOpen ? hideMiniMenu() : showMiniMenu(); }

// ── Return to hub ────────────────────────────────────────────────────
function returnToHub() {
    var overlay = document.getElementById('gameOverlay');
    var frame   = document.getElementById('itemFrame');
    if (overlay) overlay.style.display = 'none';
    if (frame)   frame.src = '';
    document.body.style.overflow = '';
    document.title = 'Dev Portal';
    hideMiniMenu();
    hideGameChat();
    currentItemKey = null;
}

// ── In-game chat ─────────────────────────────────────────────────────
function showGameChat() {
    var gc = document.getElementById('gameChat');
    if (gc) { gc.style.display = 'flex'; gameChatOpen = true; }
    hideMiniMenu();
}
function hideGameChat() {
    var gc = document.getElementById('gameChat');
    if (gc) { gc.style.display = 'none'; gameChatOpen = false; }
}

// ── Chat system ──────────────────────────────────────────────────────
function initChat() {
    db.collection('chatMessages')
        .orderBy('timestamp', 'asc')
        .limitToLast(80)
        .onSnapshot(function(snapshot) {
            allMessages = [];
            snapshot.forEach(function(doc){ allMessages.push(doc.data()); });
            renderChatMessages();
        });

    db.collection('presence').onSnapshot(function(snapshot) {
        var label = snapshot.size + ' online';
        var c1 = document.getElementById('chatOnlineCount');
        var c2 = document.getElementById('gameChatOnline');
        if (c1) c1.textContent = label;
        if (c2) c2.textContent = label;
    });

    var sendBtn = document.getElementById('chatSendBtn');
    var input   = document.getElementById('chatInput');
    if (sendBtn) sendBtn.addEventListener('click', function(){ sendMessage(input); });
    if (input)   input.addEventListener('keypress', function(e){ if (e.key === 'Enter') sendMessage(input); });

    var gSend  = document.getElementById('gameChatSend');
    var gInput = document.getElementById('gameChatInput');
    if (gSend)  gSend.addEventListener('click', function(){ sendMessage(gInput); });
    if (gInput) gInput.addEventListener('keypress', function(e){ if (e.key === 'Enter') sendMessage(gInput); });
}

function sendMessage(inputEl) {
    if (!inputEl) return;
    var text = inputEl.value.trim();
    if (!text) return;
    var user = firebase.auth().currentUser;
    
    // Allow anonymous users to chat with random username
    var displayName = user ? (user.displayName || user.email || 'Anonymous') : 
                     ('User_' + Math.random().toString(36).slice(2, 8));
    var userId = user ? user.uid : ('anon_' + Math.random().toString(36).slice(2, 10));
    
    db.collection('chatMessages').add({
        text:      text,
        author:    displayName,
        authorId:  userId,
        timestamp: new Date().toISOString()
    }).then(function(){ inputEl.value = ''; })
      .catch(function(err){ console.error('[Chat] send error:', err); });
}

function renderChatMessages() {
    var user  = firebase.auth().currentUser;
    var myUid = user ? user.uid : null;

    ['chatMessages', 'gameChatMessages'].forEach(function(id){
        var c = document.getElementById(id);
        if (!c) return;
        if (allMessages.length === 0) {
            c.innerHTML = '<div class="chat-empty">No messages yet. Say something! 👋</div>';
            return;
        }
        c.innerHTML = allMessages.map(function(msg){
            var isMe = msg.authorId === myUid;
            var bg   = isMe ? 'linear-gradient(135deg,#9b59b6,#3498db)' : 'rgba(42,42,74,0.9)';
            return '<div class="chat-msg ' + (isMe ? 'chat-msg-me' : '') + '">' +
                '<div class="chat-avatar-small" style="background:' + bg + '">' + getInitials(msg.author) + '</div>' +
                '<div class="chat-content-other">' +
                    (isMe ? '' : '<div class="chat-author">' + escHtml(msg.author) + '</div>') +
                    '<div class="chat-bubble chat-bubble-' + (isMe ? 'me' : 'other') + '">' +
                        '<span class="chat-text">' + escHtml(msg.text) + '</span>' +
                        '<span class="chat-ts">' + fmtTime(msg.timestamp) + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');
        c.scrollTop = c.scrollHeight;
    });
}

// ── Forum ────────────────────────────────────────────────────────────
function initForum() {
    var newBtn    = document.getElementById('newSuggestionBtn');
    var cancelBtn = document.getElementById('cancelSuggestionBtn');
    var submitBtn = document.getElementById('submitSuggestionBtn');
    if (newBtn)    newBtn.addEventListener('click',    function(){ showEl('suggestionForm'); });
    if (cancelBtn) cancelBtn.addEventListener('click', function(){ hideEl('suggestionForm'); });
    if (submitBtn) submitBtn.addEventListener('click', submitSuggestion);
}

async function submitSuggestion() {
    var titleEl = document.getElementById('gameTitle');
    var descEl  = document.getElementById('gameDescription');
    var genreEl = document.getElementById('gameGenre');
    var platEl  = document.getElementById('gamePlatform');
    var user    = firebase.auth().currentUser;
    if (!titleEl.value.trim() || !descEl.value.trim()) { alert('Please fill in the required fields.'); return; }
    if (!user) { alert('You must be logged in to submit.'); return; }
    try {
        await db.collection('contentSuggestions').add({
            title:       titleEl.value.trim(),
            description: descEl.value.trim(),
            genre:       genreEl ? genreEl.value : '',
            platform:    platEl  ? platEl.value.trim() : '',
            author:      currentUserData ? currentUserData.displayName : 'Unknown',
            authorId:    user.uid,
            votes:       0,
            votedBy:     [],
            createdAt:   new Date().toISOString()
        });
        alert('Suggestion submitted!');
        hideEl('suggestionForm');
        titleEl.value = ''; descEl.value = '';
        loadSuggestions();
    } catch(e) { console.error(e); alert('Error submitting suggestion.'); }
}

async function loadSuggestions() {
    showEl('forumLoading'); hideEl('emptySuggestions');
    var sl = document.getElementById('suggestionsList');
    if (sl) sl.innerHTML = '';
    try {
        var snap = await db.collection('contentSuggestions').orderBy('votes', 'desc').get();
        var list = [];
        snap.forEach(function(doc){ list.push(Object.assign({ id: doc.id }, doc.data())); });
        hideEl('forumLoading');
        if (list.length === 0) { showEl('emptySuggestions'); return; }
        renderSuggestions(list);
    } catch(e) { console.error(e); hideEl('forumLoading'); }
}

function renderSuggestions(list) {
    var sl = document.getElementById('suggestionsList');
    if (!sl) return;
    var user  = firebase.auth().currentUser;
    var myUid = user ? user.uid : null;
    sl.innerHTML = list.map(function(s){
        var voted = s.votedBy && myUid && s.votedBy.includes(myUid);
        return '<div class="suggestion-card">' +
            '<div class="suggestion-header"><div>' +
                '<div class="suggestion-title">' + escHtml(s.title) + '</div>' +
                '<div class="suggestion-meta">by ' + escHtml(s.author) + ' • ' + fmtTime(s.createdAt) + (s.genre ? ' • ' + escHtml(s.genre) : '') + '</div>' +
            '</div></div>' +
            '<div class="suggestion-body">' + escHtml(s.description) + '</div>' +
            '<div class="suggestion-actions">' +
                '<button class="vote-btn ' + (voted ? 'voted' : '') + '" onclick="voteSuggestion(\'' + s.id + '\',' + (s.votes || 0) + ',' + (voted ? 'true' : 'false') + ')">' +
                    '<i class="fas fa-thumbs-up"></i> ' + (s.votes || 0) + ' Votes' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

async function voteSuggestion(id, currentVotes, hasVoted) {
    var user = firebase.auth().currentUser;
    if (!user) { alert('You must be logged in to vote.'); return; }
    try {
        var ref = db.collection('contentSuggestions').doc(id);
        if (hasVoted) {
            await ref.update({ votes: Math.max(0, currentVotes - 1), votedBy: firebase.firestore.FieldValue.arrayRemove(user.uid) });
        } else {
            await ref.update({ votes: currentVotes + 1, votedBy: firebase.firestore.FieldValue.arrayUnion(user.uid) });
        }
        loadSuggestions();
    } catch(e) { alert('Error updating vote.'); }
}
window.voteSuggestion = voteSuggestion;

// ── Game grid ────────────────────────────────────────────────────────
function initGameGrid() {
    document.querySelectorAll('.item-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
            loadItem(this.getAttribute('data-game'));
        });
    });
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(){
            var term = this.value.toLowerCase().trim();
            document.querySelectorAll('.item-btn').forEach(function(btn){
                btn.style.display = btn.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }
}

// ── User profile ─────────────────────────────────────────────────────
function updateUserProfile(user) {
    var name  = user.displayName || user.email || 'Player';
    var email = user.email || '';
    var av = document.getElementById('sideAvatarInitials');
    var un = document.getElementById('sideUserName');
    var ur = document.getElementById('sideUserReal');
    if (av) { av.textContent = getInitials(name); av.style.background = 'linear-gradient(135deg,#9b59b6,#3498db)'; }
    if (un) un.textContent = name;
    if (ur) ur.textContent = email;
}

// ── Auth ─────────────────────────────────────────────────────────────
function initAuth() {
    firebase.auth().onAuthStateChanged(function(user){
        if (user) {
            currentUserData = { uid: user.uid, email: user.email, displayName: user.displayName || user.email };
            localStorage.setItem('currentUser', JSON.stringify(currentUserData));
            updateUserProfile(user);
            showEl('mainApp');
            hideEl('loginHub');
            hideEl('loadingOverlay');
            initChat();
            initForum();
            initGameGrid();
            switchSection('home');
        } else {
            currentUserData = null;
            localStorage.removeItem('currentUser');
            hideEl('mainApp');
            showEl('loginHub', 'flex');
            hideEl('loadingOverlay');
        }
    });
}

// ── DOMContentLoaded ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){

    // Firebase is initialized above, just get the Firestore reference
    db = firebase.firestore();

    // Side menu toggle
    var menuToggle = document.getElementById('menuToggleBtn');
    if (menuToggle) menuToggle.addEventListener('click', toggleSideMenu);

    // Nav buttons
    document.querySelectorAll('.side-nav-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
            var section = this.getAttribute('data-section');
            if (section) switchSection(section);
        });
    });

    // Logout
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(){
            firebase.auth().signOut().then(returnToHub);
        });
    }

    // Login
    // Accounts are stored as username@gamehub.local in Firebase.
    // If the user types a plain username (no @), we append that domain.
    var loginBtn      = document.getElementById('loginBtn');
    var emailInput    = document.getElementById('emailInput');
    var passwordInput = document.getElementById('passwordInput');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(){
            var raw  = emailInput    ? emailInput.value.trim() : '';
            var pass = passwordInput ? passwordInput.value     : '';
            if (!raw || !pass) { alert('Please enter your username and password.'); return; }
            // If it looks like a plain username (no @), append the domain used at signup
            var email = raw.includes('@') ? raw : raw + '@gamehub.local';
            firebase.auth().signInWithEmailAndPassword(email, pass)
                .catch(function(e){ alert('Login failed: ' + e.message); });
        });
        [emailInput, passwordInput].forEach(function(el){
            if (el) el.addEventListener('keypress', function(e){ if (e.key === 'Enter') loginBtn.click(); });
        });
    }

    // Signup
    // Use @gamehub.local to stay consistent with all existing accounts.
    var signupBtn      = document.getElementById('signupBtn');
    var signupRealName = document.getElementById('signupRealName');
    var signupName     = document.getElementById('signupName');
    var signupPassword = document.getElementById('signupPassword');
    if (signupBtn) {
        signupBtn.addEventListener('click', function(){
            var real = signupRealName ? signupRealName.value.trim() : '';
            var name = signupName     ? signupName.value.trim()     : '';
            var pass = signupPassword ? signupPassword.value        : '';
            if (!name || !pass) { alert('Please fill in all fields.'); return; }
            var email = name + '@gamehub.local';
            firebase.auth().createUserWithEmailAndPassword(email, pass)
                .then(function(cred){ return cred.user.updateProfile({ displayName: real || name }); })
                .then(function(){ alert('Account created! You are now logged in.'); })
                .catch(function(e){ alert('Signup failed: ' + e.message); });
        });
    }

    // Form switchers
    var signupLink  = document.getElementById('signupLink');
    var backToLogin = document.getElementById('backToLogin');
    if (signupLink)  signupLink.addEventListener('click',  function(e){ e.preventDefault(); showEl('signupForm'); hideEl('loginForm'); });
    if (backToLogin) backToLogin.addEventListener('click', function(e){ e.preventDefault(); showEl('loginForm'); hideEl('signupForm'); });

    // Minus key / Escape in game overlay
    document.addEventListener('keydown', function(e){
        var overlay = document.getElementById('gameOverlay');
        if (!overlay || overlay.style.display === 'none') return;
        if (e.key === '-' || e.key === '_') { e.preventDefault(); toggleMiniMenu(); }
        if (e.key === 'Escape') { hideMiniMenu(); hideGameChat(); }
    });

    // Overlay tab
    var menuTab = document.getElementById('gameMenuTab');
    if (menuTab) menuTab.addEventListener('click', toggleMiniMenu);

    // Mini menu buttons
    var miniReturn = document.getElementById('miniReturnBtn');
    if (miniReturn) miniReturn.addEventListener('click', returnToHub);

    var miniChat = document.getElementById('miniChatBtn');
    if (miniChat) miniChat.addEventListener('click', function(){ hideMiniMenu(); showGameChat(); });

    // In-game chat close
    var gcClose = document.getElementById('gameChatClose');
    if (gcClose) gcClose.addEventListener('click', hideGameChat);

    // Show loading until auth resolves
    showEl('loadingOverlay');
    initAuth();
});
