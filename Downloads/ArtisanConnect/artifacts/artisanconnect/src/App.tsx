import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Welcome from '@/pages/welcome';
import RoleOnboarding from '@/pages/role-onboarding';
import CustomerHome from '@/pages/customer-home';
import ArtisanHome from '@/pages/artisan-home';
import Browse from '@/pages/browse';
import Storefront from '@/pages/storefront';
import Requests from '@/pages/requests';
import Dashboard from '@/pages/dashboard';
import ProfileEdit from '@/pages/profile-edit';
import Profile from '@/pages/profile';
import { getStoredRole } from '@/lib/role';
import { setExtraHeadersGetter } from '@workspace/api-client-react';
import {
  Route,
  Redirect,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

// Lets the backend know which role (customer/artisan) this person chose
// during onboarding, the first time it ever creates their account row.
setExtraHeadersGetter(() => {
  const role = getStoredRole();
  return role ? { 'x-onboarding-role': role } : null;
});

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#c9472c',
    colorForeground: '#2e241d',
    colorMutedForeground: '#776c62',
    colorDanger: '#b42318',
    colorBackground: '#fffaf2',
    colorInput: '#fffdf9',
    colorInputForeground: '#2e241d',
    colorNeutral: '#ded2c3',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffaf2] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#ded2c3]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-display !text-[#2e241d]',
    headerSubtitle: '!text-[#776c62]',
    socialButtonsBlockButtonText: '!text-[#2e241d]',
    formFieldLabel: '!text-[#2e241d]',
    footerActionLink: '!text-[#c9472c]',
    footerActionText: '!text-[#776c62]',
    dividerText: '!text-[#776c62]',
    identityPreviewEditButton: '!text-[#c9472c]',
    formFieldSuccessText: '!text-[#1f6c55]',
    alertText: '!text-[#b42318]',
    logoBox: 'mb-3',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: '!border-[#ded2c3] !bg-white',
    formButtonPrimary: '!bg-[#c9472c] hover:!bg-[#a83d27]',
    formFieldInput: '!border-[#ded2c3] !bg-white',
    footerAction: '!bg-transparent',
    dividerLine: '!bg-[#ded2c3]',
    alert: '!border-[#f0b5a8] !bg-[#fff1ed]',
    otpCodeFieldInput: '!border-[#ded2c3]',
    formFieldRow: 'mb-4',
    main: 'gap-5',
  },
};

function LoadingPage() {
  return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="text-center"><div className="mx-auto size-10 animate-pulse rounded-2xl bg-primary" /><p className="mt-4 text-sm font-semibold text-muted-foreground">Loading your space…</p></div></div>;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <LoadingPage />;
  if (!isSignedIn) return <Welcome />;
  const role = getStoredRole();
  if (role === 'artisan') return <ArtisanHome />;
  if (role === 'customer') return <CustomerHome />;
  return <Welcome signedIn />;
}

function SignInPage() {
  const redirect = getStoredRole() === 'artisan' ? `${basePath}/artisan` : getStoredRole() === 'customer' ? `${basePath}/customer` : `${basePath}/`;
  return <div className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_12%_10%,hsl(var(--accent)/.35),transparent_25%),hsl(var(--background))] px-4 py-10"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={redirect} fallbackRedirectUrl={redirect} /></div>;
}

function SignUpPage() {
  const redirect = getStoredRole() === 'artisan' ? `${basePath}/artisan` : `${basePath}/customer`;
  return <div className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_12%_10%,hsl(var(--accent)/.35),transparent_25%),hsl(var(--background))] px-4 py-10"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={redirect} fallbackRedirectUrl={redirect} /></div>;
}

function AuthCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== userId) queryClient.clear();
    previousUser.current = userId;
  }), [addListener]);
  return null;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRoute} />
        <Route path="/choose-role"><Redirect to="/" /></Route>
        <Route path="/join/:role" component={RoleOnboarding} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/customer" component={CustomerHome} />
        <Route path="/artisan" component={ArtisanHome} />
        <Route path="/browse" component={Browse} />
        <Route path="/artisans/:id" component={Storefront} />
        <Route path="/requests" component={Requests} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/edit" component={ProfileEdit} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider
        publishableKey={clerkPubKey}
        proxyUrl={clerkProxyUrl}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        routerPush={(to) => window.history.pushState({}, '', to)}
        routerReplace={(to) => window.history.replaceState({}, '', to)}
      >
        <QueryClientProvider client={queryClient}>
          <AuthCacheInvalidator />
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </WouterRouter>
  );
}

export default App;
