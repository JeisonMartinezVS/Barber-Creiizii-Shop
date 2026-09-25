import type { RouteLocationNormalized } from 'vue-router'

// Metadatos SEO por ruta. index.html trae los valores por defecto (los que
// ven los bots que no ejecutan JavaScript, como los previews de WhatsApp);
// aquí se ajustan al navegar para Google y para la pestaña del navegador.

export interface SeoMeta {
  title: string
  description: string
  /** false → noindex (panel administrativo, login). */
  index?: boolean
}

const DEFAULT_SEO: SeoMeta = {
  title: 'Barber Creiizii | Barbería en Medellín – Cortes, barba y estilo',
  description:
    'Barbería premium en Aures II, Medellín. Cortes de cabello, arreglo de barba y estilo para caballeros. Reserva tu cita en línea en segundos.',
}

const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://www.creiizii.com').replace(/\/+$/, '')

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export function applySeo(to: RouteLocationNormalized) {
  const seo = { ...DEFAULT_SEO, ...(to.meta.seo as Partial<SeoMeta> | undefined) }
  // Canonical sin query ni hash, para que /?x=1 y /#servicio cuenten como "/".
  const url = `${SITE_URL}${to.path}`

  document.title = seo.title
  setMeta('name', 'description', seo.description)
  setMeta('name', 'robots', seo.index === false ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
  setMeta('property', 'og:title', seo.title)
  setMeta('property', 'og:description', seo.description)
  setMeta('property', 'og:url', url)
  setMeta('name', 'twitter:title', seo.title)
  setMeta('name', 'twitter:description', seo.description)
  setCanonical(url)
}
