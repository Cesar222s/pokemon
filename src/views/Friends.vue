<script setup>
import { ref, onMounted, computed } from 'vue'
import { useFriendsStore } from '@/stores/friends'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'

const code = ref('')
const friends = useFriendsStore()
const auth = useAuthStore()
const router = useRouter()
const ui = useUiStore()
const myId = computed(() => auth.user?.id || auth.user?.email || 'Invitado')

onMounted(() => {
  if (!auth.isAuthenticated) {
    ui.showNotice('❌ Debes iniciar sesión para acceder a tus amigos', 'error')
    setTimeout(() => router.push('/login'), 2000)
    return
  }
  friends.load()
})

async function add() {
  if (!code.value) return
  await friends.addByCode(code.value)
  code.value = ''
}

function goToBattle(friend) {
  // Guardar amigo seleccionado en sessionStorage para que Battle.vue lo use
  sessionStorage.setItem('selectedBattleFriend', JSON.stringify(friend))
  router.push('/battle')
}
</script>

<template>
  <div>
    <div class="mb-8">
      <span class="text-sm font-semibold text-poke-blue-600 dark:text-poke-blue-400 uppercase tracking-widest">Conecta y compite</span>
      <h1 class="text-5xl font-display neon font-bold mb-3">Amigos</h1>
      <p class="text-slate-600 dark:text-slate-300 max-w-xl">Agrega amigos y desafíalos a batallas</p>
    </div>
    
    <div class="grid md:grid-cols-2 gap-6 mb-8">
      <div class="card glass glow-border">
        <h3 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="text-2xl">📋</span> Tu código</h3>
        <div class="bg-gradient-to-r from-poke-blue-100 to-poke-blue-50 dark:from-poke-blue-900 dark:to-poke-blue-800 p-4 rounded-lg border border-poke-blue-300 dark:border-poke-blue-700">
          <p class="text-sm text-slate-600 dark:text-slate-300 mb-2">Comparte para agregar amigos</p>
          <p class="text-xl font-bold text-poke-blue-700 dark:text-poke-blue-300 break-all font-mono">{{ myId }}</p>
        </div>
      </div>
      
      <div class="card glass glow-border">
        <h3 class="text-lg font-semibold mb-3 flex items-center gap-2"><span class="text-2xl">➕</span> Agregar amigo</h3>
        <div class="flex gap-2">
          <input v-model="code" placeholder="Código del amigo" class="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur focus:outline-none focus:ring-2 focus:ring-poke-blue-500 transition" />
          <button class="btn px-6" @click="add">Agregar</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <span class="text-2xl">👥</span> Mis amigos ({{ friends.friends.length }})
      </h3>
      <div v-if="!friends.friends.length" class="text-center py-8 text-slate-500">
        <p class="mb-2">Sin amigos aún</p>
        <p class="text-sm">Invita amigos usando el código anterior</p>
      </div>
      <ul v-else class="space-y-2">
        <li v-for="f in friends.friends" :key="f.id" class="flex justify-between items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition border border-slate-200 dark:border-slate-600">
          <div class="flex-1">
            <div class="font-semibold text-slate-900 dark:text-white">{{ f.email }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: {{ f.code || f.id }}</div>
          </div>
          <button 
            @click="goToBattle(f)"
            class="btn px-4 py-2 whitespace-nowrap ml-4"
            title="Retar a batalla"
          >
            🎮 Batalla
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped></style>
