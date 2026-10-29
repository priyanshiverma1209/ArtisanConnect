export type UserRole = 'customer' | 'artisan';

const ROLE_KEY = 'artisanconnect-role';
const PROFILE_KEY = 'artisanconnect-onboarding';

export function getStoredRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(ROLE_KEY);
  return value === 'customer' || value === 'artisan' ? value : null;
}

export function saveRole(role: UserRole) {
  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearStoredRole() {
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}

export function saveOnboarding(role: UserRole, data: Record<string, string>) {
  saveRole(role);
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ role, ...data }));
}

export function getOnboarding() {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(PROFILE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return null;
  }
}