<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useFriendsStore } from '@/stores/friends'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { getPokemonDetail, getMoveDetail } from '@/services/pokeapi'
import TypeChip from '@/components/TypeChip.vue'

const a = ref('pikachu')
const b = ref('charmander')
const battle = useBattleStore()
const friends = useFriendsStore()
const auth = useAuthStore()
const router = useRouter()
const ui = useUiStore()
const mode = ref('local') // 'local' o 'multiplayer'
const selectedFriend = ref(null)
const userTeam = ref(['pikachu'])
const loading = ref(false)
const error = ref(null)

const aPreview = ref(null)
const bPreview = ref(null)
let aTimer = null
let bTimer = null

const aMoves = ref([])
const bMoves = ref([])
const selectedMoveA = ref(null)
const selectedMoveB = ref(null)

const displayedAHP = ref(0)
const displayedBHP = ref(0)

// Hit animations and move badges
const hitA = ref(false)
const hitB = ref(false)
const attackAnimA = ref(false)
const attackAnimB = ref(false)
const moveBadgeA = ref(null)
const moveBadgeB = ref(null)
const effClassA = ref('')
const effClassB = ref('')
const critA = ref(false)
const critB = ref(false)
const effectTextA = ref(null)
const effectTextB = ref(null)

function effToClass(eff) {
  if (eff === 0) return 'bg-slate-500'
  if (eff > 1) return 'bg-red-600'
  if (eff < 1) return 'bg-blue-600'
  return 'bg-slate-800'
}

function effToText(eff) {
  if (eff === 0) return 'No afecta…'
  if (eff > 1) return '¡Súper eficaz!'
  if (eff < 1) return 'No es muy eficaz…'
  return 'Es eficaz.'
}

function loadPreview(name, setRef) {
  if (!name) {
    setRef.value = null
    return
    }
  getPokemonDetail(name)
    .then((p) => (setRef.value = p))
    .catch(() => (setRef.value = null))
}

async function loadMoves(preview, setMoves) {
  setMoves.value = []
  if (!preview || !Array.isArray(preview.moves)) return
  const subset = preview.moves.slice(0, 20)
  const details = await Promise.all(
    subset.map((m) => getMoveDetail(m.url).catch(() => null))
  )
  setMoves.value = details
    .filter((d) => d && d.power > 0 && d.kind !== 'status')
    .sort((a, b) => b.power - a.power)
}

watch(a, (val) => {
  if (aTimer) clearTimeout(aTimer)
  aTimer = setTimeout(() => loadPreview(val, aPreview), 300)
})

watch(b, (val) => {
  if (bTimer) clearTimeout(bTimer)
  bTimer = setTimeout(() => loadPreview(val, bPreview), 300)
})

onMounted(() => {
  if (!auth.isAuthenticated) {
    ui.showNotice('❌ Debes iniciar sesión para acceder a batallas', 'error')
    setTimeout(() => router.push('/login'), 2000)
    return
  }
  loadPreview(a.value, aPreview)
  loadPreview(b.value, bPreview)
  loadFriends()
})

watch(aPreview, async (p) => {
  await loadMoves(p, aMoves)
  selectedMoveA.value = aMoves.value[0] || null
})

watch(bPreview, async (p) => {
  await loadMoves(p, bMoves)
  selectedMoveB.value = bMoves.value[0] || null
})

function animateEvents(events) {
  let i = 0
  const step = () => {
    if (!events || i >= events.length) return
    const ev = events[i]
    if (typeof ev.aHP === 'number') displayedAHP.value = ev.aHP
    if (typeof ev.bHP === 'number') displayedBHP.value = ev.bHP
    i += 1
    if (i < events.length) setTimeout(step, 500)
  }
  setTimeout(step, 500)
}

async function startInteractive() {
  await battle.startInteractive(a.value, b.value, selectedMoveA.value, selectedMoveB.value)
  if (battle.current) {
    displayedAHP.value = battle.current.aHP
    displayedBHP.value = battle.current.bHP
  }
  if (battle.result) {
    displayedAHP.value = battle.result.aHP || battle.current.aHP
    displayedBHP.value = battle.result.bHP || battle.current.bHP
  }
}

function attackA() {
  const ev = battle.attack('a')
  if (ev && battle.current) {
    // Animación de ataque de A
    attackAnimA.value = true
    setTimeout(() => { attackAnimA.value = false }, 400)
    
    // B recibe el golpe después de un delay
    setTimeout(() => {
      displayedAHP.value = battle.current.aHP
      displayedBHP.value = battle.current.bHP
      const moveName = selectedMoveA.value?.name || (ev.moveType || 'ataque')
      moveBadgeB.value = `${moveName} ×${ev.eff}`
      effClassB.value = effToClass(ev.eff)
      hitB.value = true
      if (ev.crit) { critB.value = true; setTimeout(() => { critB.value = false }, 700) }
      effectTextB.value = effToText(ev.eff)
      setTimeout(() => { hitB.value = false; moveBadgeB.value = null; effectTextB.value = null }, 700)
    }, 300)
  }
}

function attackB() {
  const ev = battle.attack('b')
  if (ev && battle.current) {
    // Animación de ataque de B
    attackAnimB.value = true
    setTimeout(() => { attackAnimB.value = false }, 400)
    
    // A recibe el golpe después de un delay
    setTimeout(() => {
      displayedAHP.value = battle.current.aHP
      displayedBHP.value = battle.current.bHP
      const moveName = selectedMoveB.value?.name || (ev.moveType || 'ataque')
      moveBadgeA.value = `${moveName} ×${ev.eff}`
      effClassA.value = effToClass(ev.eff)
      hitA.value = true
      if (ev.crit) { critA.value = true; setTimeout(() => { critA.value = false }, 700) }
      effectTextA.value = effToText(ev.eff)
      setTimeout(() => { hitA.value = false; moveBadgeA.value = null; effectTextA.value = null }, 700)
    }, 300)
  }
}

// Funciones para batallas multijugador
async function sendChallenge() {
  if (!selectedFriend.value || !userTeam.value.length) {
    error.value = 'Selecciona un amigo y configura tu equipo'
    return
  }
  loading.value = true
  error.value = null
  try {
    await battle.challengeFriend(
      selectedFriend.value.id,
      selectedFriend.value.email,
      userTeam.value
    )
    error.value = '✅ ¡Reto enviado! Esperando respuesta...'
    setTimeout(() => { error.value = null }, 3000)
  } catch (e) {
    error.value = '❌ Error al enviar reto: ' + e.message
  } finally {
    loading.value = false
  }
}

async function loadFriends() {
  try {
    await friends.load()
    // Cargar amigo pre-seleccionado desde sessionStorage (viene de Friends.vue)
    const selectedFromSession = sessionStorage.getItem('selectedBattleFriend')
    if (selectedFromSession) {
      selectedFriend.value = JSON.parse(selectedFromSession)
      sessionStorage.removeItem('selectedBattleFriend')
      mode.value = 'multiplayer'
    }
  } catch (e) {
    console.error('Error al cargar amigos:', e)
  }
}
</script>

<template>
  <div class="space-y-4 pb-8">
    <div class="mb-8">
      <span class="text-sm font-semibold text-poke-red-600 dark:text-poke-red-400 uppercase tracking-widest">Demuestra tu habilidad</span>
      <h1 class="text-5xl font-display neon font-bold mb-3">Arena de Batalla</h1>
      <p class="text-slate-600 dark:text-slate-300 max-w-xl">Enfrenta Pokémon en batallas locales o desafía a tus amigos</p>
    </div>
    
    <!-- Selector de modo de batalla -->
    <div class="card flex gap-2 items-center justify-between mb-4">
      <div class="flex gap-2">
        <button 
          @click="mode = 'local'"
          :class="mode === 'local' ? 'btn btn-primary' : 'btn btn-secondary'"
        >
          🏠 Batalla Local
        </button>
        <button 
          @click="mode = 'multiplayer'; loadFriends()"
          :class="mode === 'multiplayer' ? 'btn btn-primary' : 'btn btn-secondary'"
        >
          👥 Batalla con Amigo
        </button>
      </div>
    </div>

    <!-- Panel de batalla multijugador -->
    <div v-if="mode === 'multiplayer'" class="card">
      <h2 class="text-xl font-semibold mb-3">🎮 Reta a un amigo</h2>
      <div v-if="error" :class="['p-3 rounded-lg mb-3', error.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400']">
        {{ error }}
      </div>
      
      <!-- Selector de amigos -->
      <div class="mb-4">
        <label class="block text-sm font-semibold mb-2">Selecciona un amigo</label>
        <div class="space-y-2 max-h-40 overflow-y-auto custom-scroll">
          <button 
            v-if="friends.friends.length === 0"
            disabled
            class="w-full px-4 py-2 rounded-lg bg-slate-700/30 text-slate-400 text-sm"
          >
            No tienes amigos agregados. Agrega algunos en la sección de Amigos.
          </button>
          <button 
            v-for="f in friends.friends" 
            :key="f.id"
            @click="selectedFriend = f"
            :class="selectedFriend?.id === f.id 
              ? 'bg-blue-500/30 border-blue-500' 
              : 'bg-slate-700/20 border-slate-600 hover:border-blue-400'"
            class="w-full px-4 py-2 rounded-lg border-2 text-left transition-all flex items-center gap-2"
          >
            <span>👤</span>
            <span class="font-semibold">{{ f.email }}</span>
            <span class="ml-auto text-xs text-slate-400">({{ f.code || 'amigo' }})</span>
          </button>
        </div>
      </div>

      <!-- Configurar equipo -->
      <div class="mb-4">
        <label class="block text-sm font-semibold mb-2">Tu Pokémon para la batalla</label>
        <input 
          v-model="userTeam[0]"
          placeholder="ej: pikachu, charizard, dragonite"
          class="w-full px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
        <p class="text-xs text-slate-400 mt-1">💡 El primer Pokémon de tu equipo será usado en la batalla</p>
      </div>

      <!-- Botón enviar reto -->
      <button 
        @click="sendChallenge"
        :disabled="loading || !selectedFriend || !userTeam[0]"
        class="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="loading">⏳ Enviando...</span>
        <span v-else>
          <span>🔥</span> Retar a batalla
        </span>
      </button>
    </div>

    <!-- Panel de batalla local -->
    <div v-if="mode === 'local'" class="space-y-4">
      <h2 class="text-2xl font-semibold mb-3">Batalla entre amigos</h2>
      <p class="text-slate-500 mb-2">Simulación rápida por nombre (considera estadísticas y tipos)</p>
      <div class="flex gap-2 mb-3">
        <input v-model="a" placeholder="Pokémon A" class="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
        <input v-model="b" placeholder="Pokémon B" class="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
        <button class="btn" @click="startInteractive">Iniciar batalla</button>
      </div>
      <!-- Selector de movimientos Pokémon A -->
      <div class="card">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
            {{ aPreview?.name?.[0]?.toUpperCase() || 'A' }}
          </div>
          <div>
            <h3 class="font-bold text-lg capitalize">{{ aPreview?.name || 'Pokémon A' }}</h3>
            <p class="text-xs text-slate-400">Selecciona un movimiento</p>
          </div>
        </div>
        <div class="space-y-2 max-h-64 overflow-y-auto custom-scroll">
          <button
            v-for="m in aMoves"
            :key="m.name"
            @click="selectedMoveA = m"
            class="w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg"
            :class="selectedMoveA?.name === m.name 
              ? 'border-blue-500 bg-blue-500/10 shadow-md' 
              : 'border-white/10 hover:border-blue-400/50 bg-white/5'"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-base capitalize flex items-center gap-2">
                {{ m.kind === 'physical' ? '⚔️' : m.kind === 'special' ? '✨' : '🔮' }}
                {{ m.name.replace('-', ' ') }}
              </span>
              <span class="text-xs px-2 py-1 rounded-full font-semibold" 
                    :class="m.kind === 'physical' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'">
                {{ m.kind }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <TypeChip :type="m.type" />
              <span class="flex items-center gap-1 font-semibold">
                <span class="text-red-400">💥</span> {{ m.power }}
              </span>
              <span class="flex items-center gap-1 text-slate-400">
                <span>🎯</span> {{ m.accuracy }}%
              </span>
              <span class="flex items-center gap-1 text-slate-400">
                <span>📊</span> {{ m.pp }} PP
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Selector de movimientos Pokémon B -->
      <div class="card">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-lg">
            {{ bPreview?.name?.[0]?.toUpperCase() || 'B' }}
          </div>
          <div>
            <h3 class="font-bold text-lg capitalize">{{ bPreview?.name || 'Pokémon B' }}</h3>
            <p class="text-xs text-slate-400">Selecciona un movimiento</p>
          </div>
        </div>
        <div class="space-y-2 max-h-64 overflow-y-auto custom-scroll">
          <button
            v-for="m in bMoves"
            :key="m.name"
            @click="selectedMoveB = m"
            class="w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg"
            :class="selectedMoveB?.name === m.name 
              ? 'border-red-500 bg-red-500/10 shadow-md' 
              : 'border-white/10 hover:border-red-400/50 bg-white/5'"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-base capitalize flex items-center gap-2">
                {{ m.kind === 'physical' ? '⚔️' : m.kind === 'special' ? '✨' : '🔮' }}
                {{ m.name.replace('-', ' ') }}
              </span>
              <span class="text-xs px-2 py-1 rounded-full font-semibold" 
                    :class="m.kind === 'physical' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'">
                {{ m.kind }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <TypeChip :type="m.type" />
              <span class="flex items-center gap-1 font-semibold">
                <span class="text-red-400">💥</span> {{ m.power }}
              </span>
              <span class="flex items-center gap-1 text-slate-400">
                <span>🎯</span> {{ m.accuracy }}%
              </span>
              <span class="flex items-center gap-1 text-slate-400">
                <span>📊</span> {{ m.pp }} PP
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
    <div class="card mb-3">
      <div class="flex items-center justify-center gap-6">
        <div class="text-center relative flex-1 max-w-xs">
          <img :src="aPreview?.sprite" :alt="aPreview?.name || 'Pokémon A'" class="w-32 h-32 object-contain mx-auto transition-transform"
               :class="[
                 battle.current?.active === 'b' ? 'cursor-pointer' : 'opacity-70', 
                 hitA ? 'hit' : '', 
                 critA ? 'crit' : '',
                 attackAnimA ? 'attack-forward' : ''
               ]"
               @click="battle.current?.active === 'b' ? attackB() : null" />
          <div class="mt-2 capitalize font-bold text-lg">{{ aPreview?.name || a }}</div>
          
          <!-- Barra de vida Pokémon A -->
          <div v-if="aPreview" class="mt-2 px-2">
            <div class="flex justify-between text-xs mb-1">
              <span class="font-semibold">HP</span>
              <span v-if="battle.current || battle.result">
                {{ Math.floor(displayedAHP) }} / {{ battle.result?.aMaxHP || battle.current?.aMaxHP || 100 }}
              </span>
              <span v-else class="text-green-400">100%</span>
            </div>
            <div class="w-full h-4 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-600">
              <div 
                class="h-full transition-all duration-500 rounded-full"
                :class="(battle.current || battle.result)
                  ? (displayedAHP / (battle.result?.aMaxHP || battle.current?.aMaxHP || 100) > 0.5 ? 'bg-green-500' : displayedAHP / (battle.result?.aMaxHP || battle.current?.aMaxHP || 100) > 0.2 ? 'bg-yellow-500' : 'bg-red-500')
                  : 'bg-green-500'"
                :style="(battle.current || battle.result)
                  ? { width: Math.max(0, Math.min(100, (displayedAHP / (battle.result?.aMaxHP || battle.current?.aMaxHP || 100)) * 100)) + '%' }
                  : { width: '100%' }"
              ></div>
            </div>
          </div>
          
          <div v-if="moveBadgeA" class="absolute -top-2 left-1/2 -translate-x-1/2 text-white text-xs px-2 py-1 rounded-full shadow" :class="effClassA">
            {{ moveBadgeA }}
          </div>
          <div v-if="effectTextA" class="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-700 dark:text-slate-200">
            {{ effectTextA }}
          </div>
        </div>
        
        <span class="text-2xl font-bold neon">VS</span>
        
        <div class="text-center relative flex-1 max-w-xs">
          <img :src="bPreview?.sprite" :alt="bPreview?.name || 'Pokémon B'" class="w-32 h-32 object-contain mx-auto transition-transform"
               :class="[
                 battle.current?.active === 'a' ? 'cursor-pointer' : 'opacity-70', 
                 hitB ? 'hit' : '', 
                 critB ? 'crit' : '',
                 attackAnimB ? 'attack-backward' : ''
               ]"
               @click="battle.current?.active === 'a' ? attackA() : null" />
          <div class="mt-2 capitalize font-bold text-lg">{{ bPreview?.name || b }}</div>
          
          <!-- Barra de vida Pokémon B -->
          <div v-if="bPreview" class="mt-2 px-2">
            <div class="flex justify-between text-xs mb-1">
              <span class="font-semibold">HP</span>
              <span v-if="battle.current || battle.result">
                {{ Math.floor(displayedBHP) }} / {{ battle.result?.bMaxHP || battle.current?.bMaxHP || 100 }}
              </span>
              <span v-else class="text-green-400">100%</span>
            </div>
            <div class="w-full h-4 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-600">
              <div 
                class="h-full transition-all duration-500 rounded-full"
                :class="(battle.current || battle.result)
                  ? (displayedBHP / (battle.result?.bMaxHP || battle.current?.bMaxHP || 100) > 0.5 ? 'bg-green-500' : displayedBHP / (battle.result?.bMaxHP || battle.current?.bMaxHP || 100) > 0.2 ? 'bg-yellow-500' : 'bg-red-500')
                  : 'bg-green-500'"
                :style="(battle.current || battle.result)
                  ? { width: Math.max(0, Math.min(100, (displayedBHP / (battle.result?.bMaxHP || battle.current?.bMaxHP || 100)) * 100)) + '%' }
                  : { width: '100%' }"
              ></div>
            </div>
          </div>
          
          <div v-if="moveBadgeB" class="absolute -top-2 left-1/2 -translate-x-1/2 text-white text-xs px-2 py-1 rounded-full shadow" :class="effClassB">
            {{ moveBadgeB }}
          </div>
          <div v-if="effectTextB" class="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-700 dark:text-slate-200">
            {{ effectTextB }}
          </div>
        </div>
      </div>
      <div v-if="battle.current" class="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
        <div class="inline-block px-4 py-2 bg-white/5 rounded-lg border border-white/10">
          <span class="font-semibold">Turno {{ battle.current.turn }}</span> — 
          Ataca: <span class="capitalize font-bold neon">{{ battle.current.active === 'a' ? (battle.current.a?.name || aPreview?.name || a) : (battle.current.b?.name || bPreview?.name || b) }}</span>
        </div>
        <p class="mt-2 text-xs">💡 Haz click en el oponente para aplicar el daño</p>
      </div>
    </div>
    <div v-if="battle.result" class="card">
      <div class="text-center mb-6">
        <div class="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-lg">
          <h3 class="text-2xl font-bold text-white">🏆 Ganador: <span class="capitalize">{{ battle.result.winner.name }}</span></h3>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Pokémon A Stats -->
        <div class="bg-white/5 rounded-xl p-6 border-2 border-blue-500/30">
          <div class="flex items-center gap-3 mb-4">
            <img :src="aPreview?.sprite" :alt="battle.result.a?.name" class="w-16 h-16 object-contain">
            <div class="flex-1">
              <h4 class="text-xl font-bold capitalize mb-1">{{ battle.result.a?.name }}</h4>
              <div class="flex gap-1">
                <TypeChip v-for="t in aPreview?.types" :key="t" :type="t" />
              </div>
            </div>
          </div>
          
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-semibold">💚 HP</span>
                <span class="font-mono">{{ Math.floor(displayedAHP) }} / {{ battle.result.aMaxHP }}</span>
              </div>
              <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  class="h-full transition-all duration-500 rounded-full"
                  :class="displayedAHP / battle.result.aMaxHP > 0.5 ? 'bg-green-500' : displayedAHP / battle.result.aMaxHP > 0.2 ? 'bg-yellow-500' : 'bg-red-500'"
                  :style="{ width: Math.max(0, Math.min(100, (displayedAHP / battle.result.aMaxHP) * 100)) + '%' }"
                ></div>
              </div>
            </div>
            
            <div v-if="selectedMoveA" class="bg-white/5 rounded-lg p-3 border border-white/10">
              <p class="text-xs text-slate-400 mb-1">Movimiento usado</p>
              <p class="font-bold capitalize flex items-center gap-2">
                {{ selectedMoveA.kind === 'physical' ? '⚔️' : '✨' }}
                {{ selectedMoveA.name.replace('-', ' ') }}
              </p>
              <div class="flex items-center gap-3 mt-2 text-xs">
                <TypeChip :type="selectedMoveA.type" />
                <span class="text-red-400">💥 {{ selectedMoveA.power }}</span>
                <span class="text-slate-400">🎯 {{ selectedMoveA.accuracy }}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pokémon B Stats -->
        <div class="bg-white/5 rounded-xl p-6 border-2 border-red-500/30">
          <div class="flex items-center gap-3 mb-4">
            <img :src="bPreview?.sprite" :alt="battle.result.b?.name" class="w-16 h-16 object-contain">
            <div class="flex-1">
              <h4 class="text-xl font-bold capitalize mb-1">{{ battle.result.b?.name }}</h4>
              <div class="flex gap-1">
                <TypeChip v-for="t in bPreview?.types" :key="t" :type="t" />
              </div>
            </div>
          </div>
          
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-semibold">💚 HP</span>
                <span class="font-mono">{{ Math.floor(displayedBHP) }} / {{ battle.result.bMaxHP }}</span>
              </div>
              <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  class="h-full transition-all duration-500 rounded-full"
                  :class="displayedBHP / battle.result.bMaxHP > 0.5 ? 'bg-green-500' : displayedBHP / battle.result.bMaxHP > 0.2 ? 'bg-yellow-500' : 'bg-red-500'"
                  :style="{ width: Math.max(0, Math.min(100, (displayedBHP / battle.result.bMaxHP) * 100)) + '%' }"
                ></div>
              </div>
            </div>
            
            <div v-if="selectedMoveB" class="bg-white/5 rounded-lg p-3 border border-white/10">
              <p class="text-xs text-slate-400 mb-1">Movimiento usado</p>
              <p class="font-bold capitalize flex items-center gap-2">
                {{ selectedMoveB.kind === 'physical' ? '⚔️' : '✨' }}
                {{ selectedMoveB.name.replace('-', ' ') }}
              </p>
              <div class="flex items-center gap-3 mt-2 text-xs">
                <TypeChip :type="selectedMoveB.type" />
                <span class="text-red-400">💥 {{ selectedMoveB.power }}</span>
                <span class="text-slate-400">🎯 {{ selectedMoveB.accuracy }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white/5 rounded-lg p-4 border border-white/10">
        <h4 class="font-semibold mb-2 flex items-center gap-2">
          <span>📜</span> Registro de batalla
        </h4>
        <ul class="space-y-1 text-sm text-slate-300">
          <li v-for="(l, i) in battle.log" :key="i" class="pl-4 border-l-2 border-slate-600 py-1">{{ l }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animación de ataque - moverse hacia adelante */
@keyframes attack-forward {
  0% { transform: translateX(0) scale(1); }
  50% { transform: translateX(40px) scale(1.1); }
  100% { transform: translateX(0) scale(1); }
}

@keyframes attack-backward {
  0% { transform: translateX(0) scale(1); }
  50% { transform: translateX(-40px) scale(1.1); }
  100% { transform: translateX(0) scale(1); }
}

.attack-forward {
  animation: attack-forward 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.attack-backward {
  animation: attack-backward 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Animación de recibir golpe - shake más intenso */
@keyframes hit-shake {
  0% { transform: translateX(0) rotate(0deg); filter: brightness(1.3); }
  10% { transform: translateX(-8px) rotate(-5deg); filter: brightness(1.4); }
  20% { transform: translateX(8px) rotate(5deg); filter: brightness(1.5); }
  30% { transform: translateX(-8px) rotate(-5deg); filter: brightness(1.4); }
  40% { transform: translateX(8px) rotate(5deg); filter: brightness(1.3); }
  50% { transform: translateX(-6px) rotate(-3deg); filter: brightness(1.2); }
  60% { transform: translateX(6px) rotate(3deg); filter: brightness(1.1); }
  70% { transform: translateX(-4px) rotate(-2deg); filter: brightness(1.05); }
  80% { transform: translateX(4px) rotate(2deg); filter: brightness(1.02); }
  90% { transform: translateX(-2px) rotate(-1deg); filter: brightness(1.01); }
  100% { transform: translateX(0) rotate(0deg); filter: brightness(1); }
}

.hit { 
  animation: hit-shake 600ms ease-out;
}

/* Animación de golpe crítico - flash dramático */
@keyframes crit-flash {
  0% { 
    filter: drop-shadow(0 0 0 rgba(255, 215, 0, 0)) brightness(1) saturate(1);
    transform: scale(1);
  }
  25% { 
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) brightness(1.5) saturate(1.5);
    transform: scale(1.15);
  }
  50% { 
    filter: drop-shadow(0 0 30px rgba(255, 100, 0, 1)) brightness(1.8) saturate(2);
    transform: scale(1.2) rotate(5deg);
  }
  75% { 
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) brightness(1.5) saturate(1.5);
    transform: scale(1.15) rotate(-5deg);
  }
  100% { 
    filter: drop-shadow(0 0 0 rgba(255, 215, 0, 0)) brightness(1) saturate(1);
    transform: scale(1) rotate(0deg);
  }
}

.crit { 
  animation: crit-flash 800ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
  position: relative;
  z-index: 10;
}

/* Estilo para scroll personalizado */
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 10px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}
</style>
