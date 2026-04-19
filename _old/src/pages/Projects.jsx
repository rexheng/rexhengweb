import { useState } from 'react'
import { projects, instagramAccounts } from '../data/projectsData'
import './Projects.css'

function ProjectIcon({ type }) {
  switch (type) {
    case 'music':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
      )
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    case 'github':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
      )
    case 'document':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    case 'globe':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      )
    case 'farming':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20h10"></path>
          <path d="M10 20c5.5-5.5 2.5-12 2.5-12S19 12 14 15"></path>
          <path d="M14 20c-5.5-5.5-2.5-12-2.5-12S5 12 10 15"></path>
        </svg>
      )
    case 'research':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H15"></path>
          <path d="M10 3V11L4 21H20L14 11V3"></path>
          <path d="M10 15H14"></path>
        </svg>
      )
    case 'plant':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 4 13V4l7 7 7-7v9a7 7 0 0 1-7 7z"></path>
          <path d="M11 20V12"></path>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      )
  }
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  )
}

function ProjectCard({ project }) {
  return (
    <div className="project-card">
      {project.image && (
        <a 
          href={project.link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="project-image-wrapper"
        >
          <img src={project.image} alt={project.title} className="project-image" loading="lazy" />
        </a>
      )}
      <div className="project-header">
        <div className="project-icon">
          <ProjectIcon type={project.icon} />
        </div>
        <div className="project-content">
          <h3 className="project-title">{project.title}</h3>
          <p className="project-description">{project.description}</p>
          <div className="project-tags">
            {project.tags.map((tag, index) => (
              <span key={index} className="project-tag">{tag}</span>
            ))}
          </div>
          <div className="project-links">
            <a 
              href={project.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="project-link"
            >
              {project.linkText}
              <ExternalLinkIcon />
            </a>
            {project.github && (
              <a 
                href={project.github} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="project-link github-link"
              >
                View Source
                <ProjectIcon type="github" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InstagramCard({ account }) {
  return (
    <div className="project-card">
      <div className="instagram-card">
        <div className="instagram-icon">
          <div className="instagram-icon-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </div>
        </div>
        <div className="instagram-info">
          <div className="instagram-name">{account.name}</div>
          <div className="instagram-handle">{account.handle}</div>
        </div>
      </div>
      <a 
        href={account.link} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="project-link"
      >
        Visit Profile
        <ExternalLinkIcon />
      </a>
    </div>
  )
}

function Projects() {
  const [activeTab, setActiveTab] = useState('projects')

  return (
    <main className="projects-main">
      <div className="section-header">
        <h1>Projects</h1>
        <p>
          A collection of my work on fun coding projects, technology, educational content creation, 
          web development, and creative pursuits.
        </p>
      </div>

      <div className="tabs-container">
        <div className="tabs-list" role="tablist">
          <button 
            className={`tab-trigger ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
            role="tab"
            aria-selected={activeTab === 'projects'}
          >
            Digital Projects
          </button>
          <button 
            className={`tab-trigger ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
            role="tab"
            aria-selected={activeTab === 'content'}
          >
            Content Creation
          </button>
        </div>

        {/* Digital Projects Tab */}
        <div 
          className={`tab-content ${activeTab === 'projects' ? 'active' : ''}`} 
          role="tabpanel"
        >
          <div className="projects-grid two-col">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>

        {/* Content Creation Tab */}
        <div 
          className={`tab-content ${activeTab === 'content' ? 'active' : ''}`} 
          role="tabpanel"
        >
          <div className="tab-section-intro">
            <h3>Peter Instagram Network</h3>
            <p>
              Educational content series across multiple Instagram accounts, creating engaging 
              learning resources for students in various disciplines.
            </p>
          </div>
          <div className="projects-grid three-col">
            {instagramAccounts.map((account) => (
              <InstagramCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Projects

