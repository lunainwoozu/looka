import GenreButton from '../GenreButton';
import { GENRE_OPTIONS } from '../../constants/movie';

type GenreStepProps = {
  selectedGenreIds: number[];
  genreLoadBusy: boolean;
  onToggleGenre: (genreId: number) => void;
  onNext: () => void;
};

export default function GenreStep({
  selectedGenreIds,
  genreLoadBusy,
  onToggleGenre,
  onNext,
}: GenreStepProps) {
  return (
    <>
      <p className="hint">장르를 2~3개 선택해 주세요.</p>
      <div className="chip-grid">
        {GENRE_OPTIONS.map((genre) => (
          <GenreButton
            key={genre.id}
            genre={genre}
            active={selectedGenreIds.includes(genre.id)}
            onToggle={onToggleGenre}
          />
        ))}
      </div>
      <p className="hint">선택됨: {selectedGenreIds.length}개</p>
      <button type="button" className="btn btn--primary" disabled={genreLoadBusy} onClick={onNext}>
        {genreLoadBusy ? '불러오는 중…' : '다음: 영화 선택'}
      </button>
    </>
  );
}
