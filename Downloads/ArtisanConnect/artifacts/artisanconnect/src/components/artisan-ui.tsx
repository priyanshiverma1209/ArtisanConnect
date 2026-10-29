import { useState } from 'react';
import { Link } from 'wouter';
import { Check, Heart, MapPin, Play, Star, Verified } from 'lucide-react';
import type { ArtisanSummary, PortfolioItem } from '@workspace/api-client-react';

export function MarkIcon({ icon, fallback }: { icon?: string; fallback: string }) {
  return <span className="grid size-10 place-items-center rounded-xl bg-accent/55 text-xl">{icon || fallback}</span>;
}

export function Stars({ rating }: { rating: number }) {
  return <span className="inline-flex items-center gap-1 text-sm font-semibold"><Star size={14} fill="currentColor" className="text-accent" /> {rating.toFixed(1)}</span>;
}

export function ArtisanCard({ artisan, featured = false }: { artisan: ArtisanSummary; featured?: boolean }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className={`group relative overflow-hidden rounded-[22px] border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-craft-md ${featured ? 'md:col-span-2 md:grid md:grid-cols-[1.1fr_1fr]' : ''}`} data-testid={`card-artisan-${artisan.id}`}>
      <Link href={`/artisans/${artisan.id}`} className={`relative block overflow-hidden bg-muted ${featured ? 'min-h-[260px] md:min-h-full' : 'aspect-[1.18]'} `} data-testid={`link-artisan-image-${artisan.id}`}>
        {artisan.imageUrl ? <img src={artisan.imageUrl} alt={artisan.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_35%_25%,hsl(var(--accent)),transparent_30%),linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--sidebar)))]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70" />
        {artisan.featured && <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1.5 font-mono-brand text-[10px] font-medium uppercase tracking-[.14em] text-accent-foreground">Featured</span>}
        <button onClick={(event) => { event.preventDefault(); setSaved((value) => !value); }} className={`absolute right-4 top-4 grid size-9 place-items-center rounded-full backdrop-blur-md transition-all ${saved ? 'bg-primary text-primary-foreground' : 'bg-card/80 text-foreground hover:bg-card'}`} aria-label={saved ? `Remove ${artisan.name} from saved` : `Save ${artisan.name}`} data-testid={`button-save-artisan-${artisan.id}`}>
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
          <div><p className="font-display text-xl font-semibold leading-tight">{artisan.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-white/80"><MapPin size={12} /> {artisan.region}</p></div>
          {artisan.verified && <span className="grid size-7 place-items-center rounded-full bg-secondary text-white" title="Verified maker"><Check size={14} strokeWidth={3} /></span>}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-bold">{artisan.craft}</p><p className="mt-1 text-xs text-muted-foreground">From ${artisan.startingPrice.toLocaleString()} · {artisan.reviewCount} reviews</p></div>
          <Stars rating={artisan.rating} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {artisan.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{tag}</span>)}
        </div>
      </div>
    </article>
  );
}

export function MediaPreview({ item, large = false }: { item: PortfolioItem; large?: boolean }) {
  return <div className={`group relative overflow-hidden bg-muted ${large ? 'aspect-[1.35] rounded-[20px]' : 'aspect-square rounded-2xl'}`} data-testid={`media-preview-${item.id}`}>
    {item.mediaType === 'video' ? <video src={item.mediaUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" /> : <img src={item.mediaUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
    {item.mediaType === 'video' && <span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-card/90 text-primary shadow-craft"><Play size={14} fill="currentColor" /></span>}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-12 text-white"><p className="font-semibold">{item.title}</p><p className="mt-0.5 line-clamp-1 text-xs text-white/75">{item.description}</p></div>
  </div>;
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: count }).map((_, index) => <div key={index} className="overflow-hidden rounded-[22px] border border-border bg-card" data-testid={`skeleton-artisan-${index}`}><div className="aspect-[1.18] animate-pulse-soft bg-muted" /><div className="space-y-3 p-5"><div className="h-4 w-2/3 animate-pulse-soft rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse-soft rounded bg-muted" /><div className="h-7 w-full animate-pulse-soft rounded bg-muted" /></div></div>)}</div>;
}

export function VerifiedLine() {
  return <span className="inline-flex items-center gap-1 font-mono-brand text-[10px] uppercase tracking-[.12em] text-secondary"><Verified size={13} fill="currentColor" /> Trust-checked</span>;
}