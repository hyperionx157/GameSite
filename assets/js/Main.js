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
    'eaglercraft':       'games/html5/eaglercraft.html',
    'crazycattle3d':     'games/html5/crazycattle3d.html',
    'ucn':              'games/html5/UCN.html'
};

// ── Firebase db — assigned inside DOMContentLoaded ──────────────────
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

var db = firebase.firestore();

// ── Globals ─────────────────────────────────────────────────────────
var currentUserData = null;
var currentSection  = 'home';
var sideMenuOpen    = true;
var miniMenuOpen    = false;
var gameChatOpen    = false;
var currentItemKey = null;
var allMessages     = [];
var unreadChatCount = 0;
var lastReadTimestamp = null;
var userNotifications = [];
var unreadNotifications = 0;
var currentSessionId = null;
var sessionCheckInterval = null;

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

function fmtTime(timestamp) {
    let date;
    if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return 'recently';
    }
    if (isNaN(date.getTime())) return 'recently';
    const now = new Date();
    const m = Math.floor((now - date) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
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

// ── Session Management ────────────────────────────────────────────────
function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

async function registerSession(userId) {
    currentSessionId = generateSessionId();
    
    try {
        await db.collection('activeSessions').doc(userId).set({
            sessionId: currentSessionId,
            userId: userId,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent,
            ip: await getClientIP()
        });
        console.log('✅ Session registered:', currentSessionId);
    } catch(e) {
        console.error('Error registering session:', e);
    }
}

async function checkSessionValidity(userId) {
    try {
        const sessionDoc = await db.collection('activeSessions').doc(userId).get();
        
        if (!sessionDoc.exists) {
            console.log('No active session found, logging out');
            return false;
        }
        
        const session = sessionDoc.data();
        
        if (session.sessionId !== currentSessionId) {
            console.log('⚠️ Another session detected! Logging out...');
            showSessionConflictAlert();
            return false;
        }
        
        await db.collection('activeSessions').doc(userId).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch(e) {
        console.error('Error checking session:', e);
        return true;
    }
}

function showSessionConflictAlert() {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 10001;
        animation: slideDown 0.5s ease;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        font-family: inherit;
    `;
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Logged out!</strong>
        <p style="margin-top: 5px; font-size: 13px;">Your account was accessed from another device.</p>
        <button style="margin-top: 8px; padding: 5px 15px; background: white; color: #e74c3c; border: none; border-radius: 5px; cursor: pointer;">OK</button>
    `;
    
    document.body.appendChild(alertDiv);
    alertDiv.querySelector('button').onclick = () => {
        alertDiv.remove();
        firebase.auth().signOut();
    };
    
    setTimeout(() => {
        if (alertDiv) alertDiv.remove();
        firebase.auth().signOut();
    }, 5000);
}

async function endSession(userId) {
    if (userId && currentSessionId) {
        try {
            const sessionDoc = await db.collection('activeSessions').doc(userId).get();
            if (sessionDoc.exists && sessionDoc.data().sessionId === currentSessionId) {
                await db.collection('activeSessions').doc(userId).delete();
                console.log('✅ Session ended for:', userId);
            }
        } catch(e) {
            console.error('Error ending session:', e);
        }
    }
}

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch(e) {
        return 'unknown';
    }
}

function startSessionMonitoring(userId) {
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);
    
    sessionCheckInterval = setInterval(async () => {
        const user = firebase.auth().currentUser;
        if (!user) {
            clearInterval(sessionCheckInterval);
            return;
        }
        
        const isValid = await checkSessionValidity(userId);
        if (!isValid) {
            clearInterval(sessionCheckInterval);
            firebase.auth().signOut();
        }
    }, 30000);
}

// ── Chat Badge Functions ─────────────────────────────────────────────
function updateChatBadges() {
    const badge = document.getElementById('chatUnreadBadge');
    const miniBadge = document.getElementById('miniChatBadge');
    
    if (unreadChatCount > 0) {
        if (badge) {
            badge.textContent = unreadChatCount > 9 ? '9+' : unreadChatCount;
            badge.style.display = 'inline-block';
        }
        if (miniBadge) {
            miniBadge.textContent = unreadChatCount > 9 ? '9+' : unreadChatCount;
            miniBadge.style.display = 'inline-block';
        }
        const miniChatBtn = document.getElementById('miniChatBtn');
        if (miniChatBtn && !miniChatBtn.querySelector('.unread-badge')) {
            miniChatBtn.innerHTML = `<i class="fas fa-comments"></i> Open Chat <span class="unread-badge" style="background:#e74c3c; color:white; font-size:0.65rem; padding:2px 6px; border-radius:10px; margin-left:6px;">${unreadChatCount > 9 ? '9+' : unreadChatCount}</span>`;
        }
    } else {
        if (badge) badge.style.display = 'none';
        if (miniBadge) miniBadge.style.display = 'none';
        const miniChatBtn = document.getElementById('miniChatBtn');
        if (miniChatBtn) {
            miniChatBtn.innerHTML = `<i class="fas fa-comments"></i> Open Chat`;
        }
    }
}

function markChatAsRead() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    lastReadTimestamp = new Date();
    localStorage.setItem('lastReadChat_' + user.uid, lastReadTimestamp.toISOString());
    unreadChatCount = 0;
    updateChatBadges();
}

// ── Notification Functions ─────────────────────────────────────────────
function initNotifications() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const username = user.email ? user.email.replace('@gamehub.local', '') : user.uid;
    console.log('🔔 Initializing notifications for:', username);
    
    db.collection('notifications')
        .where('username', '==', username)
        .orderBy('createdAt', 'desc')
        .limitToLast(20)
        .onSnapshot(snapshot => {
            userNotifications = [];
            unreadNotifications = 0;
            
            snapshot.forEach(doc => {
                const notif = doc.data();
                notif.id = doc.id;
                userNotifications.push(notif);
                if (!notif.read) {
                    unreadNotifications++;
                }
            });
            
            console.log(`📬 ${unreadNotifications} unread notifications`);
            checkForNewApproval();
        });
}

function checkForNewApproval() {
    const approvalNotif = userNotifications.find(n => n.type === 'approval' && !n.read);
    if (approvalNotif) {
        console.log('🎉 Found new approval notification!');
        showApprovalPopup(approvalNotif);
        markNotificationRead(approvalNotif.id);
    }
}

function showApprovalPopup(notification) {
    const existing = document.getElementById('approvalPopup');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.id = 'approvalPopup';
    popup.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2ecc71, #27ae60);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.5s ease;
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        max-width: 350px;
    `;
    popup.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 24px;"></i>
        <div>
            <strong style="font-size: 16px;">${notification.title || 'Account Approved!'}</strong>
            <div style="font-size: 13px; margin-top: 4px;">${notification.message}</div>
            <div style="font-size: 11px; margin-top: 6px; color: rgba(255,255,255,0.9);">Click to log in</div>
        </div>
        <button style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px; font-size: 16px;">✕</button>
    `;
    
    if (!document.getElementById('notificationAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'notificationAnimStyle';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(popup);
    
    popup.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON') {
            window.location.reload();
        }
    };
    
    popup.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        popup.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => popup.remove(), 300);
    };
    
    setTimeout(() => {
        if (popup && popup.parentNode) {
            popup.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => popup.remove(), 300);
        }
    }, 8000);
}

async function markNotificationRead(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            read: true,
            readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Notification marked as read');
    } catch(e) {
        console.error('Error marking notification as read:', e);
    }
}

function listenForApprovalNotifications(username) {
    console.log('👂 Listening for approval notifications for:', username);
    
    if (window.notificationUnsubscribe) {
        window.notificationUnsubscribe();
    }
    
    const unsubscribe = db.collection('notifications')
        .where('username', '==', username)
        .where('type', '==', 'approval')
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const notif = doc.data();
                console.log('📨 Notification received:', notif);
                
                if (!notif.read) {
                    console.log('🎉 Approval notification received!');
                    
                    db.collection('notifications').doc(doc.id).update({ 
                        read: true,
                        readAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    sessionStorage.setItem('justApproved', 'true');
                    showApprovalPopup(notif);
                    
                    const pendingMsg = document.getElementById('pendingStatusMessage');
                    if (pendingMsg) {
                        pendingMsg.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                        pendingMsg.style.color = 'white';
                        pendingMsg.style.borderColor = '#2ecc71';
                        pendingMsg.innerHTML = `
                            <i class="fas fa-check-circle"></i>
                            <strong>Account Approved!</strong>
                            <p style="font-size: 12px; margin-top: 5px;">Your account has been approved! Click below to log in.</p>
                            <button id="refreshLoginBtn" style="margin-top: 8px; padding: 5px 12px; background: white; color: #27ae60; border: none; border-radius: 5px; cursor: pointer;">Log In Now</button>
                        `;
                        const refreshBtn = document.getElementById('refreshLoginBtn');
                        if (refreshBtn) {
                            refreshBtn.onclick = () => window.location.reload();
                        }
                    }
                    
                    alert('🎉 Your account has been approved! Click OK to log in.');
                    
                    setTimeout(() => window.location.reload(), 2000);
                }
            });
        }, error => {
            console.error('Error listening for notifications:', error);
        });
    
    window.notificationUnsubscribe = unsubscribe;
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
    if (name === 'chat') markChatAsRead();
    if (window.innerWidth <= 540) {
        var sm = document.getElementById('sideMenu');
        if (sm) sm.classList.remove('mobile-open');
    }
}
window.switchSection = switchSection;

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

function showMiniMenu() {
    var m = document.getElementById('gameMiniMenu');
    if (m) { 
        m.style.display = 'block'; 
        miniMenuOpen = true;
        updateChatBadges();
    }
}
function hideMiniMenu() {
    var m = document.getElementById('gameMiniMenu');
    if (m) { 
        m.style.display = 'none'; 
        miniMenuOpen = false; 
    }
}
function toggleMiniMenu() { miniMenuOpen ? hideMiniMenu() : showMiniMenu(); }

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

function showGameChat() {
    var gc = document.getElementById('gameChat');
    if (gc) { 
        gc.style.display = 'flex'; 
        gameChatOpen = true;
        markChatAsRead();
    }
    hideMiniMenu();
}
function hideGameChat() {
    var gc = document.getElementById('gameChat');
    if (gc) { 
        gc.style.display = 'none'; 
        gameChatOpen = false; 
    }
}

function initChat() {
    db.collection('chatMessages')
        .orderBy('timestamp', 'asc')
        .limitToLast(80)
        .onSnapshot(function(snapshot) {
            allMessages = [];
            snapshot.forEach(function(doc){ allMessages.push(doc.data()); });
            renderChatMessages();
            
            const user = firebase.auth().currentUser;
            if (user && lastReadTimestamp) {
                let unread = 0;
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    const msgTime = msg.timestamp?.toDate();
                    if (msg.authorId !== user.uid && msgTime && msgTime > lastReadTimestamp) {
                        unread++;
                    }
                });
                unreadChatCount = unread;
                updateChatBadges();
            }
        });
    
    db.collection('liveUsers').onSnapshot(function(snapshot) {
        var onlineCount = snapshot.size;
        var label = onlineCount + ' online';
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
    
    const chatSection = document.getElementById('sectionChat');
    const observer = new MutationObserver(() => {
        if (chatSection && chatSection.classList.contains('active-section')) {
            markChatAsRead();
        }
    });
    if (chatSection) observer.observe(chatSection, { attributes: true, attributeFilter: ['class'] });
    
    const gameChatPanel = document.getElementById('gameChat');
    if (gameChatPanel) {
        const chatObserver = new MutationObserver(() => {
            if (gameChatPanel.style.display === 'flex') {
                markChatAsRead();
            }
        });
        chatObserver.observe(gameChatPanel, { attributes: true, attributeFilter: ['style'] });
    }
}

function sendMessage(inputEl) {
    if (!inputEl) return;
    var text = inputEl.value.trim();
    if (!text) return;
    var user = firebase.auth().currentUser;
    var displayName = user ? (user.displayName || user.email || 'Anonymous') : 
                     ('User_' + Math.random().toString(36).slice(2, 8));
    var userId = user ? user.uid : ('anon_' + Math.random().toString(36).slice(2, 10));
    db.collection('chatMessages').add({
        text:      text,
        author:    displayName,
        authorId:  userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){ inputEl.value = ''; }).catch(function(err){ 
        console.error('[Chat] send error:', err);
        alert('Failed to send message. Please try again.');
    });
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
            createdAt:   firebase.firestore.FieldValue.serverTimestamp()
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
    } catch(e) { console.error(e); alert('Error updating vote.'); }
}
window.voteSuggestion = voteSuggestion;

function initGameGrid() {
    document.querySelectorAll('.item-btn').forEach(function(btn){
        btn.addEventListener('click', function(){ loadItem(this.getAttribute('data-game')); });
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
    firebase.auth().onAuthStateChanged(async function(user){
        if (user) {
            const username = user.email ? user.email.replace('@gamehub.local', '') : user.uid;
            console.log('🔐 Auth state changed - User:', username);
            
            if (sessionStorage.getItem('signupInProgress') === 'true') {
                console.log('⏳ Signup in progress, skipping approval check');
                return;
            }
            
            const saved = localStorage.getItem('lastReadChat_' + user.uid);
            lastReadTimestamp = saved ? new Date(saved) : new Date();
            
            setTimeout(async () => {
                try {
                    const doc = await db.collection('users').doc(username).get();
                    console.log('📄 User document check:', doc.exists ? 'Exists' : 'Not found');
                    
                    if (doc.exists && doc.data().allowed === true) {
                        console.log('✅ User is approved, granting access');
                        
                        // Check for existing sessions
                        const existingSession = await db.collection('activeSessions').doc(user.uid).get();
                        
                        if (existingSession.exists && existingSession.data().sessionId !== currentSessionId) {
                            console.log('⚠️ User already logged in elsewhere!');
                            alert('Your account is already logged in on another device. Please log out from there first.');
                            firebase.auth().signOut();
                            return;
                        }
                        
                        // Register new session
                        await registerSession(user.uid);
                        startSessionMonitoring(user.uid);
                        
                        currentUserData = { 
                            uid: user.uid, 
                            email: user.email, 
                            displayName: user.displayName || username,
                            username: username
                        };
                        localStorage.setItem('currentUser', JSON.stringify(currentUserData));
                        db.collection('users').doc(username).update({
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(() => {});
                        updateUserProfile(user);
                        showEl('mainApp');
                        hideEl('loginHub');
                        hideEl('loadingOverlay');
                        initChat();
                        initForum();
                        initGameGrid();
                        initNotifications();
                        switchSection('home');
                    } else {
                        console.log('⚠️ User not approved, checking pending status...');
                        
                        db.collection('pendingRequests').doc(username).get()
                            .then(function(pendingDoc) {
                                if (pendingDoc.exists) {
                                    console.log('⏳ User is pending approval');
                                    sessionStorage.setItem('userApprovalStatus', 'pending');
                                    
                                    if (!sessionStorage.getItem('pendingMessageShown')) {
                                        alert('Your account is pending approval. You will be notified here when approved.');
                                        sessionStorage.setItem('pendingMessageShown', 'true');
                                    }
                                    
                                    showEl('loginHub', 'flex');
                                    hideEl('mainApp');
                                    hideEl('loadingOverlay');
                                    
                                    const pendingMessage = document.getElementById('pendingStatusMessage');
                                    if (!pendingMessage) {
                                        const msgDiv = document.createElement('div');
                                        msgDiv.id = 'pendingStatusMessage';
                                        msgDiv.style.cssText = `
                                            background: rgba(155,89,182,0.2);
                                            border: 1px solid rgba(155,89,182,0.4);
                                            border-radius: 8px;
                                            padding: 12px;
                                            margin-top: 15px;
                                            text-align: center;
                                            color: #9b59b6;
                                        `;
                                        msgDiv.innerHTML = `
                                            <i class="fas fa-clock"></i>
                                            <strong>Account Pending Approval</strong>
                                            <p style="font-size: 12px; margin-top: 5px;">Your account is waiting for admin approval. You'll be notified here when approved.</p>
                                        `;
                                        const loginForm = document.getElementById('loginForm');
                                        if (loginForm) loginForm.appendChild(msgDiv);
                                    }
                                    
                                    listenForApprovalNotifications(username);
                                } else {
                                    console.log('❌ No pending request found for', username);
                                    firebase.auth().signOut();
                                    alert('Account not found. Please sign up first.');
                                    hideEl('loadingOverlay');
                                    showEl('loginHub', 'flex');
                                    hideEl('mainApp');
                                }
                            })
                            .catch(function(err) {
                                console.error('Error checking pending:', err);
                                firebase.auth().signOut();
                                hideEl('loadingOverlay');
                                showEl('loginHub', 'flex');
                                hideEl('mainApp');
                            });
                    }
                } catch(error) {
                    console.error('Auth error:', error);
                    firebase.auth().signOut();
                    alert('Authentication error. Please try again.');
                    hideEl('loadingOverlay');
                    showEl('loginHub', 'flex');
                    hideEl('mainApp');
                }
            }, 500);
        } else {
            console.log('🔐 No user logged in');
            if (currentUserData) {
                await endSession(currentUserData.uid);
            }
            currentUserData = null;
            localStorage.removeItem('currentUser');
            hideEl('mainApp');
            showEl('loginHub', 'flex');
            hideEl('loadingOverlay');
            const pendingMsg = document.getElementById('pendingStatusMessage');
            if (pendingMsg) pendingMsg.remove();
            sessionStorage.removeItem('pendingMessageShown');
            if (sessionCheckInterval) {
                clearInterval(sessionCheckInterval);
                sessionCheckInterval = null;
            }
        }
    });
}

// ── DOMContentLoaded ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
    db = firebase.firestore();
    
    var menuToggle = document.getElementById('menuToggleBtn');
    if (menuToggle) menuToggle.addEventListener('click', toggleSideMenu);
    
    document.querySelectorAll('.side-nav-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
            var section = this.getAttribute('data-section');
            if (section) switchSection(section);
        });
    });
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(){
            firebase.auth().signOut().then(returnToHub);
        });
    }
    
    var loginBtn      = document.getElementById('loginBtn');
    var emailInput    = document.getElementById('emailInput');
    var passwordInput = document.getElementById('passwordInput');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(){
            var raw  = emailInput    ? emailInput.value.trim() : '';
            var pass = passwordInput ? passwordInput.value     : '';
            if (!raw || !pass) { alert('Please enter your username and password.'); return; }
            var email = raw.includes('@') ? raw : raw + '@gamehub.local';
            firebase.auth().signInWithEmailAndPassword(email, pass)
                .catch(function(e){ 
                    if (e.code === 'auth/user-not-found') {
                        alert('Account not found. Please sign up first.');
                    } else if (e.code === 'auth/wrong-password') {
                        alert('Incorrect password. Please try again.');
                    } else {
                        alert('Login failed: ' + e.message);
                    }
                });
        });
        [emailInput, passwordInput].forEach(function(el){
            if (el) el.addEventListener('keypress', function(e){ if (e.key === 'Enter') loginBtn.click(); });
        });
    }
    
    var checkStatusBtn = document.getElementById('checkStatusBtn');
    if (checkStatusBtn) {
        checkStatusBtn.addEventListener('click', async function() {
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Please log in first to check your status.');
                return;
            }
            const username = user.email ? user.email.replace('@gamehub.local', '') : user.uid;
            sessionStorage.setItem('justCheckedStatus', 'true');
            
            try {
                const userDoc = await db.collection('users').doc(username).get();
                if (userDoc.exists && userDoc.data().allowed === true) {
                    console.log('✅ User is approved!');
                    alert('🎉 Your account has been approved! You can now log in.');
                    window.location.reload();
                } else {
                    const pendingDoc = await db.collection('pendingRequests').doc(username).get();
                    if (pendingDoc.exists) {
                        console.log('⏳ User is still pending');
                        alert('⏳ Your account is still pending approval. Please wait for an administrator to approve your account.');
                    } else {
                        console.log('❌ No account found');
                        alert('❌ Account not found. Please sign up first.');
                    }
                }
            } catch(e) {
                console.error('Error checking status:', e);
                alert('Error checking status. Please try again.');
            } finally {
                setTimeout(() => sessionStorage.removeItem('justCheckedStatus'), 1000);
            }
        });
    }
    
    var signupBtn      = document.getElementById('signupBtn');
    var signupRealName = document.getElementById('signupRealName');
    var signupName     = document.getElementById('signupName');
    var signupPassword = document.getElementById('signupPassword');
    var signupLink     = document.getElementById('signupLink');
    var backToLogin    = document.getElementById('backToLogin');
    
    if (signupBtn) {
        signupBtn.addEventListener('click', function(){
            var real = signupRealName ? signupRealName.value.trim() : '';
            var name = signupName ? signupName.value.trim() : '';
            var pass = signupPassword ? signupPassword.value : '';
            if (!name || !pass) { alert('Please fill in all fields.'); return; }
            if (pass.length < 6) { alert('Password must be at least 6 characters.'); return; }
            var email = name + '@gamehub.local';
            
            signupBtn.disabled = true;
            signupBtn.textContent = 'Creating Account...';
            
            console.log('📝 Starting signup for:', name);
            sessionStorage.setItem('signupInProgress', 'true');
            
            db.collection('users').doc(name).get()
                .then(function(userDoc) {
                    if (userDoc.exists) {
                        alert('Username already exists. Please choose another.');
                        signupBtn.disabled = false;
                        signupBtn.textContent = 'Create Account';
                        sessionStorage.removeItem('signupInProgress');
                        return null;
                    }
                    return db.collection('pendingRequests').doc(name).get();
                })
                .then(function(pendingDoc) {
                    if (pendingDoc && pendingDoc.exists) {
                        alert('This username is already pending approval.');
                        signupBtn.disabled = false;
                        signupBtn.textContent = 'Create Account';
                        sessionStorage.removeItem('signupInProgress');
                        return null;
                    }
                    return firebase.auth().createUserWithEmailAndPassword(email, pass);
                })
                .then(function(userCredential) {
                    if (!userCredential) return null;
                    const user = userCredential.user;
                    console.log('✅ Account created in Firebase Auth:', user.email);
                    
                    return user.updateProfile({ displayName: real || name })
                        .then(function() {
                            return db.collection('pendingRequests').doc(name).set({
                                username: name,
                                displayName: real || name,
                                realName: real,
                                uid: user.uid,
                                email: email,
                                requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                status: 'pending'
                            });
                        })
                        .then(function() {
                            console.log('✅ Added to pendingRequests');
                            sessionStorage.removeItem('signupInProgress');
                            alert('Account created! Your account is pending approval. You will be notified when approved.');
                            signupRealName.value = '';
                            signupName.value = '';
                            signupPassword.value = '';
                            showEl('loginForm', 'flex');
                            hideEl('signupForm');
                            signupBtn.disabled = false;
                            signupBtn.textContent = 'Create Account';
                        });
                })
                .catch(function(error) {
                    console.error('Signup error:', error);
                    let errorMessage = 'Signup failed: ';
                    switch(error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage += 'This username is already taken. Please choose another.';
                            break;
                        case 'auth/weak-password':
                            errorMessage += 'Password should be at least 6 characters.';
                            break;
                        default:
                            errorMessage += error.message;
                    }
                    alert(errorMessage);
                    signupBtn.disabled = false;
                    signupBtn.textContent = 'Create Account';
                    sessionStorage.removeItem('signupInProgress');
                });
        });
    }
    
    if (signupLink) signupLink.addEventListener('click', function(e){ e.preventDefault(); showEl('signupForm'); hideEl('loginForm'); });
    if (backToLogin) backToLogin.addEventListener('click', function(e){ e.preventDefault(); showEl('loginForm'); hideEl('signupForm'); });
    
    document.addEventListener('keydown', function(e){
        var overlay = document.getElementById('gameOverlay');
        if (!overlay || overlay.style.display === 'none') return;
        if (e.key === '-' || e.key === '_' || e.key === 'Minus') { 
            e.preventDefault(); 
            toggleMiniMenu(); 
        }
        if (e.key === 'Escape') { 
            hideMiniMenu(); 
            hideGameChat(); 
        }
    });
    
    var menuTab = document.getElementById('gameMenuTab');
    if (menuTab) menuTab.addEventListener('click', toggleMiniMenu);
    var miniReturn = document.getElementById('miniReturnBtn');
    if (miniReturn) miniReturn.addEventListener('click', returnToHub);
    var miniChat = document.getElementById('miniChatBtn');
    if (miniChat) miniChat.addEventListener('click', function(){ hideMiniMenu(); showGameChat(); });
    var gcClose = document.getElementById('gameChatClose');
    if (gcClose) gcClose.addEventListener('click', hideGameChat);
    
    // Session cleanup on page unload
    window.addEventListener('beforeunload', async () => {
        if (currentUserData) {
            await endSession(currentUserData.uid);
        }
    });
    
    showEl('loadingOverlay');
    initAuth();
});