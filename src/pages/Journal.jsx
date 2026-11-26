
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import JournalArticleCard from '../components/journal/JournalArticleCard.jsx'
import {
  getJournalArticles,
  getJournalImage,
  journalCategories,
} from '../data/journal.js'
import '../styles/journal.css'

export default function Journal() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getJournalArticles()
      .then(data => {
        if (active) setArticles(data || [])
      })
      .catch(() => {
        if (active) setError('We could not load the journal at the moment.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const heroImage = getJournalImage(articles[0]?.coverImage, 1800)

  return (
    <main className="journal-page">
      <section
        className="journal-hero"
        style={
          heroImage
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(247,242,239,.96) 0%, rgba(247,242,239,.82) 38%, rgba(247,242,239,.05) 78%), url("${heroImage}")`,
              }
            : undefined
        }
      >
        <div className="journal-container journal-hero-inner">
          <span className="journal-eyebrow">The Journal</span>
          <h1>Stories, inspiration and thoughtful ideas from the world of flowers.</h1>
        </div>
      </section>

      <section className="journal-categories-section">
        <div className="journal-container">
          <header className="journal-section-heading">
            <span className="journal-eyebrow">Explore the Journal</span>
            <h2>Our Categories</h2>
            <p>
              Three editorial collections, each with a unique take on
              flowers, life and meaningful moments.
            </p>
          </header>

          <div className="journal-category-grid">
            {journalCategories.map(category => {
              const categoryArticle = articles.find(
                article => article.category === category.slug
              )
              const image = getJournalImage(
                categoryArticle?.coverImage,
                900
              )

              return (
                <Link
                  to={`/journal/category/${category.slug}`}
                  className="journal-category-card"
                  key={category.slug}
                >
                  <div className="journal-category-image">
                    {image ? (
                      <img src={image} alt="" loading="lazy" />
                    ) : (
                      <div className="journal-image-placeholder" />
                    )}
                  </div>

                  <div className="journal-category-content">
                    <span className="journal-category-number">
                      {category.number}
                      <span />
                    </span>

                    <h3>{category.title}</h3>
                    <p>{category.description}</p>

                    <span className="journal-category-link">
                      Explore stories <span aria-hidden="true">→</span>
                    </span>

                    <span
                      className="journal-botanical-detail"
                      aria-hidden="true"
                    >
                      ✳
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="journal-latest-section">
        <div className="journal-container">
          <div className="journal-latest-heading">
            <div>
              <span className="journal-eyebrow">Latest Articles</span>
              <h2>From Our Journal</h2>
            </div>
            <span className="journal-latest-note">
              Discover something new
            </span>
          </div>

          {loading && (
            <p className="journal-status">Loading articles...</p>
          )}

          {error && (
            <p className="journal-status journal-error">{error}</p>
          )}

          {!loading && !error && articles.length > 0 && (
            <div className="journal-articles-grid">
              {articles.slice(0, 6).map(article => (
                <JournalArticleCard
                  article={article}
                  key={article._id}
                />
              ))}
            </div>
          )}

          {!loading && !error && articles.length === 0 && (
            <p className="journal-status">
              New stories are on their way. Please check back soon.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
