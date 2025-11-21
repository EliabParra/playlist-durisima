export const Fast = class extends HTMLElement {
    constructor(props){
        super();
        this.modules = new Map();
        this.instances = new Map();
        if(props) this.props = props;
        this.actZIndex = 0;
        this.cssFiles = new Map();
    }

    async ensureFontAwesome(){
        // Usa cache global para evitar múltiples descargas
        if(!window.__faCss){
            try{
                const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
                window.__faCss = await res.text();
            }catch(e){
                return null; // fallo silencioso
            }
        }
        if(this.shadowRoot && window.__faCss){
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(window.__faCss);
            // Evitar duplicar hoja si ya se añadió
            const already = this.shadowRoot.adoptedStyleSheets.some(s => {
                try { return s.cssRules.length && s.cssRules[0].cssText.includes('Font Awesome'); } catch(e){ return false; }
            });
            if(!already){
                this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, sheet];
            }
            return sheet;
        }
        return null;
    }

    async getCssFile(fileName) {
        if(!this.cssFiles.has(fileName)){
            let css = await fetch(fast.routes.css+fileName+".css").then((response) => response.text());
            if(!this.cssFiles.has(fileName)) {this.cssFiles.set(fileName, css);};
            return css;
        }
        else{
            return this.cssFiles.get(fileName);
        }
    }

    getMaxZIndex(){
        fast.actZIdx++;
        return fast.actZIdx;
    }
    
    getInstance(id){
        let e = document.getElementById(id);
        if(e) return e; 
        else 
            if(this.instances.has(id)){ return this.instances.get(id) }else {
            return null
        }
    }

    getTextWidth(text, font) {
        let span = document.createElement("span");
        span.style.visibility = "hidden";
        span.style.position = "absolute";
        span.style.whiteSpace = "nowrap";
        span.style.font = font; 
        span.textContent = text;
        document.body.appendChild(span);
        let width = span.offsetWidth;
        document.body.removeChild(span);
        return width;
    }

    parseBoolean(val){ return (String(val).toLowerCase() === 'true'); }

    async getClass(className){
        if(!this.modules.has(className)){
            let clase = await import('../components/'+className+'.js');
            this.modules.set(className, clase[className]); 
        }
        return  this.modules.get(className);
    }

    addHTMLInstance(obj){
        if(!this.instances.has(obj.id)){
            this.instances.set(obj.id, obj);
        }
        return this;
    }

    hide(){this.hidden = true; return this}
    show(){this.hidden = false; return this}

    async createInstance(className, props){
        try{                    
            if(!this.instances.has(props.id)){
                props.notify = false;
                let newClass = await this.getClass(className);   
                let i = new newClass(props);                
                this.instances.set(props.id, i);                
                return i;
            }
            else{ return this.instances.get(props.id) }
        }
        catch(e){
            console.log('No se pudo crear la instancia');
            return null;
        }   
    } 
}

if (!customElements.get ('x-fast')) {
    customElements.define ('x-fast', Fast);
}

window.Fast = Fast;
window.fast = new Fast();
fast.actZIdx = 0;
fast.routes = {
    css : '../src/css/',
    images : './assets/img/',
    icons : './assets/img/icons/' 
}
