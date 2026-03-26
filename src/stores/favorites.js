import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    items: [],
    loading: false,
    error: null,
  }),
  actions: {
    async load() {
      const auth = useAuthStore()
      if (!auth.user?.id) return
      
      // Cargar inmediatamente desde localStorage (no bloquea UI)
      const cached = JSON.parse(localStorage.getItem('favorites') || '[]')
      this.items = cached
      
      // Cargar desde API en background sin bloquear UI
      this.loading = cached.length === 0
      try {
        const { data } = await api.get(`/api/favorites/${auth.user.id}`)
        // Convertir estructura de MongoDB a estructura del frontend
        this.items = (data || []).map(fav => ({
          id: fav.pokemonId,
          name: fav.pokemonName,
          sprite: fav.sprite,
          officialArt: fav.officialArt,
          types: fav.types || []
        }))
        localStorage.setItem('favorites', JSON.stringify(this.items))
      } catch (e) {
        // Mantener lo que está en caché
        this.error = e?.response?.data?.error || e.message
        if (this.items.length === 0) {
          this.items = cached
        }
      } finally {
        this.loading = false
      }
    },
    async add(pokemon) {
      const auth = useAuthStore()
      if (!auth.user?.id) return
      
      // Guardar con AMBAS imágenes: sprite (rápido) y officialArt (calidad)
      const fav = {
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprite || pokemon.officialArt, // Fallback
        officialArt: pokemon.officialArt || pokemon.sprite, // Mejor calidad
        types: pokemon.types || []
      }
      
      // Actualizar localStorage de forma síncrona inmediatamente
      this.items.push(fav)
      localStorage.setItem('favorites', JSON.stringify(this.items))
      
      // Sync con backend en background
      try {
        await api.post('/api/favorites', { 
          userId: auth.user.id,
          pokemonId: pokemon.id, 
          pokemonName: pokemon.name,
          sprite: pokemon.sprite || pokemon.officialArt,
          officialArt: pokemon.officialArt || pokemon.sprite,
          types: pokemon.types || []
        })
      } catch (e) {
        // Ya está guardado localmente, no importa si falla API
        console.warn('Favorito guardado localmente, API error:', e.message)
      }
    },
    async remove(pokemonId) {
      const auth = useAuthStore()
      if (!auth.user?.id) return
      
      // Remover de forma síncrona inmediatamente
      this.items = this.items.filter((p) => p.id !== pokemonId)
      localStorage.setItem('favorites', JSON.stringify(this.items))
      
      // Sync con backend en background
      try {
        await api.delete(`/api/favorites/${auth.user.id}/${pokemonId}`)
      } catch (e) {
        console.warn('Favorito removido localmente, API error:', e.message)
      }
    },
    isFavorite(id) {
      return this.items.some((p) => p.id === id)
    },
  },
})
