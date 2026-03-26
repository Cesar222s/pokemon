<script setup>
const props = defineProps({ type: { type: String, required: true } })

function icon(t) {
  switch ((t || '').toLowerCase()) {
    case 'fire': return '🔥'
    case 'water': return '💧'
    case 'grass': return '🍃'
    case 'electric': return '⚡'
    case 'ground': return '🟫'
    case 'rock': return '🪨'
    case 'ice': return '❄️'
    case 'fighting': return '🥊'
    case 'dragon': return '🐉'
    case 'fairy': return '🧚'
    case 'psychic': return '🧠'
    case 'poison': return '☠️'
    case 'bug': return '🐛'
    case 'flying': return '🕊️'
    case 'steel': return '🛡️'
    case 'dark': return '🌑'
    case 'normal': return '🎯'
    case 'ghost': return '👻'
    default: return '⬤'
  }
}
</script>

<template>
  <span class="chip capitalize" :class="`type-${props.type}`">
    <span class="mr-1">{{ icon(props.type) }}</span>{{ props.type }}
  </span>
  
</template>

<style scoped></style>
