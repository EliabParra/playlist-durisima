# Lógica y Arquitectura de la Aplicación

Este documento explica la arquitectura, componentes, flujo de datos y la lógica principal de la app, además de cómo extenderla y dónde conectar persistencia con IndexedDB.

## 1. Visión General
La aplicación sigue un enfoque modular con **Custom Elements** (Web Components) y un **EventBus** para comunicación desacoplada.

- `App`: Orquestador. Monta componentes, suscribe eventos y coordina la interacción.
- `SideBar`: Manejo y selección de playlists (estado mínimo + LocalStorage).
- `SearchBar`: Entrada de búsqueda y acciones de subida/ajustes.
- `PlayerBar`: Controles de reproducción y gestión de cola.
- `MainContent`: Área dinámica central para vistas (inicio, playlist, búsqueda) y escenario de video.
- `MediaController`: Capa que envuelve `<audio>/<video>` exponiendo una API neutral y emitiendo eventos.

### Layout (tipo Spotify)
Grid CSS principal (`.app-shell`):
- Áreas: `sidebar`, `header`, `content`, `player`.
- Fijas: Sidebar izquierda, Header arriba del Main, Player abajo.
- Dinámica: `MainContent` cambia de vista.

```
┌─────────────┬────────────────-───────────┐
│  SideBar    │  SearchBar (header)        │
│             ├────────────────────────────┤
│             │  MainContent (pantallas)   │
│             ├────────────────────────────┤
│             │  PlayerBar (reproductor)   │
└─────────────┴────────────────────────────┘
```

## 2. Componentes y Responsabilidades

### 2.1 App (`src/js/App.js`)
- Monta los componentes en contenedores definidos en `index.html`.
- Crea el **video stage** dentro de `MainContent` para reproducir video en el área central.
- Suscribe eventos clave:
  - `playlist:selected` → `MainContent.renderPlaylist(id)`.
  - `home:selected` → `MainContent.renderHome()`.
  - `search:query` o `Enter` en SearchBar → `MainContent.renderSearchResults(query)`.
  - `playlist:play` → Configurar cola y reproducir desde `PlayerBar`.
  - `media:loaded` → Mover `<video>` al stage central o devolver `<audio>` al `PlayerBar`.

### 2.2 SideBar (`src/js/components/SideBar.js`)
- Crea/selecciona playlists (en LocalStorage).
- Emite eventos:
  - `playlist:selected` con `{ id }`.
  - `home:selected`.
- TODO IndexedDB: reemplazar LocalStorage por stores `playlists` y `tracks`.

### 2.3 SearchBar (`src/js/components/SearchBar.js`)
- Input de búsqueda.
- Emite `search:query` al presionar Enter.
- Botón para subir archivos (usa SweetAlert2 con drag & drop).
- TODO IndexedDB: guardar archivos y realizar búsquedas reales.

### 2.4 PlayerBar (`src/js/components/PlayerBar.js`)
- Controles: `play`, `pause`, `seek`, `next`, `prev`, `setVolume`, `toggleMute`, `toggleShuffle`, `toggleRepeat`.
- Cola interna `_queue` y puntero `_queueIndex`.
- Emite y escucha eventos en `EventBus` (ej. `track:change`, `progress`).
- Se apoya en `MediaController` para manejar `<audio>/<video>`.
- TODO IndexedDB: persistir cola, último track, posición, volumen, shuffle/repeat.

### 2.5 MainContent (inline en `App.js`)
- Métodos:
  - `renderHome()` → Vista de bienvenida.
  - `renderPlaylist(playlistId)` → Lista de tracks; click para reproducir o eliminar.
  - `renderSearchResults(query)` → Listado de resultados; click para reproducir.
- Integra un **contenedor de video** permanente (stage) que se activa cuando el medio es de tipo `video`.
- Puede usar `musicDB` (si está presente) para obtener datos: `getTracksByPlaylist`, `getPlaylistName`, `searchTracks`, `deleteTrack`.

### 2.6 MediaController (`src/js/services/MediaController.js`)
- Crea `<audio>` o `<video>` según `type` y emite eventos de media:
  - `media:loaded`, `play`, `pause`, `ended`, `progress`, `volume:change`.
- Métodos clave:
  - `attachTo(container)` → acopla el elemento.
  - `load(src, { type })` → cambia tipo si es necesario (recrea el elemento) y asigna `src`.
  - `play()`, `pause()`, `seek(seconds)`, `setVolume(v)`, `toggleMute()`.

## 3. Flujo de Datos y Eventos

### 3.1 Selección de Playlist
1. `SideBar` emite `playlist:selected`.
2. `App` invoca `MainContent.renderPlaylist(id)`.
3. `MainContent` pide datos (vía `musicDB`, si existe) y renderiza la lista.
4. Click en un item emite `playlist:play` con `{ queue, startIndex }`.
5. `App` setea la cola en `PlayerBar`, carga el track y reproduce.

### 3.2 Búsqueda
1. `SearchBar` emite `search:query` (o `App` escucha Enter para obtener el input).
2. `App` invoca `MainContent.renderSearchResults(query)`.
3. Al hacer click en un resultado, se emite `playlist:play` para reproducir desde los resultados.

### 3.3 Reproducción
- `PlayerBar.loadMedia(descriptor)` → `MediaController.load(src, { type })`.
- Si `type === 'video'`, `MediaController` recrea `<video>` y emite `media:loaded`.
- `App` mueve el `<video>` al stage (`MainContent`) para mostrarlo en el centro.
- Progreso se refleja vía `progress` y UI del `PlayerBar`.

## 4. Escenario de Video (Stage)
- El `<video>` vive físicamente donde lo acople `MediaController` o donde lo mueva `App`.
- Logra mantener controles en `PlayerBar` y la reproducción visual en el centro.
- Para audio, el elemento se devuelve al contenedor del `PlayerBar` y se oculta (`display:none`).

## 5. Layout y Estilos
- `src/css/global.css` define variables (ancho sidebar, alto header/player, radio, colores) y el grid.
- `.app-content` tiene `overflow-y:auto` y `scrollbar-gutter: stable`.
- Fix de modales: overrides de SweetAlert2 para evitar salto de layout (`min-height:100dvh`, `overflow-y:scroll`, neutralizar `swal2-height-auto`).

## 6. Persistencia (Ahora y Futuro)
- Presente: `LocalStorageManager` para estado ligero (playlists y selección actual).
- Futuro: `IndexedDB` (p.e. `MusicDatabase.js` / `IndexedDBManager`) con stores:
  - `playlists`: { id, name, order }
  - `tracks`: { id, playlistId, title, type, src, artist, cover }
  - `mediaState`: { lastTrackId, lastPosition, volume, shuffle, repeat }

Puntos **TODO** marcados en código donde se guardará/leerá estado.

## 7. API Pública de Componentes

### PlayerBar
- `loadMedia(descriptor)`
- `play()`, `pause()`
- `seek(seconds)`
- `setVolume(v)`, `toggleMute()`
- `setQueue(list)`, `next()`, `prev()`
- `toggleShuffle()`, `toggleRepeat()`

Eventos: `track:change`, `queue:change`, `progress`, `play`, `pause`, `ended`.

### SearchBar
- `search(query)` (emite `search:query`).

### SideBar
- Eventos DOM: `playlist:selected`, `home:selected`.

### MainContent
- `renderHome()`
- `renderPlaylist(playlistId)`
- `renderSearchResults(query)`

## 8. Cómo Añadir Nuevas Pantallas
1. Crear un nuevo componente (p.e. `LibraryView`) que extienda `Fast` o `HTMLElement`.
2. Incluir su propio Shadow DOM y estilos.
3. Añadir método en `MainContent` para montarlo (`renderLibrary()`), limpiando y anexando el componente.
4. Disparar evento desde `SideBar` o `SearchBar` para invocar esa vista.

## 9. Buenas Prácticas Aplicadas
- Encapsulación de estilos con Shadow DOM.
- Comunicación desacoplada con EventBus.
- `App` como orquestador mínimo, manteniendo lógica interna en componentes.
- Comentarios `TODO` para futuras integraciones (IndexedDB).
- Animaciones suaves (CSS) con respeto a `prefers-reduced-motion`.

## 10. Detalles de Integración con SweetAlert2
- Tematización en `src/css/Swal.css`.
- Drag & drop para subida de archivos.
- Overrides de layout para evitar recortes al abrir modales.

## 11. Desarrollo y Pruebas
- Iniciar app abriendo `index.html` (no requiere bundler).
- Depurar con `window._app` (expuesto en `App.js`).
- Verificar eventos en `EventBus` y estados de cola en `PlayerBar`.

## 12. Roadmap de Escalabilidad
- Implementar `IndexedDB` real y reemplazar LocalStorage.
- `PlaylistView` con acciones (ordenar, filtrar, favoritos).
- Cache de metadata y portadas.
- Tema claro/oscuro con variables CSS alternativas.
- Fullscreen mejorado para video y controles de calidad.

## 13. Glosario de Eventos
| Evento | Emisor | Uso |
|-------|--------|-----|
| `playlist:selected` | SideBar | Cambiar vista a la playlist |
| `home:selected` | SideBar | Volver a inicio |
| `search:query` | SearchBar | Iniciar búsqueda |
| `playlist:play` | MainContent | Reproducir lista y posición |
| `track:change` | PlayerBar | Cambiar metadata UI |
| `queue:change` | PlayerBar | Actualización de cola |
| `media:loaded` | MediaController | Tipo/metadata cargada |
| `progress` | MediaController | Progreso de reproducción |
| `play`, `pause`, `ended` | MediaController | Estado del reproductor |

---
Este esquema busca mantener la app simple, estética y extensible. La orquestación en `App` y la comunicación por eventos permiten crecer sin acoplar excesivamente los componentes.
