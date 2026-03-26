import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

export const useTeamsStore = defineStore('teams', {
  state: () => ({
    teams: [], // { id, name, members: [pokemon] }
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
        const { data } = await api.get(`/api/teams/${auth.user.id}`)
        // Convertir estructura de MongoDB a estructura del frontend
        this.teams = (data || []).map(team => ({
          id: team._id,
          name: team.name,
          members: (team.pokemons || []).map(p => ({
            id: p.pokemonId,
            name: p.pokemonName,
            sprite: p.sprite || '',
            officialArt: p.officialArt || ''
          }))
        }))
      } catch (e) {
        this.teams = JSON.parse(localStorage.getItem('teams') || '[]')
        this.error = e?.response?.data?.error || e.message
      } finally {
        this.loading = false
      }
    },
    async create(name) {
      const auth = useAuthStore()
      if (!auth.user?.id) return
      
      const team = { name, members: [] }
      try {
        const { data } = await api.post('/api/teams', { userId: auth.user.id, name })
        // Mapear respuesta del backend a estructura del frontend
        const created = {
          id: data._id,
          name: data.name,
          members: []
        }
        this.teams.push(created)
        localStorage.setItem('teams', JSON.stringify(this.teams))
        return created
      } catch (e) {
        const created = { id: Date.now(), name, members: [] }
        this.teams.push(created)
        localStorage.setItem('teams', JSON.stringify(this.teams))
        return created
      }
    },
    async update(team) {
      try {
        // Convertir estructura del frontend (members) a estructura del backend (pokemons)
        const payload = {
          name: team.name,
          pokemons: (team.members || []).map(m => ({
            pokemonId: m.id,
            pokemonName: m.name,
            sprite: m.sprite,
            officialArt: m.officialArt
          }))
        }
        await api.put(`/api/teams/${team.id}`, payload)
        const idx = this.teams.findIndex((t) => t.id === team.id)
        if (idx >= 0) this.teams[idx] = team
        localStorage.setItem('teams', JSON.stringify(this.teams))
      } catch (e) {
        const idx = this.teams.findIndex((t) => t.id === team.id)
        if (idx >= 0) this.teams[idx] = team
        localStorage.setItem('teams', JSON.stringify(this.teams))
      }
    },
    async remove(teamId) {
      try {
        await api.delete(`/api/teams/${teamId}`)
      } finally {
        this.teams = this.teams.filter((t) => t.id !== teamId)
        localStorage.setItem('teams', JSON.stringify(this.teams))
      }
    },
    async addMember(teamId, pokemon) {
      const team = this.teams.find((t) => t.id === teamId)
      if (!team) return
      // Prevent duplicates and enforce max size 6
      if (team.members?.length >= 6) return
      if (team.members?.some((p) => p.id === pokemon.id)) return
      team.members = team.members || []
      team.members.push({ id: pokemon.id, name: pokemon.name, sprite: pokemon.sprite, officialArt: pokemon.officialArt })
      localStorage.setItem('teams', JSON.stringify(this.teams))
      // Sincronizar con el backend
      await this.update(team)
    },
    async removeMember(teamId, pokemonId) {
      const team = this.teams.find((t) => t.id === teamId)
      if (!team) return
      team.members = (team.members || []).filter((p) => p.id !== pokemonId)
      localStorage.setItem('teams', JSON.stringify(this.teams))
      // Sincronizar con el backend
      await this.update(team)
    },
  },
})
