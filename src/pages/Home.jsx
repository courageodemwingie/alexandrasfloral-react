
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HeroSlider from '../components/HeroSlider.jsx'
import FloatingWhatsApp from '../components/FloatingWhatsApp.jsx'
import ProductCard from '../components/shop/ProductCard.jsx'
import { getPublicProducts } from '../services/api.js'
import {
  getJournalArticles,
  getJournalImage,
  formatJournalDate,
} from '../data/journal.js'
import '../styles/home.css'
import '../styles/home-journal.css'

import flyer1 from '../assets/flyer.webp'
import flyer2 from '../assets/flyer 2.webp'

import review1 from '../assets/customer review 1.webp'
import review2 from '../assets/customer review 2.webp'
import review3 from '../assets/customer review 3.webp'
import review4 from '../assets/customer review 4.webp'
import review5 from '../assets/customer review 5.webp'

const categoryNames = {
  bouquets: 'BOUQUETS',
  'flower-arrangements': 'FLOWER ARRANGEMENTS',
  gift: 'GIFTS',
  plants: 'PLANTS',
  wreaths: 'WREATHS',
}

function HomePromotion() {
  return (
    <section className="home-promotion" aria-label="Gift promotion">
      <div className="home-promotion-inner">
        <Link
          to="/shop/gift"
          className="home-promotion-flyer"
          aria-label="Shop our gifts collection"
        >
          <img
            src={flyer1}
            alt="Need it today? We have gift items available in Ibadan, Lagos and Abuja."
            loading="lazy"
          />
        </Link>

        <div className="home-promotion-photo">
          <img
            src={flyer2}
            alt="Gift and floral inspiration from Alexandra's Floral"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}

function CustomerLove() {
  return (
    <section
      className="customer-love"
      aria-labelledby="customer-love-heading"
    >
      <div className="customer-love-heading">
        <span className="customer-love-eyebrow">
          A LITTLE LOVE FROM OUR CUSTOMERS
        </span>

        <h2 id="customer-love-heading">
          Some messages are worth keeping.
        </h2>
      </div>

      <div className="customer-love-gallery">
        <img
          className="customer-review-image review-one"
          src={review1}
          alt="Customer sharing a photograph of their flower arrangement"
          loading="lazy"
        />

        <img
          className="customer-review-image review-two"
          src={review2}
          alt="Customer message about their flower order"
          loading="lazy"
        />

        <img
          className="customer-review-image review-three"
          src={review3}
          alt="Customer appreciation message"
          loading="lazy"
        />

        <img
          className="customer-review-image review-four"
          src={review4}
          alt="Customer appreciation message"
          loading="lazy"
        />

        <img
          className="customer-review-image review-five"
          src={review5}
          alt="Customer message about their flowers"
          loading="lazy"
        />
      </div>
    </section>
  )
}

function FeaturedJournal() {
  const [articles, setArticles] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadFeaturedStories() {
      try {
        const data = await getJournalArticles()

        if (!isMounted) return

        const featured = (data || [])
          .filter(article => article.featured)
          .slice(0, 2)

        setArticles(featured)
      } catch (error) {
        console.error('Unable to load featured journal stories:', error)

        if (isMounted) {
          setArticles([])
        }
      }
    }

    loadFeaturedStories()

    return () => {
      isMounted = false
    }
  }, [])

  if (articles.length === 0) return null

  return (
    <section
      className="home-journal"
      aria-labelledby="home-journal-heading"
    >
      <div className="home-journal-container">
        <header className="home-journal-heading">
          <span className="home-journal-eyebrow">
            A LITTLE INSPIRATION
          </span>

          <h2 id="home-journal-heading">
            Featured from the Journal
          </h2>

          <p>
            Stories, ideas and inspiration worth spending a moment with.
          </p>
        </header>

        <div className="home-journal-grid">
          {articles.map(article => {
            const image = getJournalImage(article.coverImage, 900)

            return (
              <article
                className="home-journal-card"
                key={article._id}
              >
                <Link
                  to={`/journal/${article.slug}`}
                  className="home-journal-image"
                  aria-label={`Read ${article.title}`}
                >
                  {image && (
                    <img
                      src={image}
                      alt={article.coverImageAlt || article.title}
                      loading="lazy"
                    />
                  )}
                </Link>

                <div className="home-journal-card-content">
                  <div className="home-journal-meta">
                    <span>
                      {article.category
                        ?.replaceAll('-', ' ')
                        .toUpperCase()}
                    </span>
                    <span>{formatJournalDate(article.publishedAt)}</span>
                  </div>

                  <h3>
                    <Link to={`/journal/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h3>

                  {article.excerpt && (
                    <p>{article.excerpt}</p>
                  )}

                  <Link
                    to={`/journal/${article.slug}`}
                    className="home-journal-read-link"
                  >
                    Read the story <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            )
          })}
        </div>

        <div className="home-journal-footer">
          <Link to="/journal" className="home-journal-all-link">
            Explore the Journal <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
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
          product => product.featured
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

      {/* Featured products */}
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

      {/* Promotional images */}
      <HomePromotion />

        {/* Featured Journal stories */}
      <FeaturedJournal />

      {/* Customer reviews */}
      <CustomerLove />
    

      {/* Floating WhatsApp contact */}
      <FloatingWhatsApp />
    </main>
  )
}

export default Home
