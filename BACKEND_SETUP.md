# Backend Server - Instrucciones de instalación

## 📋 Requisitos previos
- Node.js 16+
- MongoDB instalado localmente o cuenta en MongoDB Atlas

## 🚀 Instalación del Backend

### 1. Instalar dependencias del servidor
```bash
npm install express mongoose cors dotenv
```

### 2. Configurar variables de entorno

Agrega estas variables a tu archivo `.env`:

```env
# Existente
VITE_API_BASE_URL=http://localhost:3000

# Nuevas variables para el backend
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pokedex
CLIENT_URL=http://localhost:5173
```

### 3. Configurar MongoDB

**Opción A: MongoDB Local**
```bash
# Instalar MongoDB en Windows
choco install mongodb

# Iniciar servicio
mongod
```

**Opción B: MongoDB Atlas (Cloud)**
1. Ve a https://www.mongodb.com/cloud/atlas
2. Crea una cuenta gratuita
3. Crea un cluster
4. Obtén tu connection string
5. Actualiza `MONGODB_URI` en `.env`:
```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/pokedex?retryWrites=true&w=majority
```

### 4. Renombrar y ejecutar el servidor

```bash
# Renombrar el archivo de ejemplo
mv server.example.js server.js

# Agregar script en package.json
```

Agrega este script a `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "server": "node server.js",
    "dev:full": "concurrently \"npm run server\" \"npm run dev\""
  }
}
```

```bash
# Instalar concurrently para ejecutar ambos servidores
npm install -D concurrently

# Ejecutar backend y frontend simultáneamente
npm run dev:full
```

## 🔄 Cómo funciona el Background Sync

### 1. **Cuando hay conexión**
- Las peticiones se envían normalmente al backend
- El backend guarda en MongoDB
- Todo funciona como siempre

### 2. **Cuando NO hay conexión**
- La petición falla con Network Error
- Se guarda automáticamente en IndexedDB
- Se registra un evento `sync` en el Service Worker

### 3. **Cuando se recupera la conexión**
- El navegador ejecuta automáticamente el evento `sync`
- El Service Worker lee las peticiones de IndexedDB
- Intenta enviarlas al backend
- Si tienen éxito, las elimina de IndexedDB
- Notifica al frontend del resultado

## 📱 Probar el sistema offline

1. Abre DevTools → Network → Throttling → Offline
2. Intenta agregar un favorito o crear un equipo
3. Verás un mensaje: "Petición guardada. Se sincronizará cuando haya conexión"
4. Verifica en DevTools → Application → IndexedDB → pokedex-sync-db
5. Desactiva el modo offline
6. El Service Worker sincronizará automáticamente
7. Verifica en MongoDB que los datos se guardaron

## 🎯 Endpoints disponibles

### Favoritos
- `GET /api/favorites/:userId` - Obtener favoritos
- `POST /api/favorites` - Agregar favorito
- `DELETE /api/favorites/:userId/:pokemonId` - Eliminar favorito

### Equipos
- `GET /api/teams/:userId` - Obtener equipos
- `POST /api/teams` - Crear equipo
- `PUT /api/teams/:teamId` - Actualizar equipo
- `DELETE /api/teams/:teamId` - Eliminar equipo

### Batallas
- `POST /api/battles` - Registrar batalla
- `GET /api/battles/:userId` - Historial de batallas

### Health Check
- `GET /health` - Estado del servidor y MongoDB

## 🔍 Debugging

### Ver logs del Service Worker
```javascript
// En DevTools Console
navigator.serviceWorker.addEventListener('message', (event) => {
  console.log('Mensaje del SW:', event.data);
});
```

### Forzar sincronización manual
```javascript
// En DevTools Console
navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
```

### Ver cola de sincronización
```javascript
// En DevTools Console
const request = indexedDB.open('pokedex-sync-db');
request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction('sync-queue', 'readonly');
  const store = tx.objectStore('sync-queue');
  const getAllRequest = store.getAll();
  getAllRequest.onsuccess = () => {
    console.log('Peticiones pendientes:', getAllRequest.result);
  };
};
```
