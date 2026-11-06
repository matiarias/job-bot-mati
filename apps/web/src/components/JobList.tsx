import { Bookmark, ChevronRight } from 'lucide-react';
import type { RefObject } from 'react';
import type { Job } from '@job-bot/contracts';

const dates = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

type Props = { list: RefObject<HTMLElement | null>; title: string | undefined; loading: boolean; error: unknown; visibleJobs: Job[]; selected: Job | undefined; saved: string[]; order: string; setOrder: (value: string) => void; query: string; total: number; retry: () => void; selectJob: (id: string) => void };

export function JobList({ list, title, loading, error, visibleJobs, selected, saved, order, setOrder, query, total, retry, selectJob }: Props) {
  return (
          <section ref={list} className="offer-list" aria-labelledby="list-title">
            <div className="list-heading">
              <h1 id="list-title">{title}</h1>
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
                <button className="save mt-3" type="button" onClick={() => { retry(); }}>Reintentar</button>
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
                        {job.date ? <time dateTime={job.date}>{dates.format(new Date(job.date))}</time> : <span>Fecha sin confirmar</span>}
                        {saved.includes(job.id) && <Bookmark size={15} aria-label="Guardada" />}
                        <ChevronRight size={16} aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">{!total ? 'Todavía no hay ofertas disponibles.' : query.trim() ? 'No encontramos ofertas para esa búsqueda.' : 'Todavía no hay ofertas en esta bandeja.'}</p>}
          </section>
  );
}
