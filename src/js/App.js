// Importar la clase base Fast
import './lib/Fast.js';
import './components/SideBar.js';
import './components/SearchBar.js';
import './components/PlayerBar.js';
import LocalStorageManager from './services/DB/LocalStorageManager.js';
import { musicDB } from './services/DB/MusicDatabase.js';
import { eventBus } from './lib/EventBus.js';

// MainContent placeholder (pantallas dinámicas futuras)
class MainContent extends Fast {
	constructor() {
		super();
		this.name = 'MainContent';
		this.attachShadow({ mode:'open' });
		this.currentView = 'home';
	}
	#template() {
		return `
            <style>
                :host { display: block; width: 100%; height: 100%; overflow: hidden; }
                .layout { display: flex; height: 100%; }
                
                /* Zona del Video: Fija, nunca se borra con innerHTML */
                #video-stage {
                    width: 70%;
                    background: #000;
                    flex-shrink: 0; /* Que no se aplaste */
                    display: none; /* Oculto por defecto */
                    justify-content: flex-end;
                    align-items: center;
                    min-height: 300px; /* Altura mínima para el video */
                }
                #video-stage.active { display: flex; }

                /* Zona del Contenido (Listas): Dinámica, aquí hacemos innerHTML */
                #mainContent {
                    flex-grow: 1;
                    overflow-y: auto; /* Scroll solo en la lista */
                    padding-bottom: 80px; /* Espacio para el player bar */
                }
                /* pulse animation when search reset occurs */
                .pulse { animation: playlist-pulse 700ms ease; }
                @keyframes playlist-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
                    30% { transform: scale(1.009); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
                    100% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
                }
                /* playlist transition and track hover styles */
                .view-playlist.fade-in { animation: playlist-fade-in 260ms ease; }
                @keyframes playlist-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }

                .track-list { display:flex; flex-direction:column; gap:0; }
                .track-row { transition: background-color 160ms ease, transform 140ms ease, box-shadow 140ms ease; border-bottom:1px solid #444; padding:10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
                .track-row.fade-in { animation: track-fade 220ms ease; }
                .track-row.fade-in { animation-fill-mode: both; }
                @keyframes track-fade { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
                .track-row:hover { background: rgba(255,255,255,0.03); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
                .track-row.active { background: rgba(29,185,84,0.08); box-shadow: 0 6px 18px rgba(29,185,84,0.06); border-left:4px solid #1DB954; transform: none; }
                .track-row .track-info { flex-grow:1; }
            </style>

            <div class="layout">
                <div id="mainContent" class="main-content fade-in"></div>
                <div id="video-stage"></div>
            </div>
        `;
	}
	async connectedCallback() {
        this.ensureFontAwesome();
		const tpl = document.createElement('template');
		tpl.innerHTML = this.#template();
		this.shadowRoot.appendChild(tpl.content.cloneNode(true));
		
        // Referencias a las dos zonas
        this.$videoContainer = this.shadowRoot.querySelector('#video-stage');
		this.$contentRoot = this.shadowRoot.querySelector('#mainContent');
		
        this.renderHome();
	}
	renderHome() {
		this.currentView = 'home';
		this.$contentRoot.innerHTML = `
            <div class="view-home fade-in" style="padding:20px;">
                <h2>Inicio</h2>
                <p>Bienvenido a tu reproductor local.</p>
            </div>
        `;
        
	}
	async renderPlaylist(playlistId) {
		this.currentView = 'playlist';
        
        try {
            const tracks = await musicDB.getTracksByPlaylist(playlistId);
            const title = await musicDB.getPlaylistName(playlistId);
            
            // Generar HTML con botón de borrar
            const listHtml = tracks.map((t, index) => `
                <div class="track-row fade-in" data-index="${index}" data-id="${t.id}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; animation-delay:${index*60}ms;">
                    <div class="track-info" style="flex-grow:1">
                        <strong>${index+1}.</strong> ${t.title} 
                        <span style="font-size:0.8em; color:#aaa; margin-left:10px;">${t.type.toUpperCase()}</span>
                    </div>
                    <button class="delete-track-btn" data-id="${t.id}" style="background:transparent; border:none; color:#ff5555; cursor:pointer; padding:5px; font-size:18px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join('');

            this.$contentRoot.innerHTML = `
                <div class="view-playlist fade-in" style="padding:20px;">
                    <h1 style="margin-bottom:12px; font-size:48px;">${title}</h1>
                    <div class="track-list">${tracks.length ? listHtml : '<p>No hay canciones. ¡Agrega algunas!</p>'}</div>
                </div>
            `;

            // Evento: REPRODUCIR (Click en la fila)
            this.$contentRoot.querySelectorAll('.track-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    // Evitar que se reproduzca si dimos click al botón borrar
                    if(e.target.closest('.delete-track-btn')) return;
                    
                    const idx = parseInt(row.dataset.index);
                    // Emitimos evento para setupEvents
                    eventBus.emit('playlist:play', { queue: tracks, startIndex: idx });
                });
            });

            // Evento: BORRAR CANCIÓN (Click en basura)
            this.$contentRoot.querySelectorAll('.delete-track-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Detener propagación
                    Swal.fire({
                        title: '¿Eliminar este archivo permanentemente?',
                        text: 'Esta acción no se puede deshacer.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, borrar',
                        confirmButtonColor: '#d33'
                    }).then(async (r) => {
                        if (r.isConfirmed) {
                                const deletedId = parseInt(btn.dataset.id);
                                await musicDB.deleteTrack(deletedId);
                                // Si la pista eliminada es la que se está reproduciendo, detener y resetear el player
                                try {
                                    if (this.playerBar && this.playerBar._queueIndex >= 0) {
                                        const current = this.playerBar._queue[this.playerBar._queueIndex];
                                        if (current && current.id === deletedId) {
                                            // Pausar reproducción
                                            try { this.playerBar.pause(); } catch(e){}
                                            // Limpiar cola y estado
                                            try { this.playerBar.setQueue([]); } catch(e){}
                                            this.playerBar._queueIndex = -1;
                                            // Resetear metadata y progress UI
                                            try {
                                                this.playerBar._updateMetadata({ title: 'Sin título', artist: 'Desconocido' });
                                                if (this.playerBar.$timeCurrent) this.playerBar.$timeCurrent.textContent = '0:00';
                                                if (this.playerBar.$timeTotal) this.playerBar.$timeTotal.textContent = '0:00';
                                                if (this.playerBar.$progressFill) this.playerBar.$progressFill.style.width = '0%';
                                                if (this.playerBar.$progressHandle) this.playerBar.$progressHandle.style.left = '0%';
                                            } catch(e){}
                                            // Limpiar video stage si estaba activo
                                            try {
                                                const videoContainer = this.mainContent.shadowRoot.querySelector('#video-stage');
                                                if (videoContainer) { videoContainer.classList.remove('active'); videoContainer.innerHTML = ''; }
                                            } catch(e){}
                                        }
                                    }
                                } catch(e) { console.error(e); }

                                // Recargar vista actual
                                this.renderPlaylist(playlistId);
                                eventBus.emit('playlist:updated'); // Actualizar contador sidebar
                                Swal.fire('Archivo eliminado', '', 'success');
                        }
                    })
                });
            });

        } catch (e) {
            this.$contentRoot.innerHTML = `<p>Error: ${e.message}</p>`;
        }
	}
	async renderSearchResults(query) {
		this.currentView = 'search';
        this.$contentRoot.innerHTML = `<div class="loading">Buscando "${query}"...</div>`;
        try {
            const results = await musicDB.searchTracks(query);
            
            const listHtml = results.map((t, index) => `
                <div class="track-row" data-index="${index}" style="padding:10px; border-bottom:1px solid #444; cursor:pointer;">
                    <i class="fa-solid ${t.type === 'video' ? 'fa-video' : 'fa-music'}"></i> 
                    ${t.title}
                </div>
            `).join('');

            this.$contentRoot.innerHTML = `
                <div class="view-search fade-in" style="padding:20px;">
                    <h2>Resultados para: "${query}"</h2>
                    <div class="track-list">${results.length ? listHtml : '<p>No se encontraron coincidencias.</p>'}</div>
                </div>`;

            // Al hacer click en resultado, reproducimos solo esa lista de resultados
            this.$contentRoot.querySelectorAll('.track-row').forEach(row => {
                row.addEventListener('click', () => {
                    eventBus.emit('playlist:play', { queue: results, startIndex: parseInt(row.dataset.index) });
                });
            });

        } catch(e) { console.error(e); }
	}
}

if (!customElements.get('main-content')) {
	customElements.define('main-content', MainContent);
}

class App {
	constructor() {
		this.$sidebarContainer = document.getElementById('sidebar-container');
		this.$searchbarContainer = document.getElementById('searchbar-container');
		this.$contentContainer = document.getElementById('content-container');
		this.$playerbarContainer = document.getElementById('playerbar-container');
		// Video stage se inyectará dentro de MainContent para reproducir video ahí
		this.$videoStage = null; // asignado tras montar MainContent

		this.sideBar = null;
		this.searchBar = null;
		this.playerBar = null;
		this.mainContent = null;
	}

	init() {
		this.mountComponents();
		this.setupEvents();
	}

	mountComponents() {
		// Crear instancias custom elements
		this.sideBar = document.createElement('side-bar');
		this.searchBar = document.createElement('search-bar');
		this.playerBar = document.createElement('player-bar');
		this.mainContent = document.createElement('main-content');
        this.searchBar.renderPlaylist = this.mainContent.renderPlaylist.bind(this.mainContent);

		// Montar en contenedores
		this.$sidebarContainer.appendChild(this.sideBar);
		this.$searchbarContainer.appendChild(this.searchBar);
        this.$playerbarContainer.appendChild(this.playerBar);
        // Hide playerbar by default; only show when playback occurs
        try { this.$playerbarContainer.style.display = 'none'; } catch(e) {}
		this.$contentContainer.appendChild(this.mainContent);
	}

	setupEvents() {
		// Sidebar y Search (Ya tenías esto)
        this.sideBar.addEventListener('playlist:selected', (e) => {
            const { id } = e.detail;
            this.mainContent.renderPlaylist(id);
            // GUARDAR ID PARA LA SEARCHBAR
            LocalStorageManager.setItem('ui.currentPlaylistId', id);
        });
        
        this.sideBar.addEventListener('home:selected', () => {
            this.mainContent.renderHome();
            LocalStorageManager.removeItem('ui.currentPlaylistId');
        });

        this.searchBar.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const query = this.searchBar.shadowRoot.querySelector('#searchInput').value;
                if (query) {
                    this.mainContent.renderSearchResults(query);
                }
            }
        });

        // --- LÓGICA DE REPRODUCCIÓN (DB -> Player) ---
        eventBus.on('playlist:play', ({ queue, startIndex }) => {
            this.playerBar.setQueue(queue);
            const track = queue[startIndex];
            if(track) {
                this.playerBar.loadMedia(track);
                this.playerBar._queueIndex = startIndex; 
                this.playerBar.play();
            }
        });

        // Fallback: permitir que SearchBar emita 'playlist:show' para re-mostrar la playlist actual
        eventBus.on('playlist:show', ({ id }) => {
            if (id) this.mainContent.renderPlaylist(id);
        });

        // Visual cue when search resets the playlist: add a pulse animation to main content
        eventBus.on('playlist:reset', ({ id }) => {
            try {
                const main = this.mainContent;
                const container = main?.shadowRoot?.querySelector('#mainContent');
                if (container) {
                    container.classList.add('pulse');
                    setTimeout(() => container.classList.remove('pulse'), 700);
                }
            } catch(e) { console.error(e); }
        });

        // Mark active track row when player changes track
        eventBus.on('track:change', ({ id }) => {
            try {
                const main = this.mainContent;
                const container = main?.shadowRoot?.querySelector('#mainContent');
                if (!container) return;
                const rows = container.querySelectorAll('.track-row');
                rows.forEach(r => r.classList.remove('active'));
                if (id === undefined || id === null) return;
                for (const r of rows) {
                    if (String(r.dataset.id) === String(id)) {
                        r.classList.add('active');
                        // ensure visible
                        r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        break;
                    }
                }
            } catch(e) { console.error(e); }
        });

        // --- ARREGLO DEL VIDEO QUE NO SE VE ---
        eventBus.on('media:loaded', ({ type }) => {
            const el = this.playerBar.mediaController.mediaEl;
            if(!el) return;

            // Buscamos el contenedor FIJO dentro del shadowDOM de MainContent
            const videoContainer = this.mainContent.shadowRoot.querySelector('#video-stage');
            const playerWrapper = this.playerBar.shadowRoot.querySelector('#playerWrapper');

            if(type === 'video') {
                if(videoContainer){
                    // 1. Mostrar el contenedor
                    videoContainer.classList.add('active');
                    
                    // 2. Mover el elemento (AppendChild mueve, no copia)
                    videoContainer.innerHTML = ''; 
                    videoContainer.appendChild(el);
                    
                    // 3. Estilos para que se vea bien
                    el.style.width = '100%';
                    el.style.height = '100%';
                    el.style.maxHeight = '60vh'; 
                    el.style.display = 'block';

                    // 4. Intentar reproducir de nuevo (por si el movimiento lo pausó)
                    setTimeout(() => {
                        el.play().catch(e => console.log("Reproducción retomada tras mover al DOM"));
                    }, 50);
                }
            } else {
                // Es Audio
                if(videoContainer) {
                    videoContainer.classList.remove('active');
                    videoContainer.innerHTML = ''; // Limpiar stage
                }
                
                // Devolver audio al player bar
                if(playerWrapper) playerWrapper.appendChild(el);
                el.style.display = 'none';
            }
        });

        // Show/hide playerbar based on playback state
        eventBus.on('play', () => {
            try { this.$playerbarContainer.style.display = ''; } catch(e) {}
        });
        // Do not hide playerbar on pause — keep visible so user can resume.
        eventBus.on('ended', () => {
            try { this.$playerbarContainer.style.display = 'none'; } catch(e) {}
        });
        // Also hide when a track is deleted (in case it was the current)
        eventBus.on('track:deleted', () => {
            try { this.$playerbarContainer.style.display = 'none'; } catch(e) {}
        });
	}
}

// Inicializar aplicación
window.addEventListener('DOMContentLoaded', () => {
	const app = new App();
	app.init();
	window._app = app; // debug convenience
});
