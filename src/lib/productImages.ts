import { deleteObject, getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage'
import { app } from '../config/firebase'

// Imágenes de productos en Firebase Cloud Storage, carpeta productos/{id}/.
// Solo un admin activo sube o borra (reglas en Consola > Storage > Reglas); el sitio público
// solo muestra la URL que queda guardada en productos/{id}.image.

const storage = getStorage(app)

const MAX_INPUT_BYTES = 10 * 1024 * 1024 // la foto original, antes de comprimir
const MAX_SIDE_PX = 800
const QUALITY = 0.82
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const ACCEPTED_IMAGE_TYPES = ACCEPTED_TYPES.join(',')

export interface UploadedImage {
  url: string
  path: string
}

/** Devuelve un mensaje de error si el archivo no sirve, o null si es válido. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'La imagen debe ser JPG, PNG o WebP.'
  if (file.size > MAX_INPUT_BYTES) return 'La imagen no puede pesar más de 10 MB.'
  return null
}

/**
 * Reduce la imagen a máximo 800 px por lado y la convierte a WebP (o JPEG si
 * el navegador no puede generar WebP). Una foto de celular de varios MB queda
 * en unos pocos KB: carga rápido y casi no ocupa espacio en la nube.
 */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

  const webp = await toBlob('image/webp')
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob('image/jpeg')
  if (!jpeg) throw new Error('No se pudo procesar la imagen')
  return jpeg
}

export async function uploadProductImage(productId: string, file: File): Promise<UploadedImage> {
  const blob = await compressImage(file)
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  // Nombre único: al cambiar la imagen la URL cambia y nadie ve la foto vieja en caché.
  const path = `productos/${productId}/${Date.now()}.${extension}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, blob, {
    contentType: blob.type,
    cacheControl: 'public, max-age=31536000, immutable',
  })
  return { url: await getDownloadURL(fileRef), path }
}

/** Borra una imagen anterior. Si ya no existe, no pasa nada. */
export async function deleteProductImage(path: string | undefined | null): Promise<void> {
  if (!path) return
  try {
    await deleteObject(storageRef(storage, path))
  } catch (err) {
    if ((err as { code?: string })?.code !== 'storage/object-not-found') {
      console.error('No se pudo borrar la imagen anterior', err)
    }
  }
}
