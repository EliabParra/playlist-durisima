import LocalStorageManager from '../services/DB/LocalStorageManager.js';

// SideBar (versión simplificada)
// Mantiene playlists en memoria y LocalStorage. NO usa IndexedDB ni blobs.
// TODO: Reemplazar almacenamiento local por IndexedDB (stores: playlists, media)
// TODO: Al crear playlist, persistir archivos (metadata) y asociar trackIds
// TODO: Cargar playlists existentes al iniciar desde DB

export class SideBar extends Fast {
  constructor(props){
    super();
    this.name = 'SideBar';
    this.props = props;
    this.attachShadow({ mode:'open' });
    this.playlists = []; // { id, name, filesCount }
    this._selectedPlaylistId = null;
    this.built = () => {};
  }

  #getTemplate(){
    return `
      <div class="side-bar" id="sideBar">
        <div class="home-btn" id="homeBtn" title="Inicio"><i class="fa-solid fa-house"></i></div>
        <ul class="playlist-list" id="playlistList"></ul>
        <div class="add-playlist-btn" id="addPlaylistBtn" title="Crear playlist"><i class="fa-solid fa-plus"></i></div>
      </div>
    `;
  }

  async #getCss(){ return await fast.getCssFile('SideBar'); }

  async #render(){
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

  async #checkAttributes(){
    for(const attr of this.getAttributeNames()){
      if(attr.startsWith('on')){ continue; }
      this[attr] = this.getAttribute(attr);
      this.shadowRoot.firstElementChild?.setAttribute(attr, this[attr]);
    }
  }

  async #checkProps(){
    if(!this.props) return;
    for(const k in this.props){
      switch(k){
        case 'style':
          for(const prop in this.props.style){ this.shadowRoot.firstElementChild.style[prop] = this.props.style[prop]; }
          break;
        default:
          this.setAttribute(k, this.props[k]);
      }
    }
  }

  async connectedCallback(){
    await this.#render();
    await this.#checkAttributes();
    await this.#checkProps();
    await this.ensureFontAwesome();
    this._restoreState();
    this._bindEvents();
    this.updatePlaylistList();
    this.built();
  }

  _bindEvents(){
    this.$homeBtn.addEventListener('click', ()=> this.showHome());
    this.$addPlaylistBtn.addEventListener('click', ()=> this.showAddPlaylist());
  }

  addToBody(){ document.body.appendChild(this); }

  showAddPlaylist(){
    // UI mínima (sin SweetAlert para mantener simplicidad). Se puede volver a añadir.
    const name = prompt('Nombre de la playlist:');
    if(!name) return;
    // Selección de archivos (opcional)
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,video/*';
    input.onchange = () => {
      const files = Array.from(input.files);
      this._createPlaylist(name, files);
    };
    input.click();
  }

  _createPlaylist(name, files){
    const id = 'pl-' + crypto.randomUUID();
    this.playlists.push({ id, name, filesCount: files.length });
    this._selectedPlaylistId = id;
    this._persistState();
    this.updatePlaylistList();
    // TODO: Persistir playlist y archivos en IndexedDB (media + playlists stores)
  }

  updatePlaylistList(){
    this.$playlistList.innerHTML = '';
    for(const pl of this.playlists){
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

  showHome(){
    this._selectedPlaylistId = null;
    this._persistState();
    this.updatePlaylistList();
    this.dispatchEvent(new CustomEvent('home:selected'));
  }

  _persistState(){
    LocalStorageManager.setItem('ui.playlists', this.playlists);
    LocalStorageManager.setItem('ui.currentPlaylistId', this._selectedPlaylistId);
  }

  _restoreState(){
    const pls = LocalStorageManager.getItem('ui.playlists');
    if(Array.isArray(pls)) this.playlists = pls;
    this._selectedPlaylistId = LocalStorageManager.getItem('ui.currentPlaylistId') || null;
  }
}

if(!customElements.get('side-bar')){
  customElements.define('side-bar', SideBar);
}
