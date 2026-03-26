import { defineStore } from 'pinia'
import api, { setAuthToken } from '@/services/api'

function getMockUsers() {
  try { return JSON.parse(localStorage.getItem('mockUsers') || '{}') } catch { return {} }
}
function setMockUsers(db) { localStorage.setItem('mockUsers', JSON.stringify(db)) }
function getNextUserId() {
  const users = getMockUsers()
  const ids = Object.values(users).map(u => u.id).filter(Boolean)
  return Math.max(0, ...ids) + 1
}
function makeToken(email) { return btoa(`${email}:${Date.now()}`) }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
  },
  actions: {
    async register(email, password) {
      this.loading = true
      this.error = null
      try {
        if (!import.meta.env.VITE_API_BASE_URL) {
          // Mock register when API base URL is not configured
          const db = getMockUsers()
          if (db[email]) {
            throw new Error('El correo ya está registrado (modo offline)')
          }
          const userId = getNextUserId()
          db[email] = { email, password, id: userId }
          setMockUsers(db)
          const data = { user: { id: userId, email }, token: makeToken(email) }
          this.user = data.user
          this.token = data.token
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('token', this.token)
          setAuthToken(this.token)
          return data
        } else {
          const { data } = await api.post('/auth/register', { email, password })
          this.user = data.user
          this.token = data.token
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('token', this.token)
          setAuthToken(this.token)
          return data
        }
      } catch (e) {
        const msg = e?.response?.data?.message || (e.message === 'Network Error' ? 'No se puede conectar con el servidor. Verifica tu red o configura VITE_API_BASE_URL.' : e.message)
        this.error = msg
        throw e
      } finally {
        this.loading = false
      }
    },
    async login(email, password) {
      this.loading = true
      this.error = null
      try {
        if (!import.meta.env.VITE_API_BASE_URL) {
          // Mock login when API base URL is not configured
          const db = getMockUsers()
          const u = db[email]
          if (!u || u.password !== password) {
            throw new Error('Credenciales inválidas (modo offline)')
          }
          const data = { user: { id: u.id, email }, token: makeToken(email) }
          this.user = data.user
          this.token = data.token
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('token', this.token)
          setAuthToken(this.token)
          return data
        } else {
          const { data } = await api.post('/auth/login', { email, password })
          this.user = data.user
          this.token = data.token
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('token', this.token)
          setAuthToken(this.token)
          return data
        }
      } catch (e) {
        const msg = e?.response?.data?.message || (e.message === 'Network Error' ? 'No se puede conectar con el servidor. Verifica tu red o configura VITE_API_BASE_URL.' : e.message)
        this.error = msg
        throw e
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      setAuthToken(null)
    },
    init() {
      if (this.token) setAuthToken(this.token)
    },
  },
})
