import { Fast } from '../lib/Fast.js';
import * as C from '../constants.js';
import { musicDB } from '../services/DB/MusicDatabase.js';
import LocalStorageManager from '../services/DB/LocalStorageManager.js';
import { eventBus } from '../lib/EventBus.js';

export class SearchBar extends Fast {
    constructor(props, renderPlaylist = () => {}) {
        super();
        this.name = "SearchBar";
        this.props = props;
        this._sts = false;
        this.built = () => {};
        this.attachShadow({mode:'open'});
        this._isBuilt = false;
    }

    #getTemplate() { 
        return `
            <div class='search-bar' id='searchBar'>
                <button class='settings' id='settings' title='Configuración'><i class="fa-solid fa-gear"></i></button>
                <div class='search-input-container'>
                    <input type='text' class='search-input' id='searchInput' placeholder='Buscar en esta playlist...'></input>
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <button class='add-files' id='addFiles' title='Añadir archivos a la playlist'><i class="fa-solid fa-file-circle-plus"></i></button>
            </div>
        `
    }

    async #getCss() { 
        return await fast.getCssFile("SearchBar");
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
                this.$searchBar = this.shadowRoot.querySelector('#searchBar');
                this.$settings = this.shadowRoot.querySelector('#settings');
                this.$searchInput = this.shadowRoot.querySelector('#searchInput');
                this.$addFiles = this.shadowRoot.querySelector('#addFiles');
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
                            await fast.createInstance('SearchBar', {'id': this[attr]});
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
                                    await fast.createInstance('SearchBar', {'id': this[attr]})
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
        this.setupEventListeners();
        this._isBuilt = true;
        this.built();
    }

    addToBody() { document.body.appendChild(this) }

    setupEventListeners() {
        this.$settings.addEventListener('click', () => this.showSettings());
        this.$addFiles.addEventListener('click', () => this.showAddFiles());
        
        // Búsqueda al presionar Enter
        this.$searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const query = this.$searchInput.value.trim();
                if (query) {
                    // Emitimos evento para que App.js maneje la vista
                    eventBus.emit('search:query', { query });
                }
            }
        });
        
        // Opcional: Búsqueda al hacer click en la lupa
        this.$searchInput.nextElementSibling?.addEventListener('click', () => {
            const query = this.$searchInput.value.trim();
            if (query) eventBus.emit('search:query', { query });
        });
    }

    search(query) {
        this.dispatchEvent(new CustomEvent('search:query', { detail:{ query } }));
    }

    showAddFiles() {
        const currentId = LocalStorageManager.getItem('ui.currentPlaylistId');
        if (!currentId) {
            return Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Primero selecciona una playlist del menú lateral para añadir canciones.',
                timer: 3000
            });
        }

        let filesStorage = [];
        Swal.fire({
            title: 'Subir Archivos',
            theme: 'dark',
            html: `
                <div id="dropArea" class="custom-drop-zone" style="margin-top: 0;">
                    <div class="drop-icon"><i class="fa-solid fa-upload"></i></div>
                    <p class="drop-text">Arrastra tu archivo aquí o haz click</p>
                    <input type="file" id="fileElem" multiple accept="${C.FILE_TYPES.VIDEO.join(', ')}, ${C.FILE_TYPES.AUDIO.join(', ')}" style="display:none">
                    <div id="fileListContainer"></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Subir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            didOpen: () => {
                const dropArea = document.querySelector('#dropArea');
                const fileInput = document.querySelector('#fileElem');
                const fileListContainer = document.querySelector('#fileListContainer');

                // --- Lógica Drag & Drop (Igual que antes) ---
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropArea.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
                });
                ['dragenter', 'dragover'].forEach(eventName => {
                    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
                });
                ['dragleave', 'drop'].forEach(eventName => {
                    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
                });

                dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
                dropArea.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', function() { handleFiles(this.files); });

                function handleFiles(files) {
                    if (files.length > 0) {
                        filesStorage = Array.from(files);
                        let listHtml = '';
                        filesStorage.forEach(file => {
                            listHtml += `
                                <div class="file-item">
                                    <span id="fileName">${file.name}</span>
                                    <span>${(file.size/1024).toFixed(1)} KB</span>
                                </div>
                            `;
                        });
                        fileListContainer.innerHTML = listHtml;
                        fileListContainer.style.display = 'block';
                        dropArea.style.borderColor = '#28a745';
                    }
                }
            },
            preConfirm: () => {
                if (filesStorage.length === 0) {
                    Swal.showValidationMessage('Selecciona al menos un archivo');
                    return false;
                }
                return filesStorage;
            }
        }).then(async (result) => { // <--- AÑADIR ASYNC AQUÍ
            if (result.isConfirmed) {
                const archivosNuevos = result.value;

                // 1. Obtener ID de la playlist actual desde LocalStorage
                const currentId = LocalStorageManager.getItem('ui.currentPlaylistId');

                if (!currentId) {
                    return Swal.fire('Error', 'Debes seleccionar una playlist primero.', 'warning');
                }

                // 2. Mostrar Loading
                Swal.fire({
                    title: 'Guardando archivos...',
                    text: 'Esto puede tardar un poco si son videos grandes.',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    // 3. Guardar en IndexedDB usando nuestra función nueva
                    await musicDB.addTracksToPlaylist(currentId, archivosNuevos);
                    this.renderPlaylist(currentId);
                    eventBus.emit('playlist:updated');
                    eventBus.emit('playlist:selected', { id: currentId }); // Para refrescar tabla central
                    Swal.fire({
                        icon: 'success',
                        title: '¡Guardado!',
                        text: `Se añadieron ${archivosNuevos.length} archivos.`,
                        timer: 1500,
                        showConfirmButton: false
                    });
                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'No se pudieron guardar los archivos.', 'error');
                }
            }
        });
    }

    showSettings() {
        const currentId = LocalStorageManager.getItem('ui.currentPlaylistId');
        if (!currentId) {
            return Swal.fire('Error', 'No hay ninguna playlist seleccionada para editar.', 'error');
        }

        Swal.fire({
            title: 'Configuración',
            theme: 'dark',
            html: `
                <div class="playlist-name-container">
                    <label for="playlistName" class="playlist-name-label">Nombre de la playlist</label>
                    <input type="text" class="playlist-name" id="playlistName">
                </div>
            `,
            showCloseButton: false,
            showDenyButton: true,
            confirmButtonText: "Renombrar",
            denyButtonText: `Eliminar`,
        }).then(async (result) => {
            if (result.isConfirmed) {
                const name = document.querySelector('#playlistName').value;
                if (name) {
                    await musicDB.updatePlaylistName(currentId, name);
                    eventBus.emit('playlist:updated'); // Refrescar Sidebar
                    // Refrescar título en MainContent (opcional, o recargar playlist)
                    eventBus.emit('playlist:selected', { id: currentId }); 
                    Swal.fire('Nombre actualizado', '', 'success');
                }
            } else if (result.isDenied) {
                Swal.fire({
                    title: '¿Estás seguro?',
                    text: "Se borrarán todos los archivos.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, borrar',
                    confirmButtonColor: '#d33'
                }).then(async (r) => {
                    if (r.isConfirmed) {
                        await musicDB.deletePlaylist(currentId);
                        LocalStorageManager.removeItem('ui.currentPlaylistId');
                        eventBus.emit('playlist:updated'); // Refrescar Sidebar
                        eventBus.emit('home:selected'); // Ir a Home
                        Swal.fire('Eliminada', '', 'success');
                    }
                });
            }
        })
    }
}

if (!customElements.get ('search-bar')) {
    customElements.define ('search-bar', SearchBar);
}
