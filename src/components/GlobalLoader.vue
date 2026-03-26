<script setup>
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
const ui = useUiStore()
const { isLoading } = storeToRefs(ui)
</script>

<template>
  <transition name="fade" appear>
    <div v-if="isLoading" class="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm">
      <div class="loader-wrap">
        <div class="neon-ring">
          <div class="neon-core"></div>
        </div>
        <p class="mt-4 text-center text-white/90 font-medium tracking-widest">Cargando página…</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.loader-wrap { display: flex; flex-direction: column; align-items: center; }

.neon-ring {
  width: 88px; height: 88px; border-radius: 50%;
  position: relative; box-shadow: 0 0 24px rgba(99,102,241,0.6), inset 0 0 24px rgba(34,197,94,0.6);
  background: conic-gradient(from 0deg, #60a5fa, #a78bfa, #22c55e, #f43f5e, #60a5fa);
  animation: spin 1.6s linear infinite;
}
.neon-core {
  position: absolute; inset: 10px; border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15), rgba(15,23,42,0.8));
  backdrop-filter: blur(2px);
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
