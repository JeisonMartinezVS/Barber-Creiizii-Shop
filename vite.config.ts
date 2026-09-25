import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Dominio de producción. VITE_SITE_URL lo puede sobrescribir (p. ej. para
// un entorno de pruebas).
const DEFAULT_SITE_URL = 'https://www.creiizii.com'

// Rutas públicas que se incluyen en el sitemap (las del panel no se indexan).
const PUBLIC_ROUTES = ['/', '/productos']

/**
 * SEO en build: reemplaza __SITE_URL__ en index.html y genera robots.txt y
 * sitemap.xml con el dominio del sitio.
 */
function seoPlugin(siteUrl: string): Plugin {
  return {
    name: 'barber-seo',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /login', 'Disallow: /dashboard']
      if (siteUrl) robots.push('', `Sitemap: ${siteUrl}/sitemap.xml`)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' })

      if (siteUrl) {
        const lastmod = new Date().toISOString().slice(0, 10)
        const urls = PUBLIC_ROUTES.map(
          (path) => `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
        ).join('\n')
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '')

  return {
    plugins: [vue(), vueDevTools(), tailwindcss(), seoPlugin(siteUrl)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
