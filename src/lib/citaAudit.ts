import { doc, serverTimestamp, type WriteBatch } from 'firebase/firestore'
import { db } from '../config/firebase'
import { formatTime12 } from '../stores/booking'
import { addAudit, citaRefs, STATUS_LABELS, type AuditActor } from './audit'

// Acciones del personal sobre una cita que se repiten en Agenda, Reportes y el
// aviso de pendientes: siempre con el mismo log de auditoría.

export interface AuditableCita {
  id: string
  status: string
  date: string
  time: string
  barberoId: string
  barberoName?: string
  customerName?: string
  customerPhone?: string
  serviceName?: string
}

function describe(cita: AuditableCita) {
  return `${cita.customerName ?? 'cliente'} (${cita.date} ${formatTime12(cita.time)})`
}

function citaData(cita: AuditableCita) {
  return {
    date: cita.date,
    time: cita.time,
    serviceName: cita.serviceName ?? '',
    barberoName: cita.barberoName ?? '',
  }
}

/** Cambia el estado de la cita dentro del lote y registra quién lo hizo. */
export function updateCitaStatus(batch: WriteBatch, actor: AuditActor, cita: AuditableCita, status: string) {
  const update: Record<string, unknown> = { status }
  // Constancia en la propia cita de quién y cuándo la canceló.
  if (status === 'cancelada') {
    update.cancelledAt = serverTimestamp()
    update.cancelledBy = actor.actorName
    update.cancelledByUid = actor.actorUid
  }
  batch.update(doc(db, 'citas', cita.id), update)
  addAudit(batch, actor, {
    action: 'cita.estado',
    category: 'cita',
    summary: `${actor.actorName} cambió la cita de ${describe(cita)} de ${STATUS_LABELS[cita.status] ?? cita.status} a ${STATUS_LABELS[status] ?? status}`,
    ...citaRefs(cita),
    changes: { status: { from: cita.status, to: status } },
    data: citaData(cita),
  })
}

/** Elimina la cita dentro del lote y deja guardado cómo estaba. */
export function deleteCita(batch: WriteBatch, actor: AuditActor, cita: AuditableCita) {
  batch.delete(doc(db, 'citas', cita.id))
  addAudit(batch, actor, {
    action: 'cita.eliminada',
    category: 'cita',
    summary: `${actor.actorName} eliminó la cita de ${describe(cita)} (estado: ${STATUS_LABELS[cita.status] ?? cita.status})`,
    ...citaRefs(cita),
    data: { ...citaData(cita), status: cita.status },
  })
}
