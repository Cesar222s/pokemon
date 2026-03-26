<script setup>
import { ref, watchEffect } from 'vue'
const props = defineProps({ initial: { type: Object, default: () => ({}) } })
const emit = defineEmits(['update'])

const type1 = ref(props.initial.type1 || '')
const type2 = ref(props.initial.type2 || '')
const region = ref(props.initial.region || '')
const name = ref(props.initial.name || '')

watchEffect(() => {
  emit('update', { type1: type1.value, type2: type2.value, region: region.value, name: name.value })
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
    <input v-model="name" placeholder="Nombre" class="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
    <input v-model="type1" placeholder="Tipo 1" class="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
    <input v-model="type2" placeholder="Tipo 2" class="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
    <input v-model="region" placeholder="Región (kanto, johto, etc.)" class="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
  </div>
  <p class="text-xs text-slate-500">Consejo: usa valores de PokeAPI (p.ej. kanto, johto; fire, water...)</p>
</template>

<style scoped></style>
