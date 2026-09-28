// Textos legales del sitio público. Se muestran en el modal que abre cada
// enlace del footer (Footer.vue → LegalModal.vue).
//
// TODO: completar NIT / cédula del titular y un correo de contacto en
// BUSINESS cuando estén disponibles; Ley 1581 pide identificar claramente
// al responsable del tratamiento. Pedir a un abogado que revise estos
// textos antes de darlos por definitivos.

export const BUSINESS = {
  name: 'Barber Creiizii',
  address: 'Carrera 95 #88-40, Aures II, Medellín, Antioquia, Colombia',
  whatsapp: '+57 300 628 2601',
  instagram: '@creiizii_barber_shop',
  developer: 'JeiXSoft',
}

export const LEGAL_UPDATED_AT = '28 de septiembre de 2026'
// Si la política de privacidad cambia de fondo, actualizar también
// PRIVACY_POLICY_VERSION en ./legalVersion.ts (se guarda con cada autorización).

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  list?: string[]
  /** Párrafos que se muestran después de la lista. */
  closing?: string[]
}

export interface LegalDoc {
  id: LegalDocId
  /** Texto corto para el enlace del footer. */
  label: string
  title: string
  intro: string
  sections: LegalSection[]
}

export type LegalDocId = 'terminos' | 'privacidad' | 'reservas' | 'cookies' | 'ia'

const contactLine = `WhatsApp ${BUSINESS.whatsapp}, Instagram ${BUSINESS.instagram} o de forma presencial en ${BUSINESS.address}`

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'terminos',
    label: 'Términos y condiciones',
    title: 'Términos y condiciones de uso',
    intro: `Estos términos regulan el uso del sitio web de ${BUSINESS.name} y del sistema de reservas en línea. Al navegar por el sitio o agendar una cita aceptas estas condiciones. Si no estás de acuerdo con ellas, te pedimos no utilizar el sitio.`,
    sections: [
      {
        heading: '1. Quiénes somos',
        paragraphs: [
          `${BUSINESS.name} es una barbería ubicada en ${BUSINESS.address}. Puedes contactarnos por ${contactLine}.`,
        ],
      },
      {
        heading: '2. Objeto del sitio',
        paragraphs: [
          'El sitio tiene fines informativos (servicios, precios de referencia, horarios, trabajos realizados y productos) y permite agendar citas en línea. El sitio no procesa pagos: los servicios se pagan directamente en la barbería y la compra de productos se coordina por WhatsApp.',
        ],
      },
      {
        heading: '3. Uso adecuado',
        paragraphs: ['Al usar el sitio te comprometes a:'],
        list: [
          'Suministrar información veraz y actualizada al agendar una cita.',
          'No reservar a nombre de terceros sin su autorización.',
          'No realizar reservas falsas, masivas o con el fin de bloquear la agenda.',
          'No usar programas automatizados (bots o scripts) para interactuar con el sitio.',
          'No intentar acceder a las áreas administrativas, alterar el funcionamiento del sitio ni vulnerar su seguridad.',
        ],
      },
      {
        heading: '4. Reservas falsas o abusivas',
        paragraphs: [
          'Para proteger la agenda de todos, el sitio aplica verificaciones automáticas contra el uso de bots. Podemos cancelar, sin previo aviso, las reservas que resulten falsas, duplicadas o hechas de forma automatizada, y bloquear su origen.',
        ],
      },
      {
        heading: '5. Precios e información publicada',
        paragraphs: [
          'Los precios de servicios y productos se expresan en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo que se indique lo contrario. Pueden cambiar sin previo aviso; el precio aplicable es el vigente al momento de la reserva o de la compra. La disponibilidad de productos se confirma por WhatsApp.',
          'Las fotografías de trabajos son de referencia. El resultado final de cada servicio puede variar según el tipo, la textura y el estado del cabello de cada persona.',
        ],
      },
      {
        heading: '6. Reservas',
        paragraphs: [
          'Las citas agendadas en línea están sujetas a la Política de reservas y cancelaciones, que forma parte de estos términos.',
        ],
      },
      {
        heading: '7. Propiedad intelectual',
        paragraphs: [
          `La marca, el logotipo, las fotografías y los textos de ${BUSINESS.name} son de su titularidad o se usan con autorización. No pueden copiarse, reproducirse ni usarse con fines comerciales sin permiso previo y por escrito.`,
        ],
      },
      {
        heading: '8. Enlaces y servicios de terceros',
        paragraphs: [
          'El sitio contiene enlaces e integraciones de terceros, como WhatsApp, Instagram y Google Maps. Esos servicios tienen sus propios términos y políticas de privacidad, y no somos responsables de su contenido ni de su funcionamiento.',
        ],
      },
      {
        heading: '9. Disponibilidad y responsabilidad',
        paragraphs: [
          'Hacemos lo razonablemente posible para que el sitio funcione de forma continua y que la información sea correcta. Aun así, pueden presentarse interrupciones, errores técnicos o datos desactualizados. Si algo falla con tu reserva, confírmala por WhatsApp.',
          'Nada de lo dispuesto en estos términos limita los derechos que te reconoce el Estatuto del Consumidor (Ley 1480 de 2011).',
        ],
      },
      {
        heading: '10. Desarrollo con inteligencia artificial',
        paragraphs: [
          'Buena parte del código de este sitio se construyó con ayuda de herramientas de inteligencia artificial. Los detalles están en el Aviso sobre el uso de inteligencia artificial.',
        ],
      },
      {
        heading: '11. Aceptación electrónica, cambios y ley aplicable',
        paragraphs: [
          'Las aceptaciones y autorizaciones que otorgas en el sitio (por ejemplo, al marcar la casilla de autorización de datos) tienen plena validez como mensajes de datos, de acuerdo con la Ley 527 de 1999.',
          'Podemos actualizar estos términos en cualquier momento; la versión vigente es la publicada en el sitio, con su fecha de actualización. Estos términos se rigen por las leyes de la República de Colombia.',
        ],
      },
    ],
  },
  {
    id: 'privacidad',
    label: 'Política de privacidad',
    title: 'Política de tratamiento de datos personales',
    intro: `En cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas de protección de datos personales en Colombia, ${BUSINESS.name} informa cómo recolecta, usa y protege tu información.`,
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        paragraphs: [
          `${BUSINESS.name}. Dirección: ${BUSINESS.address}. Contacto: WhatsApp ${BUSINESS.whatsapp} e Instagram ${BUSINESS.instagram}.`,
        ],
      },
      {
        heading: '2. Datos que recolectamos',
        paragraphs: [
          'Aplicamos el principio de minimización: solo pedimos lo indispensable para gestionar tu cita.',
        ],
        list: [
          'Al agendar una cita: únicamente tu nombre y tu número de celular. Junto a ellos se guardan los datos de la reserva (servicio, barbero, fecha, hora y productos elegidos) y el registro de tu autorización (fecha, hora y versión de esta política que aceptaste).',
          'Al contactarnos por WhatsApp o Instagram: la información que decidas compartir en la conversación.',
          'Personal de la barbería: los datos de su cuenta de acceso al panel administrativo. En el sitio público solo se muestra el nombre de cada barbero.',
        ],
      },
      {
        heading: '3. Datos que NO recolectamos',
        list: [
          'No pedimos correo electrónico, documento de identidad, dirección ni fecha de nacimiento.',
          'No recolectamos datos sensibles (salud, origen étnico, orientación, datos biométricos, etc.) ni datos financieros o de tarjetas: el sitio no procesa pagos.',
          'El sitio no está dirigido a menores de edad. Las reservas para menores deben hacerlas sus padres o representantes legales.',
        ],
      },
      {
        heading: '4. Para qué usamos tus datos',
        list: [
          'Gestionar, confirmar, recordar, reprogramar o cancelar tus citas.',
          'Comunicarnos contigo por WhatsApp o llamada únicamente sobre tu reserva.',
          'Llevar el registro interno de servicios prestados y generar estadísticas agregadas del negocio.',
          'Atender tus peticiones, quejas y reclamos.',
        ],
        closing: [
          'No usamos tus datos para publicidad ni los vendemos o compartimos con terceros para fines comerciales. Si en el futuro quisiéramos enviarte promociones, te pediremos una autorización aparte, y cualquier contacto respetará los horarios y canales que establece la Ley 2300 de 2023.',
        ],
      },
      {
        heading: '5. Autorización',
        paragraphs: [
          'En el paso de datos del formulario de reserva te informamos, junto a un enlace a esta política, para qué usaremos tu nombre y tu celular. Al confirmar la reserva con la casilla de autorización marcada, autorizas de forma previa, expresa e informada su tratamiento para las finalidades descritas aquí. Si no estás de acuerdo, puedes desmarcar la casilla: en ese caso no es posible reservar en línea, pero siempre puedes agendar por WhatsApp o en la barbería.',
          'Guardamos la fecha, la hora y la versión de la política que aceptaste, como prueba de tu autorización. Puedes pedirnos una copia en cualquier momento.',
        ],
      },
      {
        heading: '6. Encargados y transferencia internacional',
        paragraphs: [
          'Para operar el sitio usamos proveedores tecnológicos que actúan como encargados del tratamiento. Sus servidores pueden estar fuera de Colombia, lo que implica una transmisión internacional de datos. Estos proveedores aplican estándares de seguridad reconocidos internacionalmente:',
        ],
        list: [
          'Vercel Inc.: alojamiento (hosting) del sitio web.',
          'Google Firebase (Google LLC): base de datos de reservas y autenticación del personal.',
          'Google reCAPTCHA (Google LLC): verificación automática contra bots al usar el sitio. Aplican la Política de privacidad y los Términos del servicio de Google.',
          'Google Maps: mapa de ubicación embebido.',
          'WhatsApp e Instagram (Meta Platforms, Inc.): cuando decides contactarnos por esos medios.',
        ],
      },
      {
        heading: '7. Tus derechos como titular',
        paragraphs: ['De acuerdo con el artículo 8 de la Ley 1581 de 2012, tienes derecho a:'],
        list: [
          'Conocer, actualizar y rectificar tus datos personales.',
          'Solicitar prueba de la autorización que otorgaste.',
          'Ser informado sobre el uso que se ha dado a tus datos.',
          'Revocar la autorización y/o solicitar la supresión de tus datos, cuando no exista un deber legal o contractual de conservarlos.',
          'Acceder gratuitamente a tus datos.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la normativa, una vez agotado el trámite de consulta o reclamo ante nosotros.',
        ],
      },
      {
        heading: '8. Cómo ejercer tus derechos',
        paragraphs: [
          `Escríbenos por ${contactLine}, indicando tu nombre, el teléfono con el que reservaste y tu solicitud.`,
          'Las consultas se atienden en un máximo de diez (10) días hábiles y los reclamos en un máximo de quince (15) días hábiles, prorrogables en los términos previstos por la ley.',
        ],
      },
      {
        heading: '9. Conservación',
        paragraphs: [
          'Conservamos los datos de cada reserva hasta por veinticuatro (24) meses después de la fecha de la cita, para el historial de servicios y la atención de reclamos. Después los eliminamos o los anonimizamos. Si solicitas la supresión antes, la atendemos salvo que exista un deber legal de conservarlos.',
        ],
      },
      {
        heading: '10. Seguridad',
        list: [
          'Toda la comunicación con el sitio viaja cifrada (HTTPS).',
          'Solo el personal autorizado accede al panel, con usuario y contraseña personal. Cada barbero ve únicamente sus propias citas.',
          'Reglas de seguridad en la base de datos impiden que terceros consulten el listado de reservas o modifiquen información.',
          'Verificaciones automáticas contra bots y reservas masivas.',
        ],
        closing: [
          'Si ocurriera un incidente de seguridad que afecte tus datos, lo informaremos a la Superintendencia de Industria y Comercio y, cuando corresponda, a los titulares afectados.',
        ],
      },
      {
        heading: '11. Vigencia',
        paragraphs: [
          `Esta política rige desde el ${LEGAL_UPDATED_AT}. Si realizamos cambios sustanciales, los publicaremos en este sitio.`,
        ],
      },
    ],
  },
  {
    id: 'reservas',
    label: 'Reservas y cancelaciones',
    title: 'Política de reservas y cancelaciones',
    intro: 'Queremos que todos encuentren un espacio en la agenda. Por eso te pedimos tener en cuenta estas reglas al reservar.',
    sections: [
      {
        heading: '1. Confirmación',
        paragraphs: [
          'Una reserva hecha en línea queda registrada como pendiente hasta que la barbería la confirma. Podemos contactarte por WhatsApp o por llamada para confirmarla.',
          'Puedes reservar con al menos 30 minutos de anticipación y hasta 90 días adelante.',
        ],
      },
      {
        heading: '2. Puntualidad',
        paragraphs: [
          'Te recomendamos llegar 5 minutos antes de tu cita. Si llegas con más de 15 minutos de retraso, podemos reprogramar tu turno o atenderte solo si la agenda lo permite, para no afectar a los demás clientes.',
        ],
      },
      {
        heading: '3. Cancelaciones y cambios',
        paragraphs: [
          `Puedes cancelar tu cita desde el sitio o avisarnos por WhatsApp (${BUSINESS.whatsapp}). Te pedimos hacerlo con la mayor anticipación posible, idealmente con al menos 2 horas de antelación, para liberar el espacio a otra persona.`,
        ],
      },
      {
        heading: '4. Inasistencias',
        paragraphs: [
          'Si no asistes a la cita sin avisar, esta quedará registrada como "No asistió". Ante inasistencias repetidas, la barbería podrá pedir confirmación previa por WhatsApp antes de aceptar nuevas reservas.',
        ],
      },
      {
        heading: '5. Cambios por parte de la barbería',
        paragraphs: [
          'Por fuerza mayor o imprevistos del personal podemos necesitar reprogramar tu cita. En ese caso te avisaremos lo antes posible por los datos de contacto que suministraste.',
        ],
      },
      {
        heading: '6. Pagos',
        paragraphs: [
          'No se cobra nada por reservar en línea. El valor del servicio se paga en la barbería al finalizar la atención.',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    label: 'Cookies y almacenamiento',
    title: 'Política de cookies y almacenamiento local',
    intro: 'Explicamos qué información guarda este sitio en tu navegador y para qué.',
    sections: [
      {
        heading: '1. Almacenamiento local propio',
        paragraphs: [
          'Cuando agendas una cita, guardamos en el almacenamiento local de tu navegador (localStorage) un resumen de esa reserva: su identificador, tu nombre, el servicio, el barbero, la fecha y la hora. Así el sitio puede mostrarte tu cita activa y permitirte cancelarla. Este resumen se queda en tu dispositivo, no se usa con fines publicitarios y se elimina al cancelar la cita, cuando la fecha de la cita pasa o al borrar los datos de navegación. Si usas un computador compartido, te recomendamos borrarlos al terminar.',
        ],
      },
      {
        heading: '2. Cookies técnicas',
        paragraphs: [
          'El personal de la barbería inicia sesión mediante Firebase Authentication, que usa almacenamiento técnico para mantener la sesión abierta. Es estrictamente necesario para el funcionamiento del panel administrativo.',
        ],
      },
      {
        heading: '3. Cookies de terceros',
        paragraphs: [
          'El mapa de ubicación lo provee Google Maps, que puede instalar sus propias cookies según su política de privacidad.',
          'Para proteger las reservas contra bots usamos Google reCAPTCHA, que puede usar cookies y analizar información técnica de tu navegador y de tu interacción con el sitio. Aplican la Política de privacidad y los Términos del servicio de Google.',
          'Los enlaces a WhatsApp e Instagram te llevan a servicios de Meta, que aplican sus propias políticas.',
        ],
      },
      {
        heading: '4. Publicidad',
        paragraphs: ['Este sitio no usa cookies publicitarias ni de seguimiento con fines comerciales.'],
      },
      {
        heading: '5. Cómo gestionarlas',
        paragraphs: [
          'Puedes borrar o bloquear las cookies y el almacenamiento local desde la configuración de tu navegador. Si lo haces, algunas funciones, como recordar tu cita activa, podrían dejar de funcionar.',
        ],
      },
    ],
  },
  {
    id: 'ia',
    label: 'Aviso sobre uso de IA',
    title: 'Aviso sobre el uso de inteligencia artificial',
    intro:
      'Por transparencia, queremos contarte cómo se construyó este sitio web.',
    sections: [
      {
        heading: '1. Desarrollo asistido por IA',
        paragraphs: [
          `Un gran porcentaje del código, del diseño y de los textos de este sitio se generó con Claude, un asistente de inteligencia artificial desarrollado por Anthropic. Esta forma de trabajo se conoce como "vibe coding". El proyecto fue dirigido, revisado, ajustado y publicado por ${BUSINESS.developer}.`,
        ],
      },
      {
        heading: '2. Supervisión humana',
        paragraphs: [
          `La información del negocio (servicios, precios, horarios, ubicación y datos de contacto) la define y mantiene ${BUSINESS.name}, que es responsable de ella. Las reservas, la agenda y la atención al cliente las gestionan personas del equipo de la barbería, no una inteligencia artificial.`,
        ],
      },
      {
        heading: '3. Tus datos y la IA',
        paragraphs: [
          'La inteligencia artificial se usó como herramienta durante la construcción del sitio. El sitio en funcionamiento no envía tus datos personales ni los de tus reservas a Claude, a Anthropic ni a ningún otro servicio de inteligencia artificial.',
        ],
      },
      {
        heading: '4. Posibles errores',
        paragraphs: [
          `Como cualquier software, y en especial uno generado en gran parte de forma automática, el sitio puede contener errores o imprecisiones. Si encuentras algo incorrecto, o si tu reserva no quedó bien registrada, avísanos por WhatsApp (${BUSINESS.whatsapp}) y lo resolvemos.`,
        ],
      },
      {
        heading: '5. Marcas',
        paragraphs: [
          'Claude y Anthropic son marcas de Anthropic, PBC. Su mención en este aviso es solo informativa y no implica patrocinio, afiliación ni respaldo de Anthropic hacia este negocio.',
        ],
      },
    ],
  },
]
