# Barber Creiizii Shop

Sitio web y panel administrativo de **Barber Creiizii**, barbería ubicada en Medellín, Colombia. Los clientes consultan servicios, precios y productos, y reservan citas en línea. El equipo gestiona la agenda, los empleados, el catálogo y los reportes desde un panel privado.

![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-ffca28?logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)
![Licencia](https://img.shields.io/badge/licencia-propietaria-red)

> [!IMPORTANT]
> Este proyecto se desarrolló en gran parte con asistencia de inteligencia artificial (Claude, de Anthropic). Ver [Uso de inteligencia artificial](#uso-de-inteligencia-artificial).

---

## Tabla de contenido

- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos (Firestore)](#modelo-de-datos-firestore)
- [Roles y permisos](#roles-y-permisos)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Despliegue](#despliegue)
- [Seguridad](#seguridad)
- [Aspectos legales, privacidad y políticas](#aspectos-legales-privacidad-y-políticas)
- [Uso de inteligencia artificial](#uso-de-inteligencia-artificial)
- [Pendientes conocidos](#pendientes-conocidos)
- [Licencia](#licencia)
- [Autor y contacto](#autor-y-contacto)

---

## Funcionalidades

### Sitio público

| Sección | Descripción |
| --- | --- |
| **Inicio** | Hero, servicios por categoría con precios, galería de trabajos y contacto. |
| **Reservas en línea** | Modal paso a paso: servicio → barbero → fecha y hora → datos del cliente → confirmación. Bloquea horarios ya ocupados. |
| **Cita activa** | El navegador recuerda la última reserva (`localStorage`) y muestra un banner para consultarla o cancelarla. |
| **Productos** | Catálogo con precios. La compra se coordina por WhatsApp (el sitio **no procesa pagos**). |
| **Footer** | Contacto (WhatsApp, Instagram), horario de la semana, mapa de ubicación y enlaces legales. |
| **Documentos legales** | Términos, privacidad, reservas, cookies y aviso de IA, cada uno en su propio modal. |

### Panel administrativo (`/dashboard`)

| Vista | Admin | Empleado | Descripción |
| --- | :---: | :---: | --- |
| **Agenda** | ✅ | ✅ | Citas del día con indicadores; cambio de estado (pendiente, confirmada, completada, cancelada, no asistió). |
| **Reportes** | ✅ | ✅ (solo las suyas) | KPIs, ingresos de los últimos 14 días, distribución de estados y tabla de citas con filtros por mes y día, con paginación. |
| **Empleados** | ✅ | — | Crear, editar, activar/desactivar y eliminar empleados. Envío de credenciales temporales por WhatsApp. |
| **Cortes** | ✅ | — | Servicios, categorías y precios. |
| **Productos** | ✅ | — | Catálogo de productos. |
| **Horarios** | ✅ | ✅ | Configuración de horarios de atención. |

**Primer ingreso de un empleado:** la cuenta se crea con una contraseña temporal. En su primer ingreso, un modal obligatorio le pide cambiarla. Para saber si ya la cambió, el panel compara el `passwordUpdatedAt` de Firebase Auth con el valor guardado al crear la cuenta (`tempPasswordSetAt`), así que el empleado no necesita permisos de escritura en Firestore.

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Framework | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| Lenguaje | TypeScript |
| Build | [Vite 7](https://vite.dev/) |
| Estilos | [Tailwind CSS 4](https://tailwindcss.com/) |
| Estado | [Pinia](https://pinia.vuejs.org/) |
| Rutas | [Vue Router](https://router.vuejs.org/) |
| Backend | [Firebase](https://firebase.google.com/): Firestore (base de datos), Authentication (personal) y Cloud Functions |
| Hosting | [Vercel](https://vercel.com/) |
| Calidad | ESLint, Prettier, `vue-tsc` |

---

## Estructura del proyecto

```text
Barber-Creiizii-Shop/
├── functions/                  # Cloud Functions de Firebase (TypeScript)
│   └── src/
├── public/                     # Logos, favicon e íconos
├── scripts/                    # Scripts de mantenimiento con firebase-admin (uso manual)
├── src/
│   ├── Admin/                  # Vistas del panel: Agenda, Reportes, Empleados, Login...
│   ├── components/             # Componentes del sitio público (Header, Footer, modales...)
│   │   └── dashboard/          # Componentes del panel (estadísticas, cambio de contraseña)
│   ├── config/                 # Inicialización de Firebase y configuración global
│   ├── content/
│   │   └── legal.ts            # Textos legales (términos, privacidad, cookies, IA...)
│   ├── lib/                    # Utilidades: creación de cuentas de personal, consultas a Auth
│   ├── plugins/
│   ├── router/                 # Rutas y guardas de autenticación
│   ├── stores/                 # Pinia: auth.ts (sesión y rol), booking.ts (reservas)
│   ├── ui/                     # Componentes de UI genéricos
│   ├── views/                  # Páginas públicas: Home, Productos
│   ├── App.vue
│   └── main.ts
├── firebase.json               # Configuración de Cloud Functions
├── vercel.json                 # Rewrites de la SPA
└── package.json
```

---

## Modelo de datos (Firestore)

| Colección | Contenido | Datos personales |
| --- | --- | :---: |
| `citas` | Reservas: barbero, servicio, fecha/hora, total, estado y datos del cliente (nombre, teléfono, correo, notas). | ⚠️ Sí |
| `disponibilidad` | Un documento por franja horaria ocupada, para evitar reservas dobles. | No |
| `empleados` | Ficha del personal: `name`, `email`, `phone`, `username`, `role`, `active`, `mustChangePassword`, `tempPasswordSetAt`. El ID del documento es el UID de Firebase Auth. | ⚠️ Sí |
| `productos` | Catálogo de productos. | No |
| `config` | Servicios, categorías, precios y configuración general. | No |

---

## Roles y permisos

- El rol se guarda en Firestore (`empleados/{uid}.role`), no en *custom claims*.
- `admin`: acceso completo al panel.
- `empleado`: solo Agenda, Reportes (propios) y Horarios.

> [!WARNING]
> Ocultar opciones del menú es solo visual. **La protección real la dan las reglas de seguridad de Firestore**, que hoy se administran en la consola de Firebase y **no están versionadas en este repositorio**. Ver [Pendientes conocidos](#pendientes-conocidos).

---

## Instalación y ejecución local

### Requisitos

- Node.js `^20.19.0` o `>=22.12.0`
- Un proyecto de Firebase con Firestore y Authentication (correo/contraseña) habilitados

### Pasos

```sh
# 1. Clonar el repositorio
git clone https://github.com/JeisonMartinezVS/Barber-Creiizii-Shop.git
cd Barber-Creiizii-Shop

# 2. Instalar dependencias
npm install

# 3. Crear el archivo .env (ver sección siguiente)

# 4. Levantar el servidor de desarrollo
npm run dev
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz. Este archivo está en `.gitignore` y **nunca debe subirse al repositorio**.

```env
# Configuración web de Firebase (Consola de Firebase > Configuración del proyecto)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Dominio usado para convertir "usuario" en correo al iniciar sesión (usuario@dominio)
VITE_ADMIN_EMAIL_DOMAIN=creiizii-admin.internal

# Muestra accesos rápidos de prueba en el login. Debe ser "false" en producción.
VITE_SHOW_DEMO_ACCOUNTS=false

# Opcional. Dominio para SEO (canonical, Open Graph, sitemap.xml).
# Por defecto: https://www.creiizii.com
# VITE_SITE_URL=https://www.creiizii.com
```

> [!NOTE]
> Las variables `VITE_*` se incluyen en el bundle del navegador, así que son públicas por diseño. La configuración web de Firebase no es un secreto; lo que protege los datos son las reglas de Firestore.

---

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Verificación de tipos + build de producción. |
| `npm run preview` | Sirve localmente el build de producción. |
| `npm run type-check` | Verificación de tipos con `vue-tsc`. |
| `npm run lint` | ESLint con corrección automática. |
| `npm run format` | Formatea `src/` con Prettier. |

---

## Despliegue

### Sitio web (Vercel)

1. Conecta el repositorio en Vercel.
2. Configura las variables de entorno de la sección anterior (con `VITE_SHOW_DEMO_ACCOUNTS=false`). El dominio de producción es **https://www.creiizii.com**.
3. Build: `npm run build`. Carpeta de salida: `dist`.

`vercel.json` redirige todas las rutas a `index.html` para que funcione el enrutamiento de la SPA.

**SEO:** el build genera `robots.txt` y `sitemap.xml` a partir de `VITE_SITE_URL` (ver `vite.config.ts`). Las metaetiquetas base y los datos estructurados (`BarberShop`, schema.org) están en `index.html`, y el título y la descripción de cada ruta en `src/router/seo.ts`.

### Cloud Functions (Firebase)

```sh
cd functions
npm install
npm run deploy   # firebase deploy --only functions (requiere Firebase CLI y plan Blaze)
```

---

## Seguridad

- **Credenciales:** `.env` y las llaves de cuentas de servicio (`firebase-admin`) nunca se suben al repositorio.
- **Contraseñas temporales:** se generan al crear un empleado, se envían por WhatsApp y el sistema obliga a cambiarlas en el primer ingreso.
- **Datos de clientes:** la colección `citas` contiene datos personales. El sitio público no debe tener permiso de lectura sobre ella.
- **Cuentas demo:** `VITE_SHOW_DEMO_ACCOUNTS` debe estar en `false` en producción.
- **Creación de cuentas:** se hace desde el navegador del administrador con una instancia secundaria de Firebase, para no cerrar su sesión (`src/lib/createStaffAccount.ts`).

---

## Aspectos legales, privacidad y políticas

El sitio publica sus documentos legales en el footer. Cada uno se abre en un modal. Los textos están centralizados en [`src/content/legal.ts`](src/content/legal.ts).

| Documento | Contenido principal |
| --- | --- |
| **Términos y condiciones** | Uso del sitio, precios, propiedad intelectual, servicios de terceros, responsabilidad y ley aplicable. |
| **Política de tratamiento de datos personales** | Responsable, datos recolectados, finalidades, encargados, derechos del titular (habeas data) y cómo ejercerlos. |
| **Política de reservas y cancelaciones** | Confirmación, puntualidad, cancelaciones, inasistencias y pagos. |
| **Política de cookies y almacenamiento** | Uso de `localStorage`, almacenamiento técnico de Firebase Auth y cookies de terceros (Google Maps). |
| **Aviso sobre el uso de IA** | Transparencia sobre el desarrollo asistido por IA. |

### Marco normativo de referencia (Colombia)

- **Ley 1581 de 2012**: protección de datos personales (habeas data).
- **Decreto 1377 de 2013**, compilado en el **Decreto 1074 de 2015**: reglamentación del tratamiento de datos.
- **Ley 1480 de 2011**: Estatuto del Consumidor.
- Autoridad de control: **Superintendencia de Industria y Comercio (SIC)**.

### Encargados del tratamiento (terceros)

| Proveedor | Uso |
| --- | --- |
| Vercel Inc. | Hosting del sitio web |
| Google LLC (Firebase) | Base de datos, autenticación y funciones en la nube |
| Google LLC (Maps) | Mapa de ubicación embebido |
| Meta Platforms, Inc. | WhatsApp e Instagram (contacto iniciado por el usuario) |

Los servidores de estos proveedores pueden estar fuera de Colombia (transmisión internacional de datos). La política de privacidad del sitio lo informa.

> [!CAUTION]
> Los textos legales son una base redactada con asistencia de IA y **no constituyen asesoría jurídica**. Antes de considerarlos definitivos, un abogado debe revisarlos. Pendientes:
> - Completar NIT o cédula del titular y un correo de contacto en `BUSINESS` (`src/content/legal.ts`).
> - Validar con el negocio las reglas de cancelación (antelación y tolerancia de llegada).
> - Añadir al formulario de reserva una casilla de **autorización expresa** para el tratamiento de datos, y guardar esa aceptación con la cita (Ley 1581, art. 9).
> - Evaluar si aplica la inscripción en el Registro Nacional de Bases de Datos (RNBD) de la SIC.
>
> Para actualizar un documento, edita `src/content/legal.ts` y cambia `LEGAL_UPDATED_AT`.

---

## Uso de inteligencia artificial

Un **gran porcentaje del código, del diseño y de los textos** de este proyecto se generó con **[Claude](https://www.anthropic.com/claude)**, un asistente de IA desarrollado por Anthropic, a través de Claude Code. Esta forma de trabajo se conoce como *vibe coding*.

- **Supervisión humana:** el proyecto fue dirigido, revisado, probado y publicado por **JeiXSoft**, que es responsable del resultado final.
- **Contenido del negocio:** servicios, precios, horarios y datos de contacto los define y mantiene **Barber Creiizii**.
- **Datos en producción:** el sitio en funcionamiento **no envía datos de clientes ni de reservas** a Claude, a Anthropic ni a ningún otro servicio de IA. La IA se usó solo como herramienta durante el desarrollo.
- **Transparencia hacia los usuarios:** el sitio incluye un aviso público sobre el uso de IA en el footer.
- **Limitaciones:** el código generado por IA puede contener errores. Todo cambio debe pasar `npm run type-check` y `npm run lint` y probarse manualmente antes de publicarse.

*Claude y Anthropic son marcas de Anthropic, PBC. Su mención es informativa y no implica patrocinio ni afiliación.*

---

## Pendientes conocidos

- [ ] **Reglas de Firestore versionadas:** hoy solo existen en la consola de Firebase. Conviene agregar `firestore.rules` al repositorio y desplegarlas con `firebase deploy --only firestore:rules`.
- [ ] **Cloud Function `getBookedTimes`:** está escrita en `functions/src/getBookedTimes.ts`, pero no se exporta desde `functions/src/index.ts`, así que no se despliega.
- [ ] **Horario del footer:** está fijo en `Footer.vue`. Debería leerse del mismo documento de Firestore que usa la vista Horarios.
- [ ] **Mapa del footer:** reemplazar la URL de ejemplo por el enlace real de *Google Maps > Compartir > Insertar un mapa*.
- [ ] **Script `scripts/setAdminClaim`:** es de una etapa anterior en la que los roles usaban *custom claims*. Los roles ya se leen de Firestore.
- [ ] Pendientes legales listados en [Aspectos legales](#aspectos-legales-privacidad-y-políticas).

---

## Licencia

**Software propietario. Todos los derechos reservados © JeiXSoft.**

Este código no es de uso libre. No se permite copiar, modificar, distribuir ni usar este software, total o parcialmente, sin autorización previa y por escrito del autor. La marca, el logotipo y las fotografías de **Barber Creiizii** pertenecen a su titular.

---

## Autor y contacto

| | |
| --- | --- |
| **Desarrollo** | JeiXSoft ([@JeisonMartinezVS](https://github.com/JeisonMartinezVS)) |
| **Negocio** | Barber Creiizii, Carrera 95 #88-40, Aures II, Medellín, Antioquia, Colombia |
| **WhatsApp** | [+57 300 628 2601](https://wa.me/573006282601) |
| **Instagram** | [@creiizii_barber_shop](https://instagram.com/creiizii_barber_shop) |
