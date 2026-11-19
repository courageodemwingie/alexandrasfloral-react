import HeroSlider from '../components/HeroSlider.jsx'
import ProductCard from '../components/shop/ProductCard.jsx'
import { products } from '../data/products.js'
import '../styles/home.css'

const categoryNames = {
  bouquets: 'BOUQUETS',
  'flower-arrangements': 'FLOWER ARRANGEMENTS',
  gift: 'GIFTS',
}

function Home() {
  const favouriteProducts = products.filter((product) => product.featured)

  return (
    <main className="homepage">
      <HeroSlider />

      <section className="home-favourites" aria-label="Top picks">
        {favouriteProducts.length > 0 ? (
          <div className="home-favourites-grid">
            {favouriteProducts.map((product, index) => (
              <div className="home-favourite-item" key={product.id}>
                <p className="home-favourite-category">
                  {String(index + 1).padStart(2, '0')} / {categoryNames[product.category] || product.category}
                </p>
                <ProductCard product={product} badgeLabel="TOP PICK" />
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
