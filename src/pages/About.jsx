
import '../styles/about.css'

const floralImages = {
  hero: 'https://images.unsplash.com/photo-1523693916903-027d144a2b7d?auto=format&fit=crop&w=1200&q=85',

  bouquet:
    'https://static1.squarespace.com/static/65a98c8827344649d8046b2f/65b853f2444ba3568c2cb87e/65b85690444ba3568c2d4209/1706579600945/Ubloom_044-600W.jpg?format=original',

  arrangement:
    'https://www.flowersforeveryone.com.au/cdn/shop/files/N103949_FFE_Dural_Location_010_2048x.jpg?v=1763077911',

  colourful:
    'https://images.unsplash.com/photo-1677768062220-32f1658715c4?auto=format&fit=crop&w=1000&q=85',
}

function About() {
  return (
    <main className="about-page">

      {/* HERO SECTION */}
      <section className="about-hero">
        <div className="about-hero-copy">
          <span className="about-eyebrow">
            WHY WE EXIST
          </span>

          <h1>
            Flowers should feel like part of life.
          </h1>

          <p>
            We believe flowers should be more than something
            you give on special occasions. They can be a simple
            way to show someone you care, brighten an ordinary
            day or make a meaningful moment even more memorable.
          </p>

          <a href="/shop" className="about-text-link">
            EXPLORE OUR COLLECTION <span>↗</span>
          </a>
        </div>

        <div className="about-hero-image">
          <img
            src={floralImages.hero}
            alt="A beautiful arrangement of pink and white roses"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />

          <span className="about-image-caption">
            A little beauty, for every day.
          </span>
        </div>
      </section>

      {/* OUR BELIEF */}
      <section className="about-belief">
        <div className="about-belief-copy">
          <span className="about-eyebrow">
            FOR EVERY MOMENT
          </span>

          <h2>
            Not every bouquet needs a big occasion.
          </h2>

          <p>
            Sometimes, the most memorable gestures are the
            unexpected ones. A birthday, a celebration, a
            thank-you, an apology, or simply three words:
          </p>

          <blockquote>
            “I saw this and thought of you.”
          </blockquote>
        </div>

        <div className="about-belief-image">
          <img
            src={floralImages.bouquet}
            alt="A colourful pink and lilac floral bouquet"
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      {/* OUR APPROACH */}
      <section className="about-approach">
        <div className="about-approach-heading">
          <span className="about-eyebrow">
            A LITTLE THOUGHT GOES A LONG WAY
          </span>

          <h2>
            Beautifully considered. Thoughtfully arranged.
          </h2>

          <p>
            We believe that the beauty of flowers lies in the
            details. From the colours and textures to the
            finishing touches, every arrangement is an
            opportunity to make someone feel remembered.
          </p>
        </div>

        <div className="about-image-gallery">
          <figure className="about-gallery-large">
            <img
              src={floralImages.arrangement}
              alt="An elegant arrangement of fresh flowers"
              loading="lazy"
              decoding="async"
            />

            <figcaption>
              Beauty in every detail.
            </figcaption>
          </figure>

          <figure className="about-gallery-small">
            <img
              src={floralImages.colourful}
              alt="A soft pink and white floral bouquet"
              loading="lazy"
              decoding="async"
            />

            <figcaption>
              Flowers for every expression.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* OUR PROMISE */}
      <section className="about-promise">
        <span className="about-eyebrow">
          THE ALEXANDRA'S FLORAL EXPERIENCE
        </span>

        <h2>
          Beautiful flowers shouldn't feel out of reach.
        </h2>

        <p>
          Whether you're choosing a bouquet for someone special,
          adding life to your space or marking a moment worth
          remembering, we're here to help you find something
          beautiful.
        </p>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="about-cta">
        <div>
          <span className="about-eyebrow">
            SOMETHING BEAUTIFUL AWAITS
          </span>

          <h2>
            There's always a reason to send flowers.
          </h2>
        </div>

        <a href="/shop" className="about-cta-button">
          FIND YOUR FLOWERS <span>↗</span>
        </a>
      </section>

    </main>
  )
}

export default About
