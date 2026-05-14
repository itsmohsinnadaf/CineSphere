// src/App.jsx
import { useEffect, useState } from "react";
import "./styles/base.css";

import { useLibrary } from "./hooks/useLibrary";

import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import LoadingScreen from "./components/common/LoadingScreen";

import RootFolders from "./components/folders/RootFolders";
import MovieGenres from "./components/folders/MovieGenres";
import SeriesList from "./components/folders/SeriesList";
import Seasons from "./components/folders/Seasons";

import MovieCard from "./components/cards/MovieCard";
import EpisodeCard from "./components/cards/EpisodeCard";
import VideoPlayer from "./components/player/VideoPlayer";

import BackButton from "./components/common/BackButton";
import AnimateIn from "./components/common/AnimateIn";
import CursorGlow from "./components/common/CursorGlow";
import FloatingParticles from "./components/common/FloatingParticles";


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
    backToMovieGenres,
    backToSeriesRoot,
    backToSeriesList,
    backToSeasons,
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
          onBack={resetAll}
        />
      );
    }

    // Movies – grid of movie cards (Image 1 style)
    if (view === "moviesTitles" && selectedGenre) {
  return (
    <section className="cs-left">
      <div className="cs-page-header">
        <BackButton onBack={backToMovieGenres} />

        <h2 className="cs-section-title">
          {selectedGenre.title}{" "}
          <span className="cs-section-subtitle">Movies</span>
        </h2>
      </div>

      <div className="cs-item-grid cs-centered-row">
        {movieTitles.map((m, idx) => (
          <AnimateIn key={m.id} variant="fade-up" delay={idx * 60}>
            <MovieCard
              movie={m}
              active={false}
              onClick={() => handleMovieClick(m)}
            />
          </AnimateIn>
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
      <section className="cs-left">
        <div className="cs-page-header">
          <BackButton onBack={backToSeriesRoot} />

          <h2 className="cs-section-title">
            {selectedSeriesRoot.title}
          </h2>
        </div>

        <SeriesList
          rootTitle={selectedSeriesRoot.title}
          series={seriesFolders}
          onSeriesClick={openSeriesFolder}
        />
      </section>
    );
  }


    // Seasons
    if (view === "seriesSeasons" && selectedSeries) {
      return (
        <section className="cs-left">
          <div className="cs-page-header">
            <BackButton onBack={backToSeriesList} />

            <h2 className="cs-section-title">
              {selectedSeries.title}
              <span className="cs-section-subtitle"> Seasons</span>
            </h2>
          </div>

          <Seasons
            seriesTitle={selectedSeries.title}
            seasons={seasonFolders}
            onSeasonClick={openSeason}
          />
        </section>
      );
    }


    // Episodes grid (same card design as movies)
    if (view === "seriesEpisodes" && selectedSeason) {
      return (
        <section className="cs-left">
          <div className="cs-page-header">
            <BackButton onBack={backToSeasons} />

            <h2 className="cs-section-title">
              {selectedSeason.title}
              <span className="cs-section-subtitle"> Episodes</span>
            </h2>
          </div>

          <div className="cs-item-grid cs-centered-row">
            {episodes.map((e, idx) => (
              <AnimateIn key={e.id} variant="fade-up" delay={idx * 60}>
                <EpisodeCard
                  episode={e}
                  index={idx}
                  active={false}
                  onClick={() => handleEpisodeClick(e)}
                />
              </AnimateIn>
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
      <CursorGlow />
      <FloatingParticles />

      <Header
        activeNav={activeNav}
        onNavClick={handleNavClick}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogoClick={resetAll}
      />

      {/* Loading screen rendered outside animated wrapper so it's always visible */}
      {loading && view === "root" && !rootFolders.length && <LoadingScreen />}

      <main className="cs-main">
        <div key={view} className="cs-view-enter">
          {renderContent()}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
