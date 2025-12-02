// src/components/common/Header.jsx
import ThemeToggle from "./ThemeToggle";

export default function Header({
  activeNav,
  onNavClick,
  theme,
  onToggleTheme,
  onLogoClick,
}) {
  return (
    <header className="cs-header">
      <div
        className="cs-logo"
        onClick={onLogoClick}
        style={{ cursor: "pointer" }}
      >
        <span className="cs-logo-icon">🎬</span>
        <span className="cs-logo-text">CineSphere</span>
      </div>

      <nav className="cs-nav">
        <button
          className={`cs-nav-btn ${
            activeNav === "home" ? "cs-nav-btn-active" : ""
          }`}
          onClick={() => onNavClick("home")}
        >
          Home
        </button>
        <button
          className={`cs-nav-btn ${
            activeNav === "movies" ? "cs-nav-btn-active" : ""
          }`}
          onClick={() => onNavClick("movies")}
        >
          Movies
        </button>
        <button
          className={`cs-nav-btn ${
            activeNav === "series" ? "cs-nav-btn-active" : ""
          }`}
          onClick={() => onNavClick("series")}
        >
          Series
        </button>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </nav>
    </header>
  );
}
