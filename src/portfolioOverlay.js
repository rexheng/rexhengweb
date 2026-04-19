// Collapsible left-anchored portfolio overlay.
// Default state: collapsed to a ~44px circular icon.
// Expanded: shows name, tagline, and contact links.

const STYLE = `
#rex-portfolio-overlay {
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 15;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  color: #e8ecf5;
  user-select: none;
}
#rex-portfolio-overlay .rex-toggle {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: rgba(13, 18, 32, 0.88);
  border: 1px solid rgba(180, 210, 255, 0.25);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #e8ecf5;
  transition: background 180ms ease, border-color 180ms ease;
}
#rex-portfolio-overlay .rex-toggle:hover {
  background: rgba(22, 32, 56, 0.92);
  border-color: rgba(200, 220, 255, 0.45);
}
#rex-portfolio-overlay .rex-panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 270px;
  background: rgba(13, 18, 32, 0.92);
  border: 1px solid rgba(180, 210, 255, 0.25);
  border-radius: 14px;
  padding: 16px 18px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-8px);
  transition: opacity 220ms ease, transform 220ms ease;
}
#rex-portfolio-overlay.expanded .rex-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}
#rex-portfolio-overlay.expanded .rex-toggle {
  opacity: 0;
  pointer-events: none;
}
#rex-portfolio-overlay .rex-close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 22px;
  height: 22px;
  line-height: 20px;
  text-align: center;
  border-radius: 11px;
  cursor: pointer;
  color: #a0aac0;
  font-size: 14px;
  transition: background 140ms ease, color 140ms ease;
}
#rex-portfolio-overlay .rex-close:hover {
  background: rgba(80, 100, 140, 0.35);
  color: #fff;
}
#rex-portfolio-overlay .rex-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin: 0 0 6px;
  color: #ffe8c2;
}
#rex-portfolio-overlay .rex-tagline {
  font-size: 11.5px;
  line-height: 1.45;
  color: #bac3d6;
  margin: 0 0 12px;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
}
#rex-portfolio-overlay .rex-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
#rex-portfolio-overlay .rex-links a {
  flex: 1 1 auto;
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(42, 53, 96, 0.55);
  color: #cfd6e8;
  text-decoration: none;
  border: 1px solid rgba(140, 165, 220, 0.25);
  transition: background 140ms ease, color 140ms ease;
}
#rex-portfolio-overlay .rex-links a:hover {
  background: rgba(60, 80, 140, 0.75);
  color: #fff;
}
`;

export class PortfolioOverlay {
  constructor({ name, tagline, links, initials } = {}) {
    this.name = name ?? "Rex Heng";
    this.tagline = tagline ?? "";
    this.links = links ?? [];
    this.initials = initials ?? this._deriveInitials(this.name);
    this.expanded = false;
    this._install();
  }

  _deriveInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "R";
  }

  _install() {
    if (!document.getElementById("rex-portfolio-overlay-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "rex-portfolio-overlay-style";
      styleEl.textContent = STYLE;
      document.head.appendChild(styleEl);
    }

    const root = document.createElement("div");
    root.id = "rex-portfolio-overlay";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "rex-toggle";
    toggle.setAttribute("aria-label", "Open portfolio info");
    toggle.textContent = this.initials;
    toggle.addEventListener("click", () => this.setExpanded(true));

    const panel = document.createElement("div");
    panel.className = "rex-panel";

    const close = document.createElement("div");
    close.className = "rex-close";
    close.textContent = "×";
    close.setAttribute("role", "button");
    close.setAttribute("aria-label", "Close portfolio info");
    close.addEventListener("click", () => this.setExpanded(false));

    const nameEl = document.createElement("h2");
    nameEl.className = "rex-name";
    nameEl.textContent = this.name;

    const taglineEl = document.createElement("p");
    taglineEl.className = "rex-tagline";
    taglineEl.textContent = this.tagline;

    const linksEl = document.createElement("div");
    linksEl.className = "rex-links";
    for (const { label, href } of this.links) {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      linksEl.appendChild(a);
    }

    panel.appendChild(close);
    panel.appendChild(nameEl);
    if (this.tagline) panel.appendChild(taglineEl);
    if (this.links.length) panel.appendChild(linksEl);

    root.appendChild(toggle);
    root.appendChild(panel);
    document.body.appendChild(root);

    this._root = root;
    this._toggle = toggle;
    this._panel = panel;
  }

  setExpanded(v) {
    this.expanded = !!v;
    this._root.classList.toggle("expanded", this.expanded);
  }
}
