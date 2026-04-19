import { Link } from 'react-router-dom'
import './Contact.css'

function Contact() {
  return (
    <section className="contact-page">
      <div className="contact-container">
        <h1 className="section-title">Get In Touch</h1>
        <p className="contact-description">
          I am interested in opportunities related to ESG consulting, financial analysis, and policy research. 
          Please feel free to reach out if you would like to discuss potential collaborations or projects.
        </p>
        <div className="contact-links-grid">
          <a href="mailto:rex.heng@lse.ac.uk" className="contact-link-item">
            <span>📧 rex.heng@lse.ac.uk</span>
          </a>
          <a href="https://linkedin.com/in/rexheng" target="_blank" rel="noopener noreferrer" className="contact-link-item">
            <span>💼 LinkedIn</span>
          </a>
          <a href="https://github.com/rexheng" target="_blank" rel="noopener noreferrer" className="contact-link-item">
            <span>💻 GitHub</span>
          </a>
          <a href="https://instagram.com/lse.peter" target="_blank" rel="noopener noreferrer" className="contact-link-item">
            <span>📷 Instagram</span>
          </a>
        </div>
        <div className="cta-buttons">
          <Link to="/" className="btn btn-secondary">Back to Home</Link>
          <Link to="/projects" className="btn btn-primary">View Projects</Link>
        </div>
      </div>
    </section>
  )
}

export default Contact
