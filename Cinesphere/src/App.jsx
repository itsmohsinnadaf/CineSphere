// src/App.jsx
import { useEffect, useState } from "react";
import "./styles/base.css";

import { useLibrary } from "./hooks/useLibrary";

import Header from "./components/common/Header";
import Footer from "./components/common/Footer";

import RootFolders from "./components/folders/RootFolders";
import MovieGenres from "./components/folders/MovieGenres";
import SeriesList from "./components/folders/SeriesList";
import Seasons from "./components/folders/Seasons";

import MovieCard from "./components/cards/MovieCard";
import EpisodeCard from "./components/cards/EpisodeCard";
import VideoPlayer from "./components/player/VideoPlayer";

function App() {
  const {
    view,
    activeNav,
    loading,
    error,
    rootFolders,
    movieGenres,
    movieTitles,
    selectedMovieRoot,
    selectedGenre,
    selectedMovie,
    seriesFolders,
    seasonFolders,
    episodes,
    selectedSeriesRoot,
    selectedSeries,
    selectedSeason,
    selectedEpisode,
    loadRootFolders,
    handleRootCardClick,
    handleNavClick,
    openMovieGenre,
    openSeriesFolder,
    openSeason,
    handleMovieClick,
    handleEpisodeClick,
    backFromMoviePlayer,
    backFromEpisodePlayer,
    resetAll,
  } = useLibrary();

  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    loadRootFolders();
  }, []);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const renderContent = () => {
    // ROOT – Movies / Series cards
    if (view === "root") {
      return (
        <RootFolders
          folders={rootFolders}
          loading={loading}
          error={error}
          onRootClick={handleRootCardClick}
        />
      );
    }

    // Movies – category list (Bollywood / Hollywood / Tollywood)
    if (view === "moviesGenres" && selectedMovieRoot) {
      return (
        <MovieGenres
          rootTitle={selectedMovieRoot.title}
          genres={movieGenres}
          onGenreClick={openMovieGenre}
        />
      );
    }

    // Movies – grid of movie cards (Image 1 style)
    if (view === "moviesTitles" && selectedGenre) {
      return (
        <section className="cs-left">
          <h2 className="cs-section-title" style={{ textAlign: "center" }}>
            {selectedGenre.title}{" "}
            <span className="cs-section-subtitle">Movies</span>
          </h2>
          <div className="cs-item-grid cs-centered-row">
            {movieTitles.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                active={false}
                onClick={() => handleMovieClick(m)}
              />
            ))}
          </div>
        </section>
      );
    }

    // Movie player page (Image 2 & Image 3)
    if (view === "moviePlayer" && selectedMovie && selectedGenre) {
      const meta = "Movie";
      const sub = `Category: ${selectedGenre.title} · Movies`;

      return (
        <VideoPlayer
          video={selectedMovie}
          metaLine={meta}
          subLine={sub}
          onBack={backFromMoviePlayer}
        />
      );
    }

    // Series root – list of series
    if (view === "seriesList" && selectedSeriesRoot) {
      return (
        <SeriesList
          rootTitle={selectedSeriesRoot.title}
          series={seriesFolders}
          onSeriesClick={openSeriesFolder}
        />
      );
    }

    // Seasons
    if (view === "seriesSeasons" && selectedSeries) {
      return (
        <Seasons
          seriesTitle={selectedSeries.title}
          seasons={seasonFolders}
          onSeasonClick={openSeason}
        />
      );
    }

    // Episodes grid (same card design as movies)
    if (view === "seriesEpisodes" && selectedSeason) {
      return (
        <section className="cs-left">
          <h2 className="cs-section-title" style={{ textAlign: "center" }}>
            {selectedSeason.title}{" "}
            <span className="cs-section-subtitle">Episodes</span>
          </h2>
          <div className="cs-item-grid cs-centered-row">
            {episodes.map((e, idx) => (
              <EpisodeCard
                key={e.id}
                episode={e}
                index={idx}
                active={false}
                onClick={() => handleEpisodeClick(e)}
              />
            ))}
          </div>
        </section>
      );
    }

    // Episode player page
    if (
      view === "episodePlayer" &&
      selectedEpisode &&
      selectedSeason &&
      selectedSeries
    ) {
      const meta = "Episode";
      const sub = `Series: ${selectedSeries.title} · ${selectedSeason.title}`;
      return (
        <VideoPlayer
          video={selectedEpisode}
          metaLine={meta}
          subLine={sub}
          onBack={backFromEpisodePlayer}
        />
      );
    }

    return null;
  };

  return (
    <div className={`cs-app cs-theme-${theme}`}>
      <Header
        activeNav={activeNav}
        onNavClick={handleNavClick}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogoClick={resetAll}
      />

      <main className="cs-main">{renderContent()}</main>

      <Footer />
    </div>
  );
}

export default App;
