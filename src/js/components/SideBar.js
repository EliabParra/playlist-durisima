import LocalStorageManager from '../services/DB/LocalStorageManager.js';
import { musicDB } from '../services/DB/MusicDatabase.js';
import { eventBus } from '../lib/EventBus.js';

// SideBar (versión simplificada)
// Mantiene playlists en memoria y LocalStorage. NO usa IndexedDB ni blobs.
// TODO: Reemplazar almacenamiento local por IndexedDB (stores: playlists, media)
// TODO: Al crear playlist, persistir archivos (metadata) y asociar trackIds
// TODO: Cargar playlists existentes al iniciar desde DB

export class SideBar extends Fast {
  constructor(props) {
    super();
    this.name = 'SideBar';
    this.props = props;
    this.attachShadow({ mode:'open' });
    this.playlists = []; // { id, name, filesCount }
    this._selectedPlaylistId = null;
    this.built = () => {};
  }

  #getTemplate() {
    return `
      <div class="side-bar" id="sideBar">
        <div class="home-btn" id="homeBtn" title="Inicio"><i class="fa-solid fa-house"></i></div>
        <ul class="playlist-list" id="playlistList"></ul>
        <div class="add-playlist-btn" id="addPlaylistBtn" title="Crear playlist"><i class="fa-solid fa-plus"></i></div>
      </div>
    `;
  }

  async #getCss() { return await fast.getCssFile('SideBar'); }

  async #render() {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(await this.#getCss());
    this.shadowRoot.adoptedStyleSheets = [sheet];
    const tpl = document.createElement('template');
    tpl.innerHTML = this.#getTemplate();
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));
    this.$sideBar = this.shadowRoot.querySelector('#sideBar');
    this.$homeBtn = this.shadowRoot.querySelector('#homeBtn');
    this.$playlistList = this.shadowRoot.querySelector('#playlistList');
    this.$addPlaylistBtn = this.shadowRoot.querySelector('#addPlaylistBtn');
  }

  async #checkAttributes() {
    for(const attr of this.getAttributeNames()) {
      if(attr.startsWith('on')) { continue; }
      this[attr] = this.getAttribute(attr);
      this.shadowRoot.firstElementChild?.setAttribute(attr, this[attr]);
    }
  }

  async #checkProps() {
    if(!this.props) return;
    for(const k in this.props) {
      switch(k) {
        case 'style':
          for(const prop in this.props.style) { this.shadowRoot.firstElementChild.style[prop] = this.props.style[prop]; }
          break;
        default:
          this.setAttribute(k, this.props[k]);
      }
    }
  }

  async connectedCallback() {
    await this.#render();
    await this.#checkAttributes();
    await this.#checkProps();
    await this.ensureFontAwesome();

    try {
      await musicDB.init();
      const savedPlaylists = await musicDB.getAllPlaylists();
      this.playlists = savedPlaylists.map(pl => ({
        id: pl.id,
        name: pl.name,
        filesCount: pl.trackCount
      }));
    } catch (error) {
      console.error('Error loading playlists from DB', error);
    }

    this._bindEvents();
    this.updatePlaylistList();
    this.built();

    eventBus.on('playlist:updated', () => {
      this._reloadPlaylistsFromDB();
    });
    // Carga inicial
    this._reloadPlaylistsFromDB();
  }

  async _reloadPlaylistsFromDB() {
    try {
      const saved = await musicDB.getAllPlaylists();
      this.playlists = saved.map(pl => ({ id: pl.id, name: pl.name, filesCount: pl.trackCount }));
      this.updatePlaylistList();
    } catch(e) { console.error(e); }
  }

  _bindEvents() {
    this.$homeBtn.addEventListener('click', ()=> this.showHome());
    this.$addPlaylistBtn.addEventListener('click', ()=> this.showAddPlaylist());
  }

  addToBody() { document.body.appendChild(this) }

  showAddPlaylist() {
    // SweetAlert2 modal con drag & drop y selección múltiple
    let filesStorage = [];
    Swal.fire({
      title: 'Crear playlist',
      html: `
        <div class="playlist-name-container">
          <label for="playlistName" class="playlist-name-label">Nombre de la playlist</label>
          <input type="text" class="playlist-name" id="playlistName" placeholder="Mi Playlist" />
        </div>
        <div id="dropArea" class="custom-drop-zone">
          <div class="drop-icon"><i class="fa-solid fa-upload"></i></div>
          <p class="drop-text">Arrastra archivos aquí o haz click</p>
          <input type="file" id="fileElem" multiple accept="audio/*,video/*" style="display:none" />
          <div id="fileListContainer"></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: () => {
        const popup = Swal.getPopup();
        const dropArea = popup.querySelector('#dropArea');
        const fileInput = popup.querySelector('#fileElem');
        const fileListContainer = popup.querySelector('#fileListContainer');

        const preventDefaults = e => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter','dragover','dragleave','drop'].forEach(ev => dropArea.addEventListener(ev, preventDefaults, false));
        ['dragenter','dragover'].forEach(ev => dropArea.addEventListener(ev, ()=> dropArea.classList.add('highlight'), false));
        ['dragleave','drop'].forEach(ev => dropArea.addEventListener(ev, ()=> dropArea.classList.remove('highlight'), false));
        dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
        dropArea.addEventListener('click', ()=> fileInput.click());
        fileInput.addEventListener('change', ()=> handleFiles(fileInput.files));

        function handleFiles(fileList) {
          const arr = Array.from(fileList);
          if(!arr.length) return;
          filesStorage = arr;
          let html = '';
          arr.forEach(f => {
            html += `<div class="file-item"><span>${f.name}</span><span>${(f.size/1024).toFixed(1)} KB</span></div>`;
          });
          fileListContainer.innerHTML = html;
          fileListContainer.style.display = 'block';
        }
      },
      preConfirm: () => {
        const playlistName = Swal.getPopup().querySelector('#playlistName').value.trim();
        if(!playlistName) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
        return { name: playlistName, files: filesStorage };
      }
    }).then(async (res) => {
      if(res.isConfirmed) {
        const { name, files } = res.value;

        Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

        try {
          const newPl = await musicDB.createPlaylistWithTracks(name, files);
          this.playlists.push({
            id: newPl.id,
            name: newPl.name,
            filesCount: newPl.trackCount
          });
          this.updatePlaylistList();

          Swal.fire('Playlist creada', `${name} guardada correctamente con (${files.length} archivo${files.length > 1 ? 's' : ''})`, 'success');
        } catch (error) {
          Swal.fire('Error', 'No se pudo guardar la playlist', 'error');
        }
      }
    });
  }

  updatePlaylistList() {
    this.$playlistList.innerHTML = '';
    for(const pl of this.playlists) {
      const li = document.createElement('li');
      li.textContent = pl.name.split(' ').map(w=>w[0]).join('');
      li.dataset.id = pl.id;
      li.className = 'playlist-item' + (pl.id === this._selectedPlaylistId ? ' selected' : '');
      li.title = `${pl.name} (${pl.filesCount} archivos)`;
      li.addEventListener('click', ()=>{
        this._selectedPlaylistId = pl.id;
        this._persistState();
        this.updatePlaylistList();
        this.dispatchEvent(new CustomEvent('playlist:selected', { detail:{ id: pl.id }}));
      });
      this.$playlistList.appendChild(li);
    }
  }

  showHome() {
    this._selectedPlaylistId = null;
    this._persistState();
    this.updatePlaylistList();
    this.dispatchEvent(new CustomEvent('home:selected'));
  }

  _persistState() {
    LocalStorageManager.setItem('ui.playlists', this.playlists);
    LocalStorageManager.setItem('ui.currentPlaylistId', this._selectedPlaylistId);
  }

  _restoreState() {
    const pls = LocalStorageManager.getItem('ui.playlists');
    if(Array.isArray(pls)) this.playlists = pls;
    this._selectedPlaylistId = LocalStorageManager.getItem('ui.currentPlaylistId') || null;
  }
}

if(!customElements.get('side-bar')) {
  customElements.define('side-bar', SideBar);
}
