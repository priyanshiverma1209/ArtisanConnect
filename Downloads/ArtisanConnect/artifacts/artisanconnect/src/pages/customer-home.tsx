import { ArrowRight, ClipboardEdit, Heart, Search, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useListArtisans } from '@workspace/api-client-react';
import { AppShell } from '@/components/app-shell';
import { ArtisanCard, LoadingCards } from '@/components/artisan-ui';
import { SearchBar } from '@/components/search-bar';

export default function CustomerHome() {
  const artisans = useListArtisans({ sort: 'featured' });
  return <AppShell><div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-8 lg:py-14">
    <div className="rounded-[30px] bg-[linear-gradient(120deg,hsl(var(--sidebar)),hsl(var(--secondary)))] px-6 py-12 text-sidebar-foreground sm:px-10 lg:px-16 lg:py-16">
      <p className="font-mono-brand text-[11px] uppercase tracking-[.18em] text-accent">Your customer home</p>
      <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold leading-[.94] tracking-[-.055em] sm:text-7xl">Find something made for you.</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-sidebar-foreground/75">See real work from real people. Search for an artisan or tell us what you need.</p>
      <div className="mt-8 max-w-2xl"><SearchBar /></div>
      <div className="mt-7 flex flex-wrap gap-3"><Link href="/requests" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground" data-testid="link-customer-post-request"><ClipboardEdit size={16} /> Tell an artisan what you need</Link><Link href="/browse" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white" data-testid="link-customer-browse"><Search size={16} /> See all artisans</Link></div>
    </div>
    <section className="mt-14"><div className="flex items-end justify-between gap-5"><div><p className="font-mono-brand text-[11px] uppercase tracking-[.18em] text-primary">Recommended for you</p><h2 className="mt-2 font-display text-4xl font-bold tracking-[-.045em]">People making beautiful things</h2></div><Link href="/browse" className="hidden items-center gap-1 text-sm font-bold text-secondary sm:flex" data-testid="link-customer-see-all">See all <ArrowRight size={16} /></Link></div>{artisans.isLoading ? <div className="mt-8"><LoadingCards count={4} /></div> : <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{(artisans.data ?? []).slice(0, 4).map((artisan, index) => <ArtisanCard key={artisan.id} artisan={artisan} featured={index === 0} />)}</div>}</section>
    <section className="mt-14 grid gap-5 md:grid-cols-2"><Link href="/requests" className="group rounded-[24px] border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-craft-md" data-testid="link-customer-need"><Sparkles size={21} className="text-primary" /><h3 className="mt-5 font-display text-3xl font-bold">Have an idea?</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Describe what you want. Matching artisans can contact you with ideas and prices.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">Make a request <ArrowRight size={16} /></span></Link><Link href="/dashboard" className="group rounded-[24px] border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-craft-md" data-testid="link-customer-activity"><Heart size={21} className="text-primary" /><h3 className="mt-5 font-display text-3xl font-bold">Keep track of your work</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">See your requests, saved artisans, and new replies in one place.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">Open my activity <ArrowRight size={16} /></span></Link></section>
  </div></AppShell>;
}