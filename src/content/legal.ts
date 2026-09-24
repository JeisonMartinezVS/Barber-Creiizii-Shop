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

export const LEGAL_UPDATED_AT = '24 de septiembre de 2026'

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  list?: string[]
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
          'No intentar acceder a las áreas administrativas, alterar el funcionamiento del sitio ni vulnerar su seguridad.',
        ],
      },
      {
        heading: '4. Precios e información publicada',
        paragraphs: [
          'Los precios de servicios y productos se expresan en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo que se indique lo contrario. Pueden cambiar sin previo aviso; el precio aplicable es el vigente al momento de la reserva o de la compra. La disponibilidad de productos se confirma por WhatsApp.',
          'Las fotografías de trabajos son de referencia. El resultado final de cada servicio puede variar según el tipo, la textura y el estado del cabello de cada persona.',
        ],
      },
      {
        heading: '5. Reservas',
        paragraphs: [
          'Las citas agendadas en línea están sujetas a la Política de reservas y cancelaciones, que forma parte de estos términos.',
        ],
      },
      {
        heading: '6. Propiedad intelectual',
        paragraphs: [
          `La marca, el logotipo, las fotografías y los textos de ${BUSINESS.name} son de su titularidad o se usan con autorización. No pueden copiarse, reproducirse ni usarse con fines comerciales sin permiso previo y por escrito.`,
        ],
      },
      {
        heading: '7. Enlaces y servicios de terceros',
        paragraphs: [
          'El sitio contiene enlaces e integraciones de terceros, como WhatsApp, Instagram y Google Maps. Esos servicios tienen sus propios términos y políticas de privacidad, y no somos responsables de su contenido ni de su funcionamiento.',
        ],
      },
      {
        heading: '8. Disponibilidad y responsabilidad',
        paragraphs: [
          'Hacemos lo razonablemente posible para que el sitio funcione de forma continua y que la información sea correcta. Aun así, pueden presentarse interrupciones, errores técnicos o datos desactualizados. Si algo falla con tu reserva, confírmala por WhatsApp.',
          'Nada de lo dispuesto en estos términos limita los derechos que te reconoce el Estatuto del Consumidor (Ley 1480 de 2011).',
        ],
      },
      {
        heading: '9. Desarrollo con inteligencia artificial',
        paragraphs: [
          'Buena parte del código de este sitio se construyó con ayuda de herramientas de inteligencia artificial. Los detalles están en el Aviso sobre el uso de inteligencia artificial.',
        ],
      },
      {
        heading: '10. Cambios y ley aplicable',
        paragraphs: [
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
        list: [
          'Al agendar una cita: nombre, número de teléfono, correo electrónico, notas opcionales, además del servicio, el barbero, la fecha y la hora elegidos.',
          'Al contactarnos por WhatsApp o Instagram: la información que decidas compartir en la conversación.',
          'Personal de la barbería: correo y datos de la cuenta necesarios para acceder al panel administrativo.',
        ],
        paragraphs: [
          'No recolectamos datos sensibles ni datos financieros o de tarjetas. El sitio no está dirigido a menores de edad; las reservas para menores deben hacerlas sus padres o representantes legales.',
        ],
      },
      {
        heading: '3. Para qué usamos tus datos',
        list: [
          'Gestionar, confirmar, recordar, reprogramar o cancelar tus citas.',
          'Comunicarnos contigo por WhatsApp, llamada o correo sobre tu reserva.',
          'Llevar el registro interno de servicios prestados y generar estadísticas agregadas del negocio.',
          'Atender tus peticiones, quejas y reclamos.',
          'Enviarte promociones o novedades, solo si nos autorizas expresamente. Puedes retirar esa autorización en cualquier momento.',
        ],
      },
      {
        heading: '4. Autorización',
        paragraphs: [
          'Al enviar tus datos en el formulario de reserva autorizas su tratamiento de forma previa, expresa e informada para las finalidades descritas en esta política.',
        ],
      },
      {
        heading: '5. Encargados y transferencia internacional',
        paragraphs: [
          'Para operar el sitio usamos proveedores tecnológicos que actúan como encargados del tratamiento. Sus servidores pueden estar fuera de Colombia, lo que implica una transmisión internacional de datos. Estos proveedores aplican estándares de seguridad reconocidos internacionalmente:',
        ],
        list: [
          'Vercel Inc.: alojamiento (hosting) del sitio web.',
          'Google Firebase (Google LLC): base de datos de reservas y autenticación del personal.',
          'Google Maps: mapa de ubicación embebido.',
          'WhatsApp e Instagram (Meta Platforms, Inc.): cuando decides contactarnos por esos medios.',
        ],
      },
      {
        heading: '6. Tus derechos como titular',
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
        heading: '7. Cómo ejercer tus derechos',
        paragraphs: [
          `Escríbenos por ${contactLine}, indicando tu nombre, el teléfono con el que reservaste y tu solicitud.`,
          'Las consultas se atienden en un máximo de diez (10) días hábiles y los reclamos en un máximo de quince (15) días hábiles, prorrogables en los términos previstos por la ley.',
        ],
      },
      {
        heading: '8. Conservación y seguridad',
        paragraphs: [
          'Conservamos los datos de las reservas mientras sean necesarios para las finalidades descritas y para cumplir obligaciones legales o contables. El acceso al panel administrativo está restringido al personal autorizado mediante usuario y contraseña. Adoptamos medidas técnicas y administrativas razonables para proteger la información contra el acceso no autorizado, su pérdida o su alteración.',
        ],
      },
      {
        heading: '9. Vigencia',
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
          'Cuando agendas una cita, guardamos en el almacenamiento local de tu navegador (localStorage) una referencia a esa reserva. Así el sitio puede mostrarte tu cita activa y permitirte cancelarla. Este dato se queda en tu dispositivo, no se usa con fines publicitarios y se elimina al cancelar la cita o al borrar los datos de navegación.',
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
          'El mapa de ubicación lo provee Google Maps, que puede instalar sus propias cookies según su política de privacidad. Los enlaces a WhatsApp e Instagram te llevan a servicios de Meta, que aplican sus propias políticas.',
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
