
import { useEffect, useState } from 'react'
import HeroSlider from '../components/HeroSlider.jsx'
import ProductCard from '../components/shop/ProductCard.jsx'
import { getPublicProducts } from '../services/api.js'
import '../styles/home.css'

const categoryNames = {
  bouquets: 'BOUQUETS',
  'flower-arrangements': 'FLOWER ARRANGEMENTS',
  gift: 'GIFTS',
  plants: 'PLANTS',
  wreaths: 'WREATHS',
}

function Home() {
  const [favouriteProducts, setFavouriteProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadFeaturedProducts() {
      try {
        const data = await getPublicProducts()

        if (!isMounted) return

        const featured = (data.products || []).filter(
          (product) => product.featured
        )

        setFavouriteProducts(featured)
      } catch (error) {
        console.error('Unable to load featured products:', error)

        if (isMounted) {
          setFavouriteProducts([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadFeaturedProducts()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="homepage">
      <HeroSlider />

      <section className="home-favourites" aria-label="Top picks">
        {isLoading ? (
          <p className="home-favourites-empty">
            Loading our top picks...
          </p>
        ) : favouriteProducts.length > 0 ? (
          <div className="home-favourites-grid">
            {favouriteProducts.map((product, index) => (
              <div className="home-favourite-item" key={product.id}>
                <p className="home-favourite-category">
                  {String(index + 1).padStart(2, '0')} /{' '}
                  {categoryNames[product.category_slug] ||
                    product.category_name}
                </p>

                <ProductCard
                  product={product}
                  badgeLabel="TOP PICK"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="home-favourites-empty">
            Our top picks will be here soon.
          </p>
        )}
      </section>
    </main>
  )
}

export default Home
