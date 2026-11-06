import { Sidebar, getViewLabel } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { JobList } from './components/JobList';
import { JobDetail } from './components/JobDetail';
import { useJobBoard } from './use-job-board';

export function App() {
  const { view, setView, query, setQuery, saved, selected, mobileDetail, setMobileDetail, order, setOrder, detail, list, jobs, error, loading, mutate, reviewCount, savedCount, visibleJobs, selectJob, returnToList, toggleSaved } = useJobBoard();

  return (
    <div className="shell">
      <Sidebar view={view} total={jobs.length} savedCount={savedCount} reviewCount={reviewCount} onChange={value => { setView(value); setMobileDetail(false); }} />
      <main className="min-w-0">
        <SearchBar query={query} onChange={value => { setQuery(value); setMobileDetail(false); }} />
        <div className={mobileDetail && selected ? 'inbox showing-detail' : 'inbox'}>
          <JobList list={list} title={getViewLabel(view)} loading={Boolean(loading)} error={error} visibleJobs={visibleJobs} selected={selected} saved={saved} order={order} setOrder={setOrder} query={query} total={jobs.length} retry={() => { void mutate(); }} selectJob={selectJob} />
          {selected && <JobDetail detail={detail} selected={selected} saved={saved} returnToList={returnToList} toggleSaved={toggleSaved} />}
        </div>
      </main>
    </div>
  );
}
