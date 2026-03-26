import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

export const useFriendsStore = defineStore('friends', {
  state: () => ({
    friends: [], // { id, email, friendCode }
    loading: false,
    error: null,
  }),
  actions: {
    async load() {
      const auth = useAuthStore()
      if (!auth.user?.id) return
      
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get(`/api/friends/${auth.user.id}`)
        // Convertir estructura de MongoDB a estructura del frontend
        this.friends = (data || []).map(friend => ({
          id: friend.friendId,
          email: friend.friendEmail,
          friendCode: friend.friendCode
        }))
      } catch (e) {
        this.friends = JSON.parse(localStorage.getItem('friends') || '[]')
        this.error = e?.response?.data?.error || e.message
      } finally {
        this.loading = false
      }
    },
    async addByCode(code) {
      const auth = useAuthStore()
      if (!auth.user?.id) return
      
      try {
        const { data } = await api.post('/api/friends/add', { userId: auth.user.id, friendCode: code })
        if (data) this.friends.push({
          id: data.friendId,
          email: data.friendEmail,
          friendCode: data.friendCode
        })
        localStorage.setItem('friends', JSON.stringify(this.friends))
        return data
      } catch (e) {
        // fallback demo: just store code
        const friend = { id: Date.now(), email: 'friend@example.com', friendCode: code }
        this.friends.push(friend)
        localStorage.setItem('friends', JSON.stringify(this.friends))
        return friend
      }
    },
  },
})
