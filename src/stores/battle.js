import { defineStore } from 'pinia'
import { getPokemonDetail } from '@/services/pokeapi'

// Type effectiveness chart (18 tipos)
const typeChart = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, ground: 0, dragon: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5, normal: 0 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
}

function typeEffect(moveType, defendingTypes) {
  let mult = 1
  const chart = typeChart[moveType]
  if (!chart) return 1
  for (const def of defendingTypes) {
    const m = chart[def]
    if (m === 0) return 0
    if (m) mult *= m
  }
  return mult
}

function stat(p, name) {
  return p.stats.find((s) => s.name === name)?.base || 0
}

function derivedHP(p) {
  const base = stat(p, 'hp')
  return Math.max(1, Math.round(base * 3 + 50)) // aproximación nivel 50
}

function pickMoveType(attacker) {
  const t = attacker.types || []
  if (t.length === 0) return 'normal'
  if (t.length === 1) return t[0]
  return Math.random() < 0.5 ? t[0] : t[1]
}

function damage(attacker, defender, kind /* 'physical'|'special' */, moveOverride = null) {
  const level = 50
  const power = moveOverride?.power && moveOverride.power > 0 ? moveOverride.power : 70
  const atk = kind === 'physical' ? stat(attacker, 'attack') : stat(attacker, 'special-attack')
  const def = kind === 'physical' ? stat(defender, 'defense') : stat(defender, 'special-defense')
  const moveType = moveOverride?.type || pickMoveType(attacker)
  const eff = typeEffect(moveType, defender.types)
  const stab = attacker.types.includes(moveType) ? 1.5 : 1
  const crit = Math.random() < 1 / 16 ? 1.5 : 1
  const rand = 0.85 + Math.random() * 0.15
  const base = (((2 * level) / 5 + 2) * power * atk) / def / 50 + 2
  const dmg = Math.floor(base * stab * eff * crit * rand)
  return {
    amount: Math.max(1, dmg),
    moveType,
    eff,
    stab,
    crit: crit > 1,
    kind,
  }
}

function effText(eff) {
  if (eff === 0) return ' No afecta…'
  if (eff > 1) return ' ¡Súper eficaz!'
  if (eff < 1) return ' No es muy eficaz…'
  return ''
}

export const useBattleStore = defineStore('battle', {
  state: () => ({ 
    result: null, 
    log: [], 
    events: [], 
    current: null,
    multiplayer: null, // { battleId, opponentId, opponentName, status: 'waiting'|'active'|'finished' }
    pendingInvitations: [], // invitaciones recibidas
  }),
  actions: {
    // Enviar reto a un amigo
    async challengeFriend(friendId, friendName, userTeam) {
      try {
        const api = (await import('@/services/api')).default
        const { data } = await api.post('/battles/challenge', {
          toUserId: friendId,
          fromName: friendName,
          userTeam,
        })
        return data
      } catch (e) {
        console.error('Error al enviar reto:', e)
        throw e
      }
    },

    // Aceptar una invitación de batalla
    async acceptChallenge(battleId, userTeam) {
      try {
        const api = (await import('@/services/api')).default
        const { data } = await api.post(`/battles/${battleId}/accept`, { userTeam })
        this.multiplayer = {
          battleId,
          status: 'active',
          ...data,
        }
        return data
      } catch (e) {
        console.error('Error al aceptar reto:', e)
        throw e
      }
    },

    // Guardar resultado de batalla multijugador
    async saveMultiplayerResult(battleId, result) {
      try {
        const api = (await import('@/services/api')).default
        await api.post(`/battles/${battleId}/result`, { result })
      } catch (e) {
        console.error('Error al guardar resultado:', e)
      }
    },

    // Limpiar estado de batalla multijugador
    clearMultiplayer() {
      this.multiplayer = null
    },
    async battleByNames(aName, bName, moveA = null, moveB = null) {
      const a = await getPokemonDetail(aName)
      const b = await getPokemonDetail(bName)
      return this.simulate(a, b, moveA, moveB)
    },
    simulate(a, b, moveA = null, moveB = null) {
      this.log = []
      this.events = []
      // Estado inicial
      const aMaxHP = derivedHP(a)
      const bMaxHP = derivedHP(b)
      let aHP = aMaxHP
      let bHP = bMaxHP
      const aSpd = stat(a, 'speed')
      const bSpd = stat(b, 'speed')
      const firstIsA = aSpd === bSpd ? Math.random() < 0.5 : aSpd > bSpd
      this.log.push(`Comienza la batalla: ${a.name} (HP ${aHP}) vs ${b.name} (HP ${bHP})`)

      let turn = 1
      const MAX_TURNS = 100
      while (aHP > 0 && bHP > 0 && turn <= MAX_TURNS) {
        const kindA = moveA?.kind && moveA.kind !== 'status' ? moveA.kind : (stat(a, 'attack') >= stat(a, 'special-attack') ? 'physical' : 'special')
        const kindB = moveB?.kind && moveB.kind !== 'status' ? moveB.kind : (stat(b, 'attack') >= stat(b, 'special-attack') ? 'physical' : 'special')
        if (firstIsA) {
          const d1 = damage(a, b, kindA, moveA)
          bHP -= d1.amount
          const nameA = moveA?.name || d1.moveType
          this.log.push(`Turno ${turn}: ${a.name} usa ${nameA} (${d1.kind}). Daño ${d1.amount}.${d1.crit ? ' CRÍTICO!' : ''} Efectividad x${d1.eff}.${effText(d1.eff)} HP ${b.name}: ${Math.max(0, bHP)}`)
          this.events.push({ attacker: a.name, defender: b.name, damage: d1.amount, eff: d1.eff, crit: d1.crit, moveType: d1.moveType, kind: d1.kind, aHP, bHP: Math.max(0, bHP) })
          if (bHP <= 0) break
          const d2 = damage(b, a, kindB, moveB)
          aHP -= d2.amount
          const nameB = moveB?.name || d2.moveType
          this.log.push(`Turno ${turn}: ${b.name} responde con ${nameB} (${d2.kind}). Daño ${d2.amount}.${d2.crit ? ' CRÍTICO!' : ''} Efectividad x${d2.eff}.${effText(d2.eff)} HP ${a.name}: ${Math.max(0, aHP)}`)
          this.events.push({ attacker: b.name, defender: a.name, damage: d2.amount, eff: d2.eff, crit: d2.crit, moveType: d2.moveType, kind: d2.kind, aHP: Math.max(0, aHP), bHP })
        } else {
          const d1 = damage(b, a, kindB, moveB)
          aHP -= d1.amount
          const nameB = moveB?.name || d1.moveType
          this.log.push(`Turno ${turn}: ${b.name} ataca primero con ${nameB} (${d1.kind}). Daño ${d1.amount}.${d1.crit ? ' CRÍTICO!' : ''} Efectividad x${d1.eff}.${effText(d1.eff)} HP ${a.name}: ${Math.max(0, aHP)}`)
          this.events.push({ attacker: b.name, defender: a.name, damage: d1.amount, eff: d1.eff, crit: d1.crit, moveType: d1.moveType, kind: d1.kind, aHP: Math.max(0, aHP), bHP })
          if (aHP <= 0) break
          const d2 = damage(a, b, kindA, moveA)
          bHP -= d2.amount
          const nameA = moveA?.name || d2.moveType
          this.log.push(`Turno ${turn}: ${a.name} contraataca con ${nameA} (${d2.kind}). Daño ${d2.amount}.${d2.crit ? ' CRÍTICO!' : ''} Efectividad x${d2.eff}.${effText(d2.eff)} HP ${b.name}: ${Math.max(0, bHP)}`)
          this.events.push({ attacker: a.name, defender: b.name, damage: d2.amount, eff: d2.eff, crit: d2.crit, moveType: d2.moveType, kind: d2.kind, aHP, bHP: Math.max(0, bHP) })
        }
        turn++
      }

      const winner = aHP > 0 ? a : b
      const loser = winner === a ? b : a
      const winnerHP = winner === a ? aHP : bHP
      this.log.push(`Ganador: ${winner.name} con ${winnerHP} HP restante`)
      this.result = { winner, loser, turns: turn - 1, winnerHP, aHP, bHP, aMaxHP, bMaxHP, a, b, events: this.events }
      return this.result
    },
    async startInteractive(aName, bName, moveA = null, moveB = null) {
      const a = await getPokemonDetail(aName)
      const b = await getPokemonDetail(bName)
      this.log = []
      this.events = []
      const aMaxHP = derivedHP(a)
      const bMaxHP = derivedHP(b)
      const aSpd = stat(a, 'speed')
      const bSpd = stat(b, 'speed')
      const firstIsA = aSpd === bSpd ? Math.random() < 0.5 : aSpd > bSpd
      this.current = {
        a,
        b,
        aHP: aMaxHP,
        bHP: bMaxHP,
        aMaxHP,
        bMaxHP,
        turn: 1,
        active: firstIsA ? 'a' : 'b',
        finished: false,
        moveA,
        moveB,
      }
      this.log.push(`Comienza la batalla: ${a.name} (HP ${aMaxHP}) vs ${b.name} (HP ${bMaxHP})`)
      return this.current
    },
    attack(attackerKey) {
      const c = this.current
      if (!c || c.finished) return null
      if (attackerKey !== c.active) return null
      const attacker = attackerKey === 'a' ? c.a : c.b
      const defender = attackerKey === 'a' ? c.b : c.a
      const moveOverride = attackerKey === 'a' ? c.moveA : c.moveB
      const kind = moveOverride?.kind && moveOverride.kind !== 'status' ? moveOverride.kind : (stat(attacker, 'attack') >= stat(attacker, 'special-attack') ? 'physical' : 'special')
      const d = damage(attacker, defender, kind, moveOverride)
      if (attackerKey === 'a') {
        c.bHP = Math.max(0, c.bHP - d.amount)
        this.events.push({ attacker: c.a.name, defender: c.b.name, damage: d.amount, eff: d.eff, crit: d.crit, moveType: d.moveType, kind: d.kind, aHP: c.aHP, bHP: c.bHP })
        const nameA = c.moveA?.name || d.moveType
        this.log.push(`${c.a.name} ataca con ${nameA} (${d.kind}) y hace ${d.amount} de daño. x${d.eff}${d.crit ? ' CRÍTICO!' : ''}.${effText(d.eff)} HP ${c.b.name}: ${c.bHP}`)
      } else {
        c.aHP = Math.max(0, c.aHP - d.amount)
        this.events.push({ attacker: c.b.name, defender: c.a.name, damage: d.amount, eff: d.eff, crit: d.crit, moveType: d.moveType, kind: d.kind, aHP: c.aHP, bHP: c.bHP })
        const nameB = c.moveB?.name || d.moveType
        this.log.push(`${c.b.name} ataca con ${nameB} (${d.kind}) y hace ${d.amount} de daño. x${d.eff}${d.crit ? ' CRÍTICO!' : ''}.${effText(d.eff)} HP ${c.a.name}: ${c.aHP}`)
      }
      // Check finish
      if (c.aHP <= 0 || c.bHP <= 0) {
        c.finished = true
        const winner = c.aHP > 0 ? c.a : c.b
        const loser = winner === c.a ? c.b : c.a
        const winnerHP = winner === c.a ? c.aHP : c.bHP
        this.log.push(`Ganador: ${winner.name} con ${winnerHP} HP restante`)
        this.result = { winner, loser, turns: c.turn, winnerHP, aHP: c.aHP, bHP: c.bHP, aMaxHP: c.aMaxHP, bMaxHP: c.bMaxHP, a: c.a, b: c.b, events: this.events }
        return d
      }
      // Advance turn/active
      if (c.active === 'b') c.turn += 1
      c.active = c.active === 'a' ? 'b' : 'a'
      return d
    },
  },
})
