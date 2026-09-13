import {onCall} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

interface Input {
  barberoId: string
  date: string // "YYYY-MM-DD", local calendar date
}

/**
 * Public (no auth required) — but only ever returns a list of time strings
 * ("11:30"), never customer names/phones/etc. This is what lets the booking
 * modal grey out already-taken slots without needing to give the public
 * site read access to the citas collection (which does hold customer PII).
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
