import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/productos',
    name: 'Productos',
    component: () => import('../views/Productos.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../Admin/Login.vue'),
    meta: {
      layout: 'admin',
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../Admin/Dashboard.vue'),
    meta: {
      layout: 'admin',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        redirect: { name: 'Agenda' },
      },
      {
        path: 'agenda',
        name: 'Agenda',
        component: () => import('../Admin/AgendaView.vue'),
      },
      { path: 'reportes', name: 'reportes', component: () => import('../Admin/ReportView.vue') },
      { path: 'clientes', name: 'clientes', component: () => import('../Admin/ClientsView.vue') },
      { path: 'empleados', name: 'empleados', component: () => import('../Admin/EmpleadosView.vue') },
      // { path: 'productos', name: 'productos', component: () => import('@/views/productos/ProductosView.vue') },
      { path: 'horarios', name: 'horarios', component: () => import('../Admin/TimeView.vue') },
    ],
  },
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
    }

    if (savedPosition) {
      return savedPosition
    }

    return { top: 0 }
  },
})

// Waits for Firebase's first onAuthStateChanged callback before deciding
// anything. Without this, a hard refresh on /dashboard would see
// authStore.user as null (Firebase hasn't responded yet) and bounce you to
// /login even though you're actually logged in.
function waitForAuthReady(authStore: ReturnType<typeof useAuthStore>): Promise<void> {
  if (authStore.isReady) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(
      () => authStore.isReady,
      (ready) => {
        if (ready) {
          stop()
          resolve()
        }
      },
    )
  })
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await waitForAuthReady(authStore)

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !authStore.user) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'Login' && authStore.user) {
    return { name: 'Agenda' }
  }
})

export default router
