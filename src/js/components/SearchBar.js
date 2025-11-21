import { Fast } from '../lib/Fast.js';

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
        // TODO: mostrar un modal con drag and drop para añadir archivos a la playlist
    }

    showSettings() {
        Swal.fire({
            title: 'Configuración',
            theme: 'dark',
            html: `
                <label for="playlistName">Nombre de la playlist</label>
                <input type="text" class="playlist-name" id="playlistName">
            `,
            showCloseButton: true,
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
                    timer: 1000
                })
            } else if (result.isDenied) {
                // TODO: eliminar la playlist
                Swal.fire({
                    title: "Are you sure?",
                    theme: "dark",
                    text: "You won't be able to revert this!",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Yes, delete it!"
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                        title: "Deleted!",
                        theme: 'dark',
                        text: "Your file has been deleted.",
                        icon: "success"
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
