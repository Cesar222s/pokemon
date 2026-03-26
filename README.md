# Pokedex

App Vue 3 + Vite con backend Express para:

- Registro y autenticación (email/password)
- Favoritos por usuario
- Administración de equipos
- Filtros por tipo 1, tipo 2, región y nombre
- Detalles de Pokémon (especie, estadísticas y línea evolutiva)
- Amigos por código
- Batallas entre amigos (estadísticas y tipos)
- Uso de PokeAPI y variables de entorno

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Variables de entorno

Crea un archivo `.env` en el root:

```
VITE_API_BASE_URL=http://localhost:3000
```

El backend Express debe exponer endpoints:

- POST `/auth/register` { email, password } → `{ user, token }`
- POST `/auth/login` { email, password } → `{ user, token }`
- GET `/favorites` → `{ favorites: [] }`
- POST `/favorites` { pokemon }
- DELETE `/favorites/:id`
- GET `/teams` → `{ teams: [] }`
- POST `/teams` { name, members }
- PUT `/teams/:id`
- DELETE `/teams/:id`
- GET `/friends` → `{ friends: [] }`
- POST `/friends/add` { code } → `{ friend }`

Ajusta las rutas a tus controladores reales si difieren.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## Estructura de frontend

- Vistas: `PokemonList`, `PokemonDetail`, `Favorites`, `Teams`, `Friends`, `Battle`, `Login`, `Register`
- Stores (Pinia): `auth`, `favorites`, `teams`, `friends`, `battle`
- Servicios: `services/api.js` (backend), `services/pokeapi.js` (PokeAPI)
- Componentes: `FilterBar`, `PokemonCard`

## Notas de batallas

La simulación usa estadísticas base (ataque, defensa, velocidad) y un chart de tipos simplificado. Puedes reemplazar por lógica del backend si deseas reglas más avanzadas.

## PWA (Aplicación Instalable)

Esta app ya está preparada como PWA:

- Manifest: ver [public/manifest.webmanifest](public/manifest.webmanifest) con `name`, `start_url`, `display`, `theme_color` e `icons`.
- Service Worker: ver [public/sw.js](public/sw.js) con precache de App Shell y estrategias de cache (stale-while-revalidate para assets y network-first para API/imágenes).
- Registro del SW: ver [src/main.js](src/main.js) (se registra en `load`).
- Soporte iOS: meta tags y `apple-touch-icon` en [index.html](index.html).
- Botón “Instalar”: ver [src/App.vue](src/App.vue), aparece cuando el navegador emite `beforeinstallprompt`.

### Probar como PWA

1. Construye y sirve en modo producción:

  ```sh
  npm run build
  npm run preview
  ```

2. Abre `http://localhost:4173` en Chrome/Edge/Brave.
3. Verifica el indicador de “Instalable” en la barra de direcciones, o usa el botón “Instalar” dentro de la app.
4. Activa “Offline” en DevTools (Aplicación → Service Workers / Network → Offline) y navega por rutas: el App Shell debe seguir funcionando.

### Personalización rápida

- Íconos: reemplaza archivos en [public/icons](public/icons) manteniendo tamaños `192x192` y `512x512` (incluye `maskable`).
- Colores del tema: ajusta `theme_color` y `background_color` en [public/manifest.webmanifest](public/manifest.webmanifest) y la meta `theme-color` en [index.html](index.html).
- Estrategias de cache: edita [public/sw.js](public/sw.js) si deseas cachear endpoints específicos o cambiar políticas.

### ⚠️ Troubleshooting: "La app no se instala en el celular"

**Causa más común**: Certificados auto-firmados bloquean el Service Worker en móviles.

#### Checklist de requisitos PWA para instalación:

1. **HTTPS obligatorio** (excepto localhost)
   - ❌ Certificados auto-firmados pueden fallar en móvil
   - ✅ Usa despliegue real con HTTPS válido (ver abajo)

2. **Service Worker debe registrarse exitosamente**
   - Abre Chrome DevTools en móvil: `chrome://inspect` desde PC o usa el menú → "Herramientas para desarrolladores"
   - Ve a Consola y verifica logs "✅ Service Worker registrado exitosamente"
   - Si ves "❌ SW registration failed", el certificado probablemente está bloqueado

3. **Manifest válido**
   - Verifica en DevTools → Application → Manifest
   - Debe mostrar nombre, íconos (192x192 mínimo), `start_url` y `display: standalone`

4. **Evento `beforeinstallprompt` debe dispararse**
   - En Consola deberías ver "✅ beforeinstallprompt disparado - App es instalable"
   - Si NO aparece, Chrome considera que la app no cumple los requisitos

#### Solución recomendada: Despliega con HTTPS real

**Opción 1: Vercel (gratis, 2 minutos)**

```sh
npm install -g vercel
vercel
```

Sigue el prompt, obtendrás una URL `https://tu-app.vercel.app` con HTTPS válido. Ábrela en tu móvil y Chrome mostrará "Instalar" automáticamente.

**Opción 2: Netlify Drop**

1. Ve a [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta `dist/` después de `npm run build`
3. Obtendrás una URL HTTPS al instante

**Opción 3: Cloudflare Tunnel (testing rápido)**

```sh
npm install -g cloudflared
npm run preview
# En otra terminal:
cloudflared tunnel --url https://localhost:4173
```

Usa la URL `https://xyz.trycloudflare.com` en tu móvil (certificado válido).

#### Debugging en móvil Android

1. Conecta móvil por USB y activa "Depuración USB"
2. En PC, abre Chrome → `chrome://inspect`
3. Verás tu móvil listado, click en "inspect" junto a la URL de tu app
4. Revisa Consola y Application → Service Workers / Manifest

#### Verificación manual rápida

En tu móvil, abre la consola del navegador (si puedes) y ejecuta:

```javascript
navigator.serviceWorker.getRegistrations().then(r => console.log('SW activo:', r))
```

Si retorna vacío `[]`, el SW no se registró (problema de certificado casi seguro).

