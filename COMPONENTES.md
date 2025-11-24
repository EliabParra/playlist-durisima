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

## PlayerBar (Componente de Reproducción)

El componente `player-bar` proporciona una barra de reproducción tipo Spotify con soporte para audio y video, cola, shuffle, repeat, volumen y estado desacoplado mediante `EventBus`.

### API Pública

Métodos principales:

- `loadMedia(descriptor)`: Carga un medio. `descriptor = { id, src, type: 'audio'|'video', title, artist, cover }`
- `play()` / `pause()` / `togglePlay()`
- `seek(segundos)`
- `setVolume(fracción)` (0–1)
- `toggleMute()`
- `setQueue(array)` Establece la cola y empieza desde índice 0.
- `next()` / `prev()` Avanza retrocede en la cola (respeta shuffle)
- `toggleShuffle()`
- `toggleRepeat()` (loop simple)
- `destroy()` Limpia recursos internos.
- `attachVisualizer(callback)` Pivote para futura integración de visualización de waveform.

### Eventos (EventBus)

Se emiten a través del `eventBus`:
- `media:loaded` -> `{ duration, type }`
- `play` / `pause` / `ended`
- `error` -> Error del elemento media
- `progress` -> `{ currentTime, duration }` (throttle interno ~180ms)
- `volume:change` -> `{ volume, muted }`
- `mute:change` -> `{ muted }`
- `track:change` -> Descriptor completo del track
- `queue:change` -> `{ queue }`
- `queue:end` / `queue:start`
- `shuffle:change` -> `{ shuffle }`
- `repeat:change` -> `{ repeat }`

### Persistencia (TODO)

Existen comentarios `// TODO:` en el código para insertar más adelante la lógica con `LocalStorageManager` y/o `IndexedDBManager` para:
- Último track (`id` y `src`)
- Posición de reproducción periódica
- Volumen y estado mute
- Estado shuffle / repeat
- Cola completa e índice actual

### Uso rápido

```html
<script type="module" src="./src/js/lib/Fast.js"></script>
<script type="module" src="./src/js/components/PlayerBar.js"></script>
<player-bar id="player1"></player-bar>
<script type="module">
    import { eventBus } from './src/js/lib/EventBus.js';
    const pb = fast.getInstance('player1');
    pb.loadMedia({ id:'t1', src:'track.mp3', type:'audio', title:'Track 1', artist:'Artista' });
    pb.play();
    eventBus.on('progress', ({currentTime,duration}) => {/* actualizar UI externa si se desea */});
</script>
```

### Estilos y Responsivo

`PlayerBar.css` aplica paleta oscura `#121212` con acento `#1DB954` y se adapta en breakpoints ocultando metadata y reduciendo tamaño de botones en móviles.

### Accesibilidad

- Botones con `aria-label`
- Navegación teclado: `Space` (play/pause), `ArrowLeft/Right` (seek ±5s), `ArrowUp/Down` (volumen ±5%), `m` (mute)

### Ejemplo avanzado

Revisar `examples/PlayerBar.html` para cola con audio y video, shuffle y repeat.

