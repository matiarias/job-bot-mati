import { Search } from 'lucide-react';

type Props = { query: string; onChange: (value: string) => void };

export function SearchBar({ query, onChange }: Props) {
  return (
        <header className="toolbar">
          <label className="search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Buscar ofertas</span>
            <input type="search" placeholder="Buscar por puesto, empresa o tecnología" value={query}
              onChange={event => { onChange(event.target.value); }} />
          </label>
          <span className="demo-label">Ofertas de empleo</span>
        </header>
  );
}
