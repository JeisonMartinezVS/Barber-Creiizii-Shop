import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/productos', name: 'Productos', component: () => import('../views/Productos.vue') },
  { path: '/', name: 'Home', component: () => import('../views/Home.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      const el = document.querySelector(to.hash)
      if (el) {
        return {
          el,
          behavior: 'smooth',
        }
      }
    } else if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

export default router
