import { useState, useRef, useEffect } from 'react'
import { hobbiesData } from '../data/experienceData'
import './Experience.css'

function ImageGallery({ images, hobbyId }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const wrapperRef = useRef(null)

  const slideCount = images?.length || 0

  const goToSlide = (index) => {
    setCurrentIndex(index)
    setTranslateX(0)
  }

  const nextSlide = () => {
    if (currentIndex < slideCount - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.clientX || e.touches?.[0]?.clientX || 0)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const currentX = e.clientX || e.touches?.[0]?.clientX || 0
    setTranslateX(currentX - startX)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    if (translateX < -50 && currentIndex < slideCount - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (translateX > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
    setTranslateX(0)
  }

  if (!images || images.length === 0) {
    return (
      <div className="gallery-column no-images">
        <div className="gallery-placeholder"></div>
      </div>
    )
  }

  return (
    <div className="gallery-column" data-slides={slideCount}>
      {slideCount > 1 && (
        <>
          <button className="gallery-arrow gallery-arrow-left" onClick={prevSlide}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button className="gallery-arrow gallery-arrow-right" onClick={nextSlide}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </>
      )}
      <div 
        className="gallery-wrapper"
        ref={wrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? translateX : 0}px))`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {images.map((image, index) => (
          <div key={index} className="gallery-slide">
            <img src={image.src} alt={image.alt} draggable="false" />
          </div>
        ))}
      </div>
      <div className="gallery-nav">
        {images.map((_, index) => (
          <span 
            key={index}
            className={`gallery-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          ></span>
        ))}
      </div>
    </div>
  )
}

function ProgressBar({ label, percentage }) {
  return (
    <div className="progress-item">
      <div className="progress-label">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  )
}

function TimelineItem({ hobby }) {
  return (
    <div className="timeline-item fade-in">
      <div className="timeline-dot"></div>
      <div className="timeline-content">
        {hobby.hasGradientBackground ? (
          <div className="gallery-column gradient-bg">
            <div className="gallery-placeholder"></div>
          </div>
        ) : (
          <ImageGallery images={hobby.images} hobbyId={hobby.id} />
        )}
        <div className="text-column">
          <h2 className="activity-title">{hobby.title}</h2>
          <p className="activity-subtitle">{hobby.subtitle}</p>
          <p className="activity-description">{hobby.description}</p>
          {hobby.progress && (
            <div className="progress-section">
              {hobby.progress.map((item, index) => (
                <ProgressBar key={index} label={item.label} percentage={item.percentage} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Experience() {
  return (
    <section className="timeline-section">
      <div className="timeline-header fade-in">
        <h1>My Hobbies</h1>
        <p>When I'm not immersed in my work, you'll find me pursuing these!</p>
      </div>

      <div className="timeline-container">
        <div className="timeline-line"></div>
        {hobbiesData.map((hobby) => (
          <TimelineItem key={hobby.id} hobby={hobby} />
        ))}
      </div>
    </section>
  )
}

export default Experience
