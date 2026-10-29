import { useMemo } from 'react';
import { ArrowLeft, Edit3, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useUser } from '@clerk/react';
import { Link } from 'wouter';
import { getGetProfileQueryKey, useGetProfile } from '@workspace/api-client-react';
import { AppShell } from '@/components/app-shell';
import { MediaPreview } from '@/components/artisan-ui';
import { getOnboarding, getStoredRole } from '@/lib/role';
import { ReviewsSection } from '@/components/reviews';

export default function Profile() {
  const role = getStoredRole() ?? 'customer';
  const { user } = useUser();
  const artisanProfile = useGetProfile({
    query: {
      queryKey: getGetProfileQueryKey(),
      enabled: role === 'artisan',
    },
  });
  const customerProfile = useMemo(() => getOnboarding(), []);

  if (role === 'artisan') {
    if (artisanProfile.isLoading) return <AppShell><ProfileLoading /></AppShell>;
    if (artisanProfile.isError || !artisanProfile.data) return <AppShell><ProfileError onRetry={() => artisanProfile.refetch()} /></AppShell>;
    const profile = artisanProfile.data;
    return <AppShell><div className="mx-auto max-w-[1100px] px-5 py-9 lg:px-8 lg:py-12">
      <Link href="/artisan" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary" data-testid="link-back-artisan-home"><ArrowLeft size={16} /> Back to home</Link>
      <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-primary">My profile</p><h1 className="mt-2 font-display text-5xl font-bold tracking-[-.055em]">{profile.name}</h1><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={15} /> {profile.region}</p></div><Link href="/profile/edit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-edit-profile"><Edit3 size={16} /> Edit profile</Link></div>
      <section className="mt-10 overflow-hidden rounded-[28px] border border-border bg-card shadow-craft"><div className="grid gap-0 lg:grid-cols-[.75fr_1.25fr]"><div className="min-h-64 bg-muted">{profile.imageUrl ? <img src={profile.imageUrl} alt={profile.name} className="h-full min-h-64 w-full object-cover" /> : <div className="grid h-full min-h-64 place-items-center bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--secondary)))]"><UserRound size={64} className="text-white/70" /></div>}</div><div className="p-7 sm:p-10"><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">{profile.craft}</span>{profile.verified && <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-bold text-secondary"><ShieldCheck size={14} /> Verified artisan</span>}</div><h2 className="mt-6 font-display text-3xl font-bold">What customers see</h2><p className="mt-3 text-base leading-7 text-muted-foreground">{profile.bio || 'Add a short story so customers can understand your work.'}</p><div className="mt-8 grid gap-4 sm:grid-cols-3"><Info label="Experience" value={profile.experience || 'Not added yet'} /><Info label="Starting price" value={profile.startingPrice ? `₹${profile.startingPrice.toLocaleString()}` : 'Not added yet'} /><Info label="Projects done" value={String(profile.completedProjects)} /></div></div></div></section>
      <section className="mt-10"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-primary">Your work</p><h2 className="mt-2 font-display text-3xl font-bold">Photos and videos you added</h2></div>{profile.portfolio.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2">{profile.portfolio.map((item) => <div key={item.id}><MediaPreview item={item} large /></div>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"><p className="font-display text-xl font-bold">No work added yet.</p><p className="mt-2 text-sm text-muted-foreground">Add a photo or video to help customers choose you.</p><Link href="/profile/edit" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="link-add-first-work">Add my work</Link></div>}</section>
      <ReviewsSection artisanId={profile.id} />
    </div></AppShell>;
  }

  const name = customerProfile?.name || user?.fullName || user?.firstName || 'Your profile';
  const contact = customerProfile?.contact || user?.primaryEmailAddress?.emailAddress || user?.primaryPhoneNumber?.phoneNumber || 'Not added yet';
  return <AppShell><div className="mx-auto max-w-[900px] px-5 py-9 lg:px-8 lg:py-12">
    <Link href="/customer" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary" data-testid="link-back-customer-home"><ArrowLeft size={16} /> Back to home</Link>
    <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-primary">My profile</p><h1 className="mt-2 font-display text-5xl font-bold tracking-[-.055em]">{name}</h1><p className="mt-3 text-sm text-muted-foreground">Customer account</p></div><span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-2 text-xs font-bold text-secondary"><ShieldCheck size={14} /> Account verified by Clerk</span></div>
    <section className="mt-10 rounded-[28px] border border-border bg-card p-7 shadow-craft sm:p-10"><h2 className="font-display text-3xl font-bold">Your details</h2><p className="mt-2 text-sm text-muted-foreground">This is the information you gave us when you joined.</p><div className="mt-8 grid gap-5 sm:grid-cols-2"><Info label="Name" value={name} /><Info label="Phone or email" value={contact} icon={contact.includes('@') ? <Mail size={16} /> : <Phone size={16} />} /></div></section>
    <Link href="/requests" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-customer-profile-request">Tell an artisan what you need</Link>
  </div></AppShell>;
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-2xl bg-muted/60 p-4"><p className="text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">{label}</p><p className="mt-2 flex items-center gap-2 text-sm font-bold">{icon}{value}</p></div>;
}

function ProfileLoading() {
  return <div className="mx-auto max-w-[1100px] px-5 py-14 lg:px-8"><div className="h-10 w-56 animate-pulse-soft rounded bg-muted" /><div className="mt-10 h-96 animate-pulse-soft rounded-[28px] bg-muted" /></div>;
}

function ProfileError({ onRetry }: { onRetry: () => void }) {
  return <div className="mx-auto max-w-xl px-5 py-28 text-center"><p className="font-display text-3xl font-bold">We could not load your profile.</p><p className="mt-2 text-sm text-muted-foreground">Please try again.</p><button onClick={onRetry} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground" data-testid="button-retry-profile">Try again</button></div>;
}