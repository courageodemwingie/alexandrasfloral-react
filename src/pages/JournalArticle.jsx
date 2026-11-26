
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  formatJournalDate,
  getJournalArticle,
  getJournalCategory,
  getJournalImage,
  getReadingTime,
} from '../data/journal.js'

function PortableTextContent({ body = [] }) {
  return (
    <div className="journal-rich-text">
      {body.map((block, index) => {
        if (block._type === 'image') {
          const image = getJournalImage(block, 1200)

          return image ? (
            <figure key={block._key || index}>
              <img
                src={image}
                alt={block.alt || ''}
                loading="lazy"
              />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>
          ) : null
        }

        if (block._type !== 'block') return null

        const children = (block.children || []).map((child, childIndex) => {
          let content = child.text || ''

          const marks = child.marks || []

          marks.forEach(mark => {
            if (mark === 'strong') {
              content = <strong>{content}</strong>
            } else if (mark === 'em') {
              content = <em>{content}</em>
            } else if (mark === 'underline') {
              content = <u>{content}</u>
            } else if (mark === 'code') {
              content = <code>{content}</code>
            } else {
              const link = block.markDefs?.find(
                definition => definition._key === mark
              )

              if (link?.href) {
                content = (
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {content}
                  </a>
                )
              }
            }
          })

          return <span key={child._key || childIndex}>{content}</span>
        })

        const textContent = children.length ? children : null
        const style = block.style || 'normal'

        if (style === 'h2') return <h2 key={block._key || index}>{textContent}</h2>
        if (style === 'h3') return <h3 key={block._key || index}>{textContent}</h3>
        if (style === 'h4') return <h4 key={block._key || index}>{textContent}</h4>
        if (style === 'blockquote') {
          return <blockquote key={block._key || index}>{textContent}</blockquote>
        }

        if (block.listItem === 'bullet') {
          return <ul key={block._key || index}><li>{textContent}</li></ul>
        }

        if (block.listItem === 'number') {
          return <ol key={block._key || index}><li>{textContent}</li></ol>
        }

        return <p key={block._key || index}>{textContent}</p>
      })}
    </div>
  )
}

export default function JournalArticle() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    setArticle(null)

    getJournalArticle(slug)
      .then(data => {
        if (active) setArticle(data || null)
      })
      .catch(() => {
        if (active) setError('We could not load this article.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <main className="journal-page">
        <p className="journal-status">Loading article...</p>
      </main>
    )
  }

  if (error || !article) {
    return (
      <main className="journal-page journal-not-found">
        <div className="journal-container">
          <h1>We couldn't find that story.</h1>
          <Link to="/journal">Return to the Journal</Link>
        </div>
      </main>
    )
  }

  const category = getJournalCategory(article.category)
  const coverImage = getJournalImage(article.coverImage, 1800)

  return (
    <main className="journal-page journal-article-page">
      <header className="journal-reading-header">
        <div className="journal-container">
          <Link to="/journal" className="journal-back-link">
            ← Journal
          </Link>

          {category && (
            <Link
              to={`/journal/category/${category.slug}`}
              className="journal-article-category"
            >
              {category.title}
            </Link>
          )}

          <h1>{article.title}</h1>

          {article.excerpt && (
            <p className="journal-reading-excerpt">{article.excerpt}</p>
          )}

          <div className="journal-reading-meta">
            <span>{article.authorName || "Alexandra's Floral"}</span>
            <span>{formatJournalDate(article.publishedAt)}</span>
            <span>{getReadingTime(article.body)} min read</span>
          </div>
        </div>
      </header>

      {coverImage && (
        <figure className="journal-reading-cover">
          <img
            src={coverImage}
            alt={article.coverImageAlt || article.title}
          />
        </figure>
      )}

      <article className="journal-reading-content">
        <PortableTextContent body={article.body} />
      </article>

      <div className="journal-article-end">
        <Link to="/journal" className="journal-text-link">
          ← Back to the Journal
        </Link>
      </div>
    </main>
  )
}
