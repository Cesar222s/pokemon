import { defineStore } from 'pinia'
import api from '@/services/api'

export const useBattlesStore = defineStore('battles', {
  state: () => ({
    invitations: [], // invitaciones pendientes recibidas
    activeMultiplayer: null, // batalla activa { id, opponent, status, turns }
    history: [], // historial de batallas
    loading: false,
    error: null,
  }),
  
  actions: {
    // Cargar invitaciones pendientes
    async loadInvitations() {
      try {
        const { data } = await api.get('/battles/invitations')
        this.invitations = data.invitations || []
      } catch (e) {
        console.error('Error al cargar invitaciones:', e)
        // En modo offline, intentar cargar del localStorage
        this.invitations = JSON.parse(localStorage.getItem('battle_invitations') || '[]')
      }
    },

    // Aceptar invitación de batalla
    async acceptInvitation(invitationId, userTeam) {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.post(`/battles/${invitationId}/accept`, { userTeam })
        this.invitations = this.invitations.filter(i => i.id !== invitationId)
        this.activeMultiplayer = data.battle
        return data.battle
      } catch (e) {
        this.error = e?.response?.data?.message || e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    // Rechazar invitación
    async rejectInvitation(invitationId) {
      try {
        await api.post(`/battles/${invitationId}/reject`)
        this.invitations = this.invitations.filter(i => i.id !== invitationId)
      } catch (e) {
        console.error('Error al rechazar invitación:', e)
      }
    },

    // Registrar movimiento en batalla multijugador
    async makeBattleMove(battleId, move, pokemonIndex = 0) {
      try {
        const { data } = await api.post(`/battles/${battleId}/move`, {
          move,
          pokemonIndex,
        })
        this.activeMultiplayer = data.battle
        return data
      } catch (e) {
        this.error = e?.response?.data?.message || e.message
        throw e
      }
    },

    // Terminar batalla y guardar resultado
    async finishBattle(battleId, result) {
      try {
        const { data } = await api.post(`/battles/${battleId}/finish`, { result })
        this.activeMultiplayer = null
        this.history.unshift(data.battle)
        localStorage.setItem('battle_history', JSON.stringify(this.history))
        return data.battle
      } catch (e) {
        console.error('Error al terminar batalla:', e)
      }
    },

    // Cargar historial de batallas
    async loadBattleHistory() {
      try {
        const { data } = await api.get('/battles/history')
        this.history = data.battles || []
      } catch (e) {
        // En modo offline, cargar del localStorage
        this.history = JSON.parse(localStorage.getItem('battle_history') || '[]')
      }
    },

    // Agregar simulación de invitación para modo demo
    addDemoInvitation(fromEmail) {
      const invitation = {
        id: `battle_${Date.now()}`,
        fromEmail,
        fromId: `user_${Math.random()}`,
        createdAt: new Date().toISOString(),
      }
      this.invitations.push(invitation)
      localStorage.setItem('battle_invitations', JSON.stringify(this.invitations))
      return invitation
    },

    clearError() {
      this.error = null
    },
  },
})
