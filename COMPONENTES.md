# Sistema de Componentes Fast

Este proyecto incluye un sistema para crear componentes web personalizados basado en Web Components y Shadow DOM.

## Estructura

```
playlist-durisima/
├── componentCreator.js          # Generador de componentes
├── componentConfig.json         # Configuración del componente a crear
├── src/
│   ├── js/
│   │   ├── lib/
│   │   │   └── Fast.js         # Clase base para componentes
│   │   └── components/          # Tus componentes generados
│   └── css/                     # Estilos de componentes
└── examples/                    # Demos HTML de componentes
```

## Cómo crear un nuevo componente

### 1. Configurar el componente

Edita `componentConfig.json` con los datos de tu componente:

```json
{
    "name": "MiComponente",           // Nombre de la clase (PascalCase)
    "pathComponent": "./src/js/components/",
    "pathCss": "./src/css/",
    "pathHTML": "./examples/",
    "xTab": "mi-componente"           // Tag HTML (kebab-case)
}
```

### 2. Ejecutar el generador

#### Opción A: Script automatizado (PowerShell - Recomendado)

```powershell
.\crear-componente.ps1 -nombre MiComponente
```

O especificar el tag HTML manualmente:

```powershell
.\crear-componente.ps1 -nombre MiComponente -tag mi-componente
```

#### Opción B: Manual

```bash
node componentCreator.js
```

Verás un menú con opciones:
- `1`: Crear solo el archivo JavaScript del componente
- `2`: Crear solo el archivo CSS
- `3`: Crear solo el archivo HTML de demo
- `4`: Crear todos los archivos
- `0`: Salir

### 3. Lo que se genera

El generador crea 3 archivos:

**Component JS** (`src/js/components/MiComponente.js`):
- Clase que extiende `Fast`
- Usa Shadow DOM
- Métodos privados para template, CSS y render
- Gestión de props y atributos
- Custom element registrado

**CSS** (`src/css/MiComponente.css`):
- Estilos por defecto para el componente
- Encapsulados en Shadow DOM

**HTML Demo** (`examples/MiComponente.html`):
- Ejemplo de uso en HTML puro
- Ejemplo de uso con JavaScript

## Uso de componentes

### En HTML

```html
<script type="module" src="./src/js/lib/Fast.js"></script>
<script type="module" src="./src/js/components/MiComponente.js"></script>

<!-- Uso directo con atributos -->
<mi-componente id="comp1" style="width: 200px; height: 100px;"></mi-componente>
```

### En JavaScript

```javascript
import './src/js/lib/Fast.js';
import { MiComponente } from './src/js/components/MiComponente.js';

// Crear instancia con props
let comp = await fast.createInstance("MiComponente", {
    'id': 'miComp',
    'style': { 'width': '300px', 'height': '200px' },
    'events': {
        'click': () => console.log('clicked!')
    }
});

// Callback cuando el componente esté listo
comp.built = () => {
    console.log('Componente construido');
};

// Agregar al DOM
comp.addToBody();
// O también: document.body.appendChild(comp);
```

### Obtener referencia a un componente

```javascript
// Por ID
let comp = fast.getInstance('miComp');

// Mostrar/ocultar
comp.hide();
comp.show();
```

## Métodos disponibles en Fast

La clase `Fast` proporciona:

- `getCssFile(nombre)`: Carga y cachea archivos CSS
- `createInstance(clase, props)`: Crea componentes dinámicamente
- `getInstance(id)`: Obtiene referencia a un componente
- `getClass(nombre)`: Carga dinámicamente la clase de un componente
- `getTextWidth(texto, fuente)`: Calcula ancho de texto
- `parseBoolean(valor)`: Convierte string a booleano

## Personalización

Después de generar el componente, edita:

1. **Template HTML** en `#getTemplate()`: Define la estructura
2. **Estilos** en el archivo CSS generado
3. **Lógica** en el componente: agrega métodos, eventos, etc.

## Ejemplo completo

Ver el archivo HTML generado en `examples/` para un ejemplo funcional.
