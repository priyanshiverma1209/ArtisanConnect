import { ArrowLeft, ArrowRight, CheckCircle2, Hammer, Phone, ShieldCheck, ShoppingBag } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { saveOnboarding, type UserRole } from '@/lib/role';

export default function RoleOnboarding() {
  const [, params] = useRoute('/join/:role');
  const role: UserRole = params?.role === 'artisan' ? 'artisan' : 'customer';
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: '', contact: '', city: '', craft: '', years: '', bio: '' });
  const [error, setError] = useState('');
  const isArtisan = role === 'artisan';
  const update = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.contact.trim() || (isArtisan && (!form.city.trim() || !form.craft.trim()))) {
      setError(isArtisan ? 'Please fill in your name, phone or email, city, and the work you do.' : 'Please enter your name and phone or email.');
      return;
    }
    saveOnboarding(role, form);
    setLocation('/sign-up');
  };
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_12%_10%,hsl(var(--accent)/.4),transparent_24%),hsl(var(--background))] px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary" data-testid="link-back-role-choice"><ArrowLeft size={16} /> Back</Link>
        <div className="mt-12 grid gap-12 lg:grid-cols-[.78fr_1fr] lg:items-start">
          <div>
            <span className={`grid size-14 place-items-center rounded-2xl ${isArtisan ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{isArtisan ? <Hammer size={27} /> : <ShoppingBag size={27} />}</span>
            <p className="mt-7 font-mono-brand text-[11px] uppercase tracking-[.18em] text-primary">Step 1 of 2</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[.95] tracking-[-.055em]">{isArtisan ? 'Tell customers about your work.' : 'Tell us a little about you.'}</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">{isArtisan ? 'These details help us check your profile and connect you with the right customer requests.' : 'Keep it simple. You only need a name and one way for us to verify your account.'}</p>
            <div className="mt-9 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><CheckCircle2 size={17} className="text-secondary" /> Easy to understand</p>
              <p className="flex items-center gap-2"><ShieldCheck size={17} className="text-secondary" /> Your account is verified safely</p>
              <p className="flex items-center gap-2"><Phone size={17} className="text-secondary" /> We never show your private contact details</p>
            </div>
          </div>
          <form onSubmit={submit} className="rounded-[28px] border border-border bg-card p-6 shadow-craft sm:p-8" data-testid={`form-onboarding-${role}`}>
            <div className="grid gap-5">
              <label className="text-sm font-bold">Your full name<input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:border-primary" placeholder={isArtisan ? 'For example: Ananya Mehta' : 'For example: Priya Shah'} data-testid="input-onboarding-name" /></label>
              <label className="text-sm font-bold">Phone number or email<input value={form.contact} onChange={(e) => update('contact', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:border-primary" placeholder="you@example.com or 98765 43210" data-testid="input-onboarding-contact" /></label>
              {isArtisan && <><label className="text-sm font-bold">Your city or village<input value={form.city} onChange={(e) => update('city', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:border-primary" placeholder="Jaipur, Rajasthan" data-testid="input-onboarding-city" /></label><label className="text-sm font-bold">What work do you do?<input value={form.craft} onChange={(e) => update('craft', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:border-primary" placeholder="Pottery, tailoring, woodwork…" data-testid="input-onboarding-craft" /></label><label className="text-sm font-bold">How many years have you done this? <span className="font-normal text-muted-foreground">(optional)</span><input value={form.years} onChange={(e) => update('years', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm outline-none focus:border-primary" placeholder="8 years" data-testid="input-onboarding-years" /></label><label className="text-sm font-bold">Tell us about your work <span className="font-normal text-muted-foreground">(optional)</span><textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} className="mt-2 min-h-28 w-full resize-y rounded-xl border border-input bg-background px-4 py-3.5 text-sm leading-6 outline-none focus:border-primary" placeholder="What do you make? What makes your work special?" data-testid="textarea-onboarding-bio" /></label></>}
            </div>
            {error && <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert" data-testid="status-onboarding-error">{error}</p>}
            <button className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground" data-testid="button-continue-onboarding">Continue to verification <ArrowRight size={17} /></button>
            <p className="mt-4 text-center text-xs text-muted-foreground">Next, we will verify your phone or email.</p>
          </form>
        </div>
      </div>
    </main>
  );
}