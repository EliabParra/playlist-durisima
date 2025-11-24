# Integración de Componentes y Arquitectura

Este documento describe cómo se integran los componentes principales (`SideBar`, `SearchBar`, `PlayerBar`) dentro de la clase orquestadora `App`, cómo funciona la comunicación entre ellos y cómo escalar hacia nuevas "pantallas" de contenido dinámico y futura persistencia con IndexedDB.

## 1. Objetivo de la Arquitectura
Layout tipo Spotify: barra lateral fija, barra de búsqueda arriba, reproductor abajo y área central dinámica para contenidos (playlists, búsqueda, detalles, etc.). `App` solo orquesta montaje y eventos; la lógica interna de cada componente queda encapsulada.

```
.app-shell (grid)
┌─────────────┬────────────────────────────┐
│  SideBar    │  SearchBar (header)        │
│             ├────────────────────────────┤
│             │  MainContent (pantallas)   │
│             ├────────────────────────────┤
│             │  PlayerBar (reproductor)   │
└─────────────┴────────────────────────────┘
```

## 2. Componentes Principales
### SideBar (`side-bar`)
- Maneja playlists simples en memoria + LocalStorage.
- Emite eventos:`playlist:selected`, `home:selected`.
- TODO IndexedDB: cargar playlists al iniciar, guardar nueva playlist y asociar sus tracks.

### SearchBar (`search-bar`)
- Captura input de búsqueda y emite `search:query` al presionar Enter.
- TODO IndexedDB: realizar búsquedas reales sobre tracks / metadata.

### PlayerBar (`player-bar`)
- Control de reproducción (`play`, `pause`, `seek`, volumen, loop, shuffle`).
- Emite y escucha eventos en `eventBus` (`track:change`, `queue:change`, etc.).
- TODO IndexedDB: persistir cola, último track, posición actual, volumen, estados de shuffle/repeat.

### MainContent (`main-content`)
- Placeholder para pantallas futuras.
- Métodos: `renderHome()`, `renderPlaylist(id)`, `renderSearchResults(query)`.
- TODO IndexedDB: cargar metadata de playlist y resultados de búsqueda.

## 3. App (`src/js/App.js`)
Responsable de:
- Localizar contenedores del layout (`#sidebar-container`, `#searchbar-container`, etc.).
- Crear instancias de cada custom element y montarlas.
- Suscribir eventos inter-componente y delegar a `MainContent`.
- Plan futuro: restaurar estado persistido al iniciar.

### Flujo de Inicialización
```js
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
```

### Puntos con TODO (IndexedDB)
- Cargar estado inicial (playlists, último track, volumen, posición).
- Al seleccionar playlist: cargar cola y metadatos.
- Búsqueda: ejecutar query contra índices (p.e. título, artista, tags).
- PlayerBar: persistir eventos de tiempo cada cierto intervalo.

## 4. Comunicación
- Eventos DOM propios de componentes (ej. `playlist:selected`).
- `EventBus` para eventos globales (ej. `track:change`).
- Se evita acoplamiento directo: cada componente emite y escucha eventos conocidos.

## 5. Añadir Nuevas Pantallas
Una pantalla debe ser un componente (o una simple vista) que se monta dentro de `MainContent`.

### Estrategia Simple
1. Crear clase `LibraryView` (por ejemplo) que extienda `HTMLElement` o `Fast`.
2. Incluir método `render()` y estilos internos (Shadow DOM) para independencia.
3. Añadir método en `MainContent`: `renderLibrary()` que limpia y monta `LibraryView`.
4. Disparar evento desde SideBar o algún menú para activar esa vista.

```js
class LibraryView extends Fast { /* ... */ }
// main-content.js dentro de App.js o archivo independiente
mainContent.renderLibrary = function(){
  const view = new LibraryView();
  this.$root.innerHTML = '';
  this.$root.appendChild(view);
};
```

### Recomendaciones
- Mantener vistas "simples" (solo presentación + hooks de eventos).
- Orquestar datos y estado persistido desde App + servicios (p.e. `IndexedDBManager`).

## 6. Roadmap de Escalabilidad
1. IndexedDB: implementar `IndexedDBManager` con stores: `playlists`, `tracks`, `mediaState`.
2. Playlists enriquecidas: cover, descripción, orden personalizado.
3. Búsqueda avanzada: índices por artista, título, tags; caching de resultados.
4. Pantalla de Detalle de Track: letras, progreso, recomendados.
5. Sistema de favoritos y "recientes".
6. Sincronizar posición de reproducción cada X segundos para reanudación.
7. Tema claro/oscuro (agregar variables de color alternativas a `:root`).

## 7. Estilos y Animaciones
- Animaciones ligeras (fade) definidas en `global.css` y en cada componente.
- Seguir preferencia de usuario: `prefers-reduced-motion` ya contemplado.

## 8. Buenas Prácticas Aplicadas
- Shadow DOM en componentes para encapsular estilos.
- EventBus para desacoplar comunicación global.
- Separación clara entre montaje (App) y funcionalidad interna (componentes).
- Comentarios TODO marcando puntos de persistencia futuros.

## 9. Cómo Conectar IndexedDB Luego
Ejemplo conceptual dentro de `App.init()`:
```js
// TODO: IndexedDB bootstrap
// const db = await IndexedDBManager.open();
// const playlists = await db.playlists.getAll();
// sideBar.loadPlaylists(playlists);
// const last = await db.mediaState.get('lastTrack');
// if(last) playerBar.loadMedia(last.descriptor);
```

## 10. Convenciones de Eventos Principales
| Evento | Emisor | Propósito |
|--------|--------|-----------|
| `playlist:selected` | SideBar | Cambiar vista principal a playlist |
| `home:selected` | SideBar | Volver a vista inicial |
| `search:query` | SearchBar | Mostrar resultados de búsqueda |
| `track:change` | PlayerBar | Metadata de pista actual |
| `queue:change` | PlayerBar | Actualización de cola |

## 11. Próximos Pasos Sugeridos
- Implementar `IndexedDBManager` real y reemplazar LocalStorage.
- Crear componente `PlaylistView` para mostrar lista de tracks.
- Agregar menú contextual en `PlayerBar` (loop, velocidad, descargar). 
- Implementar control de tema.

---
Cualquier ampliación futura debería mantener esta estructura modular y orientada a eventos para reducir acoplamiento y facilitar pruebas.
