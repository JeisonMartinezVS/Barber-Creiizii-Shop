<script setup lang="ts">
import Whatsapp from '../../public/icons/Whatsapp.vue'
import Instagram from '../../public/icons/Instagram.vue'

interface DayHours {
  label: string
  hours: string
}

// TODO: pull this from the same Firestore "horarios" doc used in the admin
// panel (Horarios view) so the site and the admin never fall out of sync.
const weekSchedule: DayHours[] = [
  { label: 'Domingo', hours: '12:00 - 19:00' },
  { label: 'Lunes', hours: '10:00 - 21:00' },
  { label: 'Martes', hours: '10:00 - 21:00' },
  { label: 'Miércoles', hours: '10:00 - 21:00' },
  { label: 'Jueves', hours: '10:00 - 21:00' },
  { label: 'Viernes', hours: '10:00 - 21:00' },
  { label: 'Sábado', hours: '10:00 - 22:00' },
]

// getDay(): 0 = Domingo ... 6 = Sábado, matching the order above.
const todayIndex = new Date().getDay()

// TODO: replace with the real "Compartir > Insertar un mapa" embed URL for
// your actual location from Google Maps.
const mapEmbedUrl =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.0234!2d-75.6279!3d6.2886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e44299c8c8c8c8d%3A0x8c8c8c8c8c8c8c8c!2sCra.%2095%20%2388-40%2C%20Medell%C3%ADn%2C%20Antioquia!5e0!3m2!1ses!2sco!4v1234567890'
</script>

<template>
  <footer class="relative bg-linear-to-b from-background to-card border-t border-primary/20">
    <div
      class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent"
    />

    <div class="max-w-11/12 w-full mx-auto py-16 px-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
        <!-- Brand -->
        <div class="flex flex-col gap-3">
          <p class="flex items-center gap-2 font-gothic text-neutral-content text-xl">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-primary shrink-0"
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
            Barber Creiizii
          </p>
          <p class="text-muted-foreground text-sm">
            Barbería premium en Medellín. Cada detalle cuenta, cada corte es nuestra firma.
          </p>
          <div class="flex items-center gap-3 mt-1">
            <a
              href="#"
              class="flex items-center gap-2 border border-green-500/40 text-green-400 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-500/10 transition"
            >
              <Whatsapp class="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href="#"
              class="flex items-center gap-2 border border-pink-500/40 text-pink-400 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-pink-500/10 transition"
            >
              <Instagram class="w-4 h-4" />
              Instagram
            </a>
          </div>
        </div>

        <!-- Contacto -->
        <div class="flex flex-col gap-3">
          <p class="flex items-center gap-2 text-primary text-xs font-bold tracking-widest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"
              />
            </svg>
            CONTACTO
          </p>
          <a
            href="https://wa.me/573006282601"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-3 bg-card border border-white/10 rounded-lg px-3 py-3 hover:border-primary/30 transition"
          >
            <span class="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-green-400 shrink-0">
              <Whatsapp class="w-4 h-4" />
            </span>
            <div>
              <p class="text-sm font-semibold text-neutral-content">WhatsApp</p>
              <p class="text-xs text-muted-foreground">+57 300 628 2601</p>
            </div>
          </a>
          <a
            href="https://instagram.com/creiizii_barber_shop"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-3 bg-card border border-white/10 rounded-lg px-3 py-3 hover:border-primary/30 transition"
          >
            <span class="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-pink-400 shrink-0">
              <Instagram class="w-4 h-4" />
            </span>
            <div>
              <p class="text-sm font-semibold text-neutral-content">Instagram</p>
              <p class="text-xs text-muted-foreground">@creiizii_barber_shop</p>
            </div>
          </a>
        </div>

        <!-- Horario -->
        <div class="flex flex-col gap-3">
          <p class="flex items-center gap-2 text-primary text-xs font-bold tracking-widest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            HORARIO
          </p>
          <div class="flex flex-col gap-0.5">
            <div
              v-for="(day, index) in weekSchedule"
              :key="day.label"
              class="flex items-center justify-between px-2 py-1.5 rounded-lg"
              :class="index === todayIndex ? 'bg-primary/10 border border-primary/30' : ''"
            >
              <span
                class="text-sm"
                :class="index === todayIndex ? 'text-primary font-semibold' : 'text-neutral-content/70'"
              >
                {{ day.label }}
              </span>
              <span
                class="text-sm"
                :class="index === todayIndex ? 'text-primary font-semibold' : 'text-muted-foreground'"
              >
                {{ day.hours }}
              </span>
            </div>
          </div>
        </div>

        <!-- Ubicación -->
        <div class="flex flex-col gap-3">
          <p class="flex items-center gap-2 text-primary text-xs font-bold tracking-widest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            UBICACIÓN
          </p>
          <div class="text-sm text-muted-foreground leading-relaxed">
            <p>Carrera 95 #88-40</p>
            <p>Aures II, Medellín</p>
            <p>Antioquia, Colombia</p>
          </div>
          <iframe
            :src="mapEmbedUrl"
            class="w-full h-40 rounded-lg border border-white/10 mt-1"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      <div
        class="mt-16 pt-8 border-t border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <p class="text-muted-foreground text-sm text-center md:text-left">
          &copy; {{ new Date().getFullYear() }} Barber Creiizii Shop. Todos los derechos
          reservados.
        </p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-px bg-linear-to-r from-transparent to-primary" />
          <div class="w-1.5 h-1.5 rotate-45 border border-primary" />
          <div class="w-2 h-2 rotate-45 border-2 border-primary" />
          <div class="w-1.5 h-1.5 rotate-45 border border-primary" />
          <div class="w-8 h-px bg-linear-to-l from-transparent to-primary" />
        </div>
      </div>
    </div>
  </footer>
</template>