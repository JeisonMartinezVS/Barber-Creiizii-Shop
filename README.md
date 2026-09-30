# North Side Barber Club

Sitio web y panel administrativo de **North Side Barber Club**, barbería ubicada en Medellín, Colombia. Los clientes consultan servicios, precios y productos, y reservan citas en línea. El equipo gestiona la agenda, los empleados, el catálogo y los reportes desde un panel privado.

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
| `citas` | Reservas: barbero, servicio, fecha/hora, total, estado, datos del cliente (**solo nombre y celular**) y registro de la autorización (`privacyConsent`, `privacyPolicyVersion`, `createdAt`). Lectura pública solo por ID; nadie externo puede listarlas. | ⚠️ Sí |
| `disponibilidad` | Un documento por horario ocupado (`barberoId_fecha_hora`) enlazado a su cita (`citaId`). Evita reservas dobles. | No |
| `empleados` | Ficha del personal: `name`, `email`, `phone`, `username`, `role`, `active`, `schedule`, `mustChangePassword`, `tempPasswordSetAt`. El ID del documento es el UID de Firebase Auth. **Lectura pública** (el modal de reservas lee aquí barberos y horarios); solo el admin escribe, y cada empleado solo su propio `schedule`. | ⚠️ Sí |
| `productos` | Catálogo de productos. `image` es la URL pública de su imagen y `imagePath` su ruta en Cloud Storage (`productos/{id}/…`). | No |
| `config` | Servicios, categorías, precios y configuración general. | No |

---

## Roles y permisos

- El rol se guarda en Firestore (`empleados/{uid}.role`), no en *custom claims*.
- `admin`: acceso completo al panel.
- `empleado`: solo Agenda, Reportes (propios) y Horarios.
- Un empleado **desactivado** (`active: false`) o **eliminado** no puede entrar al panel ni leer datos, aunque su cuenta de Firebase Auth siga existiendo.

> [!WARNING]
> Ocultar opciones del menú es solo visual. **La protección real la dan las reglas de seguridad de Firestore**, versionadas en [`firestore.rules`](firestore.rules). Como cualquiera puede crear una cuenta de Firebase Auth con la API key pública, las reglas **nunca** confían solo en `request.auth != null`: validan el rol y el estado activo en `empleados/{uid}`.

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

# Clave de sitio de reCAPTCHA v3 para Firebase App Check (protección contra bots).
# Si está vacía, App Check no se activa.
VITE_RECAPTCHA_SITE_KEY=

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

**SEO:** el build genera `robots.txt` y `sitemap.xml` para `https://www.creiizii.com` (ver `vite.config.ts`). Las metaetiquetas base y los datos estructurados (`BarberShop`, schema.org) están en `index.html`, y el título y la descripción de cada ruta en `src/router/seo.ts`.

### Reglas de Firestore

```sh
npm install -g firebase-tools   # una sola vez
firebase login
firebase deploy --only firestore:rules
```

> [!IMPORTANT]
> **Orden al publicar estas reglas por primera vez:** primero desplegar el sitio en Vercel y **después** publicar las reglas. El código nuevo funciona con las reglas anteriores, pero el código anterior no cumple las reglas nuevas (guardaba la cita y el horario por separado).

### App Check (protección contra bots)

1. Crear una clave **reCAPTCHA v3** para `www.creiizii.com` en la [consola de reCAPTCHA](https://www.google.com/recaptcha/admin).
2. En Firebase > **App Check**, registrar la app web con el proveedor reCAPTCHA v3 (clave secreta).
3. Poner la clave de sitio en `VITE_RECAPTCHA_SITE_KEY` (Vercel) y desplegar.
4. Revisar en App Check > Métricas que las peticiones llegan verificadas y luego **aplicar (enforce) solo para Cloud Firestore**. No aplicarlo a Authentication: la creación de empleados desde el panel dejaría de funcionar.

En desarrollo local, App Check imprime un *debug token* en la consola del navegador; se registra en App Check > Administrar tokens de depuración.

### Cabeceras de seguridad

`vercel.json` añade cabeceras HTTP de seguridad (anti-clickjacking, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`). La **Content Security Policy** está en modo *Report-Only*: tras desplegar, revisar la consola del navegador en todas las páginas. Si no aparecen avisos de CSP, cambiar la clave `Content-Security-Policy-Report-Only` por `Content-Security-Policy` para aplicarla.

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
- **Datos de clientes:** solo nombre y celular. El sitio público puede crear citas válidas y leer una cita por su ID (aleatorio, solo lo conoce quien reservó), pero **no listar** la colección.
- **Reservas atómicas:** la cita y su horario se guardan en un solo lote; las reglas verifican que coincidan, que el horario esté libre, el formato y el tamaño de cada campo y que la fecha esté entre ahora y 100 días. Liberar un horario exige que su cita quede cancelada en el mismo lote.
- **Datos del personal:** `empleados` es de lectura pública porque el modal de reservas necesita la lista de barberos y sus horarios. Eso deja visibles el correo y el celular del personal a quien inspeccione las peticiones de red; es un riesgo aceptado. Si en el futuro se quiere ocultar, la solución es un directorio público aparte con solo nombre, rol y horario.
- **Contraseñas temporales:** se generan con `crypto.getRandomValues`, se envían por WhatsApp y el sistema obliga a cambiarlas en el primer ingreso.
- **Bajas de personal:** al eliminar o desactivar un empleado pierde el acceso de inmediato. Aun así, conviene **deshabilitar su cuenta** en Firebase > Authentication > Usuarios.
- **Cuentas demo:** `VITE_SHOW_DEMO_ACCOUNTS` debe estar en `false` en producción (con `false`, la lista de usuarios de prueba ni siquiera se incluye en el build).
- **Creación de cuentas:** se hace desde el navegador del administrador con una instancia secundaria de Firebase, para no cerrar su sesión (`src/lib/createStaffAccount.ts`).
- **Recomendado en la consola:** activar la *protección contra la enumeración de correos* en Firebase Authentication y una **alerta de presupuesto** en Google Cloud Billing.

---

## Aspectos legales, privacidad y políticas

El sitio publica sus documentos legales en el footer. Cada uno se abre en un modal. Los textos están centralizados en [`src/content/legal.ts`](src/content/legal.ts).

| Documento | Contenido principal |
| --- | --- |
| **Términos y condiciones** | Uso del sitio, precios, propiedad intelectual, servicios de terceros, responsabilidad y ley aplicable. |
| **Política de tratamiento de datos personales** | Responsable, datos recolectados (solo nombre y celular) y no recolectados, finalidades, autorización, encargados, derechos del titular (habeas data), conservación (24 meses) y seguridad. |
| **Política de reservas y cancelaciones** | Confirmación, anticipación, puntualidad, cancelaciones, inasistencias y pagos. |
| **Política de cookies y almacenamiento** | Uso de `localStorage`, almacenamiento técnico de Firebase Auth y cookies de terceros (Google Maps y Google reCAPTCHA). |
| **Aviso sobre el uso de IA** | Transparencia sobre el desarrollo asistido por IA. |

### Marco normativo de referencia (Colombia)

- **Ley 1581 de 2012**: protección de datos personales (habeas data).
- **Decreto 1377 de 2013**, compilado en el **Decreto 1074 de 2015**: reglamentación del tratamiento de datos.
- **Ley 1480 de 2011**: Estatuto del Consumidor.
- **Ley 527 de 1999**: validez de los mensajes de datos (aceptación electrónica).
- **Ley 2300 de 2023**: canales y horarios permitidos para contactar a los consumidores.
- Autoridad de control: **Superintendencia de Industria y Comercio (SIC)**.

**Autorización del cliente:** el formulario de reserva exige marcar una casilla de autorización con enlace a la política. Cada cita guarda `privacyConsent`, `privacyPolicyVersion` (ver `src/content/legalVersion.ts`) y la fecha (`createdAt`) como prueba.

### Encargados del tratamiento (terceros)

| Proveedor | Uso |
| --- | --- |
| Vercel Inc. | Hosting del sitio web |
| Google LLC (Firebase) | Base de datos, autenticación y funciones en la nube |
| Google LLC (reCAPTCHA) | Verificación contra bots (App Check) |
| Google LLC (Maps) | Mapa de ubicación embebido |
| Meta Platforms, Inc. | WhatsApp e Instagram (contacto iniciado por el usuario) |

Los servidores de estos proveedores pueden estar fuera de Colombia (transmisión internacional de datos). La política de privacidad del sitio lo informa.

> [!CAUTION]
> Los textos legales son una base redactada con asistencia de IA y **no constituyen asesoría jurídica**. Antes de considerarlos definitivos, un abogado debe revisarlos. Pendientes:
> - Completar NIT o cédula del titular y un correo de contacto en `BUSINESS` (`src/content/legal.ts`).
> - Validar con el negocio las reglas de cancelación (antelación y tolerancia de llegada).
> - **Cumplir el plazo de conservación de 24 meses:** hoy la eliminación es manual (el admin borra las citas antiguas). Puede automatizarse con una Cloud Function programada.
> - Evaluar si aplica la inscripción en el Registro Nacional de Bases de Datos (RNBD) de la SIC (obligatoria solo para sociedades y entidades sin ánimo de lucro con activos superiores a 100.000 UVT).
>
> Para actualizar un documento, edita `src/content/legal.ts` y cambia `LEGAL_UPDATED_AT`. Si el cambio en la política de datos es de fondo, cambia también `PRIVACY_POLICY_VERSION`.

---

## Uso de inteligencia artificial

Un **gran porcentaje del código, del diseño y de los textos** de este proyecto se generó con **[Claude](https://www.anthropic.com/claude)**, un asistente de IA desarrollado por Anthropic, a través de Claude Code. Esta forma de trabajo se conoce como *vibe coding*.

- **Supervisión humana:** el proyecto fue dirigido, revisado, probado y publicado por **JeiXSoft**, que es responsable del resultado final.
- **Contenido del negocio:** servicios, precios, horarios y datos de contacto los define y mantiene **North Side Barber Club**.
- **Datos en producción:** el sitio en funcionamiento **no envía datos de clientes ni de reservas** a Claude, a Anthropic ni a ningún otro servicio de IA. La IA se usó solo como herramienta durante el desarrollo.
- **Transparencia hacia los usuarios:** el sitio incluye un aviso público sobre el uso de IA en el footer.
- **Limitaciones:** el código generado por IA puede contener errores. Todo cambio debe pasar `npm run type-check` y `npm run lint` y probarse manualmente antes de publicarse.

*Claude y Anthropic son marcas de Anthropic, PBC. Su mención es informativa y no implica patrocinio ni afiliación.*

---

## Pendientes conocidos

- [ ] **Cloud Function `getBookedTimes`:** está escrita en `functions/src/getBookedTimes.ts`, pero no se exporta ni se usa (el sitio consulta `disponibilidad`). Puede eliminarse.
- [ ] **Reportes:** `ReportView` escucha en vivo **toda** la colección `citas`. Con los años (o ante abuso) crece el costo y la carga del panel; conviene limitarla por rango de fechas.
- [ ] **Dependencias de `functions/`:** `npm audit` reporta 8 vulnerabilidades moderadas que requieren actualizar `firebase-admin` a una versión mayor.
- [ ] **Horario del footer:** está fijo en `Footer.vue`. Debería leerse del mismo documento de Firestore que usa la vista Horarios.
- [ ] **Mapa del footer:** reemplazar la URL de ejemplo por el enlace real de *Google Maps > Compartir > Insertar un mapa*.
- [ ] **Script `scripts/setAdminClaim`:** es de una etapa anterior en la que los roles usaban *custom claims*. Los roles ya se leen de Firestore.
- [ ] Pendientes legales listados en [Aspectos legales](#aspectos-legales-privacidad-y-políticas).

---

## Licencia

**Software propietario. Todos los derechos reservados © JeiXSoft.**

Este código no es de uso libre. No se permite copiar, modificar, distribuir ni usar este software, total o parcialmente, sin autorización previa y por escrito del autor. La marca, el logotipo y las fotografías de **North Side Barber Club** pertenecen a su titular.

---

## Autor y contacto

| | |
| --- | --- |
| **Desarrollo** | JeiXSoft ([@JeisonMartinezVS](https://github.com/JeisonMartinezVS)) |
| **Negocio** | North Side Barber Club, Carrera 95 #88-40, Aures II, Medellín, Antioquia, Colombia |
| **WhatsApp** | [+57 300 628 2601](https://wa.me/573006282601) |
| **Instagram** | [@north_side_barber_club](https://instagram.com/north_side_barber_club) |
