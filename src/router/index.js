import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PokemonList from '@/views/PokemonList.vue'
import PokemonDetail from '@/views/PokemonDetail.vue'
import Favorites from '@/views/Favorites.vue'
import Teams from '@/views/Teams.vue'
import Friends from '@/views/Friends.vue'
import Battle from '@/views/Battle.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'

const protectedRoutes = ['favorites', 'teams', 'friends', 'battle']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: PokemonList },
    { path: '/pokemon/:id', name: 'pokemon-detail', component: PokemonDetail },
    { path: '/favorites', name: 'favorites', component: Favorites },
    { path: '/teams', name: 'teams', component: Teams },
    { path: '/friends', name: 'friends', component: Friends },
    { path: '/battle', name: 'battle', component: Battle },
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: Register },
  ],
})

// Guard para rutas protegidas
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  
  if (protectedRoutes.includes(to.name)) {
    if (!auth.isAuthenticated) {
      // Redirigir a login si no está autenticado
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
