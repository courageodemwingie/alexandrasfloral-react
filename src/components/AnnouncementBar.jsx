
import announcements from '../data/announcements.js'
import './AnnouncementBar.css'

function AnnouncementBar() {
  if (announcements.length === 0) {
    return null
  }

  const hasMultipleAnnouncements = announcements.length > 1

  // Duplicate the announcements to create a seamless loop.
  const tickerAnnouncements = [
    ...announcements,
    ...announcements,
  ]

  return (
    <div
      className="announcement-bar"
      aria-label="Website announcements"
    >
      <div className="announcement-viewport">
        <div
          className="announcement-track"
          style={{
            animation: hasMultipleAnnouncements
              ? `announcement-scroll ${announcements.length * 12}s linear infinite`
              : 'none',
          }}
        >
          {tickerAnnouncements.map((announcement, index) => (
            <div
              className="announcement-slide"
              key={`${announcement.id}-${index}`}
              aria-hidden={index >= announcements.length}
            >
              {announcement.image && (
                <img
                  className="announcement-image"
                  src={announcement.image}
                  alt={announcement.imageAlt || ''}
                />
              )}

              <span className="announcement-message">
                {announcement.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnnouncementBar
