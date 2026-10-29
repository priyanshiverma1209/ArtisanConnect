import { ArrowRight, ChevronRight, Clock3, Hand, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'wouter';
import { useListArtisans, useListCategories } from '@workspace/api-client-react';
import { AppShell } from '@/components/app-shell';
import { ArtisanCard, LoadingCards, MarkIcon } from '@/components/artisan-ui';
import { SearchBar } from '@/components/search-bar';

export default function Home() {
  const categories = useListCategories();
  const artisans = useListArtisans({ sort: 'featured' });
  const makers = artisans.data?.slice(0, 5) ?? [];
  return <AppShell>
    <section className="overflow-hidden border-b border-border bg-[radial-gradient(circle_at_76%_14%,hsl(var(--accent)/.34),transparent_24%),linear-gradient(115deg,hsl(var(--sidebar))_0%,hsl(29_34%_25%)_58%,hsl(var(--secondary))_100%)] text-sidebar-foreground">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-24">
        <div className="animate-rise">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-mono-brand text-[10px] uppercase tracking-[.16em] text-accent"><Sparkles size={13} /> The people behind the good stuff</div>
          <h1 className="max-w-[680px] font-display text-[clamp(3.2rem,7vw,6.5rem)] font-bold leading-[.93] tracking-[-.065em]">Find work with a <span className="text-accent">human</span> touch.</h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-sidebar-foreground/75 sm:text-lg">Meet skilled makers, see how they work, and commission something that earns its place in your everyday.</p>
          <div className="mt-9"><SearchBar /></div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-sidebar-foreground/60"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-accent" /> Verified profiles</span><span className="flex items-center gap-2"><Hand size={15} className="text-accent" /> Direct from the studio</span></div>
        </div>
        <div className="relative hidden min-h-[440px] animate-fade lg:block">
          <div className="absolute right-5 top-0 h-[360px] w-[300px] rotate-[7deg] rounded-[28px] border border-white/15 bg-[linear-gradient(140deg,hsl(var(--accent)),hsl(12_71%_48%))] p-3 shadow-2xl"><div className="h-full rounded-[20px] border border-black/10 bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,.55),transparent_20%),linear-gradient(150deg,hsl(42_81%_62%),hsl(12_71%_48%))]" /><p className="absolute bottom-8 left-8 font-display text-2xl font-bold text-sidebar">Objects with a point of view.</p></div>
          <div className="absolute bottom-8 left-5 w-[245px] rotate-[-8deg] rounded-[24px] border border-white/15 bg-card p-3 text-foreground shadow-2xl"><div className="h-44 rounded-[17px] bg-[radial-gradient(circle_at_50%_25%,hsl(var(--accent)),transparent_25%),linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--sidebar)))]" /><div className="flex items-center justify-between px-2 pb-1 pt-3"><div><p className="font-display text-lg font-bold">The studio edit</p><p className="text-xs text-muted-foreground">A little less ordinary</p></div><ArrowRight size={17} className="text-primary" /></div></div>
          <span className="absolute bottom-0 right-0 grid size-20 place-items-center rounded-full bg-accent text-center font-mono-brand text-[10px] uppercase leading-4 tracking-[.1em] text-accent-foreground shadow-craft">Made<br />nearby</span>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-[1440px] px-5 py-14 lg:px-8">
      <div className="flex items-end justify-between gap-5"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-primary">Start with a feeling</p><h2 className="mt-2 font-display text-4xl font-bold tracking-[-.045em]">Browse by craft</h2></div><Link href="/browse" className="hidden items-center gap-1 text-sm font-bold text-secondary hover:text-primary sm:flex" data-testid="link-browse-all-categories">See all makers <ArrowRight size={16} /></Link></div>
      {categories.isLoading ? <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[116px] animate-pulse-soft rounded-2xl bg-muted" />)}</div> : categories.isError ? <StateMessage title="Categories took a breather" body="Try browsing all makers while we reconnect." action="Browse makers" href="/browse" /> : <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">{(categories.data ?? []).slice(0, 6).map((category) => <Link key={category.id} href={`/browse?category=${encodeURIComponent(category.name)}`} data-testid={`link-category-${category.id}`} className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-craft"><MarkIcon icon={category.icon} fallback="AC" /><p className="mt-4 text-sm font-bold">{category.name}</p><p className="mt-1 text-xs text-muted-foreground">{category.count} makers</p><ChevronRight size={15} className="mt-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" /></Link>)}</div>}
    </section>
    <section className="bg-muted/55">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8"><div className="mb-8 flex items-end justify-between gap-5"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-primary">Worth a closer look</p><h2 className="mt-2 font-display text-4xl font-bold tracking-[-.045em]">Makers to know</h2></div><Link href="/browse" className="flex items-center gap-1 text-sm font-bold text-secondary hover:text-primary" data-testid="link-discover-makers">Discover all <ArrowRight size={16} /></Link></div>{artisans.isLoading ? <LoadingCards count={4} /> : artisans.isError ? <StateMessage title="The shelves are being restocked" body="We couldn't load makers right now." action="Try browse" href="/browse" /> : makers.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{makers.map((artisan, index) => <ArtisanCard artisan={artisan} key={artisan.id} featured={index === 0} />)}</div> : <StateMessage title="Your next favorite maker is almost here" body="No featured makers yet. Explore the full marketplace." action="Browse all makers" href="/browse" />}</div>
    </section>
    <section className="mx-auto grid max-w-[1440px] gap-4 px-5 py-16 sm:grid-cols-3 lg:px-8">
      {[{ icon: UsersRound, title: 'People, not product pages', body: 'Know the maker, their process, and the place they call home.' }, { icon: ShieldCheck, title: 'Confidence built in', body: 'Clear prices, response times, and trust-checked profiles.' }, { icon: Clock3, title: 'A faster yes', body: 'Simple requests get you from “maybe” to making sooner.' }].map(({ icon: Icon, title, body }) => <div key={title} className="rounded-[22px] border border-border bg-card p-6"><Icon size={22} className="text-primary" /><h3 className="mt-5 font-display text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></div>)}
    </section>
  </AppShell>;
}

function StateMessage({ title, body, action, href }: { title: string; body: string; action: string; href: string }) {
  return <div className="rounded-[22px] border border-dashed border-border bg-card px-6 py-12 text-center"><p className="font-display text-2xl font-bold">{title}</p><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p><Link href={href} className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid={`link-state-${action.toLowerCase().replaceAll(' ', '-')}`}>{action}</Link></div>;
}