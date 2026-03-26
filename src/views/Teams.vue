<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTeamsStore } from '@/stores/teams'
import { useFavoritesStore } from '@/stores/favorites'
import { getPokemonList } from '@/services/pokeapi'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()
const name = ref('')
const teams = useTeamsStore()
const favs = useFavoritesStore()

// Search state for adding Pokémon directly
const searchName = ref('')
const searchType1 = ref('')
const searchOffset = ref(0)
const searchResults = ref([])
const searchLoading = ref(false)
const searchError = ref('')
const PAGE_SIZE = 24
const pageNumber = computed(() => Math.floor(searchOffset.value / PAGE_SIZE) + 1)

// Modal state
const showSearchFavs = ref(false)
const showSearchPokemon = ref(false)
const currentTeamForSearch = ref(null)

// UI notice messages
const notice = ref('')
const noticeType = ref('success') // success, error, warning
function showNotice(msg, type = 'success') {
  notice.value = msg
  noticeType.value = type
  setTimeout(() => (notice.value = ''), 2500)
}

onMounted(async () => {
  // Verificar autenticación
  if (!auth.isAuthenticated) {
    showNotice('❌ Debes iniciar sesión para acceder a tus equipos', 'error')
    setTimeout(() => router.push('/login'), 2000)
    return
  }
  
  await teams.load()
  await favs.load()
  // No precargar Pokémon - cargar bajo demanda cuando el usuario lo solicite
})

async function createTeam() {
  if (!name.value.trim()) {
    showNotice('⚠️ Escribe un nombre para el equipo', 'warning')
    return
  }
  if (name.value.length > 20) {
    showNotice('❌ El nombre no puede exceder 20 caracteres', 'error')
    return
  }
  await teams.create(name.value)
  showNotice('✅ Equipo creado exitosamente', 'success')
  name.value = ''
}

function addToTeam(teamId, pokemon) {
  if (isTeamFull(teamId)) {
    showNotice('❌ El equipo ya tiene 6 miembros', 'error')
    return
  }
  if (isInTeam(teamId, pokemon.id)) {
    showNotice('❌ Ese Pokémon ya está en el equipo', 'error')
    return
  }
  teams.addMember(teamId, pokemon)
  showNotice(`✅ ${pokemon.name} agregado al equipo`, 'success')
}

async function handleAddPokemonToTeam(pokemon) {
  if (currentTeamForSearch.value) {
    addToTeam(currentTeamForSearch.value, pokemon)
    // Cierra el modal después de agregar
    if (isTeamFull(currentTeamForSearch.value)) {
      showSearchFavs.value = false
      showSearchPokemon.value = false
    }
  }
}

async function removeFromTeam(teamId, pokemonId) {
  await teams.removeMember(teamId, pokemonId)
  showNotice('✅ Pokémon removido', 'success')
}

function deleteTeam(teamId) {
  teams.remove(teamId)
  showNotice('✅ Equipo eliminado', 'success')
}

function isTeamFull(teamId) {
  const t = teams.teams.find((x) => x.id === teamId)
  return t ? t.members.length >= 6 : false
}

function isInTeam(teamId, pokemonId) {
  const t = teams.teams.find((x) => x.id === teamId)
  return t ? t.members.some((p) => p.id === pokemonId) : false
}

async function searchPokemon() {
  searchLoading.value = true
  searchError.value = ''
  try {
    const list = await getPokemonList({
      name: searchName.value || undefined,
      type1: searchType1.value || undefined,
      type2: undefined,
      offset: searchOffset.value || 0,
      limit: PAGE_SIZE,
    })
    searchResults.value = list
  } catch (e) {
    searchError.value = e.message
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function nextPage() {
  searchOffset.value += PAGE_SIZE
  searchPokemon()
}

function prevPage() {
  searchOffset.value = Math.max(0, searchOffset.value - PAGE_SIZE)
  searchPokemon()
}
</script>

<template>
  <div class="min-h-screen pb-12">
    <!-- Header -->
    <div class="mb-12 text-center">
      <span class="text-sm font-semibold text-poke-blue-600 dark:text-poke-blue-400 uppercase tracking-widest">Estrategia batalla</span>
      <h1 class="text-6xl font-display neon font-bold mb-3 block">⚔️ Mis Equipos</h1>
      <p class="text-slate-600 dark:text-slate-300 text-lg">Forma equipos legendarios para dominar las batallas</p>
    </div>

    <!-- Notification -->
    <div v-if="notice" 
      class="fixed top-4 right-4 max-w-sm p-4 rounded-lg font-semibold animate-bounce"
      :class="{
        'bg-green-500/20 text-green-400 border border-green-500/50': noticeType === 'success',
        'bg-red-500/20 text-red-400 border border-red-500/50': noticeType === 'error',
        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50': noticeType === 'warning'
      }"
    >
      {{ notice }}
    </div>

    <div class="max-w-7xl mx-auto px-4">
      <!-- Create Team Section -->
      <div class="mb-12 max-w-2xl mx-auto">
        <div class="card glass glow-border p-8 text-center">
          <h2 class="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
            <span class="text-4xl animate-spin" style="animation-duration: 3s;">🎲</span>
            Nuevo Equipo
            <span class="text-4xl animate-spin" style="animation-duration: 3s; animation-direction: reverse;">🎲</span>
          </h2>
          <p class="text-slate-500 dark:text-slate-400 mb-5">Dale un nombre épico a tu equipo</p>
          <form @submit.prevent="createTeam" class="space-y-4">
            <input 
              v-model="name" 
              placeholder="Ej: Los Inmortales, Team Dragon, Guerreros..."
              maxlength="20"
              @keyup.enter="createTeam"
              class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-poke-blue-500 text-center text-lg font-semibold"
            />
            <div class="flex justify-between items-center">
              <p class="text-xs text-slate-500">{{ name.length }}/20 caracteres</p>
              <button type="submit" class="btn px-12 py-3 text-lg">✨ Crear Equipo</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Teams Grid -->
      <div v-if="teams.teams.length === 0" class="text-center py-20">
        <p class="text-7xl mb-4">🏆</p>
        <p class="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-2">Sin equipos aún</p>
        <p class="text-slate-500 dark:text-slate-400 text-lg">¡Crea tu primer equipo para convertirte en un Campeón Pokémon!</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Team Card -->
        <div v-for="(t, idx) in teams.teams" :key="t.id" class="team-card">
          <!-- Card Background with gradient -->
          <div class="absolute inset-0 bg-gradient-to-br from-poke-blue-600/20 to-poke-red-600/20 rounded-2xl blur"></div>
          
          <div class="relative card overflow-hidden">
            <!-- Team Header -->
            <div class="bg-gradient-to-r from-poke-blue-600 to-poke-red-600 p-6 text-white">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="text-4xl">{{ ['⚡', '🔥', '💧', '🌿', '🧊', '✨'][idx % 6] }}</span>
                  <div>
                    <h3 class="text-2xl font-bold">{{ t.name }}</h3>
                    <p class="text-sm opacity-90">{{ t.members.length }} de 6 Pokémon</p>
                  </div>
                </div>
                <button 
                  @click="deleteTeam(t.id)"
                  class="px-3 py-1 rounded-lg bg-red-500/30 hover:bg-red-500/50 transition"
                >
                  🗑️
                </button>
              </div>

              <!-- Progress bar -->
              <div class="h-2 bg-white/30 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-white transition-all duration-500"
                  :style="{ width: `${(t.members.length / 6) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- Team Members Display -->
            <div class="p-6">
              <div class="grid grid-cols-3 gap-3 mb-6">
                <!-- Member slots with pokeballs -->
                <div v-for="i in 6" :key="i" class="h-28 relative group">
                  <div v-if="t.members[i-1]" class="w-full h-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center relative overflow-hidden border-2 border-slate-200 dark:border-slate-600 hover:border-poke-blue-500 transition">
                    <img 
                      :src="t.members[i-1].officialArt || t.members[i-1].sprite" 
                      :alt="t.members[i-1].name"
                      class="w-24 h-24 object-contain animate-float drop-shadow-lg"
                    />
                    <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap shadow-lg">
                      {{ t.members[i-1].name }}
                    </div>
                    <button 
                      @click="removeFromTeam(t.id, t.members[i-1].id)"
                      class="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-lg"
                    >
                      ✕
                    </button>
                  </div>
                  <div v-else class="w-full h-full rounded-xl border-3 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 hover:border-poke-blue-500 hover:bg-poke-blue-500/5 transition group/empty">
                    <div class="text-center">
                      <p class="text-3xl mb-1">⚫</p>
                      <p class="text-xs font-bold text-slate-500">Vacío</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quick Add Buttons -->
              <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
                <p class="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 uppercase">Agregar Pokémon</p>
                <div class="flex gap-2">
                  <button 
                    v-if="favs.items.length > 0"
                    @click="currentTeamForSearch = t.id; showSearchFavs = true"
                    class="flex-1 py-2 px-3 rounded-lg bg-poke-red-500/20 text-poke-red-400 hover:bg-poke-red-500/30 font-semibold transition text-sm"
                  >
                    ❤️ Favoritos
                  </button>
                  <button 
                    @click="currentTeamForSearch = t.id; showSearchPokemon = true"
                    class="flex-1 py-2 px-3 rounded-lg bg-poke-blue-500/20 text-poke-blue-400 hover:bg-poke-blue-500/30 font-semibold transition text-sm"
                  >
                    🔍 Buscar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Modal for current team -->
    <div v-if="showSearchFavs || showSearchPokemon" class="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50 p-4">
      <div class="card max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scroll">
        <div class="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-slate-50 dark:bg-slate-900">
          <div class="flex justify-between items-center">
            <h3 class="text-2xl font-bold">
              {{ showSearchFavs ? '❤️ Mis Favoritos' : '🔍 Buscar Pokémon' }}
            </h3>
            <button @click="showSearchFavs = showSearchPokemon = false" class="text-2xl hover:scale-110">✕</button>
          </div>
        </div>

        <div class="p-6">
          <!-- Search Inputs (only for search tab) -->
          <div v-if="showSearchPokemon" class="space-y-3 mb-6">
            <input 
              v-model="searchName"
              placeholder="Buscar por nombre..."
              @input="async () => { searchOffset = 0; await searchPokemon() }"
              class="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-poke-blue-500"
            />
            <select 
              v-model="searchType1"
              @change="async () => { searchOffset = 0; await searchPokemon() }"
              class="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-poke-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="fire">🔥 Fuego</option>
              <option value="water">💧 Agua</option>
              <option value="grass">🌿 Planta</option>
              <option value="electric">⚡ Eléctrico</option>
              <option value="ice">❄️ Hielo</option>
              <option value="fighting">👊 Lucha</option>
              <option value="poison">☠️ Veneno</option>
              <option value="ground">⛰️ Tierra</option>
              <option value="flying">🦅 Volador</option>
              <option value="psychic">🧠 Psíquico</option>
              <option value="bug">🐛 Bicho</option>
              <option value="rock">🪨 Roca</option>
              <option value="ghost">👻 Fantasma</option>
              <option value="dragon">🐉 Dragón</option>
              <option value="dark">🌙 Siniestro</option>
              <option value="steel">⚙️ Acero</option>
              <option value="fairy">✨ Hada</option>
            </select>
          </div>

          <!-- Loading -->
          <div v-if="showSearchPokemon && searchLoading" class="text-center py-8">
            <p class="text-slate-500">Buscando Pokémon extraordinarios...</p>
          </div>

          <!-- Error -->
          <div v-else-if="searchError" class="text-center py-8 text-red-500">
            {{ searchError }}
          </div>

          <!-- Empty -->
          <div v-else-if="showSearchPokemon && !searchName && !searchType1" class="text-center py-8 text-slate-500">
            Busca un Pokémon o filtra por tipo
          </div>

          <!-- Results Grid -->
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <button 
              v-for="p in (showSearchFavs ? favs.items : searchResults)"
              :key="p.id"
              @click="handleAddPokemonToTeam(p)"
              class="pokemon-grid-item"
              :class="{ 'opacity-50 cursor-not-allowed': isTeamFull(currentTeamForSearch) || isInTeam(currentTeamForSearch, p.id) }"
              :disabled="isTeamFull(currentTeamForSearch) || isInTeam(currentTeamForSearch, p.id)"
            >
              <div class="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 h-full flex flex-col items-center justify-center hover:shadow-lg transition">
                <img :src="p.officialArt || p.sprite" :alt="p.name" class="w-20 h-20 object-contain animate-float mb-2"/>
                <p class="font-bold capitalize text-sm text-center">{{ p.name }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">ID #{{ p.id }}</p>
              </div>
            </button>
          </div>

          <!-- Pagination -->
          <div v-if="showSearchPokemon && searchResults.length > 0" class="flex justify-between items-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button 
              @click="prevPage"
              :disabled="searchOffset === 0"
              class="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 disabled:opacity-50 hover:bg-slate-300 transition"
            >
              ← Anterior
            </button>
            <span class="font-semibold">Página {{ pageNumber }}</span>
            <button 
              @click="nextPage"
              class="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-card {
  position: relative;
  transition: transform 300ms ease;
}

.team-card:hover {
  transform: translateY(-8px);
}

.pokemon-grid-item {
  transition: all 300ms ease;
}

.pokemon-grid-item:not(:disabled):hover {
  transform: scale(1.05);
}

.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

@keyframes softFloat {
  0%, 100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.02);
  }
}

.animate-float {
  animation: softFloat 2.5s ease-in-out infinite;
}
</style>
