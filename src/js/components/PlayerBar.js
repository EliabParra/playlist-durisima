import { Fast } from '../lib/Fast.js';
import { eventBus } from '../lib/EventBus.js';
import { createMediaController } from '../services/MediaController.js';

export class PlayerBar extends Fast {
    constructor(props) {
        super();  
        this.name = "PlayerBar";
        this.props = props;
        this._sts = false;
        this.built = () => {}; 
        this.attachShadow({mode:'open'});
        this._isBuilt = false;
        // loopMode: 'none' | 'all' | 'one'
        this._loopMode = 'none';
        this._shuffle = false;
        // restore persisted loopMode and shuffle if present
        try {
            const savedLoop = localStorage.getItem('player_loopMode');
            if (savedLoop === 'none' || savedLoop === 'all' || savedLoop === 'one') this._loopMode = savedLoop;
        } catch(e) { /* ignore storage errors */ }
        try {
            const savedShuffle = localStorage.getItem('player_shuffle');
            if (savedShuffle !== null) this._shuffle = (savedShuffle === 'true');
        } catch(e) { /* ignore storage errors */ }
        this._playing = false;
        this.media = null; // HTMLMediaElement to control
        this._queue = []; // internal queue placeholder
        this._queueIndex = -1;
        this.mediaController = createMediaController(); // wraps <audio>/<video>
        // TODO: persist queue changes & last index
        // subscribe to media events if needed
        eventBus.on('play', ()=> { this._playing = true; this._updatePlayState(); });
        eventBus.on('pause', ()=> { this._playing = false; this._updatePlayState(); });
        eventBus.on('ended', ()=> this._onEnded());
        eventBus.on('progress', ({ currentTime, duration })=> {
            // Could throttle later
            this._reflectProgress(currentTime, duration);
            // TODO: persist currentTime periodically for resume feature
        });
        
    }

    #getTemplate() { 
        return `
            <div class="player-wrapper" id="playerWrapper">
                <div class="player-top-row">
                    <div class="metadata" id="metadata" aria-live="polite">
                        <div class="cover" id="coverWrap">
                            <img id="coverImg" alt="Cover" />
                            <div class="cover-media-icon" id="coverMediaIcon"><i class="fa-solid fa-music"></i></div>
                        </div>
                        <div class="track-info" id="trackInfo">
                            <div class="title" id="trackTitle"><span class="title-text">Sin título</span></div>
                            <div class="artist" id="trackArtist">Desconocido</div>
                        </div>
                    </div>
                    <div class="controls-center-group" aria-label="Controles de reproducción">
                        <button id="shuffle" class="icon-btn" title="Aleatorio" aria-label="Aleatorio"><i class="fa-solid fa-shuffle"></i></button>
                        <button id="prev" class="icon-btn" title="Anterior" aria-label="Anterior"><i class="fa-solid fa-backward-step"></i></button>
                        <button id="playPause" class="play-btn" title="Play" aria-label="Reproducir/Pausar"><i class="fa-solid fa-play"></i></button>
                        <button id="next" class="icon-btn" title="Siguiente" aria-label="Siguiente"><i class="fa-solid fa-forward-step"></i></button>
                        <button id="loop" class="icon-btn" title="Repetir" aria-label="Repetir"><i class="fa-solid fa-repeat"></i></button>
                    </div>
                    <div class="right-group">
                        <div class="volume-wrapper" id="volumeWrapper">
                            <button id="muteToggle" class="icon-btn" title="Mute" aria-label="Silenciar"><i id="volumeIcon" class="fa-solid fa-volume-high"></i></button>
                            <div class="volume-slider-wrap">
                                <input id="volumeSlider" type="range" min="0" max="100" value="100" aria-label="Volumen" />
                            </div>
                        </div>
                        <button id="fullscreen" class="icon-btn" title="Pantalla completa" aria-label="Pantalla completa"><i class="fa-solid fa-expand"></i></button>
                    </div>
                </div>
                <div class="progress-row">
                    <span id="timeCurrent" class="time">0:00</span>
                    <div id="progressWrap" class="progress-wrap" aria-label="Barra de progreso" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                        <div id="progressBar" class="progress-bar">
                            <div id="progressFill" class="progress-fill"></div>
                            <div id="progressHandle" class="progress-handle" tabindex="0" aria-label="Posición actual"></div>
                        </div>
                    </div>
                    <span id="timeTotal" class="time">0:00</span>
                </div>
            </div>
        `
    }

    async #getCss() { 
        return await fast.getCssFile("PlayerBar");
    }

    #render() {
        return new Promise(async (resolve, reject) => {
            try {
                let sheet = new CSSStyleSheet();
                let css = await this.#getCss();
                sheet.replaceSync(css);
                this.shadowRoot.adoptedStyleSheets = [sheet];
                this.template = document.createElement('template');
                this.template.innerHTML = this.#getTemplate();
                let tpc = this.template.content.cloneNode(true);  
                this.mainElement = tpc.firstChild.nextSibling;
                this.shadowRoot.appendChild(this.mainElement);

                // elements
                this.$wrapper = this.shadowRoot.querySelector('#playerWrapper');
                this.$sidebar = this.shadowRoot.querySelector('#playlistSidebar');
                this.$shuffle = this.shadowRoot.querySelector('#shuffle');
                this.$prev = this.shadowRoot.querySelector('#prev');
                this.$playPause = this.shadowRoot.querySelector('#playPause');
                this.$next = this.shadowRoot.querySelector('#next');
                this.$loop = this.shadowRoot.querySelector('#loop');
                this.$fullscreen = this.shadowRoot.querySelector('#fullscreen');
                this.$timeCurrent = this.shadowRoot.querySelector('#timeCurrent');
                this.$timeTotal = this.shadowRoot.querySelector('#timeTotal');
                this.$progressBar = this.shadowRoot.querySelector('#progressBar');
                this.$progressFill = this.shadowRoot.querySelector('#progressFill');
                this.$progressHandle = this.shadowRoot.querySelector('#progressHandle');
                this.$coverImg = this.shadowRoot.querySelector('#coverImg');
                    this.$coverMediaIcon = this.shadowRoot.querySelector('#coverMediaIcon');
                this.$trackTitle = this.shadowRoot.querySelector('#trackTitle');
                this.$trackArtist = this.shadowRoot.querySelector('#trackArtist');
                this.$volumeSlider = this.shadowRoot.querySelector('#volumeSlider');
                this.$muteToggle = this.shadowRoot.querySelector('#muteToggle');
                this.$volumeIcon = this.shadowRoot.querySelector('#volumeIcon');
                resolve(this);
            } 
            catch (error) {
                reject(error);
            }
        })
    }

    #checkAttributes() {
        return new Promise(async (resolve, reject) => {
            try {
                for(let attr of this.getAttributeNames()) {          
                    if (attr.substring(0,2)!="on") {
                        this[attr] = this.getAttribute(attr);
                        this.mainElement.setAttribute(attr, this[attr]);
                    }
                    else{
                        let f = this[attr];
                        this[attr] = ()=>{ if (!this._disabled) f() };
                    }
                    switch(attr) {
                        case 'id' : 
                            await fast.createInstance('PlayerBar', {'id': this[attr]});
                            break;
                    }
                }
                resolve(this);
            } catch (error) {
                reject(error);
            }
        })
    }

    #checkProps() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.props) {
                    for(let attr in this.props) {
                        switch(attr) {
                            case 'style' :
                                for(let attrcss in this.props.style) this.mainElement.style[attrcss] = this.props.style[attrcss];
                                break;
                            case 'events' : 
                                for(let attrevent in this.props.events) {
                                    this.mainElement.addEventListener(attrevent, ()=>{
                                        if (!this._disabled)this.props.events[attrevent]()})}
                                break;
                            default : 
                                this.setAttribute(attr, this.props[attr]);
                                this[attr] = this.props[attr];
                                if (attr==='id') {
                                    this.id = this[attr];
                                    await fast.createInstance('PlayerBar', {'id': this[attr]})
                                };
                        }
                    }
                }
                resolve(this);
            } catch (error) {
                reject(error);
            }
        })
    }
    
    async connectedCallback() {
        await this.#render();
        await this.ensureFontAwesome();
        await this.#checkAttributes();
        await this.#checkProps();
        this.setupListeners();
        this._isBuilt = true;
        this.built();
        // Attach underlying media element to wrapper (hidden until video type maybe later)
        this.mediaController.attachTo(this.$wrapper);
        this.media = this.mediaController.mediaEl;
        // apply persisted loop/shuffle to media/UI
        try {
            if (this.media) this.media.loop = (this._loopMode === 'one');
        } catch(e){}
        try { this.$shuffle.classList.toggle('active', this._shuffle); } catch(e){}
        try { this.$loop.classList.toggle('active', this._loopMode !== 'none'); } catch(e){}
        try { this.$loop.classList.toggle('one', this._loopMode === 'one'); } catch(e){}
        // refresh loop icon graphic according to mode
        try { this._refreshLoopIcon(); } catch(e){}
        // sync UI volume to current media controller values
        try {
            this.$volumeSlider.value = Math.round((this.media?.volume ?? 1) * 100);
        } catch(e){}
        this._updateVolumeIcon();
    }

    addToBody() {document.body.appendChild(this);}

    #formatTime(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        sec = Math.floor(sec);
        let m = Math.floor(sec/60);
        let s = sec%60;
        return `${m}:${s.toString().padStart(2,'0')}`;
    }

    setupListeners() {
        this.$playPause.addEventListener('click', ()=>this.togglePlay());
        this.$prev.addEventListener('click', ()=>this.prev());
        this.$next.addEventListener('click', ()=>this.next());
        this.$shuffle.addEventListener('click', ()=>this.toggleShuffle());
        this.$loop.addEventListener('click', ()=>this.toggleRepeat());
        this.$fullscreen.addEventListener('click', ()=>this.toggleFullscreen());

        // progress click/seek
        this.$progressBar.addEventListener('click', (e)=>{
            if (!this.media) return;
            const rect = this.$progressBar.getBoundingClientRect();
            const perc = (e.clientX - rect.left) / rect.width;
            this.media.currentTime = perc * this.media.duration;
        });

        // Drag seek
        let seeking = false;
        const onSeekMove = (e) => {
            if (!seeking || !this.media) return;
            const rect = this.$progressBar.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const perc = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            this.seek(perc * this.media.duration);
        };
        this.$progressBar.addEventListener('mousedown', (e)=> { seeking = true; onSeekMove(e); });
        window.addEventListener('mousemove', onSeekMove);
        window.addEventListener('mouseup', ()=> seeking = false);
        this.$progressBar.addEventListener('touchstart', (e)=> { seeking = true; onSeekMove(e); }, { passive: true });
        window.addEventListener('touchmove', onSeekMove, { passive: true });
        window.addEventListener('touchend', ()=> seeking = false);

        // Volume events
        this.$volumeSlider.addEventListener('input', ()=>{
            const v = this.$volumeSlider.value / 100;
            this.setVolume(v);
            this._updateVolumeIcon();
        });
        this.$muteToggle.addEventListener('click', ()=>{
            this.toggleMute();
            this._updateVolumeIcon();
        });

        // Keyboard accessibility
        this.shadowRoot.addEventListener('keydown', (e)=>{
            if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
            else if (e.code === 'ArrowRight') { this.seek((this.media?.currentTime || 0) + 5); }
            else if (e.code === 'ArrowLeft') { this.seek((this.media?.currentTime || 0) - 5); }
            else if (e.code === 'ArrowUp') { const nv = Math.min(1, (this.media?.volume || 1) + 0.05); this.setVolume(nv); this.$volumeSlider.value = Math.round(nv*100); this._updateVolumeIcon(); }
            else if (e.code === 'ArrowDown') { const nv = Math.max(0, (this.media?.volume || 1) - 0.05); this.setVolume(nv); this.$volumeSlider.value = Math.round(nv*100); this._updateVolumeIcon(); }
            else if (e.key === 'm') { this.toggleMute(); this._updateVolumeIcon(); }
        });
    }

    setMedia(mediaElement) {
        if (!mediaElement) return;
        if (this.media) {
            this.media.removeEventListener('timeupdate', this._timeUpdateHandler);
            this.media.removeEventListener('loadedmetadata', this._loadedHandler);
            this.media.removeEventListener('ended', this._endedHandler);
        }
        this.media = mediaElement;
        this._timeUpdateHandler = ()=>this._onTimeUpdate();
        this._loadedHandler = ()=>this._onLoaded();
        this._endedHandler = ()=>this._onEnded();
        this.media.addEventListener('timeupdate', this._timeUpdateHandler);
        this.media.addEventListener('loadedmetadata', this._loadedHandler);
        this.media.addEventListener('ended', this._endedHandler);
        // set initial UI
        this.$timeTotal.textContent = this.#formatTime(this.media.duration);
        // sync volume slider and mute/icon state
        try {
            this.$volumeSlider.value = Math.round((this.media.volume ?? 1) * 100);
        } catch(e){}
        this._updateVolumeIcon();
        this._updatePlayState();
        // update fullscreen visibility and cover icon according to media element type
        try {
            const isVideo = (this.media && this.media.tagName && this.media.tagName.toLowerCase() === 'video');
            this._setFullscreenVisible(Boolean(isVideo));
            this._setCoverIcon(isVideo ? 'video' : 'audio');
        } catch(e){}
    }

    // --- Public API ---
    loadMedia(descriptor) {
        // descriptor: { id, src, type, title, artist, cover }
        if (!descriptor || !descriptor.src) return;
        this.mediaController.load(descriptor.src, { type: descriptor.type });
        this.setMedia(this.mediaController.mediaEl);
        eventBus.emit('track:change', descriptor);
        this._updateMetadata(descriptor);
        this._ensureVideoVisibility(descriptor.type);
        // also update fullscreen button and cover icon
        try { this._setFullscreenVisible(descriptor.type === 'video'); } catch(e){}
        try { this._setCoverIcon(descriptor.type === 'video' ? 'video' : 'audio'); } catch(e){}
    }

    play() {
        if (!this.media) return;
        this.mediaController.play();
    }

    pause() {
        if (!this.media) return;
        this.mediaController.pause();
    }

    seek(seconds) {
        this.mediaController.seek(seconds);
    }

    setVolume(v) {
        this.mediaController.setVolume(v);
        // TODO: persist volume level
    }

    toggleMute() {
        this.mediaController.toggleMute();
        // TODO: persist mute state
    }

    setQueue(list) {
        this._queue = Array.isArray(list) ? list : [];
        this._queueIndex = this._queue.length ? 0 : -1;
        // TODO: persist queue
        eventBus.emit('queue:change', { queue: this._queue });
    }

    next() {
        if (!this._queue || this._queue.length === 0) return;

        if (this._shuffle) {
            // choose a random different index
            if (this._queue.length === 1) this._queueIndex = 0;
            else {
                let idx = this._queueIndex;
                while (idx === this._queueIndex) idx = Math.floor(Math.random() * this._queue.length);
                this._queueIndex = idx;
            }
        } else {
            // normal ordered next
            if (this._queueIndex < this._queue.length - 1) this._queueIndex++;
            else {
                if (this._loopMode === 'all') this._queueIndex = 0;
                else { eventBus.emit('queue:end'); return; }
            }
        }
        const descriptor = this._queue[this._queueIndex];
        this.loadMedia(descriptor);
        try { this.play(); } catch (e) {}
    }

    prev() {
        // If current media exists and has played more than 5 seconds, restart it
        try {
            const curMedia = this.media;
            const currentTime = curMedia?.currentTime ?? 0;
            if (currentTime > 5) {
                // restart current track
                try { this.seek(0); } catch(e){}
                try { this.play(); } catch(e){}
                return;
            }
        } catch(e) {}

        // Otherwise go to previous track in queue (if any)
        if (this._shuffle) {
            // pick random different index
            if (this._queue.length <= 1) { eventBus.emit('queue:start'); return; }
            let idx;
            do { idx = Math.floor(Math.random()*this._queue.length); } while(idx === this._queueIndex && this._queue.length > 1);
            this._queueIndex = idx;
        } else {
            if (this._queueIndex <= 0) { eventBus.emit('queue:start'); return; }
            this._queueIndex--;
        }
        const descriptor = this._queue[this._queueIndex];
        this.loadMedia(descriptor);
        // autoplay the newly loaded track (user gesture from prev click)
        try { this.play(); } catch(e){}
    }

    toggleShuffle() {
        this._shuffle = !this._shuffle;
        try { localStorage.setItem('player_shuffle', String(this._shuffle)); } catch(e){}
        this._updatePlayState();
        eventBus.emit('shuffle:change', { shuffle: this._shuffle });
    }

    toggleRepeat() {
        // cycle through loop modes: none -> all -> one -> none
        const order = ['none','all','one'];
        const idx = order.indexOf(this._loopMode);
        const next = order[(idx + 1) % order.length];
        this._loopMode = next;
        if (this.media) this.media.loop = (this._loopMode === 'one');
        try { localStorage.setItem('player_loopMode', this._loopMode); } catch(e){}
        this._updatePlayState();
        eventBus.emit('loop:change', { mode: this._loopMode });
        // refresh loop icon graphic according to mode
        try { this._refreshLoopIcon(); } catch(e){}
    }

    _refreshLoopIcon() {
        try {
            const ic = this.$loop?.querySelector('i');
            if (!ic) return;
            // Use a different icon when in 'one' mode to visually indicate single-track repeat
            if (this._loopMode === 'one') {
                ic.className = 'fa-solid fa-rotate-right';
            } else {
                ic.className = 'fa-solid fa-repeat';
            }
        } catch(e) { /* ignore */ }
    }

    destroy() {
        this.mediaController.destroy();
        // TODO: clear persisted position (optional)
    }

    // --- end Public API ---

    _onLoaded() {
        this.$timeTotal.textContent = this.#formatTime(this.media.duration);
    }

    _onTimeUpdate() {
        if (!this.media) return;
        this._reflectProgress(this.media.currentTime, this.media.duration || 0);
    }

    _reflectProgress(cur, dur) {
        const now = performance.now();
        if (!this._lastProgressUpdate || now - this._lastProgressUpdate > 180) {
            this._lastProgressUpdate = now;
            const perc = dur ? (cur/dur)*100 : 0;
            this.$progressFill.style.width = perc+'%';
            this.$timeCurrent.textContent = this.#formatTime(cur);
            if (this.$progressHandle) {
                this.$progressHandle.style.left = perc+'%';
                this.$progressWrap?.setAttribute('aria-valuenow', String(Math.round(perc)));
            }
            // TODO: persist currentTime every few seconds
        }
    }

    _onEnded() {
        try {
            // If loop one, let media.loop handle repeating the same track
            if (this._loopMode === 'one') return;

            // If shuffle is enabled, pick a random next track (different from current when possible)
            if (this._shuffle && this._queue.length > 1) {
                let idx = this._queueIndex;
                while (idx === this._queueIndex) {
                    idx = Math.floor(Math.random() * this._queue.length);
                }
                this._queueIndex = idx;
                const descriptor = this._queue[this._queueIndex];
                this.loadMedia(descriptor);
                try { this.play(); } catch(e){}
                return;
            }

            // Otherwise, advance in order if possible
            if (this._queueIndex < this._queue.length - 1) {
                this._queueIndex++;
                const descriptor = this._queue[this._queueIndex];
                this.loadMedia(descriptor);
                try { this.play(); } catch(e){}
                return;
            }

            // If at end and loop all, wrap to start
            if (this._loopMode === 'all' && this._queue.length > 0) {
                this._queueIndex = 0;
                const descriptor = this._queue[this._queueIndex];
                this.loadMedia(descriptor);
                try { this.play(); } catch(e){}
                return;
            }

            // Default: stop playback and update UI
            this._playing = false;
            this._updatePlayState();
            this.dispatchEvent(new CustomEvent('player-ended',{bubbles:true}));
        } catch (e) {
            console.error(e);
            this._playing = false;
            this._updatePlayState();
            this.dispatchEvent(new CustomEvent('player-ended',{bubbles:true}));
        }
    }

    togglePlay() {
        if (!this.media) {
            // try to resolve from props selector
            if (this.props.mediaSelector) {
                const m = document.querySelector(this.props.mediaSelector);
                if (m) this.setMedia(m);
            }
            if (!this.media) return;
        }
        if (this.media.paused) {
            this.media.play();
            this._playing = true;
        } else {
            this.media.pause();
            this._playing = false;
        }
        this._updatePlayState();
    }

    _updatePlayState() {
        const icon = this.$playPause.querySelector('i');
        if (this.media && !this.media.paused) {
            icon.className = 'fa-solid fa-pause';
            this.$playPause.title = 'Pausa';
        } else {
            icon.className = 'fa-solid fa-play';
            this.$playPause.title = 'Reproducir';
        }
        // reflect loopMode and shuffle
        try { if (this.media) this.media.loop = (this._loopMode === 'one'); } catch(e){}
        try { this.$loop.classList.toggle('active', this._loopMode !== 'none'); } catch(e){}
        try { this.$loop.classList.toggle('one', this._loopMode === 'one'); } catch(e){}
        try { this.$shuffle.classList.toggle('active', this._shuffle); } catch(e){}
    }

    // Legacy methods maintained for backward compatibility (will emit via new API)
    toggleLoop() {
        this.toggleRepeat();
    }

    // Original toggleShuffle now calls new API
    // (method still exists for external code expecting previous name)
    // Actual implementation above

    toggleFullscreen() {
        // prefer media element (video) for fullscreen
        const target = this.media && this.media.requestFullscreen ? this.media : this.$wrapper;
        if (!document.fullscreenElement) {
            target.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    _updateMetadata(descriptor) {
        const titleText = descriptor.title || 'Sin título';
        // ensure inner span updated
        const span = this.$trackTitle.querySelector('.title-text');
        if (span) span.textContent = titleText;
        else this.$trackTitle.textContent = titleText;
        this.$trackArtist.textContent = descriptor.artist || 'Desconocido';
        if (descriptor.cover) {
            this.$coverImg.src = descriptor.cover;
        } else {
            this.$coverImg.src = '';
        }
        // Fade-in cover
        this.$coverImg.onload = () => {
            this.$coverImg.classList.add('loaded');
        };
        // marquee behavior: if title overflows, apply animation
        try {
            const container = this.$trackTitle;
            const inner = this.$trackTitle.querySelector('.title-text');
            if (container && inner) {
                // reset
                container.classList.remove('marquee');
                inner.style.animationDuration = '';
                // small timeout to allow layout
                requestAnimationFrame(()=>{
                    const overflow = inner.scrollWidth > container.clientWidth + 4; // small threshold
                    if (overflow) {
                        container.classList.add('marquee');
                        const distance = inner.scrollWidth - container.clientWidth;
                        // duration proportional to distance (px) -> seconds, plus a pause
                        const speed = 0.02; // seconds per pixel
                        const dur = Math.max(4, Math.ceil(distance * speed));
                        inner.style.animationDuration = dur + 's';
                    }
                });
            }
        } catch(e){}
    }

    _ensureVideoVisibility(type) {
        if (!this.media) return;
        if (type === 'video') { this.media.style.display = 'block'; }
        else { this.media.style.display = 'none'; }
        // TODO: lazy initialize visualization hook for video if needed
    }

    _setFullscreenVisible(visible) {
        try {
            if (!this.$fullscreen) return;
            // use visibility instead of display so the layout (slider position) doesn't shift
            this.$fullscreen.style.visibility = visible ? '' : 'hidden';
            this.$fullscreen.setAttribute('aria-hidden', visible ? 'false' : 'true');
        } catch(e){}
    }

    _setCoverIcon(kind) {
        // kind: 'audio' | 'video'
        try {
            if (!this.$coverMediaIcon) return;
            const icon = this.$coverMediaIcon.querySelector('i');
            if (!icon) return;
            if (kind === 'video') {
                icon.className = 'fa-solid fa-video';
            } else {
                icon.className = 'fa-solid fa-music';
            }
            // ensure visible
            this.$coverMediaIcon.style.display = '';
        } catch(e){}
    }

    _updateVolumeIcon() {
        if (!this.media) return;
        const v = this.media.volume;
        if (this.media.muted || v === 0) { this.$volumeIcon.className = 'fa-solid fa-volume-xmark'; }
        else if (v < 0.33) { this.$volumeIcon.className = 'fa-solid fa-volume-low'; }
        else { this.$volumeIcon.className = 'fa-solid fa-volume-high'; }
    }

    attachVisualizer(callback) {
        // Store callback to invoke with future waveform/analyser data
        this._visualizerCallback = callback;
        // TODO: integrate WebAudio analyser and emit waveformData periodically
    }
}

if (!customElements.get ('player-bar')) {
    customElements.define ('player-bar', PlayerBar);
}
