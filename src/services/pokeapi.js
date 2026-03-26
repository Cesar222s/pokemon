const POKEAPI_BASE = 'https://pokeapi.co/api/v2'

async function json(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`PokeAPI error: ${res.status}`)
  return res.json()
}

const imageCache = new Map()
export function cacheImage(name, sprite) {
  imageCache.set(name, sprite)
}

export function getCachedImage(name) {
  return imageCache.get(name)
}

// Limita peticiones concurrentes a PokeAPI
async function withConcurrencyLimit(promises, limit = 6) {
  const results = new Array(promises.length)
  let activeCount = 0
  let index = 0

  const executeNext = async () => {
    if (index >= promises.length) return

    const currentIndex = index++
    activeCount++

    try {
      results[currentIndex] = await promises[currentIndex]
    } catch (error) {
      results[currentIndex] = error
    } finally {
      activeCount--
      if (index < promises.length) {
        await executeNext()
      }
    }
  }

  const workers = Array(Math.min(limit, promises.length))
    .fill(null)
    .map(() => executeNext())

  await Promise.all(workers)
  return results
}

export async function getPokemonList({ limit = 50, offset = 0, name, type1, type2, region } = {}) {
  if (name) {
    try {
      const p = await json(`${POKEAPI_BASE}/pokemon/${name.toLowerCase()}`)
      return [simplifyPokemon(p)]
    } catch {
      return []
    }
  }

  // Base list
  const base = await json(`${POKEAPI_BASE}/pokemon?limit=${limit}&offset=${offset}`)
  const detailed = await withConcurrencyLimit(base.results.map((r) => json(r.url)), 6)
  let list = detailed.map(simplifyPokemon)

  // Region filter via pokedex mapping (simple heuristic)
  if (region) {
    try {
      const dex = await json(`${POKEAPI_BASE}/pokedex/${region.toLowerCase()}`)
      const names = new Set(dex.pokemon_entries.map((e) => e.pokemon_species.name))
      list = list.filter((p) => names.has(p.name))
    } catch {
      // ignore invalid region
    }
  }

  // Type filters
  if (type1 || type2) {
    list = list.filter((p) => {
      const types = p.types.map((t) => t.toLowerCase())
      const t1ok = type1 ? types.includes(type1.toLowerCase()) : true
      const t2ok = type2 ? types.includes(type2.toLowerCase()) : true
      return t1ok && t2ok
    })
  }

  return list
}

export async function getPokemonDetail(idOrName) {
  const p = await json(`${POKEAPI_BASE}/pokemon/${String(idOrName).toLowerCase()}`)
  const species = await json(p.species.url)
  const evoChainUrl = species.evolution_chain?.url
  let evolution = []
  if (evoChainUrl) {
    const chain = await json(evoChainUrl)
    evolution = flattenEvolution(chain.chain)
  }
  return {
    ...simplifyPokemon(p),
    species: {
      ...species,
      height: p.height,
      weight: p.weight,
    },
    evolution,
    moves: p.moves?.map((m) => ({ name: m.move.name, url: m.move.url })) || [],
  }
}

function simplifyPokemon(p) {
  return {
    id: p.id,
    name: p.name,
    sprite: p.sprites.front_default, // Fallback rápido
    officialArt: p.sprites.other?.['official-artwork']?.front_default || p.sprites.front_default,
    types: p.types.map((t) => t.type.name),
    stats: p.stats.map((s) => ({ name: s.stat.name, base: s.base_stat })),
  }
}

function flattenEvolution(node, acc = []) {
  if (!node) return acc
  acc.push(node.species.name)
  if (Array.isArray(node.evolves_to)) {
    for (const n of node.evolves_to) flattenEvolution(n, acc)
  }
  return acc
}

export async function getMoveDetail(nameOrUrl) {
  const url = nameOrUrl.startsWith('http') ? nameOrUrl : `${POKEAPI_BASE}/move/${String(nameOrUrl).toLowerCase()}`
  const move = await json(url)
  return {
    name: move.name,
    type: move.type?.name || 'normal',
    power: move.power || 0,
    accuracy: move.accuracy || 100,
    pp: move.pp || 0,
    kind: move.damage_class?.name === 'physical' ? 'physical' : move.damage_class?.name === 'special' ? 'special' : 'status',
  }
}
