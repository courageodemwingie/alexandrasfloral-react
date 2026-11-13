
export const categories = [
  {
    id: 'bouquets',
    name: 'Bouquets',
    slug: 'bouquets',
    description: 'Hand-tied and beautifully wrapped floral bouquets.',
  },
  {
    id: 'flower-arrangements',
    name: 'Flower Arrangements',
    slug: 'flower-arrangements',
    description: 'Thoughtfully designed floral arrangements.',
  },
  {
    id: 'plants',
    name: 'Plants',
    slug: 'plants',
    description: 'Plants and greenery for your spaces.',
  },
  {
    id: 'wreaths',
    name: 'Wreaths',
    slug: 'wreaths',
    description: 'Decorative floral wreaths for different occasions.',
  },
  {
    id: 'gift',
    name: 'Gifts',
    slug: 'gift',
    description: 'Thoughtful floral gifts and combinations.',
  },
]

const testImages = [
  {
    id: 'red-roses',
    name: 'Red Roses',
    image: '/images/Products/5-red-roses-and-gypsophila.webp',
  },
  {
    id: 'pink-roses',
    name: 'Pink Roses',
    image: '/images/Products/20-pink-roses-and-gypsophila.webp',
  },
  {
    id: 'fifty-red-roses',
    name: '50 Red Roses',
    image: '/images/Products/50-red-roses.webp',
  },
  {
    id: 'floral-arrangement',
    name: 'Floral Arrangement',
    image: '/images/Products/floral-arrangement-03.webp',
  },
  {
    id: 'lily-rose',
    name: 'Lily and Rose',
    image: '/images/Products/lily-and-rose-arrangement.webp',
  },
  {
    id: 'red-white-roses',
    name: 'Red and White Roses',
    image: '/images/Products/red-and-white-roses-with-gypsophila.webp',
  },
]

const categoryLabels = {
  bouquets: 'Bouquet',
  'flower-arrangements': 'Flower Arrangement',
  plants: 'Plant',
  wreaths: 'Wreath',
  gift: 'Gift',
}

function createProduct(category, number, imageIndex, featured = false) {
  const productNumber = String(number).padStart(2, '0')
  const id = `${category}-${productNumber}`

  const name = `${categoryLabels[category]} ${productNumber}`

  const variations = Array.from({ length: 4 }, (_, index) => {
    const image = testImages[(imageIndex + index) % testImages.length]

    return {
      id: `${id}-variation-${index + 1}`,
      name: `Variation ${index + 1}`,
      price: 35000,
      image: image.image,
    }
  })

  return {
    id,
    name,
    slug: id,
    category,
    description:
      'Temporary placeholder product. Replace with the actual product description before launch.',
    price: 35000,
    featured,
    variations,
  }
}

export const products = [
  // Bouquets - 12 products
  ...Array.from({ length: 12 }, (_, index) =>
    createProduct('bouquets', index + 1, index, index === 0)
  ),

  // Flower Arrangements - 6 products
  ...Array.from({ length: 6 }, (_, index) =>
    createProduct('flower-arrangements', index + 1, index + 3, index === 0)
  ),

  // Plants - 6 products
  ...Array.from({ length: 6 }, (_, index) =>
    createProduct('plants', index + 1, index + 1)
  ),

  // Wreaths - 6 products
  ...Array.from({ length: 6 }, (_, index) =>
    createProduct('wreaths', index + 1, index + 2)
  ),

  // Gifts - 6 products
  ...Array.from({ length: 6 }, (_, index) =>
    createProduct('gift', index + 1, index + 4)
  ),
]

export const getProductBySlug = (slug) =>
  products.find((product) => product.slug === slug)

export const getProductsByCategory = (categorySlug) =>
  products.filter((product) => product.category === categorySlug)

export const getCategoryBySlug = (slug) =>
  categories.find((category) => category.slug === slug)
