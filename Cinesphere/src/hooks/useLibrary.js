// src/hooks/useLibrary.js
import { useState } from "react";
import { browsePath } from "../api/api";

/**
 * Same constants as before – fallbacks for images and posters.
 */

const FOLDER_DOWNLOAD_LINKS = {
  // "Movies": "https://1drv.ms/f/yourMoviesFolder",
  // "Movies/Bollywood": "https://1drv.ms/f/yourBollywoodFolder",
  // "Series": "https://1drv.ms/f/yourSeriesFolder",
};

const ROOT_IMAGES = {
  Movies: "/images/folders/movies-hero.png",
  Series: "/images/folders/series-hero.png",
};

const SUB_IMAGES = {
  Bollywood: "/images/folders/bollywood.png",
  Hollywood: "/images/folders/hollywood.png",
  Tollywood: "/images/folders/tollywood.png",
};

const SERIES_IMAGES = {
  "Alien Earth": "/images/series/alien-earth.jpg",
};

const SEASON_IMAGES = {
  // "Season 1": "/images/series/season1.jpg",
};

const VIDEO_IMAGES = {
  // "Shiddat 2021 1080p Hindi": "/images/movies/shiddat-2021.jpg",
};

const DEFAULT_POSTER = "/images/movies/default-poster.jpg";

function prettifyFilename(name) {
  const withoutExt = name.replace(/\.[^/.]+$/, "");
  return withoutExt.replace(/[._]+/g, " ");
}

function isCloudImage(url) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * view values:
 *  - "root"
 *  - "moviesGenres"
 *  - "moviesTitles"    -> grid of movie cards
 *  - "moviePlayer"     -> full-page player for a movie
 *  - "seriesList"
 *  - "seriesSeasons"
 *  - "seriesEpisodes"  -> grid of episode cards
 *  - "episodePlayer"   -> full-page player for an episode
 */

export function useLibrary() {
  const [view, setView] = useState("root");
  const [activeNav, setActiveNav] = useState("home");

  const [rootFolders, setRootFolders] = useState([]);

  // Movies branch
  const [movieGenres, setMovieGenres] = useState([]);
  const [movieTitles, setMovieTitles] = useState([]);
  const [selectedMovieRoot, setSelectedMovieRoot] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);

  // Series branch
  const [seriesFolders, setSeriesFolders] = useState([]);
  const [seasonFolders, setSeasonFolders] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeriesRoot, setSelectedSeriesRoot] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------- ROOT (Movies / Series) ---------- */

  async function loadRootFolders() {
    try {
      setLoading(true);
      setError(null);

      const items = await browsePath("");

      const folders = items
        .filter((i) => i.type === "folder")
        .map((item) => {
          const cover = item.coverUrl || null;
          const localHero = ROOT_IMAGES[item.name] || null;
          const heroImage = localHero || cover;

          return {
            id: item.path,
            name: item.name,
            title: item.name,
            path: item.path,
            image: heroImage,
            downloadUrl: FOLDER_DOWNLOAD_LINKS[item.path] || null,
            isCloudImage: !localHero && isCloudImage(cover),
          };
        });

      setRootFolders(folders);
      setView("root");
      setActiveNav("home");
    } catch (err) {
      console.error("loadRootFolders error:", err);
      setError("Failed to load library");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- MOVIES FLOW ---------- */

  async function openMoviesRoot(rootFolder) {
    try {
      setSelectedMovieRoot(rootFolder);
      setSelectedGenre(null);
      setSelectedMovie(null);
      setView("moviesGenres");
      setActiveNav("movies");
      setLoading(true);
      setError(null);

      const items = await browsePath(rootFolder.path);

      const genres = items
        .filter((i) => i.type === "folder")
        .map((item) => ({
          id: item.path,
          name: item.name,
          title: item.name,
          path: item.path,
          image: item.coverUrl || SUB_IMAGES[item.name] || null,
          downloadUrl: FOLDER_DOWNLOAD_LINKS[item.path] || null,
          isCloudImage: isCloudImage(item.coverUrl),
        }));

      setMovieGenres(genres);
    } catch (err) {
      console.error("openMoviesRoot error:", err);
      setError("Failed to load movie categories");
    } finally {
      setLoading(false);
    }
  }

  async function openMovieGenre(genreFolder) {
    try {
      setSelectedGenre(genreFolder);
      setSelectedMovie(null);
      setView("moviesTitles");
      setLoading(true);
      setError(null);

      const items = await browsePath(genreFolder.path);

      const vids = items
        .filter((i) => i.type === "video")
        .map((item) => {
          const title = prettifyFilename(item.name);
          const chosenPoster =
            item.posterUrl || VIDEO_IMAGES[title] || DEFAULT_POSTER;

          return {
            id: item.path,
            name: item.name,
            title,
            path: item.path,
            type: "Movie",
            videoUrl: item.videoUrl,
            image: chosenPoster,
            posterUrl: item.posterUrl || null,
            isCloudImage: isCloudImage(item.posterUrl),
            sources: [{ label: "Original", url: item.videoUrl }],
          };
        });

      setMovieTitles(vids);
    } catch (err) {
      console.error("openMovieGenre error:", err);
      setError("Failed to load movies");
    } finally {
      setLoading(false);
    }
  }

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
    setView("moviePlayer"); // full-page player
  };

  const backFromMoviePlayer = () => {
    // go back to the movie list grid
    setView("moviesTitles");
  };

  /* ---------- SERIES FLOW ---------- */

  async function openSeriesRoot(rootFolder) {
    try {
      setSelectedSeriesRoot(rootFolder);
      setSelectedSeries(null);
      setSelectedSeason(null);
      setSelectedEpisode(null);
      setSeriesFolders([]);
      setSeasonFolders([]);
      setEpisodes([]);
      setView("seriesList");
      setActiveNav("series");
      setLoading(true);
      setError(null);

      const items = await browsePath(rootFolder.path);

      const seriesList = items
        .filter((i) => i.type === "folder")
        .map((item) => ({
          id: item.path,
          name: item.name,
          title: item.name,
          path: item.path,
          image: item.coverUrl || SERIES_IMAGES[item.name] || DEFAULT_POSTER,
          downloadUrl:
            FOLDER_DOWNLOAD_LINKS[item.path] || item.folderUrl || null,
          isCloudImage: isCloudImage(item.coverUrl),
        }));

      setSeriesFolders(seriesList);
    } catch (err) {
      console.error("openSeriesRoot error:", err);
      setError("Failed to load series");
    } finally {
      setLoading(false);
    }
  }

  async function openSeriesFolder(seriesFolder) {
    try {
      setSelectedSeries(seriesFolder);
      setSelectedSeason(null);
      setSelectedEpisode(null);
      setView("seriesSeasons");
      setLoading(true);
      setError(null);

      const items = await browsePath(seriesFolder.path);

      const seasons = items
        .filter((i) => i.type === "folder")
        .map((item) => ({
          id: item.path,
          name: item.name,
          title: item.name,
          path: item.path,
          image: item.coverUrl || SEASON_IMAGES[item.name] || DEFAULT_POSTER,
          downloadUrl:
            FOLDER_DOWNLOAD_LINKS[item.path] || item.folderUrl || null,
          isCloudImage: isCloudImage(item.coverUrl),
        }));

      setSeasonFolders(seasons);
    } catch (err) {
      console.error("openSeriesFolder error:", err);
      setError("Failed to load seasons");
    } finally {
      setLoading(false);
    }
  }

  async function openSeason(seasonFolder) {
    try {
      setSelectedSeason(seasonFolder);
      setSelectedEpisode(null);
      setView("seriesEpisodes");
      setLoading(true);
      setError(null);

      const items = await browsePath(seasonFolder.path);

      const eps = items
        .filter((i) => i.type === "video")
        .map((item) => {
          const title = prettifyFilename(item.name);
          const chosenPoster =
            item.posterUrl || VIDEO_IMAGES[title] || DEFAULT_POSTER;

          return {
            id: item.path,
            name: item.name,
            title,
            path: item.path,
            type: "Episode",
            videoUrl: item.videoUrl,
            image: chosenPoster,
            posterUrl: item.posterUrl || null,
            isCloudImage: isCloudImage(item.posterUrl),
            sources: [{ label: "Original", url: item.videoUrl }],
          };
        });

      setEpisodes(eps);
    } catch (err) {
      console.error("openSeason error:", err);
      setError("Failed to load episodes");
    } finally {
      setLoading(false);
    }
  }

  const handleEpisodeClick = (episode) => {
    setSelectedEpisode(episode);
    setView("episodePlayer"); // full-page player
  };

  const backFromEpisodePlayer = () => {
    setView("seriesEpisodes");
  };

  /* ---------- ROOT CARD & NAV CLICK HANDLERS ---------- */

  const handleRootCardClick = (rootFolder) => {
    if (rootFolder.name === "Movies") {
      openMoviesRoot(rootFolder);
    } else if (rootFolder.name === "Series") {
      openSeriesRoot(rootFolder);
    }
  };

  const resetAll = () => {
    setView("root");
    setActiveNav("home");
    setSelectedMovieRoot(null);
    setSelectedGenre(null);
    setSelectedMovie(null);
    setSelectedSeriesRoot(null);
    setSelectedSeries(null);
    setSelectedSeason(null);
    setSelectedEpisode(null);
    setMovieGenres([]);
    setMovieTitles([]);
    setSeriesFolders([]);
    setSeasonFolders([]);
    setEpisodes([]);
  };

  const handleNavClick = (nav) => {
    if (nav === "home") {
      resetAll();
      return;
    }

    if (!rootFolders.length) return;

    if (nav === "movies") {
      const moviesRoot = rootFolders.find(
        (f) => f.name.toLowerCase() === "movies"
      );
      if (moviesRoot) openMoviesRoot(moviesRoot);
    } else if (nav === "series") {
      const seriesRoot = rootFolders.find(
        (f) => f.name.toLowerCase() === "series"
      );
      if (seriesRoot) openSeriesRoot(seriesRoot);
    }
  };

  return {
    // state
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

    // actions
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
  };
}
