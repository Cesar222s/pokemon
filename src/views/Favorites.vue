<script setup>
import { onMounted } from 'vue'
import { useFavoritesStore } from '@/stores/favorites'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import PokemonCard from '@/components/PokemonCard.vue'
import { useUiStore } from '@/stores/ui'

const favs = useFavoritesStore()
const auth = useAuthStore()
const router = useRouter()
const ui = useUiStore()

onMounted(async () => {
  if (!auth.isAuthenticated) {
    ui.showNotice('❌ Debes iniciar sesión para acceder a tus favoritos', 'error')
    setTimeout(() => router.push('/login'), 2000)
    return
  }
  // Cargar favoritos (desde localStorage inmediatamente, API en background)
  favs.load()
})

function toggleFav(p) { favs.remove(p.id) }
</script>

<template>
  <div>
    <div class="mb-8">
      <span class="text-sm font-semibold text-poke-red-600 dark:text-poke-red-400 uppercase tracking-widest">Tus preferencias</span>
      <h1 class="text-5xl font-display neon font-bold mb-3">Mis Favoritos</h1>
      <p class="text-slate-600 dark:text-slate-300 max-w-xl">Pokémon que has marcado como favoritos</p>
    </div>
    
    <!-- Solo mostrar loading si no hay cache local -->
    <div v-if="favs.loading && favs.items.length === 0" class="text-center py-12">
      <p class="text-slate-500 dark:text-slate-400">Cargando tus favoritos...</p>
    </div>
    
    <div v-else-if="!favs.items.length" class="card text-center py-12 border-dashed">
      <p class="text-2xl text-slate-400 dark:text-slate-500 mb-2">📭 Sin favoritos aún</p>
      <p class="text-slate-500 dark:text-slate-400">Explora la Pokédex y marca tus Pokémon favoritos</p>
    </div>
    
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <PokemonCard v-for="p in favs.items" :key="p.id" :pokemon="p" :is-fav="true" @toggle-fav="toggleFav" />
    </div>
  </div>
</template>

<style scoped></style>
