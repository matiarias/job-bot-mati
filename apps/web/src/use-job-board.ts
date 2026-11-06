import { useRef, useState } from 'react';
import type { View } from './components/Sidebar';
import { useJobs } from './use-jobs';

const storageKey = 'job-bot:demo:saved';
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

export function useJobBoard() {
  const [view, setView] = useState<View>('all');
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
  }).sort((a, b) => {
    if (!a.date) return b.date ? 1 : 0;
    if (!b.date) return -1;
    return order === 'recent' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
  });
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

  return { view, setView, query, setQuery, saved, selected, mobileDetail, setMobileDetail, order, setOrder, detail, list, jobs, error, loading, mutate, reviewCount, savedCount, visibleJobs, selectJob, returnToList, toggleSaved };
}
