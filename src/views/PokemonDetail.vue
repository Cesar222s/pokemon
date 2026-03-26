<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPokemonDetail } from '@/services/pokeapi'
import { useFavoritesStore } from '@/stores/favorites'
import TypeChip from '@/components/TypeChip.vue'

const route = useRoute()
const router = useRouter()
const favorites = useFavoritesStore()
const detail = ref(null)
const activeTab = ref('stats')
const loading = ref(true)
const error = ref(null)
const imageLoading = ref(true)

// Precargar imagen para mejor calidad
const preloadImage = (src) => {
  if (!src) return
  const img = new Image()
  img.onload = () => { imageLoading.value = false }
  img.onerror = () => { imageLoading.value = false }
  img.src = src
}

const isFavorite = computed(() => {
  if (!detail.value) return false
  if (!favorites.items || !Array.isArray(favorites.items)) return false
  return favorites.items.some(f => f.id === detail.value.id)
})

const statColor = (value) => {
  if (value >= 100) return 'bg-green-500'
  if (value >= 70) return 'bg-blue-500'
  if (value >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

const totalStats = computed(() => {
  if (!detail.value) return 0
  return detail.value.stats.reduce((sum, s) => sum + s.base, 0)
})

const toggleFavorite = () => {
  if (!detail.value) return
  if (isFavorite.value) {
    favorites.remove(detail.value.id)
  } else {
    favorites.add({
      id: detail.value.id,
      name: detail.value.name,
      sprite: detail.value.sprite,
      types: detail.value.types
    })
  }
}

const goToEvolution = (name) => {
  router.push(`/pokemon/${name}`)
  detail.value = null
  loadPokemon()
}

const loadPokemon = async () => {
  loading.value = true
  error.value = null
  detail.value = null
  imageLoading.value = true
  try {
    const idOrName = route.params.id
    detail.value = await getPokemonDetail(idOrName)
    // Precargar imagen de alta calidad en background
    if (detail.value.officialArt) {
      preloadImage(detail.value.officialArt)
    }
  } catch (err) {
    console.error('Error al cargar pokemon:', err)
    error.value = err.message || 'Error al cargar el Pokémon'
  } finally {
    loading.value = false
  }
}

onMounted(loadPokemon)
</script>

<template>
  <div v-if="detail" class="max-w-6xl mx-auto space-y-6">
    <!-- Header con imagen grande y título -->
    <div class="card relative overflow-hidden">
      <div class="absolute inset-0 opacity-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"></div>
      <div class="relative grid md:grid-cols-5 gap-6 items-center">
        <div class="md:col-span-2 flex flex-col items-center gap-4">
          <div class="relative group">
            <div class="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition"></div>
            <!-- Skeleton mientras carga -->
            <div v-if="imageLoading" class="relative w-64 h-64 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 rounded-full animate-pulse"></div>
            <img 
              v-if="detail.officialArt"
              :src="detail.officialArt" 
              :alt="detail.name" 
              loading="lazy"
              @load="imageLoading = false"
              @error="() => { imageLoading = false }"
              class="relative w-64 h-64 object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-300" 
            />
            <img 
              v-else
              :src="detail.sprite" 
              :alt="detail.name" 
              loading="lazy"
              @load="imageLoading = false"
              @error="() => { imageLoading = false }"
              class="relative w-64 h-64 object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-300" 
            />
          </div>
          <button 
            @click="toggleFavorite"
            class="btn flex items-center gap-2"
            :class="isFavorite ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'"
          >
            <span class="text-xl">{{ isFavorite ? '❤️' : '🤍' }}</span>
            {{ isFavorite ? 'Remover de Favoritos' : 'Añadir a Favoritos' }}
          </button>
        </div>
        <div class="md:col-span-3 space-y-4">
          <div>
            <p class="text-sm text-slate-400 font-semibold">#{{ String(detail.id).padStart(3, '0') }}</p>
            <h1 class="text-5xl font-bold capitalize neon mb-3">{{ detail.name }}</h1>
            <div class="flex gap-2 flex-wrap">
              <TypeChip v-for="t in detail.types" :key="t" :type="t" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white/5 rounded-lg p-3 border border-white/10">
              <p class="text-xs text-slate-400 uppercase tracking-wide">Altura</p>
              <p class="text-2xl font-bold">{{ (detail.species.height || 10) / 10 }}m</p>
            </div>
            <div class="bg-white/5 rounded-lg p-3 border border-white/10">
              <p class="text-xs text-slate-400 uppercase tracking-wide">Peso</p>
              <p class="text-2xl font-bold">{{ (detail.species.weight || 100) / 10 }}kg</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-white/10 pb-2">
      <button 
        @click="activeTab = 'stats'"
        class="px-4 py-2 rounded-t-lg font-semibold transition"
        :class="activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'"
      >
        📊 Estadísticas
      </button>
      <button 
        @click="activeTab = 'evolution'"
        class="px-4 py-2 rounded-t-lg font-semibold transition"
        :class="activeTab === 'evolution' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'"
      >
        🔄 Evolución
      </button>
      <button 
        @click="activeTab = 'info'"
        class="px-4 py-2 rounded-t-lg font-semibold transition"
        :class="activeTab === 'info' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'"
      >
        ℹ️ Información
      </button>
    </div>

    <!-- Contenido de tabs -->
    <div v-show="activeTab === 'stats'" class="card space-y-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-2xl font-bold">Estadísticas Base</h3>
        <div class="text-right">
          <p class="text-xs text-slate-400 uppercase">Total</p>
          <p class="text-3xl font-bold neon">{{ totalStats }}</p>
        </div>
      </div>
      <div class="space-y-3">
        <div v-for="s in detail.stats" :key="s.name" class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="capitalize font-medium">{{ s.name.replace('-', ' ') }}</span>
            <span class="font-bold">{{ s.base }}</span>
          </div>
          <div class="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              class="h-full transition-all duration-500 rounded-full"
              :class="statColor(s.base)"
              :style="{ width: Math.min((s.base / 200) * 100, 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'evolution'" class="card">
      <h3 class="text-2xl font-bold mb-4">🔄 Cadena Evolutiva</h3>
      <div v-if="detail.evolution.length > 0" class="flex flex-wrap gap-4 justify-center items-center">
        <div 
          v-for="(evo, idx) in detail.evolution" 
          :key="evo"
          class="flex items-center gap-3"
        >
          <button
            @click="goToEvolution(evo)"
            class="group relative"
            :class="evo === detail.name ? 'ring-4 ring-blue-500 rounded-xl' : ''"
          >
            <div class="card px-6 py-4 hover:bg-white/10 transition cursor-pointer">
              <p class="text-center capitalize font-bold text-lg">{{ evo }}</p>
              <p v-if="evo === detail.name" class="text-xs text-blue-400 text-center mt-1">Actual</p>
            </div>
          </button>
          <span v-if="idx < detail.evolution.length - 1" class="text-3xl text-slate-500">→</span>
        </div>
      </div>
      <p v-else class="text-slate-400 text-center py-8">No evoluciona</p>
    </div>

    <div v-show="activeTab === 'info'" class="grid md:grid-cols-2 gap-4">
      <div class="card">
        <h3 class="text-xl font-bold mb-3">🌍 Especie</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-slate-400">Color:</span>
            <span class="capitalize font-semibold">{{ detail.species.color?.name || 'Desconocido' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Hábitat:</span>
            <span class="capitalize font-semibold">{{ detail.species.habitat?.name || 'Desconocido' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Forma:</span>
            <span class="capitalize font-semibold">{{ detail.species.shape?.name || 'Desconocido' }}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 class="text-xl font-bold mb-3">🎯 Características</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-slate-400">Generación:</span>
            <span class="capitalize font-semibold">{{ detail.species.generation?.name?.replace('generation-', 'Gen ') || 'Gen I' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Es legendario:</span>
            <span class="font-semibold">{{ detail.species.is_legendary ? '✅ Sí' : '❌ No' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Es mítico:</span>
            <span class="font-semibold">{{ detail.species.is_mythical ? '✅ Sí' : '❌ No' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="text-center text-slate-400 py-12">
    <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    <p class="mt-4 text-lg">Cargando Pokémon...</p>
  </div>
  <div v-else-if="error" class="text-center py-12">
    <p class="text-red-500 text-xl mb-4">❌ {{ error }}</p>
    <button @click="loadPokemon" class="btn">Reintentar</button>
  </div>
</template>

<style scoped></style>
