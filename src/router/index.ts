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
        title: 'Productos para cabello y barba | North Side Barber Club Medellín',
        description:
          'Ceras, aceites, shampoos y productos profesionales para el cuidado del cabello y la barba. Consulta disponibilidad por WhatsApp en North Side Barber Club, Medellín.',
      },
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../Admin/Login.vue'),
    meta: {
      layout: 'admin',
      seo: { title: 'Iniciar sesión | North Side Barber Club', index: false },
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../Admin/Dashboard.vue'),
    meta: {
      layout: 'admin',
      requiresAuth: true,
      seo: { title: 'Panel de gestión | North Side Barber Club', index: false },
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
      // adminOnly: además de ocultarlas en el menú, el guard impide abrirlas por URL.
      {
        path: 'clientes',
        name: 'clientes',
        component: () => import('../Admin/ClientsView.vue'),
      },
      {
        path: 'empleados',
        name: 'empleados',
        component: () => import('../Admin/EmpleadosView.vue'),
        meta: { adminOnly: true },
      },
      {
        path: 'productos',
        name: 'productos',
        component: () => import('../Admin/ProductsView.vue'),
        meta: { adminOnly: true },
      },
      { path: 'cortes', name: 'cortes', component: () => import('../Admin/CutsView.vue'), meta: { adminOnly: true } },
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

// Espera la primera respuesta de onAuthStateChanged antes de decidir nada.
// Sin esto, al recargar /dashboard authStore.user todavía sería null
// (Firebase aún no respondió) y mandaría a /login aunque haya sesión abierta.
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

  // Sesión abierta pero sin rol válido (empleado desactivado o eliminado):
  // se cierra la sesión en vez de dejarlo entrar al panel.
  if (authStore.user && !authStore.role) {
    await authStore.logout()
    return to.name === 'Login' ? true : { name: 'Login' }
  }

  // Esto es solo la capa visual: la protección real de los datos son las
  // reglas de seguridad de Firestore.
  const adminOnly = to.matched.some((record) => record.meta.adminOnly)
  if (adminOnly && !authStore.isAdmin) {
    return { name: 'Agenda' }
  }

  if (to.name === 'Login' && authStore.user) {
    return { name: 'Agenda' }
  }
})

router.afterEach((to) => applySeo(to))

export default router
