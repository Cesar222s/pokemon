/**
 * Image caching composable para mejorar rendimiento
 * Almacena imagen URLs en localStorage y previa en background
 */

const CACHE_KEY = 'pokemon_image_cache'
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 días

function getImageCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return {}
    
    const data = JSON.parse(cached)
    const now = Date.now()
    
    // Limpiar cache expirado
    Object.keys(data).forEach(key => {
      if (now - data[key].timestamp > CACHE_EXPIRY) {
        delete data[key]
      }
    })
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    return data
  } catch (e) {
    return {}
  }
}

function cacheImage(pokemonId, url) {
  try {
    const cache = getImageCache()
    cache[pokemonId] = {
      url,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('Error caching image:', e)
  }
}

function getCachedImage(pokemonId) {
  const cache = getImageCache()
  return cache[pokemonId]?.url || null
}

// Precargar imagen y almacenarla en caché
function preloadImage(pokemonId, url) {
  if (!url) return
  
  const img = new Image()
  img.onload = () => {
    cacheImage(pokemonId, url)
  }
  img.onerror = () => {
    // Si falla, no cachear
  }
  img.src = url
}

export function useImageCache() {
  return {
    getImageCache,
    cacheImage,
    getCachedImage,
    preloadImage
  }
}
