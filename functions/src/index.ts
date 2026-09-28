/**
 * Punto de entrada de las Cloud Functions. Aquí se importan los disparadores
 * de cada submódulo, por ejemplo:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * Lista completa de disparadores: https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
// import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// Guía para escribir funciones:
// https://firebase.google.com/docs/functions/typescript

// Control de costos: máximo de contenedores que pueden correr al mismo
// tiempo. Ante picos de tráfico inesperados (o un abuso), el rendimiento baja
// en vez de disparar la factura. El límite es por función y se puede
// sobrescribir en cada una con la opción `maxInstances`, p. ej.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTA: setGlobalOptions no aplica a funciones de la API v1; en esas se usa
// functions.runWith({ maxInstances: 10 }). En la v1 cada contenedor atiende
// una sola petición a la vez, así que este valor sería el máximo de
// peticiones simultáneas.
setGlobalOptions({maxInstances: 10});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
