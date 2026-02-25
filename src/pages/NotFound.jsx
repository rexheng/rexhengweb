import { Link } from 'react-router-dom'
import './NotFound.css'

function AxolotlLoader() {
  return (
    <div className="axolotlloader">
      <div className="axolotl">
        <div className="axolhead">
          <div className="axolgill"></div>
          <div className="axolgill"></div>
          <div className="axolgill"></div>
          <div className="axolgill"></div>
          <div className="axolgill"></div>
          <div className="axolgill"></div>
          <div className="axoleye"></div>
          <div className="axoleye"></div>
        </div>
        <div className="axolleg front-left"></div>
        <div className="axolleg front-right"></div>
        <div className="axolleg back-left"></div>
        <div className="axolleg back-right"></div>
        <div className="axolbody"></div>
        <div className="axoltail"></div>
      </div>
      <div className="loader">
        <div className="loaderline"></div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="error-page">
      <div className="error-container">
        <AxolotlLoader />
        <h1 className="error-code">404</h1>
        <p className="error-message">Page Not Found</p>
        <p className="error-description">
          Oops! Rex doesn't have this page but here's an axolotl.
        </p>
        <Link to="/" className="home-button">Go Home</Link>
      </div>
    </div>
  )
}

export default NotFound
