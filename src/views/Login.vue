<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()
auth.init()

async function submit() {
  try {
    await auth.login(email.value, password.value)
    
    // Pedir permisos de notificación después de login exitoso
    if (window.requestNotificationPermission) {
      setTimeout(() => {
        window.requestNotificationPermission()
      }, 500)
    }
    
    router.push('/')
  } catch (e) {}
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4">
    <div class="w-full max-w-md">
      <div class="card glass glow-border p-8">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-display neon font-bold mb-2">POKEDEX</h1>
          <h2 class="text-2xl font-semibold text-slate-700 dark:text-slate-200">Iniciar sesión</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Accede a tu cuenta de Pokédex</p>
        </div>
        <form @submit.prevent="submit" class="space-y-4">
          <div class="relative">
            <input 
              v-model="email" 
              placeholder="tu@correo.com" 
              type="email" 
              required 
              class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-poke-blue-500 transition"
            />
          </div>
          <div class="relative">
            <input 
              v-model="password" 
              placeholder="Contraseña" 
              type="password" 
              required 
              class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-poke-blue-500 transition"
            />
          </div>
          <button type="submit" :disabled="auth.loading" class="btn w-full text-lg font-semibold py-3 disabled:opacity-50">
            {{ auth.loading ? 'Conectando...' : 'Entrar' }}
          </button>
        </form>
        <p v-if="auth.error" class="text-red-500 mt-4 text-center text-sm border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{{ auth.error }}</p>
        <div class="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p class="text-slate-600 dark:text-slate-400 text-sm mb-2">¿No tienes cuenta?</p>
          <router-link to="/register" class="text-poke-blue-600 dark:text-poke-blue-400 font-semibold hover:underline">Crear cuenta de Pokédex</router-link>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-500 mt-4 text-center leading-relaxed">
          💡 Modo offline: Si ves "Network Error", puedes registrarte/iniciar sesión localmente
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
