# Sistema Fast - Guía Rápida

## ¿Qué es esto?

Este proyecto ahora incluye el sistema **Fast** para crear Web Components reutilizables con Shadow DOM. Es una versión simplificada y adaptada de tu librería `fast`.

## 🚀 Inicio rápido

### Crear tu primer componente

```powershell
.\crear-componente.ps1 -nombre AudioPlayer
```

Esto crea automáticamente:
- ✅ `src/js/components/AudioPlayer.js` - Tu componente
- ✅ `src/css/AudioPlayer.css` - Estilos encapsulados
- ✅ `examples/AudioPlayer.html` - Demo funcional

### Usar el componente

**En HTML:**
```html
<audio-player id="player1"></audio-player>
```

**En JavaScript:**
```javascript
import { AudioPlayer } from './src/js/components/AudioPlayer.js';

let player = await fast.createInstance("AudioPlayer", {
    id: 'player1',
    style: { width: '300px' }
});

player.built = () => {
    console.log('¡Listo!');
};

player.addToBody();
```

## 📁 Estructura de archivos creados

```
playlist-durisima/
├── src/
│   ├── js/
│   │   ├── lib/
│   │   │   └── Fast.js              ← Clase base (ya está)
│   │   ├── components/
│   │   │   ├── PlaylistCard.js      ← Componente de ejemplo
│   │   │   └── [TusComponentes].js
│   │   └── App.js                   ← Punto de entrada
│   └── css/
│       └── [TusComponentes].css
├── examples/                         ← Demos HTML
├── componentCreator.js               ← Generador manual
├── componentConfig.json              ← Config actual
├── crear-componente.ps1              ← 🔥 Usa este!
└── COMPONENTES.md                    ← Documentación completa
```

## 🎯 Ejemplo incluido

Abre `examples/PlaylistCard.html` en el navegador para ver un componente funcionando.

## 📖 Documentación completa

Lee `COMPONENTES.md` para:
- Configuración avanzada
- API completa de Fast
- Personalización de componentes
- Ejemplos de código

## 🔧 Lo que se adaptó de tu librería `fast`

### ✅ Incluido (lo esencial):
- Clase base `Fast` extendiendo `HTMLElement`
- Sistema de carga dinámica de componentes
- Cache de archivos CSS
- Gestión de instancias
- Shadow DOM y estilos encapsulados
- Soporte para props y atributos
- Generador de componentes

### ❌ Excluido (para mantenerlo simple):
- Sistema reactivo (Any, Integer, Float)
- Cache de SVG
- Grupos de radio/checkbox
- Dependencias de jsdoc

## 💡 Tips

1. **Nombres**: Usa PascalCase para nombres de clase (ej: `AudioPlayer`)
2. **Tags**: Se generan automáticamente en kebab-case (ej: `audio-player`)
3. **Fast global**: `window.fast` está disponible en toda tu app
4. **Rutas CSS**: Los estilos se buscan automáticamente en `src/css/`
5. **Tipografía Global**: Se ha integrado la fuente variable **Inter** (pesos 400–700) con `display=swap` para mejorar rendimiento. Puedes usar utilidades (`.text-sm`, `.font-semibold`, etc.) definidas en `global.css`.

## ⚙️ Configuración de rutas

Si necesitas cambiar las rutas, edita `src/js/lib/Fast.js`:

```javascript
fast.routes = {
    css : './src/css/',
    images : './assets/img/',
    icons : './assets/img/icons/' 
}
```

---

**¿Dudas?** Revisa `COMPONENTES.md` o el código de `PlaylistCard.js` como referencia.
