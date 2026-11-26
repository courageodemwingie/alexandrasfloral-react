
import { sanityClient } from '../services/sanity-client.js'
import { createImageUrlBuilder } from '@sanity/image-url'

const imageBuilder = createImageUrlBuilder(sanityClient)

export const journalCategories = [
  {
    title: 'Beyond the Rose',
    slug: 'beyond-the-rose',
    number: '01',
    description:
      'The world of flowers beyond bouquets: floral inspiration, flower meanings, care tips and the beauty of nature.',
  },
  {
    title: 'Floral Musings',
    slug: 'floral-musings',
    number: '02',
    description:
      'Stories, ideas and thoughtful conversations about flowers, gifting, relationships and everyday moments.',
  },
  {
    title: 'Brides of Alexandra',
    slug: 'brides-of-alexandra',
    number: '03',
    description:
      'Wedding flowers, bridal bouquets, wedding inspiration and beautiful floral moments from our brides.',
  },
]

export function getJournalImage(source, width = 1000) {
  if (!source) return ''

  try {
    return imageBuilder
      .image(source)
      .width(width)
      .auto('format')
      .url()
  } catch {
    return ''
  }
}

export function getJournalCategory(slug) {
  return journalCategories.find(category => category.slug === slug)
}

export function formatJournalDate(date) {
  if (!date) return ''

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function getReadingTime(body = []) {
  const words = body
    .filter(block => block?._type === 'block')
    .flatMap(block => block.children || [])
    .map(child => child.text || '')
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.ceil(words / 200))
}

const articleFields = `
  _id,
  title,
  "slug": slug.current,
  coverImage,
  coverImageAlt,
  excerpt,
  category,
  "authorName": author->name,
  "authorPhoto": author->photo,
  "authorBio": author->bio,
  publishedAt,
  featured,
  seoTitle,
  seoDescription,
  body[]{
    ...,
    _type == "image" => {
      ...,
      asset->{
        _id,
        url,
        metadata
      }
    }
  }
`

export async function getJournalArticles() {
  return sanityClient.fetch(`
    *[
      _type == "journalArticle" &&
      defined(slug.current) &&
      defined(publishedAt) &&
      publishedAt <= now()
    ] | order(publishedAt desc) {
      ${articleFields}
    }
  `)
}

export async function getJournalArticle(slug) {
  return sanityClient.fetch(`
    *[
      _type == "journalArticle" &&
      slug.current == $slug &&
      defined(publishedAt) &&
      publishedAt <= now()
    ][0] {
      ${articleFields}
    }
  `, { slug })
}
