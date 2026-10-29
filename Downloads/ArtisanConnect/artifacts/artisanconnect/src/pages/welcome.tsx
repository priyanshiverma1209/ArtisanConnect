import { ArrowRight, Hammer, HeartHandshake, ShoppingBag, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useClerk } from '@clerk/react';
import { saveRole } from '@/lib/role';

export default function Welcome({ signedIn = false }: { signedIn?: boolean }) {
  const { signOut } = useClerk();
  const choose = (role: 'customer' | 'artisan') => saveRole(role);
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_80%_0%,hsl(var(--accent)/.45),transparent_28%),hsl(var(--background))] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-welcome-brand">
            <span className="grid size-10 rotate-[-8deg] place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={19} /></span>
            <span className="font-display text-2xl font-bold tracking-[-.04em]">artisan<span className="text-primary">connect</span></span>
          </Link>
          {signedIn ? <button onClick={() => signOut({ redirectUrl: '/' })} className="text-sm font-bold text-muted-foreground hover:text-primary" data-testid="button-sign-out">Sign out</button> : <Link href="/sign-in" className="text-sm font-bold text-secondary hover:text-primary" data-testid="link-existing-account">I already have an account</Link>}
        </header>
        <section className="py-16 lg:py-24">
          <p className="font-mono-brand text-[11px] uppercase tracking-[.18em] text-primary">Welcome to ArtisanConnect</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold leading-[.95] tracking-[-.055em] sm:text-7xl">First, tell us how you will use this app.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Choose one option. We will show you only the things you need.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <Link href="/join/customer" onClick={() => choose('customer')} className="group rounded-[28px] border border-border bg-card p-7 shadow-craft transition-all hover:-translate-y-1 hover:border-secondary/45 hover:shadow-craft-md" data-testid="link-choose-customer">
              <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><ShoppingBag size={27} /></span>
              <h2 className="mt-9 font-display text-3xl font-bold">I am a customer</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">I want to find an artisan, see their work, or ask someone to make something for me.</p>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-secondary group-hover:text-primary">Start as a customer <ArrowRight size={16} /></span>
            </Link>
            <Link href="/join/artisan" onClick={() => choose('artisan')} className="group rounded-[28px] border border-border bg-card p-7 shadow-craft transition-all hover:-translate-y-1 hover:border-primary/45 hover:shadow-craft-md" data-testid="link-choose-artisan">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Hammer size={27} /></span>
              <h2 className="mt-9 font-display text-3xl font-bold">I am an artisan</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">I make things and want to show my work, meet customers, and receive new requests.</p>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:text-secondary">Start as an artisan <ArrowRight size={16} /></span>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><HeartHandshake size={15} className="text-primary" /> You can change your choice later.</div>
        </section>
        <p className="pb-4 text-xs text-muted-foreground">Made for people who value human work.</p>
      </div>
    </main>
  );
}