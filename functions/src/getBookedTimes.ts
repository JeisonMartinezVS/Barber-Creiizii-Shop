import {onCall} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

interface Input {
  barberoId: string
  date: string // "YYYY-MM-DD", fecha local del calendario
}

/**
 * Pública (no requiere sesión), pero solo devuelve una lista de horas
 * ("11:30"), nunca nombres, teléfonos ni otros datos de clientes. Así el
 * modal de reservas puede marcar los horarios ocupados sin darle al sitio
 * público acceso de lectura a la colección citas (que sí tiene datos
 * personales).
 */
export const getBookedTimes = onCall<Input>(async (request) => {
  const {barberoId, date} = request.data ?? {};
  if (!barberoId || !date) return {times: []};

  const snapshot = await getFirestore()
    .collection("citas")
    .where("barberoId", "==", barberoId)
    .where("date", "==", date)
    .get();

  const times = snapshot.docs
    .map((d) => d.data())
    .filter((cita) => cita.status !== "cancelada")
    .map((cita) => cita.time as string);

  return {times};
});
