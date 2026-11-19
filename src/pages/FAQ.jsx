
import './FAQ.css'

function FAQ() {
  return (
    <main className="faq-page">
      <section className="faq-hero">
        <p className="faq-eyebrow">HERE TO HELP</p>
        <h1>Frequently Asked Questions</h1>
        <p>
          Find answers to common questions about our flowers, orders and services.
        </p>
      </section>

      <section className="faq-content">
        <div className="faq-placeholder">
          <span className="faq-placeholder-flower">✿</span>

          <h2>We're putting the details together.</h2>

          <p>
            Our answers are coming soon. In the meantime, please get in touch
            with us if you need help with an order or enquiry.
          </p>

          <a
            href="mailto:info@alexandrasfloral.com"
            className="faq-contact-link"
          >
            Contact us
          </a>
        </div>
      </section>
    </main>
  )
}

export default FAQ
