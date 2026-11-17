import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useJobRefresh } from '../use-jobs';

const time = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' });

export function JobRefresh() {
  const [showForm, setShowForm] = useState(false);
  const refresh = useJobRefresh();

  return (
    <div className="job-refresh">
      <button className="save" type="button" aria-expanded={showForm} aria-controls="job-refresh-form"
        onClick={() => setShowForm(value => !value)}>
        <RefreshCw size={16} aria-hidden="true" /> Buscar ofertas nuevas
      </button>
      <form id="job-refresh-form" hidden={!showForm} onSubmit={event => {
        event.preventDefault();
        const form = event.currentTarget;
        const token = String(new FormData(form).get('token') ?? '').trim();
        if (refresh.isPending || !token) return;
        form.reset();
        refresh.mutate(token);
      }}>
        <label htmlFor="job-refresh-token">Clave de actualización</label>
        <div className="job-refresh-fields">
          <input id="job-refresh-token" name="token" type="password" required autoComplete="off" />
          <button className="save" type="submit" disabled={refresh.isPending}>Iniciar búsqueda</button>
        </div>
      </form>
      <div role="status">
        {refresh.isPending && <p>Buscando en los portales…</p>}
        {refresh.data && <>
          <p>Última búsqueda: {time.format(new Date(refresh.data.completedAt))}.</p>
          <p>{refresh.data.processed === 0 ? 'La búsqueda no encontró ofertas para guardar.'
            : `${refresh.data.processed} ofertas guardadas o actualizadas.`}</p>
          {refresh.data.warnings.length > 0 && <p>Algunas consultas fallaron. Se usaron los resultados disponibles.</p>}
        </>}
      </div>
      {refresh.isError && <p role="alert">{refresh.error.message}</p>}
    </div>
  );
}
