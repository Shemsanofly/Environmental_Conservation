/**
 * Environmental Chatbot Widget
 * Floating chat interface for user questions about environmental issues
 */

class EnvironmentalChatbot {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.messages = [];
        this.pendingAttachments = [];
        this.isRecording = false;
        this.speechRecognition = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.gifResults = [];
        this.emojiLibraryPromise = null;
        this.init();
    }

    init() {
        this.createWidgetHTML();
        this.loadEmojiPickerLibrary();
        this.attachEventListeners();
        this.scrollToBottom();
    }

    createWidgetHTML() {
        // Create button
        const button = document.createElement('button');
        button.className = 'chat-widget-button';
        button.id = 'chatWidgetButton';
        button.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
        button.setAttribute('title', 'Chat with our environmental assistant');

        // Create container
        const container = document.createElement('div');
        container.className = 'chat-widget-container';
        container.id = 'chatWidgetContainer';
        container.innerHTML = `
            <div class="chat-header">
                <h3>🌍 Environmental Assistant</h3>
                <p>Ask me about conservation, sustainability, and environmental issues</p>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-area">
                <div class="chat-attachment-preview" id="chatAttachmentPreview"></div>
                <textarea 
                    class="chat-input-field" 
                    id="chatInput" 
                    placeholder="Ask a question about environmental issues..."
                    rows="1"
                ></textarea>
                <div class="chat-tools-row">
                    <button class="chat-tool-btn" id="chatAttachBtn" title="Attach files">📎</button>
                    <button class="chat-tool-btn" id="chatEmojiBtn" title="Insert emoji">☺</button>
                    <button class="chat-tool-btn chat-gif-btn" id="chatGifBtn" title="Search GIFs">GIF</button>
                    <button class="chat-tool-btn" id="chatVoiceBtn" title="Record voice">🎤</button>
                    <button class="chat-send-btn" id="chatSendBtn" title="Send">Send</button>
                </div>
                <div class="chat-popover chat-emoji-popover" id="chatEmojiPopover"></div>
                <div class="chat-popover chat-gif-popover" id="chatGifPopover">
                    <div class="chat-gif-search-row">
                        <input id="chatGifSearchInput" class="chat-gif-search-input" type="text" placeholder="Search GIFs...">
                        <button id="chatGifSearchBtn" class="chat-gif-search-btn" type="button">Go</button>
                    </div>
                    <div id="chatGifGrid" class="chat-gif-grid"></div>
                </div>
                <input id="chatFileInput" type="file" multiple accept="image/*,audio/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,application/pdf,text/plain,text/markdown,text/csv,application/json" hidden>
            </div>
        `;

        document.body.appendChild(button);
        document.body.appendChild(container);
    }

    attachEventListeners() {
        const button = document.getElementById('chatWidgetButton');
        const sendBtn = document.getElementById('chatSendBtn');
        const input = document.getElementById('chatInput');
        const attachBtn = document.getElementById('chatAttachBtn');
        const emojiBtn = document.getElementById('chatEmojiBtn');
        const gifBtn = document.getElementById('chatGifBtn');
        const voiceBtn = document.getElementById('chatVoiceBtn');
        const fileInput = document.getElementById('chatFileInput');
        const gifSearchInput = document.getElementById('chatGifSearchInput');
        const gifSearchBtn = document.getElementById('chatGifSearchBtn');

        button.addEventListener('click', () => this.toggleChat());
        sendBtn.addEventListener('click', () => this.sendMessage());
        attachBtn.addEventListener('click', () => fileInput.click());
        emojiBtn.addEventListener('click', () => this.toggleEmojiPopover());
        gifBtn.addEventListener('click', () => this.toggleGifPopover());
        voiceBtn.addEventListener('click', () => this.toggleAudioRecording());
        gifSearchBtn.addEventListener('click', () => this.searchGifs());
        gifSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.searchGifs();
            }
        });

        fileInput.addEventListener('change', async (event) => {
            await this.handleSelectedFiles(event.target.files, false);
            fileInput.value = '';
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 80) + 'px';
        });

        document.addEventListener('click', (event) => {
            const emojiPopover = document.getElementById('chatEmojiPopover');
            const gifPopover = document.getElementById('chatGifPopover');
            if (!emojiPopover || !gifPopover) return;

            const insideEmoji = emojiPopover.contains(event.target) || emojiBtn.contains(event.target);
            const insideGif = gifPopover.contains(event.target) || gifBtn.contains(event.target);
            if (!insideEmoji) {
                emojiPopover.classList.remove('active');
            }
            if (!insideGif) {
                gifPopover.classList.remove('active');
            }
        });

        this.renderEmojiPopover();
    }

    renderEmojiPopover() {
        const popover = document.getElementById('chatEmojiPopover');
        if (!popover) return;
        popover.innerHTML = '<div class="chat-emoji-loading">Loading emoji panel...</div>';

        this.loadEmojiPickerLibrary().then((loaded) => {
            if (!loaded) {
                this.renderEmojiFallback(popover);
                return;
            }

            popover.innerHTML = '<emoji-picker class="chat-emoji-picker" theme="light" preview-position="none"></emoji-picker>';
            const picker = popover.querySelector('emoji-picker');
            if (!picker) {
                this.renderEmojiFallback(popover);
                return;
            }

            picker.addEventListener('emoji-click', (event) => {
                const emoji = event && event.detail && event.detail.unicode
                    ? event.detail.unicode
                    : '';
                if (!emoji) return;
                this.insertEmoji(emoji);
                popover.classList.remove('active');
            });
        });
    }

    renderEmojiFallback(popover) {
        const emojis = [
            '😀', '😃', '😄', '😁', '😆', '🙂', '😊', '😉', '😍', '😘', '🤗', '🤔', '😎', '😢', '😭', '😡',
            '👍', '👎', '👏', '🙏', '💪', '💚', '❤️', '✨', '🔥', '🌍', '🌏', '🌱', '🌳', '🍃', '🌊', '♻️',
            '🐢', '🐋', '🐬', '🦋', '🌞', '🌧️', '⚡', '🌈', '🚮', '💧', '🍀', '📢', '🧠', '✅', '❌', '📍'
        ];
        popover.innerHTML = `<div class="chat-emoji-grid">${emojis.map((e) => `<button class="chat-emoji-item" type="button">${e}</button>`).join('')}</div>`;
        Array.from(popover.querySelectorAll('.chat-emoji-item')).forEach((btn) => {
            btn.addEventListener('click', () => {
                this.insertEmoji(btn.textContent || '');
                popover.classList.remove('active');
            });
        });
    }

    loadEmojiPickerLibrary() {
        if (window.customElements && window.customElements.get('emoji-picker')) {
            return Promise.resolve(true);
        }

        if (this.emojiLibraryPromise) {
            return this.emojiLibraryPromise;
        }

        this.emojiLibraryPromise = new Promise((resolve) => {
            const existing = document.getElementById('emoji-picker-element-script');
            if (existing) {
                existing.addEventListener('load', () => resolve(true), { once: true });
                existing.addEventListener('error', () => resolve(false), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.id = 'emoji-picker-element-script';
            script.type = 'module';
            script.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });

        return this.emojiLibraryPromise;
    }

    insertEmoji(emoji) {
        const input = document.getElementById('chatInput');
        if (!input) return;
        input.value += emoji;
        input.focus();
        input.dispatchEvent(new Event('input'));
    }

    toggleEmojiPopover() {
        const popover = document.getElementById('chatEmojiPopover');
        const gifPopover = document.getElementById('chatGifPopover');
        if (!popover || !gifPopover) return;
        gifPopover.classList.remove('active');
        popover.classList.toggle('active');
    }

    async toggleGifPopover() {
        const popover = document.getElementById('chatGifPopover');
        const emojiPopover = document.getElementById('chatEmojiPopover');
        if (!popover || !emojiPopover) return;
        emojiPopover.classList.remove('active');
        const willOpen = !popover.classList.contains('active');
        popover.classList.toggle('active');
        if (willOpen && this.gifResults.length === 0) {
            await this.searchGifs();
        }
    }

    async searchGifs() {
        const input = document.getElementById('chatGifSearchInput');
        const query = input ? input.value.trim() : '';
        const grid = document.getElementById('chatGifGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="chat-gif-loading">Loading GIFs...</div>';

        try {
            const response = await fetch(`/api/gifs/search?q=${encodeURIComponent(query)}&limit=12`);
            const data = await response.json();
            this.gifResults = Array.isArray(data && data.items) ? data.items : [];
            this.renderGifGrid();
        } catch (error) {
            this.gifResults = [];
            grid.innerHTML = '<div class="chat-gif-loading">Could not load GIFs right now.</div>';
        }
    }

    renderGifGrid() {
        const grid = document.getElementById('chatGifGrid');
        if (!grid) return;

        if (!this.gifResults.length) {
            grid.innerHTML = '<div class="chat-gif-loading">No GIFs found.</div>';
            return;
        }

        grid.innerHTML = this.gifResults.map((item, idx) => `
            <button class="chat-gif-item" data-index="${idx}" type="button" title="${this.escapeHtml(item.title || 'GIF')}">
                <img src="${this.escapeHtml(item.url)}" alt="GIF result">
            </button>
        `).join('');

        Array.from(grid.querySelectorAll('.chat-gif-item')).forEach((btn) => {
            btn.addEventListener('click', () => {
                const index = Number(btn.getAttribute('data-index'));
                const selected = this.gifResults[index];
                if (!selected) return;
                this.pendingAttachments.push({
                    kind: 'gif_remote',
                    name: selected.title || 'GIF',
                    mimeType: 'image/gif',
                    url: selected.url
                });
                this.renderAttachmentPreview();
                const popover = document.getElementById('chatGifPopover');
                if (popover) popover.classList.remove('active');
            });
        });
    }

    async toggleAudioRecording() {
        if (this.isRecording && this.mediaRecorder) {
            this.mediaRecorder.stop();
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof window.MediaRecorder === 'undefined') {
            this.addBotMessage('Voice recording is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: preferredMime });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const mimeType = this.mediaRecorder && this.mediaRecorder.mimeType
                    ? this.mediaRecorder.mimeType
                    : 'audio/webm';
                const blob = new Blob(this.audioChunks, { type: mimeType });

                stream.getTracks().forEach((track) => track.stop());

                if (blob.size > 0) {
                    const dataUrl = await this.readBlobAsDataURL(blob);
                    this.pendingAttachments.push({
                        kind: 'audio',
                        name: 'voice-message.webm',
                        mimeType,
                        dataUrl
                    });
                    this.renderAttachmentPreview();
                }

                this.isRecording = false;
                this.mediaRecorder = null;
                this.audioChunks = [];
                this.updateVoiceButton();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateVoiceButton();
        } catch (error) {
            this.isRecording = false;
            this.mediaRecorder = null;
            this.audioChunks = [];
            this.updateVoiceButton();
            this.addBotMessage('Could not access microphone. Please allow mic permissions and try again.');
        }
    }

    updateVoiceButton() {
        const voiceBtn = document.getElementById('chatVoiceBtn');
        if (!voiceBtn) return;
        voiceBtn.classList.toggle('recording', this.isRecording);
        voiceBtn.textContent = this.isRecording ? '⏹' : '🎤';
        voiceBtn.title = this.isRecording ? 'Stop recording' : 'Record voice';
    }

    async handleSelectedFiles(fileList, forceGif) {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        for (const file of files.slice(0, 5)) {
            const parsed = await this.parseAttachment(file, forceGif);
            if (parsed) {
                this.pendingAttachments.push(parsed);
            }
        }

        this.renderAttachmentPreview();
    }

    async parseAttachment(file, forceGif) {
        const maxBytes = 3 * 1024 * 1024;
        if (file.size > maxBytes) {
            this.addBotMessage(`Attachment ${file.name} is too large. Max allowed size is 3MB.`);
            return null;
        }

        const mimeType = String(file.type || '').toLowerCase();
        const fileName = String(file.name || 'attachment');

        if (forceGif || mimeType === 'image/gif') {
            const dataUrl = await this.readFileAsDataURL(file);
            return { kind: 'gif', name: fileName, mimeType: 'image/gif', dataUrl };
        }

        if (mimeType.startsWith('image/')) {
            const dataUrl = await this.readFileAsDataURL(file);
            return { kind: 'image', name: fileName, mimeType, dataUrl };
        }

        if (mimeType.startsWith('audio/')) {
            const dataUrl = await this.readFileAsDataURL(file);
            return { kind: 'audio', name: fileName, mimeType, dataUrl };
        }

        if (
            mimeType.startsWith('text/') ||
            mimeType === 'application/json' ||
            fileName.endsWith('.md') ||
            fileName.endsWith('.csv') ||
            fileName.endsWith('.txt') ||
            fileName.endsWith('.json')
        ) {
            const textContent = await this.readFileAsText(file);
            return {
                kind: 'document',
                name: fileName,
                mimeType: mimeType || 'text/plain',
                textContent: textContent.slice(0, 12000)
            };
        }

        return {
            kind: 'document',
            name: fileName,
            mimeType: mimeType || 'application/octet-stream',
            textContent: ''
        };
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    readBlobAsDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    renderAttachmentPreview() {
        const preview = document.getElementById('chatAttachmentPreview');
        if (!preview) return;

        if (!this.pendingAttachments.length) {
            preview.innerHTML = '';
            return;
        }

        preview.innerHTML = this.pendingAttachments.map((item, index) => {
            const label = item.kind === 'gif'
                ? 'GIF'
                : item.kind === 'image'
                    ? 'Image'
                    : item.kind === 'audio'
                        ? 'Audio'
                        : item.kind === 'gif_remote'
                            ? 'GIF'
                        : 'Doc';
            return `<button class="chat-attachment-chip" data-index="${index}" title="Remove ${this.escapeHtml(item.name)}">${label}: ${this.escapeHtml(item.name)} ✕</button>`;
        }).join('');

        Array.from(preview.querySelectorAll('.chat-attachment-chip')).forEach((chip) => {
            chip.addEventListener('click', () => {
                const index = Number(chip.getAttribute('data-index'));
                if (!Number.isFinite(index)) return;
                this.pendingAttachments.splice(index, 1);
                this.renderAttachmentPreview();
            });
        });
    }

    toggleChat() {
        const button = document.getElementById('chatWidgetButton');
        const container = document.getElementById('chatWidgetContainer');

        this.isOpen = !this.isOpen;
        button.classList.toggle('active');
        container.classList.toggle('active');

        if (this.isOpen && this.messages.length === 0) {
            this.addBotMessage('Hello! 👋 I\'m your environmental assistant. I can help answer questions about climate change, conservation, sustainability, and environmental protection. What would you like to know?');
        }

        this.scrollToBottom();
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        const attachments = [...this.pendingAttachments];

        if ((!message && !attachments.length) || this.isLoading) return;

        // Add user message
        this.addUserMessage(message || '(Attachment only)', attachments);
        input.value = '';
        input.style.height = 'auto';
        this.pendingAttachments = [];
        this.renderAttachmentPreview();

        // Show loading indicator
        this.isLoading = true;
        this.addLoadingMessage();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, attachments }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            let data = null;
            try {
                data = await response.json();
            } catch (parseError) {
                data = null;
            }

            if (!response.ok) {
                const serverError = data && data.error
                    ? data.error
                    : `Service unavailable (HTTP ${response.status})`;
                throw new Error(serverError);
            }
            
            // Remove loading message
            this.removeLoadingMessage();
            
            if (data.reply) {
                this.addBotMessage(data.reply);
            } else {
                this.addBotMessage(this.getLocalFallbackResponse(message || 'attachment'));
            }
        } catch (error) {
            this.removeLoadingMessage();
            this.addBotMessage(this.getLocalFallbackResponse(message || 'attachment'));
            console.error('Chat error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    getLocalFallbackResponse(userMessage) {
        const text = String(userMessage || '').toLowerCase();

        if (text.includes('environment')) {
            return 'The environment is everything around us: air, water, soil, plants, animals, and the ecosystems they form. It supports life and provides resources we depend on. Protecting the environment means reducing pollution, conserving biodiversity, and using natural resources responsibly so future generations can thrive.';
        }

        if (text.includes('climate')) {
            return 'Climate refers to long-term weather patterns in a region. Climate change happens when these patterns shift over time, largely due to greenhouse gas emissions from human activities. Actions like clean energy use, tree planting, and reducing waste help lower climate risks.';
        }

        if (text.includes('pollution') || text.includes('plastic')) {
            return 'Pollution harms ecosystems and human health. You can help by reducing single-use plastics, reusing materials, disposing waste properly, and supporting community cleanups. Small daily actions have a real cumulative impact.';
        }

        return 'I could not reach the AI service at this moment, but I can still help. Ask me about climate change, biodiversity, pollution, conservation, or sustainable living and I will provide practical guidance.';
    }

    addUserMessage(text, attachments = []) {
        const messagesDiv = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';

        const attachmentHtml = attachments.length
            ? `<div class="chat-user-attachments">${attachments.map((item) => {
                const kind = item.kind === 'gif_remote' ? 'GIF' : String(item.kind || '').toUpperCase();
                return `<span class="chat-inline-attachment">${this.escapeHtml(kind)}: ${this.escapeHtml(item.name)}</span>`;
            }).join('')}</div>`
            : '';

        messageDiv.innerHTML = `<div class="message-bubble">${attachmentHtml}${this.escapeHtml(text)}</div>`;
        messagesDiv.appendChild(messageDiv);
        this.scrollToBottom();
        this.messages.push({ type: 'user', text });
    }

    addBotMessage(text) {
        const messagesDiv = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.innerHTML = `<div class="message-bubble">${this.formatBotMessage(text)}</div>`;
        messagesDiv.appendChild(messageDiv);
        this.scrollToBottom();
        this.messages.push({ type: 'bot', text });
    }

    addErrorMessage(text) {
        const messagesDiv = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message error';
        messageDiv.innerHTML = `<div class="message-bubble">⚠️ ${this.escapeHtml(text)}</div>`;
        messagesDiv.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addLoadingMessage() {
        const messagesDiv = document.getElementById('chatMessages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loadingMessage';
        loadingDiv.innerHTML = `<div class="message-bubble typing-indicator"><span></span><span></span><span></span></div>`;
        messagesDiv.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    removeLoadingMessage() {
        const loadingMsg = document.getElementById('loadingMessage');
        if (loadingMsg) loadingMsg.remove();
    }

    scrollToBottom() {
        const messagesDiv = document.getElementById('chatMessages');
        setTimeout(() => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 0);
    }

    formatBotMessage(text) {
        // Convert markdown-like formatting to HTML
        let formatted = this.escapeHtml(text);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.chatbot = new EnvironmentalChatbot();
    });
} else {
    window.chatbot = new EnvironmentalChatbot();
}
