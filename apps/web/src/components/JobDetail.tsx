import { ArrowLeft, Bookmark, BriefcaseBusiness, Check, MapPin } from 'lucide-react';
import { useState, type RefObject } from 'react';
import type { Job } from '@job-bot/contracts';

type Props = { detail: RefObject<HTMLElement | null>; selected: Job; saved: string[]; returnToList: () => void; toggleSaved: (id: string) => void };

const DESCRIPTION_LIMIT = 600;

function JobDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > DESCRIPTION_LIMIT;
  const excerpt = description.slice(0, DESCRIPTION_LIMIT).replace(/\s+\S*$/, '').trimEnd();

  return (
    <section className="detail-section">
      <h3>Sobre el rol</h3>
      <p className="description">{isLong && !expanded ? `${excerpt || description.slice(0, DESCRIPTION_LIMIT)}…` : description}</p>
      {isLong && <button className="description-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ver menos' : 'Ver más'}</button>}
    </section>
  );
}

export function JobDetail({ detail, selected, saved, returnToList, toggleSaved }: Props) {
  const isSaved = saved.includes(selected.id);
  const hasUrl = selected.url && /^https:\/\//i.test(selected.url);

  return (
    <article ref={detail} tabIndex={-1} className="detail" aria-labelledby="detail-title">
      <button className="back" type="button" onClick={returnToList}><ArrowLeft size={17} aria-hidden="true" /> Volver a ofertas</button>
      <header className="detail-header">
        <div className="detail-top">
          <p className="company"><BriefcaseBusiness size={18} aria-hidden="true" /> {selected.company}</p>
          <button className="save" type="button" aria-pressed={isSaved} onClick={() => toggleSaved(selected.id)}>
            <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            {isSaved ? 'Guardada' : 'Guardar'}
          </button>
        </div>
        <div className="detail-heading">
          <h2 id="detail-title">{selected.title}</h2>
          <p className="location"><MapPin size={16} aria-hidden="true" /> {selected.location}</p>
        </div>
        {(selected.source || hasUrl) && <div className="detail-source">
          {selected.source && <p>Fuente: {selected.source === 'Himalayas' ? <a href="https://himalayas.app" target="_blank" rel="noopener noreferrer">Himalayas</a> : selected.source}</p>}
          {hasUrl && <a className="save" href={selected.url} target="_blank" rel="noopener noreferrer">Ver oferta original</a>}
        </div>}
        {selected.skills.length > 0 && <ul className="skills" aria-label="Tecnologías">
          {selected.skills.map(skill => <li key={skill}>{skill}</li>)}
        </ul>}
      </header>
      <dl className="facts">
        <div><dt>Modalidad contractual</dt><dd>{selected.contract}</dd></div>
        <div><dt>Salario</dt><dd>{selected.salary}</dd></div>
      </dl>
      <JobDescription key={selected.id} description={selected.description} />
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
