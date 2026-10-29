import { Search, SlidersHorizontal } from 'lucide-react';
import { useLocation } from 'wouter';

export function SearchBar({ compact = false, value = '', onChange }: { compact?: boolean; value?: string; onChange?: (value: string) => void }) {
  const [, setLocation] = useLocation();
  return <form className={`flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-craft ${compact ? 'max-w-xl' : 'max-w-2xl'}`} onSubmit={(event) => { event.preventDefault(); setLocation(`/browse${value ? `?search=${encodeURIComponent(value)}` : ''}`); }}>
    <Search className="ml-3 text-primary" size={19} />
    <input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder="Try “ceramicist in Portland”" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70" data-testid="input-search-artisans" />
    <button type="submit" className="hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:block" data-testid="button-search-artisans">Find a maker</button>
    <button type="submit" className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground sm:hidden" aria-label="Search" data-testid="button-search-mobile"><SlidersHorizontal size={17} /></button>
  </form>;
}