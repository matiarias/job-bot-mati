import { Bookmark, CircleHelp, Inbox } from 'lucide-react';

const views = [
  { id: 'all', label: 'Ofertas para vos', icon: Inbox },
  { id: 'saved', label: 'Guardadas', icon: Bookmark },
  { id: 'review', label: 'Por confirmar', icon: CircleHelp },
] as const;

export type View = (typeof views)[number]['id'];

type Props = { view: View; onChange: (view: View) => void; total: number; savedCount: number; reviewCount: number };

export function Sidebar({ view, onChange, total, savedCount, reviewCount }: Props) {
  return (
      <aside className="sidebar">
        <div className="brand">
          <img src={import.meta.env.BASE_URL + 'job-bot.svg'} width={36} height={36} alt="" />
          <div>Job Bot <span>Mati Arias</span></div>
        </div>
        <nav aria-label="Bandejas" className="nav">
          {views.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => { onChange(id); }}>
              <Icon size={18} aria-hidden="true" /> <span>{label}</span>
              <span className="nav-count">{id === 'saved' ? savedCount : id === 'review' ? reviewCount : total}</span>
            </button>
          ))}
        </nav>
        <p className="sidebar-note">Empleo tech remoto<br />Argentina y LATAM</p>
      </aside>
  );
}

export function getViewLabel(view: View) {
  return views.find(item => item.id === view)?.label;
}
