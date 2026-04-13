// Projects
export const projects = [
  {
    id: 1,
    title: 'Landmark',
    description: 'Agricultural IoT and policy optimisation platform built at Hack London 2026. Low-cost STM32 LoRaWAN sensor nodes transmit soil, water, and climate telemetry into a Next.js dashboard that fuses ground readings with NASA GIBS satellite overlays. Five routes cover overview, a sensor map with GPU-driven Mapbox clustering, satellite intelligence, risk forecasts, and a proof-of-concept Solana-anchored audit trail.',
    tags: ['Next.js', 'Mapbox GL', 'IoT', 'LoRaWAN'],
    link: 'https://the-delta-ten.vercel.app/',
    linkText: 'View Project',
    icon: 'farming',
    github: 'https://github.com/rexheng/landmark-vercel',
    image: '/screenshots/landmark.png'
  },
  {
    id: 2,
    title: 'The Republic',
    description: 'A full-stack research intelligence platform combining an interactive Semantic Scholar knowledge graph with autonomous AI agent debates and truth markets on the Flare Coston2 testnet.',
    tags: ['Next.js', 'AI Swarm', 'Web3', 'React'],
    link: 'https://the-republic-ashy.vercel.app/',
    linkText: 'View Project',
    icon: 'research',
    github: 'https://github.com/rexheng/the-republic',
    image: '/screenshots/the-republic.png'
  },
  {
    id: 3,
    title: 'Bloom AI',
    description: 'An AI-powered companion web application featuring natural language processing and integrated payments.',
    tags: ['Next.js', 'React', 'AI', 'Stripe'],
    link: 'https://bloomai-orpin.vercel.app/',
    linkText: 'View Project',
    icon: 'plant',
    github: 'https://github.com/rexheng/bloomai',
    image: '/screenshots/bloom-ai.png'
  },
  {
    id: 4,
    title: 'Neo-Riemannian Explorer',
    description: 'Interactive music theory visualisation tool featuring two modes: Transformation for chord transformations (P/L/R operations), and Negative Harmony Mode for converting chords using axis reflection.',
    tags: ['React', 'Vite', 'Music Theory', 'Visualisation'],
    link: 'https://neoriemannian.vercel.app/',
    linkText: 'Explore App',
    icon: 'music',
    image: '/screenshots/neoriemannian.png'
  },
  {
    id: 5,
    title: 'Four Letters',
    description: 'Word-search puzzle game with custom game logic and implementation. Features intuitive UI design with multiple input methods including type, swipe, and tap controls for seamless gameplay.',
    tags: ['JavaScript', 'Game Design', 'UI', 'Touch Config'],
    link: 'https://four-letters-two.vercel.app/',
    linkText: 'Play Game',
    icon: 'grid',
    image: '/screenshots/four-letters.png'
  },
  {
    id: 6,
    title: 'Sustainalytics Insights & Scraper',
    description: 'AI-powered prompt engineering solution mapped for analyzing corporate sustainability reports, paired with a Python-based web scraper for extracting ESG data. Systematically extracts key metrics, anomalies, and insights.',
    tags: ['Prompt Engineering', 'Python', 'ESG', 'NLP'],
    link: 'https://docs.google.com/document/d/1e5PgHN8UrYMhesZB3XK-g0LJO-lboEt4aJv-cW73s4Y/edit?usp=sharing',
    linkText: 'Read Docs',
    github: 'https://github.com/rexheng/sustainlyticsscraper/tree/main',
    icon: 'document'
  },
  {
    id: 8,
    title: 'Attic Band',
    description: 'Official promotional website for Attic, an emerging rock band. Features high-fidelity music streaming, upcoming tour dates, interactive media, and band lore.',
    tags: ['Web Design', 'Music', 'Brand Identity'],
    link: 'https://attictheband.com',
    linkText: 'Visit Live Site',
    icon: 'globe',
    image: '/screenshots/attic-band.png'
  },
  {
    id: 9,
    title: 'Rex Tech Consult',
    description: 'High-conversion technology consulting portfolio proof of concept designed for a modern tech consulting startup, focusing on performance optimization and scalable architecture.',
    tags: ['Consulting', 'Tech', 'Next.js', 'Enterprise'],
    link: 'https://rextechconsult.vercel.app/',
    linkText: 'Enter Portal',
    icon: 'globe',
    image: '/screenshots/rex-tech.png'
  },
  {
    id: 10,
    title: 'Amogus',
    description: 'Among Us-themed AI deliberation council. Four agents with distinct archetypes debate planning prompts through isolated rounds, producing refined PRDs. MCP server for Cursor and Claude Code. 2nd place at Cursor Hack London 2026.',
    tags: ['TypeScript', 'MCP', 'Anthropic API', 'Next.js', 'WebSocket'],
    link: 'https://github.com/rexheng/amogus',
    linkText: 'View on GitHub',
    icon: 'grid',
    github: 'https://github.com/rexheng/amogus'
  },
  {
    id: 11,
    title: 'Olympic Way Interchange',
    description: 'Data-driven proposal for a new London Underground station at Wembley Stadium, built over 72 hours for the LSESU x Susquehanna Datathon 2026 (1st place). Composite station need score across all 4,994 London LSOAs, graph-theoretic network efficiency modelling on 358 Tube nodes, and historical validation via Elizabeth Line and Northern Line Extension natural experiments. Monte Carlo sensitivity across 10,000 weight perturbations held the recommendation.',
    tags: ['Python', 'GeoPandas', 'NetworkX', 'Mapbox', 'Geospatial'],
    link: 'https://tfl-lsoa-visual.vercel.app',
    linkText: 'Explore LSOA Map',
    icon: 'research',
    github: 'https://github.com/rexheng/london_lsoa_map',
    image: '/screenshots/olympic-way-interchange.png'
  },
  {
    id: 12,
    title: 'Peel',
    description: 'Tokenised food-waste marketplace on Hedera. AI agents autonomously negotiate surplus inventory trades between restaurants via HCS, with settlements on HTS.',
    tags: ['TypeScript', 'Hedera', 'LangChain', 'AI Agents'],
    link: 'https://peel-market.vercel.app',
    linkText: 'View Live',
    icon: 'plant',
    github: 'https://github.com/rexheng/peel-market',
    image: '/screenshots/peel.png'
  }
]

export const technicalProjects = projects.filter((project) => project.icon !== 'globe')
export const websiteProjects = projects.filter((project) => project.icon === 'globe')

// Instagram Network
export const instagramAccounts = [
  { id: 1, name: 'LSE Peter', handle: '@lse.peter', link: 'https://www.instagram.com/lse.peter' },
  { id: 2, name: 'NUS Peter', handle: '@nus.peter', link: 'https://www.instagram.com/nus.peter' },
  { id: 3, name: 'Govt Peter', handle: '@govt.peter', link: 'https://www.instagram.com/govt.peter' },
  { id: 4, name: 'Econ Peter', handle: '@econ.peter', link: 'https://www.instagram.com/econ.peter' },
  { id: 5, name: 'Literature Peter', handle: '@literature.peter', link: 'https://www.instagram.com/literature.peter' },
  { id: 6, name: 'Lawsuit Peter', handle: '@lawsuit.peter', link: 'https://www.instagram.com/lawsuit.peter' }
]
