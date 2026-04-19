import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer>
      <div className="footer-links">
        <Link to="/">Home</Link>
        <Link to="/experience">Experience</Link>
        <Link to="/writing">Writing</Link>
        <Link to="/projects">Projects</Link>
      </div>
      <p className="footer-copyright">Rex Heng</p>
    </footer>
  )
}

export default Footer
