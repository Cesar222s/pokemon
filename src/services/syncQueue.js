/**
 * Módulo para manejar la cola de sincronización con IndexedDB
 * Guarda peticiones HTTP fallidas para reintentarlas cuando haya conexión
 */

const DB_NAME = 'pokedex-sync-db';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

class SyncQueue {
  constructor() {
    this.db = null;
  }

  /**
   * Inicializa la base de datos IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear object store si no existe
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          
          // Índices para búsquedas eficientes
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('url', 'url', { unique: false });
        }
      };
    });
  }

  /**
   * Guarda una petición fallida en IndexedDB
   */
  async addRequest(requestData) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const data = {
      url: requestData.url,
      method: requestData.method,
      headers: requestData.headers || {},
      body: requestData.body,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => {
        console.log('✅ Petición guardada en cola de sincronización:', data.url);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todas las peticiones pendientes
   */
  async getAllRequests() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina una petición de la cola
   */
  async removeRequest(id) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log('✅ Petición eliminada de cola:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpia toda la cola
   */
  async clearAll() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Registra un evento de sincronización con el Service Worker
   */
  async registerSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-queue');
        console.log('🔄 Sincronización registrada');
      } catch (error) {
        console.error('❌ Error al registrar sincronización:', error);
        // Fallback: intentar sincronizar inmediatamente
        this.syncImmediately();
      }
    } else {
      console.warn('⚠️ Background Sync no soportado, intentando sincronización inmediata');
      this.syncImmediately();
    }
  }

  /**
   * Intenta sincronizar inmediatamente (fallback si no hay Background Sync)
   */
  async syncImmediately() {
    try {
      const requests = await this.getAllRequests();
      
      for (const req of requests) {
        try {
          const response = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body ? JSON.stringify(req.body) : undefined,
          });

          if (response.ok) {
            await this.removeRequest(req.id);
            console.log('✅ Petición sincronizada:', req.url);
          }
        } catch (error) {
          console.log('⏳ Petición aún no puede sincronizarse:', req.url);
        }
      }
    } catch (error) {
      console.error('❌ Error en sincronización inmediata:', error);
    }
  }
}

// Instancia única
const syncQueue = new SyncQueue();

export default syncQueue;
