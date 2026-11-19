
import { useState } from 'react'
import './BridalLookbook.css'

const WHATSAPP_NUMBER = '2348133695329'

const bridalBouquets = [
  {
    name: 'Classic Ivory',
    image: '/images/Bridal/classic-ivory.webp',
  },
  {
    name: 'Romantic Red',
    image: '/images/Bridal/romantic-red.webp',
  },
  {
    name: 'Blush Romance',
    image: '/images/Bridal/blush-romance.webp',
  },
  {
    name: 'Calla Lily Elegance',
    image: '/images/Bridal/calla-lily.webp',
  },
]

const weddingFlorals = [
  {
    name: 'Ceremony Florals',
    image: '/images/Bridal/ceremony-florals.webp',
  },
  {
    name: 'Reception Styling',
    image: '/images/Bridal/reception-styling.webp',
  },
  {
    name: 'Bridal Party Florals',
    image: '/images/Bridal/bridal-party.webp',
  },
  {
    name: 'Wedding Essentials',
    image: '/images/Bridal/wedding-essentials.webp',
  },
]

const inspirationImages = [
  '/images/Bridal/inspiration-01.webp',
  '/images/Bridal/inspiration-02.webp',
  '/images/Bridal/inspiration-03.webp',
]

function BridalLookbook() {
  const [selectedImage, setSelectedImage] = useState(null)

  const enquiryMessage = encodeURIComponent(
    "Hello Alexandra's Floral! I'd like to make an enquiry about bridal and wedding flowers."
  )

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${enquiryMessage}`

  return (
    <main className="bridal-lookbook-page">

      {/* HERO SECTION */}
      <section className="bridal-hero">
        <div className="bridal-hero-content">
          <p className="bridal-eyebrow">BRIDAL LOOKBOOK</p>

          <h1>
            Wedding Florals
            <br />
            by Alexandra's
          </h1>

          <p className="bridal-hero-description">
            A curated look at our bridal and wedding floral designs,
            from timeless bouquets to breathtaking venue decor.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bridal-primary-button"
          >
            Enquire for Your Wedding →
          </a>
        </div>

        <div className="bridal-hero-image">
          <img
            src="/images/Bridal/bridal-hero.webp"
            alt="Bride holding a beautiful wedding bouquet"
          />
        </div>
      </section>

      {/* BRIDAL BOUQUETS */}
      <section className="bridal-section">
        <div className="bridal-section-heading">
          <p className="bridal-eyebrow">MADE FOR YOUR MOMENT</p>
          <h2>Bridal Bouquets</h2>
          <p>
            Elegant, handcrafted bouquets for your walk down the aisle.
          </p>
        </div>

        <div className="bridal-bouquet-grid">
          {bridalBouquets.map((bouquet) => (
            <button
              type="button"
              className="bridal-bouquet-card"
              key={bouquet.name}
              onClick={() => setSelectedImage(bouquet)}
            >
              <img src={bouquet.image} alt={bouquet.name} />
              <span>{bouquet.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* WEDDING FLORALS */}
      <section className="bridal-section bridal-wedding-section">
        <div className="bridal-section-heading">
          <p className="bridal-eyebrow">BEYOND THE BOUQUET</p>
          <h2>Wedding Florals</h2>
          <p>
            More than bouquets. We design complete floral experiences
            for your big day.
          </p>
        </div>

        <div className="bridal-wedding-grid">
          {weddingFlorals.map((item) => (
            <button
              type="button"
              className="bridal-wedding-card"
              key={item.name}
              onClick={() => setSelectedImage(item)}
            >
              <img src={item.image} alt={item.name} />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* BRIDAL INSPIRATION */}
      <section className="bridal-section">
        <div className="bridal-section-heading">
          <p className="bridal-eyebrow">A LITTLE INSPIRATION</p>
          <h2>Bridal Inspiration</h2>
          <p>
            Real weddings, signature designs and floral ideas to
            inspire your own celebration.
          </p>
        </div>

        <div className="bridal-inspiration-grid">
          {inspirationImages.map((image, index) => (
            <button
              type="button"
              className="bridal-inspiration-image"
              key={image}
              onClick={() =>
                setSelectedImage({
                  name: `Bridal inspiration ${index + 1}`,
                  image,
                })
              }
            >
              <img
                src={image}
                alt={`Wedding floral inspiration ${index + 1}`}
              />
            </button>
          ))}
        </div>
      </section>

      {/* WEDDING ENQUIRY */}
      <section className="bridal-enquiry">
        <div>
          <p className="bridal-eyebrow">LET'S CREATE SOMETHING BEAUTIFUL</p>
          <h2>Planning a Wedding?</h2>
          <p>
            Let's bring your floral vision to life. Speak with our team
            about your wedding date, theme and floral needs.
          </p>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bridal-enquiry-button"
        >
          Enquire on WhatsApp →
        </a>
      </section>

      {/* IMAGE PREVIEW */}
      {selectedImage && (
        <div
          className="bridal-image-modal"
          onClick={() => setSelectedImage(null)}
          role="presentation"
        >
          <div
            className="bridal-image-modal-content"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedImage.name}
          >
            <button
              type="button"
              className="bridal-modal-close"
              onClick={() => setSelectedImage(null)}
              aria-label="Close image preview"
            >
              ×
            </button>

            <img
              src={selectedImage.image}
              alt={selectedImage.name}
            />

            <p>{selectedImage.name}</p>
          </div>
        </div>
      )}

    </main>
  )
}

export default BridalLookbook
