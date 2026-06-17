import ThemeToggle from "./ThemeToggle";
import { MdSearch, MdHome, MdMovie, MdTv } from "react-icons/md";

export default function Header({
  activeNav,
  onNavClick,
  theme,
  onToggleTheme,
  onLogoClick,
  onSearchOpen,
}) {
  return (
    <>
      <header className="cs-header">
        <div
          className="cs-logo"
          onClick={onLogoClick}
          style={{ cursor: "pointer", alignItems: "center" }}
        >
          <img
            src="/cinesphere-icon.png"
            alt="CineSphere"
            className="cs-logo-img"
          />
          <span className="cs-logo-text">CineSphere</span>
        </div>

        <nav className="cs-nav">
          <button
            className={`cs-nav-btn ${activeNav === "home" ? "cs-nav-btn-active" : ""}`}
            onClick={() => onNavClick("home")}
          >
            Home
          </button>
          <button
            className={`cs-nav-btn ${activeNav === "movies" ? "cs-nav-btn-active" : ""}`}
            onClick={() => onNavClick("movies")}
          >
            Movies
          </button>
          <button
            className={`cs-nav-btn ${activeNav === "series" ? "cs-nav-btn-active" : ""}`}
            onClick={() => onNavClick("series")}
          >
            Series
          </button>

          {/* Search bar — looks like a real input, acts as a button */}
          <button
            className="cs-nav-search-bar"
            onClick={onSearchOpen}
            aria-label="Search"
          >
            <svg className="cs-nav-search-icon-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="cs-nav-search-placeholder">Search movies, series…</span>
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </nav>
      </header>

      <nav className="cs-mobile-nav">
        <button
          className={`cs-nav-tab ${activeNav === "home" ? "active" : ""}`}
          onClick={() => onNavClick("home")}
          aria-label="Home"
        >
          <MdHome size={22} />
          <span>Home</span>
        </button>
        <button
          className={`cs-nav-tab ${activeNav === "movies" ? "active" : ""}`}
          onClick={() => onNavClick("movies")}
          aria-label="Movies"
        >
          <MdMovie size={22} />
          <span>Movies</span>
        </button>
        <button
          className={`cs-nav-tab ${activeNav === "series" ? "active" : ""}`}
          onClick={() => onNavClick("series")}
          aria-label="Series"
        >
          <MdTv size={22} />
          <span>Series</span>
        </button>
        <button
          className="cs-nav-tab"
          onClick={onSearchOpen}
          aria-label="Search"
        >
          <MdSearch size={22} />
          <span>Search</span>
        </button>
      </nav>
    </>
  );
}
