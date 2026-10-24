import { collection, doc, serverTimestamp, writeBatch, type WriteBatch } from 'firebase/firestore'
import { db } from '../config/firebase'

// Auditoría: cada movimiento de la página deja un registro en `auditoria`,
// que solo puede leer el super admin (vista /auditoria) y que nadie puede
// editar ni borrar (ver firestore.rules).
//
// El registro se agrega al MISMO lote que la acción: o se guardan los dos o
// ninguno, así no hay movimientos sin log ni logs de acciones que fallaron.
//
// Este archivo no importa el store de auth a propósito: la web pública lo usa
// para registrar reservas y cancelaciones sin descargar Firebase Auth.

export type AuditCategory = 'cita' | 'cliente' | 'empleado' | 'producto' | 'servicio' | 'horario' | 'venta' | 'sesion'

export interface AuditActor {
  actorType: 'cliente' | 'personal'
  actorUid: string
  actorName: string
  actorRole: 'cliente' | 'admin' | 'empleado' | 'superadmin'
}

export interface AuditEntry {
  /** "categoria.accion", p. ej. "cita.estado". */
  action: string
  category: AuditCategory
  /** Frase legible: "Cambió la cita de Ana de Pendiente a Cancelada". */
  summary: string
  citaId?: string
  customerName?: string
  customerPhone?: string
  barberoId?: string
  /** Id del documento afectado cuando no es una cita (producto, empleado...). */
  targetId?: string
  /** Campos que cambiaron: { status: { from: 'pendiente', to: 'cancelada' } }. */
  changes?: Record<string, { from: unknown; to: unknown }>
  /** Datos extra útiles para investigar (servicio, hora, productos...). */
  data?: Record<string, unknown>
}

export function customerActor(name: string): AuditActor {
  return { actorType: 'cliente', actorUid: '', actorName: name.slice(0, 120), actorRole: 'cliente' }
}

// Firestore no acepta `undefined`: se quita de los mapas libres.
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildRecord(entry: AuditEntry, actor: AuditActor) {
  const record: Record<string, unknown> = {
    at: serverTimestamp(),
    action: entry.action,
    category: entry.category,
    summary: entry.summary.slice(0, 500),
    source: actor.actorType === 'cliente' ? 'web' : 'panel',
    userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : '').slice(0, 300),
    ...actor,
    citaId: entry.citaId ?? '',
    customerName: (entry.customerName ?? '').slice(0, 80),
    customerPhone: (entry.customerPhone ?? '').slice(0, 20),
    barberoId: entry.barberoId ?? '',
    targetId: entry.targetId ?? '',
  }
  if (entry.changes) record.changes = clean(entry.changes)
  if (entry.data) record.data = clean(entry.data)
  return record
}

/** Agrega el registro al lote de la acción (se guarda con el commit). */
export function addAudit(batch: WriteBatch, actor: AuditActor, entry: AuditEntry) {
  batch.set(doc(collection(db, 'auditoria')), buildRecord(entry, actor))
}

/**
 * Registro suelto, para eventos que no escriben nada más (inicio y cierre de
 * sesión). Nunca lanza error: un log fallido no debe bloquear al usuario.
 */
export async function logAudit(actor: AuditActor, entry: AuditEntry) {
  try {
    const batch = writeBatch(db)
    addAudit(batch, actor, entry)
    await batch.commit()
  } catch (err) {
    console.warn('No se pudo registrar el evento de auditoría', err)
  }
}

export const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
}

/** Datos de una cita que se repiten en sus logs. */
export function citaRefs(cita: {
  id: string
  customerName?: string
  customerPhone?: string
  barberoId?: string
}): Pick<AuditEntry, 'citaId' | 'customerName' | 'customerPhone' | 'barberoId'> {
  return {
    citaId: cita.id,
    customerName: cita.customerName ?? '',
    customerPhone: cita.customerPhone ?? '',
    barberoId: cita.barberoId ?? '',
  }
}
