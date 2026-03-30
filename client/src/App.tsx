import { useCallback, useMemo, useState } from 'react';
import './App.css';
import GenreStep from './components/steps/GenreStep';
import MovieSelectionStep from './components/steps/MovieSelectionStep';
import ChallengeStep from './components/steps/ChallengeStep';
import { GENRE_OPTIONS } from './constants/movie';
import { useGenreStep } from './hooks/useGenreStep';
import { useMovieSelection } from './hooks/useMovieSelection';
import { useChallengeFilter } from './hooks/useChallengeFilter';

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const genre = useGenreStep();
  const movie = useMovieSelection();
  const challenge = useChallengeFilter();

  const genreNameMap = useMemo(
    () => Object.fromEntries(GENRE_OPTIONS.map((g) => [g.id, g.name])) as Record<number, string>,
    []
  );

  const handleGenreNext = useCallback(async () => {
    const seedIndex = await genre.loadGenreMovies();
    if (!seedIndex) return;

    movie.reset(seedIndex);
    challenge.reset();
    setStep(2);
  }, [challenge, genre, movie]);

  const handleMovieNext = useCallback(() => {
    if (movie.pickedMovieIds.length < 2) {
      genre.setErr('영화는 최소 2개 선택해 주세요.');
      return;
    }
    genre.setErr(null);
    setStep(3);
  }, [movie.pickedMovieIds.length, genre]);

  const pickedMovies = movie.pickedMovieIds
    .map((id) => movie.movieIndex[id])
    .filter(Boolean)
    .map((m) => ({
      id: m.id,
      title: m.title,
      voteAverage: m.vote_average,
      posterPath: m.poster_path,
    }));

  return (
    <div className="app">
      <header className="app__header">
        <h1>Looka</h1>
      </header>

      <section className="panel">
        <div className="step-head">
          <h2>온보딩</h2>
          <p className="step-indicator">STEP {step} / 3</p>
        </div>

        {step === 1 && (
          <GenreStep
            selectedGenreIds={genre.selectedGenreIds}
            genreLoadBusy={genre.busy}
            onToggleGenre={genre.toggleGenre}
            onNext={handleGenreNext}
          />
        )}

        {step === 2 && (
          <MovieSelectionStep
            selectedGenreIds={genre.selectedGenreIds}
            genreNameMap={genreNameMap}
            genreMovieMap={genre.genreMovieMap}
            pickedMovieIds={movie.pickedMovieIds}
            searchQuery={movie.searchQuery}
            searching={movie.searching}
            searchErr={movie.searchErr}
            searchResults={movie.searchResults}
            onBack={() => setStep(1)}
            onNext={handleMovieNext}
            onToggleMoviePick={movie.togglePick}
            onSearchQueryChange={movie.setSearchQuery}
            onSearch={() => movie.runSearch(movie.searchQuery)}
          />
        )}

        {step === 3 && (
          <ChallengeStep
            challengeLevel={challenge.challengeLevel}
            pickedMovies={pickedMovies}
            filterBusy={challenge.busy}
            filterErr={challenge.err}
            filterResults={challenge.results}
            filterTitles={challenge.titles}
            filterPosters={challenge.posters}
            candidatePoolCount={challenge.candidatePoolCount}
            onBack={() => setStep(2)}
            onRunReverseFilter={() => challenge.run(genre.selectedGenreIds, movie.pickedMovieIds)}
            onSelectChallengeLevel={challenge.setChallengeLevel}
          />
        )}

        {genre.err && <p className="msg msg--err">{genre.err}</p>}
      </section>
    </div>
  );
}
