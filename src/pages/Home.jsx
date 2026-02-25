import { useState } from 'react'
import { educationData, workExperienceData, cocurricularData } from '../data/aboutData'
import './Home.css'

function Home() {
  const [activeTab, setActiveTab] = useState('education')

  const getTabData = () => {
    switch (activeTab) {
      case 'education':
        return educationData
      case 'experience':
        return workExperienceData
      case 'cocurricular':
        return cocurricularData
      default:
        return educationData
    }
  }

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content fade-in">
            <h1>Rex Heng</h1>
            <p className="hero-subtitle">Philosophy, Politics and Economics</p>
            <p className="hero-subtitle-secondary">London School of Economics</p>
          </div>
        </div>
      </section>

      {/* About Me Section with Tabs */}
      <section className="about-me">
        <div className="container">
          <h2 className="section-title">About Me</h2>
          
          <div className="tabs-container">
            <div className="tabs-list">
              <button 
                className={`tab-trigger ${activeTab === 'education' ? 'active' : ''}`}
                onClick={() => setActiveTab('education')}
              >
                Education
              </button>
              <button 
                className={`tab-trigger ${activeTab === 'experience' ? 'active' : ''}`}
                onClick={() => setActiveTab('experience')}
              >
                Work Experience
              </button>
              <button 
                className={`tab-trigger ${activeTab === 'cocurricular' ? 'active' : ''}`}
                onClick={() => setActiveTab('cocurricular')}
              >
                Co-Curriculars
              </button>
            </div>

            <div className="tab-content active">
              <div className="about-grid">
                {getTabData().map((item) => (
                  <div key={item.id} className={`about-card ${item.colorClass} fade-in`}>
                    <h3>{item.title}</h3>
                    <p className="card-subtitle">{item.subtitle}</p>
                    {item.details.map((detail, index) => (
                      <p key={index} className="card-detail">{detail}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact" id="contact">
        <div className="contact-container">
          <h2 className="section-title">Contact me</h2>
          <p className="contact-description">
            Feel free to reach out for any questions or opportunities.
          </p>
          <div className="contact-button-wrapper">
            <button className="contact-btn-container">
              <a 
                href="https://www.linkedin.com/in/rexheng/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn2"
              >
                <span className="spn2">LinkedIn</span>
              </a>
            </button>
            <button className="contact-btn-container">
              <a href="mailto:rexheng@gmail.com" className="btn2">
                <span className="spn2">Email</span>
              </a>
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
