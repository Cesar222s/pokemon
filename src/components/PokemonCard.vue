<script setup>
import { ref, onMounted } from 'vue'
import TypeChip from '@/components/TypeChip.vue'
import { useImageCache } from '@/composables/useImageCache'

const props = defineProps({ pokemon: { type: Object, required: true }, isFav: Boolean })
const emit = defineEmits(['toggle-fav'])

const imageLoading = ref(true)
const imageError = ref(false)
const observer = ref(null)
const { preloadImage } = useImageCache()

// Usar imagen de mejor calidad
const imageUrl = props.pokemon.officialArt || props.pokemon.sprite

onMounted(() => {
  // Precargar imagen en background
  preloadImage(props.pokemon.id, imageUrl)
  
  // Lazy loading con Intersection Observer
  const img = document.querySelector(`[data-pokemon-id="${props.pokemon.id}"]`)
  if (img && 'IntersectionObserver' in window) {
    observer.value = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.src = entry.target.dataset.src
          observer.value.unobserve(entry.target)
        }
      })
    }, { rootMargin: '100px' })
    observer.value.observe(img)
  }
})

function handleImageLoad() {
  imageLoading.value = false
  imageError.value = false
}

function handleImageError() {
  imageLoading.value = false
  imageError.value = true
}
</script>

<template>
  <div class="card overflow-hidden group hover:shadow-lg transition-all duration-300">
    <router-link :to="`/pokemon/${pokemon.name}`" class="flex flex-col items-center gap-3 w-full py-4 px-3">
      <div class="relative w-32 h-32 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg overflow-hidden">
        <!-- Placeholder skeleton mientras carga -->
        <div v-if="imageLoading" class="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-600 dark:via-slate-700 dark:to-slate-600 animate-pulse rounded-lg"></div>
        
        <!-- Imagen con animación de batalla -->
        <img 
          :data-pokemon-id="pokemon.id"
          :data-src="imageUrl"
          :alt="pokemon.name"
          loading="lazy"
          @load="handleImageLoad"
          @error="handleImageError"
          class="battle-pokemon w-28 h-28 object-contain drop-shadow-lg z-10"
        />
        
        <!-- Fallback si la imagen de calidad falla -->
        <img 
          v-if="imageError"
          :src="pokemon.sprite"
          :alt="pokemon.name"
          class="battle-pokemon w-28 h-28 object-contain drop-shadow-lg z-10"
        />
      </div>
      <div class="text-center w-full">
        <h3 class="text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">{{ pokemon.name }}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: #{{ String(pokemon.id).padStart(3, '0') }}</p>
      </div>
    </router-link>
    <div class="flex flex-wrap gap-1.5 justify-center px-3 py-2">
      <TypeChip v-for="t in pokemon.types" :key="t" :type="t" />
    </div>
    <button 
      class="w-full px-3 py-2.5 rounded-b-lg transition-all"
      :class="[
        isFav 
          ? 'bg-poke-red-100 dark:bg-poke-red-900 text-poke-red-700 dark:text-poke-red-200 hover:bg-poke-red-200 dark:hover:bg-poke-red-800 font-semibold' 
          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium'
      ]"
      @click="emit('toggle-fav', pokemon)"
    >
      {{ isFav ? '❤️ Favorito' : '🤍 Guardar' }}
    </button>
  </div>
</template>

<style scoped>
@keyframes softFloat {
  0%, 100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.02);
  }
}

.battle-pokemon {
  animation: softFloat 2.5s ease-in-out infinite;
}
</style>
