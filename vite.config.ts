import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Dominio de producción (también en index.html y src/router/seo.ts).
const SITE_URL = 'https://www.creiizii.com'

// Rutas públicas que se incluyen en el sitemap (las del panel no se indexan).
const PUBLIC_ROUTES = ['/', '/productos']

/** SEO en build: genera robots.txt y sitemap.xml con el dominio del sitio. */
function seoPlugin(siteUrl: string): Plugin {
  return {
    name: 'barber-seo',
    generateBundle() {
      const robots = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /login',
        'Disallow: /dashboard',
        '',
        `Sitemap: ${siteUrl}/sitemap.xml`,
      ]
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' })

      const lastmod = new Date().toISOString().slice(0, 10)
      const urls = PUBLIC_ROUTES.map(
        (path) => `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
      ).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss(), seoPlugin(SITE_URL)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
