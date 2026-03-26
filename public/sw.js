const VERSION = 'v3';
const APP_SHELL_CACHE = `app-shell-${VERSION}`;
const DYNAMIC_CACHE = `dynamic-${VERSION}`;

// Rutas fijas del APP SHELL (SPA)
const APP_SHELL_ROUTES = [
    '/',
    '/index.html',
    '/favorites',
    '/teams',
    '/friends',
    '/battle',
    '/login',
    '/register',
];

// Pre-cache del APP SHELL y activar nuevo SW automáticamente
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ROUTES))
    );
    self.skipWaiting();
});

// Eliminar cache vieja y tomar control de clientes
self.addEventListener('activate', (event) => {
    const allowList = [APP_SHELL_CACHE, DYNAMIC_CACHE];
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (!allowList.includes(key)) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

// Estrategias de cache
function isNavigationRequest(request) {
    return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isGet(request) { return request.method === 'GET'; }

function isStaticAsset(url) {
    return /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/i.test(url.pathname);
}

// Cache dinámico (Network First para GET), App Shell (Cache First para navegación)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo manejar peticiones http/https
    if (!url.protocol.startsWith('http')) return;

    // Navegación: servir App Shell desde cache (SPA offline)
    if (isNavigationRequest(request)) {
        event.respondWith(
            caches.match('/index.html').then((cached) => {
                if (cached) return cached;
                return fetch(request)
                    .then((res) => {
                        // Cachear index si fue obtenido
                        const clone = res.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => cache.put('/index.html', clone));
                        return res;
                    })
                    .catch(() => caches.match('/index.html'));
            })
        );
        return;
    }

    // Assets estáticos: Stale-While-Revalidate
    if (isGet(request) && isStaticAsset(url)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request)
                    .then((res) => {
                        if (res && res.status === 200) {
                            const clone = res.clone();
                            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
                        }
                        return res;
                    })
                    .catch(() => cached);
                return cached || fetchPromise;
            })
        );
        return;
    }

    // API y otros GET: Network First con fallback a cache
    if (isGet(request)) {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }
    // Otros métodos: pasar directo a red
});

// ============================================
// BACKGROUND SYNC - Sincronización offline
// ============================================

const DB_NAME = 'pokedex-sync-db';
const STORE_NAME = 'sync-queue';

/**
 * Abre la base de datos IndexedDB
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene todas las peticiones pendientes de IndexedDB
 */
async function getAllPendingRequests() {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Elimina una petición de IndexedDB
 */
async function removeRequest(id) {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Listener de sincronización en segundo plano
 * Se ejecuta cuando se registra un evento 'sync' o cuando hay conexión
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 Evento sync detectado:', event.tag);
    
    if (event.tag === 'sync-queue') {
        event.waitUntil(syncPendingRequests());
    }
});

/**
 * Sincroniza todas las peticiones pendientes
 */
async function syncPendingRequests() {
    console.log('🔄 Iniciando sincronización de peticiones pendientes...');
    
    try {
        const requests = await getAllPendingRequests();
        console.log(`📦 Peticiones pendientes: ${requests.length}`);
        
        const results = {
            success: 0,
            failed: 0,
            total: requests.length
        };
        
        // Procesar cada petición
        for (const req of requests) {
            try {
                console.log(`⏳ Sincronizando: ${req.method} ${req.url}`);
                
                const response = await fetch(req.url, {
                    method: req.method,
                    headers: req.headers,
                    body: req.body ? JSON.stringify(req.body) : undefined,
                });
                
                if (response.ok) {
                    // Petición exitosa - eliminar de la cola
                    await removeRequest(req.id);
                    results.success++;
                    console.log(`✅ Sincronizado exitosamente: ${req.url}`);
                    
                    // Notificar al cliente si está disponible
                    notifyClients({
                        type: 'SYNC_SUCCESS',
                        url: req.url,
                        timestamp: req.timestamp
                    });
                } else {
                    // Error del servidor - mantener en cola
                    results.failed++;
                    console.warn(`⚠️ Error ${response.status} al sincronizar: ${req.url}`);
                }
            } catch (error) {
                // Error de red - mantener en cola para reintentar después
                results.failed++;
                console.error(`❌ Error al sincronizar ${req.url}:`, error.message);
            }
        }
        
        console.log(`✅ Sincronización completada:`, results);
        
        // Notificar resultado final
        notifyClients({
            type: 'SYNC_COMPLETE',
            results
        });
        
        return results;
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        throw error;
    }
}

/**
 * Notifica a todos los clientes activos
 */
async function notifyClients(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => {
        client.postMessage(message);
    });
}

// Listener para mensajes desde el cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_NOW') {
        // Permitir sincronización manual desde el cliente
        event.waitUntil(syncPendingRequests());
    }
});

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (err) {
        data = { title: 'Notificacion', message: event.data ? event.data.text() : '' };
    }

    const title = data.title || 'Notificacion';
    const options = {
        body: data.message || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || data.kind || 'general',
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
            for (const client of clientsArr) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
});