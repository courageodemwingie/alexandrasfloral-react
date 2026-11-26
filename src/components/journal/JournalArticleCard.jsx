
import { Link } from 'react-router-dom'
import {
  formatJournalDate,
  getJournalCategory,
  getJournalImage,
  getReadingTime,
} from '../../data/journal.js'

export default function JournalArticleCard({ article }) {
  const category = getJournalCategory(article.category)
  const image = getJournalImage(article.coverImage, 800)

  return (
    <article className="journal-article-card">
      <Link
        to={`/journal/${article.slug}`}
        className="journal-article-image-link"
        aria-label={`Read ${article.title}`}
      >
        {image ? (
          <img
            src={image}
            alt={article.coverImageAlt || article.title}
            loading="lazy"
          />
        ) : (
          <div className="journal-image-placeholder" />
        )}
      </Link>

      <div className="journal-article-card-content">
        {category && (
          <Link
            to={`/journal/category/${category.slug}`}
            className="journal-article-category"
          >
            {category.title}
          </Link>
        )}

        <h3>
          <Link to={`/journal/${article.slug}`}>
            {article.title}
          </Link>
        </h3>

        {article.excerpt && <p>{article.excerpt}</p>}

        <div className="journal-article-meta">
          <span>{formatJournalDate(article.publishedAt)}</span>
          <span>{getReadingTime(article.body)} min read</span>
        </div>
      </div>
    </article>
  )
}
