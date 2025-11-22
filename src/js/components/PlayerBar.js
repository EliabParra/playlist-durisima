import { Fast } from '../lib/Fast.js';

export class PlayerBar extends Fast {
    constructor(props){
        super();
        this.name = 'PlayerBar';
        this.props = props || {};
        this.attachShadow({mode:'open'});
        this._isBuilt = false;
        this.built = ()=>{};
        this._loop = false;
        this._shuffle = false;
        this._playing = false;
        this.media = null; // HTMLMediaElement to control
    }

    #template(){
        return `
            <div class="player-wrapper" id="playerWrapper">
                <div class="sidebar" id="playlistSidebar">
                    <div class="sidebar-scroll">
                        <button class="pl-btn" title="Playlist 1">P1</button>
                        <button class="pl-btn" title="Playlist 2">P2</button>
                        <button class="pl-btn" title="Playlist 3">P3</button>
                        <button class="pl-btn" title="Crear" id="createPl">+</button>
                    </div>
                </div>
                <div class="player-main" id="playerMain">
                    <div class="controls-top">
                        <div class="controls-left">
                            <button id="shuffle" class="icon-btn" title="Aleatorio"><i class="fa-solid fa-shuffle"></i></button>
                            <button id="prev" class="icon-btn" title="Anterior"><i class="fa-solid fa-backward-step"></i></button>
                        </div>

                        <div class="controls-center">
                            <button id="playPause" class="play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                        </div>

                        <div class="controls-right">
                            <button id="next" class="icon-btn" title="Siguiente"><i class="fa-solid fa-forward-step"></i></button>
                            <button id="loop" class="icon-btn" title="Repetir"><i class="fa-solid fa-repeat"></i></button>
                            <button id="fullscreen" class="icon-btn" title="Pantalla completa"><i class="fa-solid fa-expand"></i></button>
                        </div>
                    </div>

                    <div class="progress-row">
                        <span id="timeCurrent" class="time">0:00</span>
                        <div id="progressWrap" class="progress-wrap">
                            <div id="progressBar" class="progress-bar"><div id="progressFill" class="progress-fill"></div></div>
                        </div>
                        <span id="timeTotal" class="time">0:00</span>
                    </div>
                </div>
            </div>
        `;
    }

    async #getCss(){
        return await fast.getCssFile('PlayerBar');
    }

    async #render(){
        let sheet = new CSSStyleSheet();
        let css = await this.#getCss();
        sheet.replaceSync(css);
        this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, sheet];
        this.template = document.createElement('template');
        this.template.innerHTML = this.#template();
        let content = this.template.content.cloneNode(true);
        this.shadowRoot.appendChild(content);

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
    }

    #formatTime(sec){
        if(!sec || isNaN(sec)) return '0:00';
        sec = Math.floor(sec);
        let m = Math.floor(sec/60);
        let s = sec%60;
        return `${m}:${s.toString().padStart(2,'0')}`;
    }

    connectedCallback(){
        this.#render().then(()=>{
            this.setupListeners();
            this._isBuilt = true;
            this.built();
        })
    }

    setupListeners(){
        this.$playPause.addEventListener('click', ()=>this.togglePlay());
        this.$prev.addEventListener('click', ()=>this.dispatchEvent(new CustomEvent('player-prev',{bubbles:true})));
        this.$next.addEventListener('click', ()=>this.dispatchEvent(new CustomEvent('player-next',{bubbles:true})));
        this.$shuffle.addEventListener('click', ()=>this.toggleShuffle());
        this.$loop.addEventListener('click', ()=>this.toggleLoop());
        this.$fullscreen.addEventListener('click', ()=>this.toggleFullscreen());

        // progress click/seek
        this.$progressBar.addEventListener('click', (e)=>{
            if(!this.media) return;
            const rect = this.$progressBar.getBoundingClientRect();
            const perc = (e.clientX - rect.left) / rect.width;
            this.media.currentTime = perc * this.media.duration;
        });
    }

    setMedia(mediaElement){
        if(!mediaElement) return;
        if(this.media){
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
        this._updatePlayState();
    }

    _onLoaded(){
        this.$timeTotal.textContent = this.#formatTime(this.media.duration);
    }

    _onTimeUpdate(){
        if(!this.media) return;
        const cur = this.media.currentTime;
        const dur = this.media.duration || 0;
        const perc = dur ? (cur/dur)*100 : 0;
        this.$progressFill.style.width = perc+'%';
        this.$timeCurrent.textContent = this.#formatTime(cur);
    }

    _onEnded(){
        // if loop active, the media will loop itself if loop attribute set
        this._playing = false;
        this._updatePlayState();
        this.dispatchEvent(new CustomEvent('player-ended',{bubbles:true}));
    }

    togglePlay(){
        if(!this.media){
            // try to resolve from props selector
            if(this.props.mediaSelector) {
                const m = document.querySelector(this.props.mediaSelector);
                if(m) this.setMedia(m);
            }
            if(!this.media) return;
        }
        if(this.media.paused){
            this.media.play();
            this._playing = true;
        } else {
            this.media.pause();
            this._playing = false;
        }
        this._updatePlayState();
    }

    _updatePlayState(){
        const icon = this.$playPause.querySelector('i');
        if(this.media && !this.media.paused){
            icon.className = 'fa-solid fa-pause';
            this.$playPause.title = 'Pausa';
        } else {
            icon.className = 'fa-solid fa-play';
            this.$playPause.title = 'Reproducir';
        }
        // reflect loop
        if(this.media) this.media.loop = this._loop;
        this.$loop.classList.toggle('active', this._loop);
        this.$shuffle.classList.toggle('active', this._shuffle);
    }

    toggleLoop(){
        this._loop = !this._loop;
        if(this.media) this.media.loop = this._loop;
        this._updatePlayState();
        this.dispatchEvent(new CustomEvent('player-loop',{detail:{loop:this._loop}, bubbles:true}));
    }

    toggleShuffle(){
        this._shuffle = !this._shuffle;
        this._updatePlayState();
        this.dispatchEvent(new CustomEvent('player-shuffle',{detail:{shuffle:this._shuffle}, bubbles:true}));
    }

    toggleFullscreen(){
        // prefer media element (video) for fullscreen
        const target = this.media && this.media.requestFullscreen ? this.media : this.$wrapper;
        if(!document.fullscreenElement){
            target.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }
}

if(!customElements.get('player-bar')){
    customElements.define('player-bar', PlayerBar);
}
