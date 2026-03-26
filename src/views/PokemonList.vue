<script setup>
import { ref, onMounted } from 'vue'
import { getPokemonList } from '@/services/pokeapi'
import FilterBar from '@/components/FilterBar.vue'
import PokemonCard from '@/components/PokemonCard.vue'
import { useFavoritesStore } from '@/stores/favorites'

const filters = ref({})
const list = ref([])
const loading = ref(false)
const favs = useFavoritesStore()

onMounted(async () => {
  await favs.load()
  await refresh()
})

async function refresh() {
  loading.value = true
  try {
    list.value = await getPokemonList({ ...filters.value, limit: 60 })
    // Precargar imágenes en background para mejor performance
    list.value.forEach(p => {
      if (p.officialArt) {
        const img = new Image()
        img.src = p.officialArt
      }
    })
  } finally {
    loading.value = false
  }
}

function onUpdate(f) {
  filters.value = f
  refresh()
}

function toggleFav(p) {
  if (favs.isFavorite(p.id)) favs.remove(p.id)
  else favs.add(p)
}
</script>

<template>
  <div>
    <div class="mb-8">
      <div class="inline-block mb-2">
        <span class="text-sm font-semibold text-poke-red-600 dark:text-poke-red-400 uppercase tracking-widest">Explora el mundo Pokémon</span>
      </div>
      <h1 class="text-5xl font-display neon font-bold mb-3">POKÉDEX</h1>
      <p class="text-slate-600 dark:text-slate-300 max-w-xl">Encuentra y explora los Pokémon de todas las generaciones. Filtra por tipo, región y más.</p>
    </div>
    
    <FilterBar :initial="filters" @update="onUpdate" />
    
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
      <div v-for="n in 8" :key="n" class="skeleton-card flex flex-col items-center gap-2">
        <div class="skeleton-img"></div>
        <div class="skeleton-line"></div>
        <div class="flex gap-2">
          <span class="chip skeleton-line w-12"></span>
          <span class="chip skeleton-line w-10"></span>
        </div>
        <div class="btn-outline w-full skeleton-line h-8"></div>
      </div>
    </div>
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
      <PokemonCard v-for="p in list" :key="p.id" :pokemon="p" :is-fav="favs.isFavorite(p.id)" @toggle-fav="toggleFav" />
    </div>
    
    <div v-if="!loading && list.length === 0" class="text-center py-12">
      <p class="text-xl text-slate-500 dark:text-slate-400">No se encontraron Pokémon con esos filtros</p>
    </div>
  </div>
</template>

<style scoped></style>
