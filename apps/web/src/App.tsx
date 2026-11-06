import { useRef, useState } from 'react';
import { ArrowLeft, Bookmark, BriefcaseBusiness, Check, ChevronRight, CircleHelp, Inbox, MapPin, Search } from 'lucide-react';
import { useJobs } from './use-jobs';

const views = [
  { id: 'all', label: 'Ofertas para vos', icon: Inbox },
  { id: 'saved', label: 'Guardadas', icon: Bookmark },
  { id: 'review', label: 'Por confirmar', icon: CircleHelp },
] as const;

const storageKey = 'job-bot:demo:saved';
const dates = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function readSaved() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === 'string'))]
      : [];
  } catch {
    return [];
  }
}

export function App() {
  const [view, setView] = useState<(typeof views)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(readSaved);
  const [selectedId, setSelectedId] = useState<string>();
  const [mobileDetail, setMobileDetail] = useState(false);
  const [order, setOrder] = useState('recent');
  const detail = useRef<HTMLElement>(null);
  const list = useRef<HTMLElement>(null);

  const { data: jobs = [], error, isLoading, isValidating, mutate } = useJobs();
  const loading = isLoading || (error && isValidating);
  const reviewCount = jobs.filter(job => job.questions.length).length;
  const savedCount = jobs.filter(job => saved.includes(job.id)).length;
  const searchTerm = normalize(query.trim());
  const visibleJobs = jobs.filter(job => {
    if (view === 'saved' && !saved.includes(job.id)) return false;
    if (view === 'review' && !job.questions.length) return false;
    return !searchTerm || normalize([job.title, job.company, job.location, ...job.skills].join(' ')).includes(searchTerm);
  }).sort((a, b) => order === 'recent' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const selected = visibleJobs.find(job => job.id === selectedId) ?? visibleJobs[0];

  function selectJob(id: string) {
    setSelectedId(id);
    setMobileDetail(true);
    if (window.matchMedia('(max-width: 860px)').matches) {
      requestAnimationFrame(() => detail.current?.focus());
    }
  }

  function returnToList() {
    setMobileDetail(false);
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus());
  }

  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep the session usable when the browser blocks storage.
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={import.meta.env.BASE_URL + 'job-bot.svg'} width={36} height={36} alt="" />
          <div>Job Bot <span>Mati Arias</span></div>
        </div>
        <nav aria-label="Bandejas" className="nav">
          {views.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => { setView(id); setMobileDetail(false); }}>
              <Icon size={18} aria-hidden="true" /> <span>{label}</span>
              <span className="nav-count">{id === 'saved' ? savedCount : id === 'review' ? reviewCount : jobs.length}</span>
            </button>
          ))}
        </nav>
        <p className="sidebar-note">Empleo tech remoto<br />Argentina y LATAM</p>
      </aside>
      <main className="min-w-0">
        <header className="toolbar">
          <label className="search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Buscar ofertas</span>
            <input type="search" placeholder="Buscar por puesto, empresa o tecnología" value={query}
              onChange={event => { setQuery(event.target.value); setMobileDetail(false); }} />
          </label>
          <span className="demo-label">Datos de ejemplo</span>
        </header>
        <div className={mobileDetail && selected ? 'inbox showing-detail' : 'inbox'}>
          <section ref={list} className="offer-list" aria-labelledby="list-title">
            <div className="list-heading">
              <h1 id="list-title">{views.find(item => item.id === view)?.label}</h1>
              <div className="list-controls">
                <p role="status">{loading ? 'Cargando ofertas…' : error ? 'Ofertas no disponibles' : `${visibleJobs.length} ${visibleJobs.length === 1 ? 'oferta' : 'ofertas'}`}</p>
                <select aria-label="Orden de las ofertas" value={order} onChange={event => setOrder(event.target.value)}>
                  <option value="recent">Más recientes</option>
                  <option value="older">Más antiguas</option>
                </select>
              </div>
            </div>
            {loading ? null : error ? (
              <div className="empty">
                <p>No pudimos cargar las ofertas. Volvé a intentar en unos segundos.</p>
                <button className="save mt-3" type="button" onClick={() => { void mutate(); }}>Reintentar</button>
              </div>
            ) : visibleJobs.length ? (
              <ul className="rows">
                {visibleJobs.map(job => (
                  <li key={job.id}>
                    <button className="job-row" type="button" aria-pressed={selected?.id === job.id} onClick={() => selectJob(job.id)}>
                      <span className="monogram" aria-hidden="true">{job.company.split(' ').map(word => word[0]).join('')}</span>
                      <span className="row-copy">
                        <strong>{job.title}</strong>
                        <span>{job.company}</span>
                        <small>{job.location}</small>
                      </span>
                      <span className="row-meta">
                        <time dateTime={job.date}>{dates.format(new Date(job.date))}</time>
                        {saved.includes(job.id) && <Bookmark size={15} aria-label="Guardada" />}
                        <ChevronRight size={16} aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">{!jobs.length ? 'Todavía no hay ofertas disponibles.' : query.trim() ? 'No encontramos ofertas para esa búsqueda.' : 'Todavía no hay ofertas en esta bandeja.'}</p>}
          </section>
          {selected && (
            <article ref={detail} tabIndex={-1} className="detail" aria-labelledby="detail-title">
              <button className="back" type="button" onClick={returnToList}><ArrowLeft size={17} aria-hidden="true" /> Volver a ofertas</button>
              <div className="detail-top">
                <p className="company"><BriefcaseBusiness size={18} aria-hidden="true" /> {selected.company}</p>
                <button className="save" type="button" aria-pressed={saved.includes(selected.id)} onClick={() => toggleSaved(selected.id)}>
                  <Bookmark size={16} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} aria-hidden="true" />
                  {saved.includes(selected.id) ? 'Guardada' : 'Guardar'}
                </button>
              </div>
              <h2 id="detail-title">{selected.title}</h2>
              <p className="location"><MapPin size={16} aria-hidden="true" /> {selected.location}</p>
              <ul className="skills" aria-label="Tecnologías">
                {selected.skills.map(skill => <li key={skill}>{skill}</li>)}
              </ul>
              <dl className="facts">
                <div><dt>Modalidad contractual</dt><dd>{selected.contract}</dd></div>
                <div><dt>Salario</dt><dd>{selected.salary}</dd></div>
              </dl>
              <section className="detail-section">
                <h3>Sobre el rol</h3>
                <p>{selected.description}</p>
              </section>
              <section className="match detail-section">
                <h3>Coincidencias con tu búsqueda</h3>
                <ul>{selected.matches.map(match => <li key={match}><Check size={16} aria-hidden="true" />{match}</li>)}</ul>
              </section>
              {selected.questions.length > 0 && <section className="detail-section">
                <h3>Por confirmar</h3>
                <ul className="questions">{selected.questions.map(question => <li key={question}>{question}</li>)}</ul>
              </section>}
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
