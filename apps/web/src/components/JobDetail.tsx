import { ArrowLeft, Bookmark, BriefcaseBusiness, Check, MapPin } from 'lucide-react';
import type { RefObject } from 'react';
import type { Job } from '@job-bot/contracts';

type Props = { detail: RefObject<HTMLElement | null>; selected: Job; saved: string[]; returnToList: () => void; toggleSaved: (id: string) => void };

export function JobDetail({ detail, selected, saved, returnToList, toggleSaved }: Props) {
  return (
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
              {selected.source && <p className="location">Fuente: {selected.source}</p>}
              {selected.url && /^https:\/\//i.test(selected.url) && <a className="save mt-3 w-fit" href={selected.url} target="_blank" rel="noopener noreferrer">Ver oferta original</a>}
              {selected.source === 'Himalayas' && <p><a href="https://himalayas.app" target="_blank" rel="noopener noreferrer">Datos de Himalayas</a></p>}
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
  );
}
