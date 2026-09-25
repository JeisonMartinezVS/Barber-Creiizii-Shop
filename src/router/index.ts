import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import type { useAuthStore } from '../stores/auth'
import { applySeo } from './seo'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    // Usa los valores por defecto de seo.ts
  },
  {
    path: '/productos',
    name: 'Productos',
    component: () => import('../views/Productos.vue'),
    meta: {
      seo: {
        title: 'Productos para cabello y barba | Barber Creiizii Medellín',
        description:
          'Ceras, aceites, shampoos y productos profesionales para el cuidado del cabello y la barba. Consulta disponibilidad por WhatsApp en Barber Creiizii, Medellín.',
      },
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../Admin/Login.vue'),
    meta: {
      layout: 'admin',
      seo: { title: 'Iniciar sesión | Barber Creiizii', index: false },
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../Admin/Dashboard.vue'),
    meta: {
      layout: 'admin',
      requiresAuth: true,
      seo: { title: 'Panel de gestión | Barber Creiizii', index: false },
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
      { path: 'productos', name: 'productos', component: () => import('../Admin/ProductsView.vue') },
      { path: 'cortes', name: 'cortes', component: () => import('../Admin/CutsView.vue') },
      { path: 'horarios', name: 'horarios', component: () => import('../Admin/TimeView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,

  async scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      // Las secciones de Home se cargan de forma diferida: esperamos a que
      // la sección exista y tenga contenido antes de desplazarnos a ella.
      const el = await waitForSection(to.hash)

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

// Espera (máx. ~2 s) a que el elemento del hash exista y tenga altura, porque
// con componentes lazy el contenido llega un poco después de la navegación.
function waitForSection(hash: string, timeoutMs = 2000): Promise<Element | null> {
  const start = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      const el = document.querySelector(hash)
      if (el && (el as HTMLElement).offsetHeight > 0) return resolve(el)
      if (performance.now() - start > timeoutMs) return resolve(el)
      requestAnimationFrame(check)
    }
    check()
  })
}

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
  // Las páginas públicas no necesitan saber quién está logueado: así no
  // descargan Firebase Auth ni esperan su respuesta para mostrarse.
  const isAdminLayout = to.matched.some((record) => record.meta.layout === 'admin')
  if (!isAdminLayout) return

  const { useAuthStore } = await import('../stores/auth')
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

router.afterEach((to) => applySeo(to))

export default router
