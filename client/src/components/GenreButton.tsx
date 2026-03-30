import type { GenreOption } from '../types/MovieType';

type GenreButtonProps = {
  genre: GenreOption;
  active: boolean;
  onToggle: (genreId: number) => void;
};

export default function GenreButton({ genre, active, onToggle }: GenreButtonProps) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'chip--active' : ''}`}
      onClick={() => onToggle(genre.id)}
    >
      {genre.name}
    </button>
  );
}
