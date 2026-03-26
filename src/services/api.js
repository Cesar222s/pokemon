import axios from 'axios'
import syncQueue from './syncQueue'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

// Interceptor para manejar errores de red
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si hay error de red y no es una petición GET, guardar en IndexedDB
    if (error.message === 'Network Error' && error.config && error.config.method !== 'get') {
      const { url, method, headers, data } = error.config;
      
      try {
        await syncQueue.addRequest({
          url: `${api.defaults.baseURL}${url}`,
          method: method.toUpperCase(),
          headers: headers || {},
          body: data,
        });
        
        // Registrar sincronización en segundo plano
        await syncQueue.registerSync();
        
        // Crear error personalizado para informar al usuario
        const offlineError = new Error('Petición guardada. Se sincronizará cuando haya conexión');
        offlineError.isOffline = true;
        offlineError.originalError = error;
        return Promise.reject(offlineError);
      } catch (syncError) {
        console.error('Error al guardar petición offline:', syncError);
      }
    }
    
    return Promise.reject(error);
  }
)

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export default api
