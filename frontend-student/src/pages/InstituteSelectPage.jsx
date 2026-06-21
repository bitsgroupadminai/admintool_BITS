import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Search, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { InstituteSelectSkeleton } from '@/components/skeletons';
import { PageShell } from '@/components/ui/PortalCard';
import { InstituteCard } from '@/components/institute/InstituteCard';
import { studentApi } from '@/api/student.api';

const DEFAULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function InstituteSelectPage() {
  const [institutes, setInstitutes] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadInstitutes = useCallback(async (search) => {
    if (!search) setLoading(true);

    try {
      const params = { limit: DEFAULT_LIMIT };
      if (search) params.search = search;

      const { data } = await studentApi.listInstitutes(params);
      setInstitutes(data.data.institutes ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load institutes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutes(debouncedSearch);
  }, [debouncedSearch, loadInstitutes]);

  if (loading && institutes.length === 0) {
    return <InstituteSelectSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#F4FAF7]">
      <header className="border-b border-[#E2EEE8]/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A6640] text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-[#052E1C]">Student Portal</p>
              <p className="text-xs text-[#4B6358]">Official enrollment gateway</p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-xl border border-[#C4E8D4] bg-white px-4 py-2 text-xs font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5]"
          >
            Student login
          </Link>
        </div>
      </header>

      <section className="border-b border-[#E2EEE8] bg-white">
        <PageShell className="py-10 sm:py-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C4E8D4] bg-[#F0FAF5] px-3 py-1.5 text-xs font-semibold text-[#0A6640]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified institutes
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#052E1C] sm:text-4xl">
              Find your institute
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#4B6358] sm:text-base">
              Search and select where you want to apply. Your request is sent only to that
              institute&apos;s admin team.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-xl">
            <label htmlFor="institute-search" className="sr-only">
              Search institutes
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id="institute-search"
                type="text"
                role="searchbox"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by institute name…"
                className="h-12 w-full rounded-2xl border border-[#D8ECE2] bg-white pl-11 pr-11 text-sm text-[#052E1C] shadow-sm outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/25"
                autoComplete="off"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F0FAF5]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </PageShell>
      </section>

      <PageShell className="py-8 sm:py-10">
        {institutes.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-[#E2EEE8] bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#052E1C]">
              {debouncedSearch ? 'No matching institutes' : 'No institutes available yet'}
            </p>
            <p className="mt-2 text-sm text-[#4B6358]">
              {debouncedSearch
                ? 'Try a shorter or different spelling — fuzzy search matches partial names too.'
                : 'Please check back later or contact your institute office.'}
            </p>
            {debouncedSearch ? (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="mt-5 text-sm font-semibold text-[#0A6640] hover:underline"
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {institutes.map((institute, index) => (
              <InstituteCard key={institute.id} institute={institute} index={index + 1} />
            ))}
          </div>
        )}
      </PageShell>
    </div>
  );
}
