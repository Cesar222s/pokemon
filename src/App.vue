<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import GlobalLoader from '@/components/GlobalLoader.vue'
const auth = useAuthStore()
auth.init()

const dark = ref(false)
const menuOpen = ref(false)
const isOnline = ref(navigator.onLine)

onMounted(() => {
  const saved = localStorage.getItem('theme')
  dark.value = saved === 'dark'
  document.documentElement.classList.toggle('dark', dark.value)
  
  // Detectar cambios de conexión
  window.addEventListener('online', () => {
    isOnline.value = true
    console.log('✅ Conexión restaurada')
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
    console.log('❌ Modo offline activado')
  })
})

function toggleDark() {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
  localStorage.setItem('theme', dark.value ? 'dark' : 'light')
}
function toggleMenu() { menuOpen.value = !menuOpen.value }
</script>

<template>
  <GlobalLoader />
  <header class="navbar">
    <div class="nav-inner">
      <div class="flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="white" opacity="0.9"/>
          <path d="M2 16h28" stroke="black" stroke-width="3"/>
          <circle cx="16" cy="16" r="6" fill="white" stroke="black" stroke-width="3"/>
          <circle cx="16" cy="16" r="3" fill="#e11d48"/>
        </svg>
        <span class="text-xl font-semibold tracking-wider font-display neon">POKEDEX</span>
        <button class="btn-outline" @click="toggleDark">{{ dark ? 'Claro' : 'Oscuro' }}</button>
        <button class="btn-outline sm:hidden" @click="toggleMenu">Menú</button>
      </div>
      <nav class="nav-links hidden sm:flex">
        <router-link class="nav-link" to="/">Inicio</router-link>
        <router-link class="nav-link" to="/favorites">Favoritos</router-link>
        <router-link class="nav-link" to="/teams">Equipos</router-link>
        <router-link class="nav-link" to="/friends">Amigos</router-link>
        <router-link class="nav-link" to="/battle">Batalla</router-link>
      </nav>
      <div class="flex items-center gap-3">
        <!-- Status de conexión -->
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" :class="isOnline ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'">
          <span class="text-lg" :class="isOnline ? 'animate-pulse' : ''">{{ isOnline ? '🟢' : '🔴' }}</span>
          <span class="hidden sm:inline">{{ isOnline ? 'Online' : 'Offline' }}</span>
        </div>
        
        <router-link v-if="!auth.isAuthenticated" class="btn-outline" to="/login">Login</router-link>
        <router-link v-if="!auth.isAuthenticated" class="btn" to="/register">Registro</router-link>
        <button v-if="auth.isAuthenticated" class="btn" @click="auth.logout">Salir</button>
      </div>
    </div>
    <!-- Mobile menu -->
    <div v-if="menuOpen" class="sm:hidden border-t border-white/20 bg-white/80 dark:bg-slate-900/80">
      <div class="container py-2 flex flex-col gap-2">
        <router-link class="nav-link" @click="menuOpen=false" to="/">Inicio</router-link>
        <router-link class="nav-link" @click="menuOpen=false" to="/favorites">Favoritos</router-link>
        <router-link class="nav-link" @click="menuOpen=false" to="/teams">Equipos</router-link>
        <router-link class="nav-link" @click="menuOpen=false" to="/friends">Amigos</router-link>
        <router-link class="nav-link" @click="menuOpen=false" to="/battle">Batalla</router-link>
      </div>
    </div>
  </header>
  <main class="container py-6">
    <router-view />
  </main>
</template>

<style scoped></style>
