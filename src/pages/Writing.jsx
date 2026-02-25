import { articlesData } from '../data/writingData'
import './Writing.css'

function ArticleCard({ article }) {
  return (
    <article className="article-card fade-in">
      <img 
        src={article.image} 
        alt={article.imageAlt} 
        className="article-image"
      />
      <div className="article-content">
        <div className="article-meta">
          <span className="article-category">{article.category}</span>
          <span className="article-date">📅 {article.date}</span>
        </div>
        <h2 className="article-title">
          <a href={article.link} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
        </h2>
        <p className="article-excerpt">{article.excerpt}</p>
        <div className="article-tags">
          {article.tags.map((tag, index) => (
            <span key={index} className="article-tag">{tag}</span>
          ))}
        </div>
        <div className="article-footer">
          <span className="article-source">{article.source}</span>
          <a 
            href={article.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="read-more"
          >
            Read Full Article
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </div>
    </article>
  )
}

function Writing() {
  return (
    <section className="writing-section">
      <div className="writing-header fade-in">
        <h1>Writing</h1>
        <p>
          Essays and reflections on policy, technology, social impact, and lived experiences 
          from internships and research programs.
        </p>
      </div>

      <div className="articles-grid">
        {articlesData.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  )
}

export default Writing
