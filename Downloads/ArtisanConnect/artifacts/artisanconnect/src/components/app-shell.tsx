import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { Compass, LayoutDashboard, LogOut, Menu, Plus, Search, Sparkles, UserRound, X } from 'lucide-react';
import { clearStoredRole, getStoredRole } from '@/lib/role';
import { NotificationBell } from '@/components/notification-bell';

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = getStoredRole() ?? 'customer';
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  const nav = role === 'artisan' ? [
    { href: '/artisan', label: 'Home', icon: Compass },
    { href: '/requests', label: 'Customer requests', icon: Search },
    { href: '/profile', label: 'My profile', icon: UserRound },
    { href: '/dashboard', label: 'My activity', icon: LayoutDashboard },
  ] : [
    { href: '/customer', label: 'Home', icon: Compass },
    { href: '/browse', label: 'Find artisans', icon: Search },
    { href: '/requests', label: 'My requests', icon: Plus },
    { href: '/dashboard', label: 'My activity', icon: LayoutDashboard },
  ];
  return (
    <div className="grain min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center gap-5 px-5 lg:px-8">
          <button className="rounded-lg p-2 md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu" data-testid="button-toggle-menu">
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link href="/" className="group flex items-center gap-2.5" data-testid="link-brand">
            <span className="grid size-9 rotate-[-8deg] place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-craft transition-transform group-hover:rotate-0">
              <Sparkles size={18} strokeWidth={2.5} />
            </span>
            <span className="font-display text-[23px] font-bold tracking-[-.04em]">artisan<span className="text-primary">connect</span></span>
          </Link>
          <div className="hidden h-8 w-px bg-border md:block" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${location === href ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
              <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-craft sm:flex" data-testid="link-profile">
              <span className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground"><UserRound size={13} /></span>
              My profile
            </Link>
            <button onClick={() => { clearStoredRole(); void signOut({ redirectUrl: basePath }); }} className="hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary sm:flex" data-testid="button-logout"><LogOut size={15} /> Log out</button>
            {role === 'customer' && <Link href="/requests" className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-craft transition-all hover:-translate-y-0.5 hover:shadow-craft-md" aria-label="Post a request" data-testid="link-post-request"><Plus size={18} /></Link>}
          </div>
        </div>
        {mobileOpen && (
          <nav className="animate-fade border-t border-border bg-card px-5 py-3 md:hidden" aria-label="Mobile">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`} className="flex items-center gap-3 border-b border-border/60 py-3.5 text-sm font-semibold last:border-0">
                <Icon size={17} className="text-primary" /> {label}
              </Link>
            ))}
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 border-b border-border/60 py-3.5 text-sm font-semibold" data-testid="link-mobile-profile"><UserRound size={17} className="text-primary" /> My profile</Link>
            <button onClick={() => { clearStoredRole(); void signOut({ redirectUrl: basePath }); }} className="flex w-full items-center gap-3 py-3.5 text-left text-sm font-semibold text-muted-foreground" data-testid="button-mobile-logout"><LogOut size={17} className="text-primary" /> Log out</button>
          </nav>

        )}
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-sidebar px-5 py-12 text-sidebar-foreground lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-2xl font-bold">Made by hand.<br /><span className="text-accent">Found with heart.</span></p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-sidebar-foreground/65">A brighter way to find the people behind the things worth keeping.</p>
          </div>
          <div className="font-mono-brand text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/55">ArtisanConnect · 2024 / Made for makers</div>
        </div>
      </footer>
    </div>
  );
}
