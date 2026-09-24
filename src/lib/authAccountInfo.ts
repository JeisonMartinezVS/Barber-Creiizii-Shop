import type { User } from 'firebase/auth'

export interface AuthAccountTimestamps {
  /** Milisegundos, según el servidor de Firebase Auth. */
  createdAt: number
  /** Milisegundos: última vez que se fijó la contraseña (al crearla o al cambiarla). */
  passwordUpdatedAt: number
}

/**
 * Lee de Firebase Auth (endpoint accounts:lookup, el mismo que usa el SDK
 * internamente en user.reload()) las marcas de tiempo de la cuenta. El SDK
 * no expone passwordUpdatedAt, por eso se consulta directamente con el
 * token del propio usuario — no requiere permisos extra ni Firestore.
 */
export async function fetchAuthAccountTimestamps(user: User, apiKey: string): Promise<AuthAccountTimestamps> {
  const idToken = await user.getIdToken()
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) throw new Error(`accounts:lookup respondió ${res.status}`)
  const data = (await res.json()) as { users?: Array<{ createdAt?: string; passwordUpdatedAt?: number }> }
  const info = data.users?.[0]
  const createdAt = Number(info?.createdAt)
  const passwordUpdatedAt = Number(info?.passwordUpdatedAt)
  if (!createdAt || !passwordUpdatedAt) throw new Error('accounts:lookup no devolvió las marcas de tiempo')
  return { createdAt, passwordUpdatedAt }
}
