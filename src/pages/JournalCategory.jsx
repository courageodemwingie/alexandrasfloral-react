
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import JournalArticleCard from '../components/journal/JournalArticleCard.jsx'
import {
  getJournalArticles,
  getJournalCategory,
  getJournalImage,
} from '../data/journal.js'

export default function JournalCategory() {
  const { categorySlug } = useParams()
  const category = getJournalCategory(categorySlug)

  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    getJournalArticles()
      .then(data => {
        if (active) {
          setArticles(
            (data || []).filter(
              article => article.category === categorySlug
            )
          )
        }
      })
      .catch(() => {
        if (active) setError('We could not load these stories.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [categorySlug])

  if (!category) {
    return (
      <main className="journal-page journal-not-found">
        <div className="journal-container">
          <h1>Category not found</h1>
          <Link to="/journal">Return to the Journal</Link>
        </div>
      </main>
    )
  }

  const heroImage = getJournalImage(articles[0]?.coverImage, 1600)

  return (
    <main className="journal-page">
      <section
        className="journal-category-hero"
        style={
          heroImage
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(247,242,239,.96), rgba(247,242,239,.68) 55%, rgba(247,242,239,.08)), url("${heroImage}")`,
              }
            : undefined
        }
      >
        <div className="journal-container">
          <Link to="/journal" className="journal-back-link">
            ← Back to Journal
          </Link>
          <span className="journal-eyebrow">
            Collection {category.number}
          </span>
          <h1>{category.title}</h1>
          <p>{category.description}</p>
        </div>
      </section>

      <section className="journal-category-articles">
        <div className="journal-container">
          <div className="journal-latest-heading">
            <div>
              <span className="journal-eyebrow">Explore the collection</span>
              <h2>Stories and inspiration</h2>
            </div>
            <span className="journal-latest-note">
              {articles.length} {articles.length === 1 ? 'story' : 'stories'}
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
              {articles.map(article => (
                <JournalArticleCard
                  article={article}
                  key={article._id}
                />
              ))}
            </div>
          )}

          {!loading && !error && articles.length === 0 && (
            <div className="journal-empty">
              <h2>Stories are coming soon.</h2>
              <p>
                We're preparing more from {category.title}.
                Please check back soon.
              </p>
              <Link to="/journal" className="journal-text-link">
                Explore other categories →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
