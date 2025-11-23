// Importar la clase base Fast
import './lib/Fast.js';
import './components/SideBar.js';
import './components/SearchBar.js';
import './components/PlayerBar.js';
import { eventBus } from './lib/EventBus.js';

// MainContent placeholder (pantallas dinámicas futuras)
class MainContent extends Fast {
	constructor(){
		super();
		this.name = 'MainContent';
		this.attachShadow({ mode:'open' });
		this.currentView = 'home';
	}
	#template(){
		return `<div class="main-content" id="mainContent"></div>`;
	}
	async connectedCallback(){
		const tpl = document.createElement('template');
		tpl.innerHTML = this.#template();
		this.shadowRoot.appendChild(tpl.content.cloneNode(true));
		this.$root = this.shadowRoot.querySelector('#mainContent');
		this.renderHome();
	}
	renderHome(){
		this.currentView = 'home';
		this.$root.innerHTML = `
			<div class="view-home fade-in">
				<h2>Inicio</h2>
				<p>Selecciona una playlist a la izquierda o usa la búsqueda para filtrar contenidos.</p>
				<p class="hint">(Esta área cambiará con componentes de pantallas futuras).</p>
			</div>`;
	}
	renderPlaylist(playlistId){
		this.currentView = 'playlist';
		this.$root.innerHTML = `
			<div class="view-playlist fade-in">
				<h2>Playlist</h2>
				<p>ID seleccionada: <strong>${playlistId}</strong></p>
				<p>TODO: cargar metadata y tracks desde IndexedDB.</p>
			</div>`;
		// TODO: fetch playlist metadata & tracks from IndexedDB (store: playlists, media)
	}
	renderSearchResults(query){
		this.currentView = 'search';
		this.$root.innerHTML = `
			<div class="view-search fade-in">
				<h2>Resultados de búsqueda</h2>
				<p>Query: <strong>${query}</strong></p>
				<p>TODO: ejecutar búsqueda en la playlist actual o global usando IndexedDB.</p>
			</div>`;
		// TODO: perform search against indexed store (tracks, metadata)
	}
}

if(!customElements.get('main-content')){
	customElements.define('main-content', MainContent);
}

class App {
	constructor(){
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

	init(){
		this.mountComponents();
		this.setupEvents();
		// Future: restore persisted state (queue, last track, volume, playlist selection)
		// TODO: cargar estado inicial de IndexedDB (playlists, último track, volumen, posición)
	}

	mountComponents(){
		// Crear instancias custom elements
		this.sideBar = document.createElement('side-bar');
		this.searchBar = document.createElement('search-bar');
		this.playerBar = document.createElement('player-bar');
		this.mainContent = document.createElement('main-content');

		// Montar en contenedores
		this.$sidebarContainer.appendChild(this.sideBar);
		this.$searchbarContainer.appendChild(this.searchBar);
		this.$playerbarContainer.appendChild(this.playerBar);
		this.$contentContainer.appendChild(this.mainContent);
		// Crear stage para video playback dentro de main content (fuera de player bar)
		this.$videoStage = document.createElement('div');
		this.$videoStage.id = 'video-stage';
		this.$videoStage.className = 'video-stage hidden';
		this.mainContent.shadowRoot.querySelector('#mainContent').prepend(this.$videoStage);
	}

	setupEvents(){
		// Playlist seleccionada
		this.sideBar.addEventListener('playlist:selected', (e)=>{
			const { id } = e.detail;
			this.mainContent.renderPlaylist(id);
			// TODO: cargar queue de la playlist seleccionada y pasarla al reproductor
			// eventBus.emit('playlist:load', { id });
		});
		// Volver a home
		this.sideBar.addEventListener('home:selected', ()=>{
			this.mainContent.renderHome();
		});
		// Búsqueda
		this.searchBar.addEventListener('search:query', (e)=>{
			const { query } = e.detail;
			this.mainContent.renderSearchResults(query);
			// TODO: filtrar resultados reales
		});
		// Escuchar cambio de track para reflejar metadata (si se quisiera mostrar en main)
		eventBus.on('track:change', (descriptor)=>{
			// Placeholder: podríamos actualizar vista si está mostrando detalles
			// TODO: opcional - sincronizar vista de pista en MainContent
		});
		// Cuando media se carga determinar si es video y mover elemento
		eventBus.on('media:loaded', ({ type })=>{
			const el = this.playerBar.mediaController.mediaEl;
			if(!el) return;
			if(type === 'video'){
				// Mover video al stage central
				this.$videoStage.classList.remove('hidden');
				this.$videoStage.innerHTML = '';
				this.$videoStage.appendChild(el);
				el.style.display = 'block';
				el.setAttribute('playsinline','');
				// Ajustar clase para estilos
				el.classList.add('video-element');
			} else {
				// Revertir a audio: ocultar stage y devolver elemento al player wrapper
				this.$videoStage.classList.add('hidden');
				this.playerBar.shadowRoot.querySelector('#playerWrapper').appendChild(el);
				el.style.display = 'none';
			}
		});
	}
}

// Inicializar aplicación
window.addEventListener('DOMContentLoaded', ()=>{
	const app = new App();
	app.init();
	window._app = app; // debug convenience
});
