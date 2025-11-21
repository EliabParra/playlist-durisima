const fs = require('fs');
const path = require('path');

let j = JSON.parse(fs.readFileSync("componentConfig.json"));
let name = j.pathComponent+j.name+'.js';
let css = j.pathCss+j.name+'.css';
let html = j.pathHTML+j.name+'.html';

// Calcular ruta relativa para importar Fast.js
function getRelativePath(from, to) {
    const fromPath = path.dirname(from.replace('./', ''));
    const toPath = to.replace('./', '');
    let relative = path.relative(fromPath, toPath);
    // En Windows, convertir \ a /
    relative = relative.replace(/\\/g, '/');
    // Si no comienza con . agregar ./
    if (!relative.startsWith('.')) {
        relative = './' + relative;
    }
    return relative;
}

const fastImportPath = getRelativePath(j.pathComponent, 'src/js/lib/Fast.js');
const componentImportPath = getRelativePath('./', j.pathComponent + j.name + '.js');

let dataFile =`
import { Fast } from '${fastImportPath}';

export class ${j.name} extends Fast {
    constructor(props) {
        super();  
        this.name = "${j.name}";
        this.props = props;
        this._sts = false;
        this.built = () => {}; 
        this.attachShadow({mode:'open'});
        this._isBuilt = false;
    }

    #getTemplate() { return \`
            <div class='${j.xTab}'></div>
        \`    
    }

    async #getCss() { 
        return await fast.getCssFile("${j.name}");
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
                            await fast.createInstance('${j.name}', {'id': this[attr]});
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
                                    await fast.createInstance('${j.name}', {'id': this[attr]})
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
        await this.#checkAttributes();
        await this.#checkProps();      
        this._isBuilt = true;  
        this.built();
    }

    addToBody() {document.body.appendChild(this);}
}

if (!customElements.get ('${j.xTab}')) {
    customElements.define ('${j.xTab}', ${j.name});
}
`;

let defaultCss = `
.${j.name}{
    display : flex;
    position : absolute;
    left : 0px;
    top : 0px;
    background-color : rgb(8, 143, 136);
    color : white;
    align-items : center;
    justify-content : center;
    border : 0px;
    transition: 0.1s box-shadow;
    width: 25%;
    height:25%;
}

.${j.name}:hover {
    transition: all 0.2s ease-in-out;
    box-shadow: 3px 2px 22px 1px rgba(0, 0, 0, 0.24);
    color : orange;
    cursor:pointer;
}
` 

let defaultHTML = `
<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${j.name} - Demo</title>
        <script type="module" src="./src/js/lib/Fast.js"></script>
    </head>
    <body>
        <script type="module">
            import { ${j.name} } from './src/js/components/${j.name}.js';
            
            let fastInit = async () => {
                let comp = await fast.createInstance("${j.name}", {
                    'id':'My${j.name}JS',
                    'style' : {'width' : '20%', 'height' : '20%'} ,
                });
                comp.built = ()=>{
                    console.log('Componente construido...');
                }
                comp.addToBody();
            };
            
            window.addEventListener('DOMContentLoaded', fastInit);
        </script>
        <${j.xTab} id="My${j.name}HTML" style="position:absolute; left:10px; top:100px; width: 100px; height:100px"></${j.xTab}>
    </body>
</html> 
`

let menu = ()=>{
    console.log('----------------------------------------------------------');
    console.log('1: crear el archivo de componente, si existe se reescribe..!');
    console.log('2: crear el archivo de css, si existe se reescribe..!');
    console.log('3: crear el archivo HTML, si existe se reescribe..!');
    console.log('4: crear todos los archivos, si existen se reescriben..!');
    console.log('0: salir');
    console.log('----------------------------------------------------------');
}

let msg = (m)=>{
    console.log('');
    console.log(m);
}

// Inicializar menú siempre, incluso si el archivo aún no existe
process.stdin.resume();
process.stdin.setEncoding('utf8');
menu();

if(!fs.existsSync(name)) {
    msg(`INFO: El archivo de componente '${name}' todavía no existe. Usa opción 1 o 4 para crear.`);
}
if(!fs.existsSync(css)) {
    msg(`INFO: El archivo CSS '${css}' todavía no existe. Usa opción 2 o 4 para crear.`);
}
if(!fs.existsSync(html)) {
    msg(`INFO: El archivo HTML '${html}' todavía no existe. Usa opción 3 o 4 para crear.`);
}

process.stdin.on("data", (resp) => {
    const ensureDir = (filePath)=>{
        const dir = path.dirname(filePath.replace(/\\/g,'/'));
        if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
    }
    switch(resp.toLowerCase().trim()) {
        case '1' : {
            ensureDir(name);
            fs.writeFileSync(name, dataFile);
            msg('INFO: Archivo de componente creado...');
            menu();
            break;
        }
        case '2': {
            ensureDir(css);
            fs.writeFileSync(css, defaultCss);
            msg('INFO: Archivo CSS creado...');
            menu();
            break;                
        }
        case '3': {
            ensureDir(html);
            fs.writeFileSync(html, defaultHTML);
            msg('INFO: Archivo HTML creado...');
            menu();
            break;                
        }
        case '4' : {
            ensureDir(name);
            fs.writeFileSync(name, dataFile);
            msg('INFO: Archivo de componente creado...');
            ensureDir(css);
            fs.writeFileSync(css, defaultCss);
            msg('INFO: Archivo CSS creado...');
            ensureDir(html);
            fs.writeFileSync(html, defaultHTML);
            msg('INFO: Archivo HTML creado...');
            menu();
            break;
        }
        case '0' : {
            console.log("Adios..!")
            process.exit();
        }
        default : menu();
    }
});
