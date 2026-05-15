// Left-anchored RH switch button. Persists across the playground and CV views
// and toggles between them. Styling lives in ui.js (.rex-toggle).

export class PortfolioOverlay {
  constructor({ name, initials } = {}) {
    this.name = name ?? "Rex Heng";
    this.initials = initials ?? this._deriveInitials(this.name);
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

    const toggle = document.createElement("a");
    toggle.className = "rex-toggle";
    toggle.href = "/cv/";
    toggle.setAttribute("aria-label", "Open CV");
    toggle.textContent = this.initials;

    root.appendChild(toggle);
    document.body.appendChild(root);

    this._root = root;
    this._toggle = toggle;
  }
}
