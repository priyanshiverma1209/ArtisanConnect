import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { useArtisanReviews, useMyReviewedJobs, useSubmitReview } from '@/lib/extra-api';

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} className={n <= Math.round(value) ? 'text-accent' : 'text-muted-foreground/30'} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />)}
  </span>;
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
    {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => onChange(n)} role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} className="rounded-md p-1 transition-transform hover:scale-110" data-testid={`button-star-${n}`}>
      <Star size={30} className={n <= value ? 'text-accent' : 'text-muted-foreground/40'} fill={n <= value ? 'currentColor' : 'none'} />
    </button>)}
    {value > 0 && <span className="ml-2 text-sm font-semibold text-muted-foreground">{RATING_WORDS[value]}</span>}
  </div>;
}

/** Shown to the customer under a completed job, so they can rate the artisan. */
export function ReviewForm({ connectionId, artisanName }: { connectionId: string; artisanName: string }) {
  const reviewed = useMyReviewedJobs();
  const submit = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  if (reviewed.isLoading) return null;
  if ((reviewed.data ?? []).includes(connectionId) || submit.isSuccess) {
    return <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-secondary" data-testid={`status-reviewed-${connectionId}`}><CheckCircle2 size={15} /> Thank you! Your review for {artisanName} is published.</p>;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (rating < 1) { setError('Please tap the stars to give a rating.'); return; }
    setError('');
    submit.mutate({ connectionId, rating, comment }, { onError: () => setError('We could not save your review. Please try again.') });
  };

  return <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-accent/60 bg-accent/20 p-4" data-testid={`form-review-${connectionId}`}>
    <p className="font-display text-lg font-bold">How was your experience with {artisanName}?</p>
    <p className="mt-1 text-xs text-muted-foreground">Your honest review helps other customers choose.</p>
    <div className="mt-3"><span className="text-sm font-semibold">Rating <span className="text-destructive">*</span></span><StarInput value={rating} onChange={setRating} /></div>
    <label className="mt-3 block text-sm font-semibold">Feedback <span className="font-normal text-muted-foreground">(optional)</span>
      <textarea value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} className="mt-2 min-h-20 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="What did you like? Quality, communication, delivery on time..." data-testid="textarea-review-comment" />
    </label>
    {error && <p className="mt-2 text-xs font-semibold text-destructive" role="alert">{error}</p>}
    <button disabled={submit.isPending} className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid="button-submit-review">{submit.isPending ? 'Submitting...' : 'Submit review'}</button>
  </form>;
}

/** Public ratings summary + list of reviews for one artisan. */
export function ReviewsSection({ artisanId }: { artisanId: string }) {
  const data = useArtisanReviews(artisanId);
  const summary = data.data;
  return <section className="mt-14" data-testid="section-reviews">
    <p className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-primary">Ratings and reviews</p>
    <h2 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">What customers say</h2>
    {data.isLoading ? <div className="mt-7 h-40 animate-pulse-soft rounded-2xl bg-muted" /> : data.isError || !summary ? <p className="mt-6 text-sm text-muted-foreground">Reviews could not be loaded right now.</p> : summary.count === 0 ? <div className="mt-7 rounded-[22px] border border-dashed border-border bg-card px-6 py-12 text-center"><Star size={22} className="mx-auto text-primary" /><p className="mt-3 font-display text-2xl font-bold">No reviews yet.</p><p className="mt-2 text-sm text-muted-foreground">Reviews appear here after a customer completes a job with this artisan.</p></div> : <div className="mt-7 grid gap-6 md:grid-cols-[260px_1fr]">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="font-display text-5xl font-bold">{summary.average.toFixed(1)}</p>
        <div className="mt-2"><StarRow value={summary.average} size={18} /></div>
        <p className="mt-1 text-xs text-muted-foreground">{summary.count} review{summary.count === 1 ? '' : 's'}</p>
        <div className="mt-4 space-y-1.5">{[5, 4, 3, 2, 1].map((n) => { const c = summary.distribution[String(n)] ?? 0; return <div key={n} className="flex items-center gap-2 text-xs"><span className="w-3 font-semibold">{n}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(c / summary.count) * 100}%` }} /></div><span className="w-4 text-right text-muted-foreground">{c}</span></div>; })}</div>
      </div>
      <div className="space-y-4">{summary.reviews.map((review) => <article key={review.id} className="rounded-2xl border border-border bg-card p-5" data-testid={`review-${review.id}`}>
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{review.customerName.charAt(0).toUpperCase()}</span><div><p className="text-sm font-bold">{review.customerName}</p><StarRow value={review.rating} size={13} /></div></div><span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        {review.comment && <p className="mt-3 text-sm leading-6 text-foreground/80">{review.comment}</p>}
      </article>)}</div>
    </div>}
  </section>;
}