
import { useEffect, useState } from 'react'
import './HeroSlider.css'

import floralImage from '../assets/hero/large-floral-arrangement.webp'
import bridalImage from '../assets/hero/bridal-floral-arrangement.webp'
import plantsImage from '../assets/hero/decorative-floral-arrangement.webp'

const slides = [
  {
    id: 1,
    category: 'FLORAL ARRANGEMENTS',
    title: 'Make an Impression.',
    description:
      'Flowers for birthdays, milestones, special occasions, and everything in between.',
    image: floralImage,
    alt: 'Beautiful large floral arrangement',
  },
  {
    id: 2,
    category: 'BRIDAL BOUQUETS',
    title: 'For the day you imagined.',
    description:
      'Elegant floral arrangements created to complement your bridal dress.',
    image: bridalImage,
    alt: 'Elegant bridal floral arrangement',
  },
  {
    id: 3,
    category: 'PLANTS',
    title: 'Bring nature indoors.',
    description:
      'Plants and landscape arrangements that add life and character to your space.',
    image: plantsImage,
    alt: 'Decorative plants and floral arrangement',
  },
]

function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((previousSlide) => (
        (previousSlide + 1) % slides.length
      ))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  const goToPrevious = () => {
    setCurrentSlide((previousSlide) =>
      (previousSlide - 1 + slides.length) % slides.length
    )
  }

  const goToNext = () => {
    setCurrentSlide((previousSlide) =>
      (previousSlide + 1) % slides.length
    )
  }

  return (
    <section className="hero-slider" aria-label="Featured floral collections">
      <div className="hero-slides">
        {slides.map((slide, index) => (
          <article
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            key={slide.id}
            aria-hidden={index !== currentSlide}
          >
            <img
              className="hero-background"
              src={slide.image}
              alt={slide.alt}
            />

            <div className="hero-overlay" />

            <div className="hero-content">
              <span className="hero-category">{slide.category}</span>

              <h1>{slide.title}</h1>

              <p>{slide.description}</p>

              <div className="hero-actions">
                <a href="/contact" className="hero-button hero-button-primary">
                  Order Now
                </a>

                <a href="/shop" className="hero-button hero-button-secondary">
                  Explore
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      
<div className="hero-controls">
  <div className="hero-indicators">
    {slides.map((slide, index) => (
      <button
        key={slide.id}
        type="button"
        className={`hero-indicator ${index === currentSlide ? 'active' : ''}`}
        onClick={() => goToSlide(index)}
        aria-label={`Go to slide ${index + 1}`}
        aria-current={index === currentSlide ? 'true' : undefined}
      />
    ))}
  </div>
</div>

    </section>
  )
}

export default HeroSlider
