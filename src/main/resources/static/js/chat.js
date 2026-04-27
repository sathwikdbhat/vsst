// ============================================================
// VSST — chat.js  (Rebranded Version)
// ============================================================

var chatIsOpen      = false;
var isWaitingForBot = false;

var API_BASE_CHAT = window.API_BASE || window.location.origin;

// ----------------------------------------------------------------
// INIT — show welcome message + badge after 2.5s
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {

    // Ensure Enter key works
    var inputEl = document.getElementById('chatInput');
    if (inputEl) {
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    // Welcome message after 2.5s
    setTimeout(function () {
        addAIMessage(
            "👋 Hi! I'm VSST AI, your intelligent supply chain assistant.\n\n" +
            "I have real-time access to all shipments, anomalies, routes, and fleet data. " +
            "You can ask me anything in plain English — I understand natural language!"
        );

        // Show unread badge if chat is closed
        if (!chatIsOpen) {
            var badge = document.getElementById('chatUnreadBadge');
            if (badge) { badge.style.display = 'flex'; badge.textContent = '1'; }
        }
    }, 2500);
});

// ----------------------------------------------------------------
// TOGGLE CHAT PANEL
// ----------------------------------------------------------------
function toggleChat() {
    chatIsOpen = !chatIsOpen;
    var panel  = document.getElementById('chatPanel');
    var icon   = document.getElementById('chatBubbleIcon');
    var badge  = document.getElementById('chatUnreadBadge');

    if (chatIsOpen) {
        if (panel)  panel.style.display  = 'flex';
        if (icon)   icon.innerHTML = '✕';
        if (badge)  badge.style.display  = 'none';
        // Focus input after animation
        setTimeout(function () {
            var inp = document.getElementById('chatInput');
            if (inp) inp.focus();
        }, 200);
    } else {
        if (panel)  panel.style.display  = 'none';
        if (icon)   icon.innerHTML = '&#129302;';
    }
}

// ----------------------------------------------------------------
// SEND A TYPED MESSAGE
// ----------------------------------------------------------------
async function sendChatMessage() {
    if (isWaitingForBot) return;

    var inputEl = document.getElementById('chatInput');
    var sendBtn = document.getElementById('chatSendBtn');
    if (!inputEl) return;

    var message = inputEl.value.trim();
    if (!message) return;

    // Clear input immediately
    inputEl.value = '';

    // Disable send button while waiting
    isWaitingForBot = true;
    if (sendBtn) sendBtn.disabled = true;

    // Show user message
    addUserMessage(message);

    // Show typing
    var typingId = addTypingIndicator();

    try {
        var resp = await fetch(API_BASE_CHAT + '/api/chat/message', {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ message: message })
        });

        removeTypingIndicator(typingId);

        // Handle Rate Limit explicitly in the UI
        if (resp.status === 429) {
            addAIMessage("⚠️ I am receiving too many requests right now! Please wait a few seconds and try again.");
            return;
        }

        if (resp.status === 401) {
            addAIMessage("⚠️ Session expired. Please log in again.");
            return;
        }

        if (!resp.ok) {
            addAIMessage("⚠️ Server error (" + resp.status + "). Please try again.");
            return;
        }

        var data = await resp.json();

        if (data.error) {
            addAIMessage("⚠️ " + data.error);
        } else if (data.response) {
            addAIMessage(data.response);
        } else {
            addAIMessage("I received your message but couldn't generate a response. Please try again.");
        }

    } catch (error) {
        removeTypingIndicator(typingId);
        console.error('Chat API error:', error);

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            addAIMessage("⚠️ Cannot reach the server. Make sure Spring Boot is running.");
        } else {
            addAIMessage("⚠️ Connection error: " + error.message + ". Please check your connection.");
        }
    } finally {
        isWaitingForBot = false;
        if (sendBtn) sendBtn.disabled = false;
        // Re-focus input
        if (inputEl) inputEl.focus();
    }
}

// ----------------------------------------------------------------
// SEND A SUGGESTION CHIP (click-to-ask)
// ----------------------------------------------------------------
function sendSuggestion(text) {
    var inputEl = document.getElementById('chatInput');
    if (inputEl) inputEl.value = text;
    sendChatMessage();
}

// ----------------------------------------------------------------
// ADD MESSAGES TO UI
// ----------------------------------------------------------------
function addUserMessage(text) {
    var container = document.getElementById('chatMessages');
    if (!container) return;

    var div = document.createElement('div');
    div.className = 'chat-msg user';
    div.innerHTML =
        '<div class="chat-avatar">&#128100;</div>' +
        '<div class="chat-bubble">' + escapeHtml(text) + '</div>';
    container.appendChild(div);
    scrollToBottom();
}

function addAIMessage(text) {
    var container = document.getElementById('chatMessages');
    if (!container) return;

    var div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.innerHTML =
        '<div class="chat-avatar">&#129302;</div>' +
        '<div class="chat-bubble">' + formatResponse(text) + '</div>';
    container.appendChild(div);
    scrollToBottom();
}

function addTypingIndicator() {
    var container = document.getElementById('chatMessages');
    if (!container) return null;

    var id  = 'typing-' + Date.now();
    var div = document.createElement('div');
    div.className = 'chat-msg ai chat-typing';
    div.id        = id;
    div.innerHTML =
        '<div class="chat-avatar">&#129302;</div>' +
        '<div class="chat-bubble">' +
        '<div class="typing-dots">' +
        '<span></span><span></span><span></span>' +
        '</div>' +
        '</div>';
    container.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ----------------------------------------------------------------
// FORMAT AI RESPONSE (markdown-like rendering)
// ----------------------------------------------------------------
function formatResponse(text) {
    if (!text) return '';

    return escapeHtml(text)
        // Bold **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
        // Italic *text*
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Bullet points — convert "• " to proper bullets
        .replace(/^• /gm, '<span style="color:#4fc3f7">•</span> ')
        // Newlines to <br>
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text || '')));
    return div.innerHTML;
}

function scrollToBottom() {
    var container = document.getElementById('chatMessages');
    if (container) {
        setTimeout(function () {
            container.scrollTop = container.scrollHeight;
        }, 60);
    }
}