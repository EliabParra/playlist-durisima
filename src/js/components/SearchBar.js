import { Fast } from '../lib/Fast.js';
import * as C from '../constants.js';

export class SearchBar extends Fast {
    constructor(props) {
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
                    if(attr.substring(0,2)!="on") {
                        this[attr] = this.getAttribute(attr);
                        this.mainElement.setAttribute(attr, this[attr]);
                    }
                    else{
                        let f = this[attr];
                        this[attr] = ()=>{ if(!this._disabled) f() };
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
                if(this.props) {
                    for(let attr in this.props) {
                        switch(attr) {
                            case 'style' :
                                for(let attrcss in this.props.style) this.mainElement.style[attrcss] = this.props.style[attrcss];
                                break;
                            case 'events' : 
                                for(let attrevent in this.props.events) {
                                    this.mainElement.addEventListener(attrevent, ()=>{
                                        if(!this._disabled)this.props.events[attrevent]()})}
                                break;
                            default : 
                                this.setAttribute(attr, this.props[attr]);
                                this[attr] = this.props[attr];
                                if(attr==='id') {
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
        this.$settings.addEventListener('click', () => { this.showSettings() })
        this.$addFiles.addEventListener('click', () => { this.showAddFiles() })
        this.$searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.search(this.$searchInput.value)
            }
        })
    }

    search(query) {
        // TODO: buscar archivos en la playlist
    }

    showAddFiles() {
        let filesStorage = [];

        Swal.fire({
            title: 'Subir Archivos',
            theme: 'dark',
            html: `
                <div id="dropArea" class="custom-drop-zone">
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
                // Retornamos los archivos para procesarlos en el .then()
                // Opcional: Podrías llamar a guardarEnIndexedDB aquí y usar showLoading()
                return filesStorage;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const archivosAProcesar = result.value;

                // Mostramos un loading mientras IndexedDB trabaja (es rápido, pero buena práctica)
                Swal.fire({
                    title: 'Guardando en la playlist...',
                    theme: 'dark',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        
                        // TODO: guardar en indexedDB
                            // .then((cantidad) => {
                            //     Swal.fire(
                            //         '¡Guardado!',
                            //         `Se han almacenado ${cantidad} archivos en IndexedDB localmente.`,
                            //         'success'
                            //     );
                            // })
                            // .catch((error) => {
                            //     Swal.fire('Error', error, 'error');
                            // });
                    }
                });
            }
        });
    }

    showSettings() {
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
            confirmButtonText: "Guardar",
            denyButtonText: `Eliminar`,
        }).then((result) => {
            if (result.isConfirmed) {
                // TODO: guardar el nombre de la playlist
                Swal.fire({
                    title: '¡Guardado!',
                    theme: 'dark',
                    icon: 'success',
                    showCancelButton: false,
                    showCloseButton: false,
                    showConfirmButton: false,
                    timer: 1000
                })
            } else if (result.isDenied) {
                // TODO: eliminar la playlist
                Swal.fire({
                    title: "¿Estás seguro?",
                    theme: "dark",
                    text: "No podrás revertir esto!",
                    icon: "warning",
                    showCancelButton: true,
                    showCloseButton: false,
                    confirmButtonText: "Sí, eliminar!",
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            title: "¡Eliminado!",
                            theme: 'dark',
                            text: "Tu playlist ha sido eliminada.",
                            icon: "success",
                            showCancelButton: false,
                            showCloseButton: false,
                            showConfirmButton: false,
                            timer: 1000
                        });
                    }
                });
            }
        })
    }
}

if (!customElements.get ('search-bar')) {
    customElements.define ('search-bar', SearchBar);
}
