import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    friendRequests: [], // Solicitudes de amistad pendientes
    battleRequests: [], // Retos de batalla pendientes
    loading: false,
    error: null,
  }),

  actions: {
    // Cargar solicitudes de amistad pendientes
    async loadFriendRequests() {
      const auth = useAuthStore()
      if (!auth.user?.id) return

      this.loading = true
      try {
        const { data } = await api.get(`/api/friends/requests/${auth.user.id}`)
        this.friendRequests = data || []
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        this.friendRequests = []
      } finally {
        this.loading = false
      }
    },

    // Cargar retos de batalla pendientes
    async loadBattleRequests() {
      const auth = useAuthStore()
      if (!auth.user?.id) return

      this.loading = true
      try {
        const { data } = await api.get(`/api/battles/requests/${auth.user.id}`)
        this.battleRequests = data || []
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        this.battleRequests = []
      } finally {
        this.loading = false
      }
    },

    // Enviar solicitud de amistad
    async sendFriendRequest(friendCode) {
      const auth = useAuthStore()
      if (!auth.user?.id) return

      try {
        const { data } = await api.post('/api/friends/request', {
          userId: auth.user.id,
          friendCode,
        })
        return data
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        throw e
      }
    },

    // Aceptar solicitud de amistad
    async acceptFriendRequest(requestId) {
      try {
        const { data } = await api.post(
          `/api/friends/accept/${requestId}`,
          {}
        )
        
        // Remover de la lista
        this.friendRequests = this.friendRequests.filter(
          (r) => r._id !== requestId
        )
        
        return data
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        throw e
      }
    },

    // Rechazar solicitud de amistad
    async rejectFriendRequest(requestId) {
      try {
        // API endpoint para rechazar
        await api.post(`/api/friends/reject/${requestId}`, {})
        
        this.friendRequests = this.friendRequests.filter(
          (r) => r._id !== requestId
        )
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        throw e
      }
    },

    // Enviar reto de batalla
    async sendBattleRequest(friendId, teamId) {
      const auth = useAuthStore()
      if (!auth.user?.id) return

      try {
        const { data } = await api.post('/api/battles/request', {
          userId: auth.user.id,
          friendId,
          teamId,
        })
        return data
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        throw e
      }
    },

    // Aceptar reto de batalla
    async acceptBattleRequest(battleId, opponentTeamId) {
      try {
        const { data } = await api.post(
          `/api/battles/${battleId}/accept`,
          { opponentTeamId }
        )
        return data
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        throw e
      }
    },

    // Rechazar reto de batalla
    async rejectBattleRequest(battleId) {
      try {
        const { data } = await api.post(
          `/api/battles/${battleId}/reject`,
          {}
        )
        
        this.battleRequests = this.battleRequests.filter(
          (r) => r._id !== battleId
        )
        
        return data
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        throw e
      }
    },

    // Finalizar batalla
    async finishBattle(battleId, result) {
      try {
        const { data } = await api.post(
          `/api/battles/${battleId}/finish`,
          { result } // 'win', 'lose', 'draw'
        )
        
        this.battleRequests = this.battleRequests.filter(
          (r) => r._id !== battleId
        )
        
        return data
      } catch (e) {
        this.error = e?.response?.data?.error || e.message
        throw e
      }
    },

    // Cargar todo
    async loadAll() {
      await Promise.all([
        this.loadFriendRequests(),
        this.loadBattleRequests(),
      ])
    },

    // Escuchar notificaciones en tiempo real
    startListening() {
      // Este método se puede ampliar con WebSocket en el futuro
      this.loadAll()
      
      // Recargar cada 10 segundos (polling simple)
      setInterval(() => this.loadAll(), 10000)
    },
  },
})
