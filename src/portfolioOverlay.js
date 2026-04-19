// Collapsible left-anchored portfolio card. All styling lives in ui.js.
// Design: editorial placard — serif-italic name, mono labels, hairline rules.

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

    const eyebrow = document.createElement("div");
    eyebrow.className = "rex-eyebrow";
    eyebrow.textContent = "Portfolio";

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
      a.innerHTML = `<span>${label}</span>`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      linksEl.appendChild(a);
    }

    panel.appendChild(close);
    panel.appendChild(eyebrow);
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
