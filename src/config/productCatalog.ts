// Catálogo fijo de productos. Las imágenes viven en public/productsImg y el
// documento de Firestore usa el `id` de aquí, así la imagen queda "quemada".
// Desde el panel solo se editan el nombre y el stock; lo demás (imagen,
// marca, precio, descripción) se controla desde este archivo y se aplica
// con el botón "Guardar productos".

export interface CatalogProduct {
  id: string
  name: string // nombre inicial (luego editable desde el panel)
  brand: string
  price: number
  description: string
  image: string
}

// Precio único de los geles. Ajústalo aquí y pulsa "Guardar productos".
const NISHMAN_WAX_PRICE = 25000

export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    id: 'nishman-01-gumgum',
    name: 'Nishman 01 Gumgum',
    brand: 'Nishman',
    price: NISHMAN_WAX_PRICE,
    description: 'Cera para peinar con aroma a chicle.',
    image: '/productsImg/nishman-01-gumgum.jpg',
  },
  {
    id: 'nishman-03-flaming',
    name: 'Nishman 03 Flaming',
    brand: 'Nishman',
    price: NISHMAN_WAX_PRICE,
    description: 'Cera para peinar de fijación fuerte.',
    image: '/productsImg/nishman-03-flaming.jpg',
  },
  {
    id: 'nishman-04-rugby',
    name: 'Nishman 04 Rugby',
    brand: 'Nishman',
    price: NISHMAN_WAX_PRICE,
    description: 'Cera para peinar de fijación fuerte.',
    image: '/productsImg/nishman-04-rugby.jpg',
  },
  {
    id: 'nishman-07-gold-one',
    name: 'Nishman 07 Gold One',
    brand: 'Nishman',
    price: NISHMAN_WAX_PRICE,
    description: 'Cera para peinar con acabado brillante.',
    image: '/productsImg/nishman-07-gold-one.jpg',
  },
  {
    id: 'nishman-08-matte',
    name: 'Nishman 08 Matte',
    brand: 'Nishman',
    price: NISHMAN_WAX_PRICE,
    description: 'Cera para peinar con acabado mate.',
    image: '/productsImg/nishman-08-matte.jpg',
  },
  {
    id: 'nishman-09-cola',
    name: 'Nishman 09 Cola',
    brand: 'Nishman',
    price: NISHMAN_WAX_PRICE,
    description: 'Gel wax con aroma a cola.',
    image: '/productsImg/nishman-09-cola.jpg',
  },
]
