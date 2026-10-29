import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Check, ImagePlus, LoaderCircle, Plus, Save, UploadCloud, X } from 'lucide-react';
import { Link } from 'wouter';
import { getGetProfileQueryKey, useCreatePortfolioItem, useGetProfile, useRequestUploadUrl, useUpdateProfile } from '@workspace/api-client-react';
import type { PortfolioItemInput, ProfileUpdate } from '@workspace/api-client-react';
import { AppShell } from '@/components/app-shell';
import { MediaPreview } from '@/components/artisan-ui';

const initialProfile: ProfileUpdate = { name: '', craft: '', region: '', bio: '', startingPrice: 0 };

export default function ProfileEdit() {
  const updateProfile = useUpdateProfile();
  const existingProfile = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const createPortfolio = useCreatePortfolioItem();
  const requestUpload = useRequestUploadUrl();
  const [profile, setProfile] = useState<ProfileUpdate>(initialProfile);
  const [notice, setNotice] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [portfolioForm, setPortfolioForm] = useState({ title: '', description: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!existingProfile.data) return;
    const { name, craft, region, bio, startingPrice } = existingProfile.data;
    setProfile({ name, craft, region, bio, startingPrice });
  }, [existingProfile.data]);
  const saveProfile = (event: FormEvent) => { event.preventDefault(); updateProfile.mutate({ data: profile }, { onSuccess: () => setNotice('Studio profile saved.'), onError: () => setNotice('We could not save your profile yet.') }); };
  const chooseFile = (file?: File) => { if (!file) return; if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { setUploadError('Please choose an image or video file.'); return; } setUploadError(''); setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); };
  const publishWork = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !portfolioForm.title.trim()) { setUploadError('Add a title and choose a file before publishing.'); return; }
    setUploadError('');
    try {
      const signed = await requestUpload.mutateAsync({ data: { name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type } });
      const response = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': selectedFile.type }, body: selectedFile });
      if (!response.ok) throw new Error('Upload failed');
       const item: PortfolioItemInput = { title: portfolioForm.title, description: portfolioForm.description, mediaUrl: `/api/storage${signed.objectPath}`, mediaType: selectedFile.type.startsWith('video/') ? 'video' : 'image' };
      await createPortfolio.mutateAsync({ data: item });
      setNotice('New work added to your portfolio.'); setPortfolioForm({ title: '', description: '' }); setSelectedFile(null); setPreviewUrl('');
    } catch { setUploadError('The upload did not finish. Check the file and try again.'); }
  };
  const setField = (key: keyof ProfileUpdate, value: string | number) => setProfile((old) => ({ ...old, [key]: value }));
  return <AppShell><div className="mx-auto max-w-[1100px] px-5 py-9 lg:px-8 lg:py-12">
     <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary" data-testid="link-back-profile"><ArrowLeft size={16} /> View my profile</Link>
    <div className="mt-7"><p className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-primary">Your studio</p><h1 className="mt-2 font-display text-5xl font-bold tracking-[-.055em]">Make the work easy to find.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">A clear profile is the first hello. Show people what you do, where you do it, and why it matters.</p></div>
    {notice && <div className="mt-7 flex items-center gap-3 rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-3 text-sm font-semibold text-secondary" data-testid="status-profile-notice"><Check size={17} /> {notice}<button className="ml-auto" onClick={() => setNotice('')} aria-label="Dismiss status" data-testid="button-dismiss-profile-notice"><X size={15} /></button></div>}
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_.84fr]"><form onSubmit={saveProfile} className="rounded-[24px] border border-border bg-card p-6 shadow-craft sm:p-8"><div className="flex items-center justify-between"><div><h2 className="font-display text-2xl font-bold">Profile details</h2><p className="mt-1 text-xs text-muted-foreground">Keep it specific. The right people will notice.</p></div><Save size={19} className="text-primary" /></div><div className="mt-7 space-y-4"><label className="block text-sm font-semibold">Studio or name<input value={profile.name} onChange={(e) => setField('name', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Mara Bell Studio" data-testid="input-profile-name" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">What you make<input value={profile.craft} onChange={(e) => setField('craft', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Ceramic tableware" data-testid="input-profile-craft" /></label><label className="block text-sm font-semibold">Based in<input value={profile.region} onChange={(e) => setField('region', e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Austin, TX" data-testid="input-profile-region" /></label></div><label className="block text-sm font-semibold">Your story<textarea value={profile.bio} onChange={(e) => setField('bio', e.target.value)} className="mt-2 min-h-36 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-primary" placeholder="Tell a customer what pulls you to this work, what your process looks like, and what you care about." data-testid="textarea-profile-bio" /></label><label className="block text-sm font-semibold">Projects start at<input type="number" min="0" value={profile.startingPrice || ''} onChange={(e) => setField('startingPrice', Number(e.target.value))} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="180" data-testid="input-profile-price" /></label></div><button disabled={updateProfile.isPending} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60" data-testid="button-save-profile">{updateProfile.isPending ? 'Saving…' : 'Save profile'} <ArrowLeft size={15} className="rotate-180" /></button></form>
      <div className="space-y-8"><form onSubmit={publishWork} className="rounded-[24px] border border-border bg-card p-6 shadow-craft sm:p-8"><div className="flex items-center justify-between"><div><h2 className="font-display text-2xl font-bold">Add a work sample</h2><p className="mt-1 text-xs text-muted-foreground">Images and short videos welcome.</p></div><ImagePlus size={19} className="text-primary" /></div><button type="button" onClick={() => inputRef.current?.click()} className="mt-6 flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center transition-colors hover:bg-primary/10" data-testid="button-choose-portfolio-file">{previewUrl ? selectedFile?.type.startsWith('video/') ? <video src={previewUrl} className="max-h-40 rounded-xl object-contain" muted controls /> : <img src={previewUrl} alt="Selected preview" className="max-h-40 rounded-xl object-contain" /> : <><UploadCloud size={25} className="text-primary" /><span className="mt-3 text-sm font-bold">Choose an image or video</span><span className="mt-1 text-xs text-muted-foreground">Preview it here before it goes live</span></>}<input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} data-testid="input-portfolio-file" /></button><label className="mt-5 block text-sm font-semibold">Title<input value={portfolioForm.title} onChange={(e) => setPortfolioForm((old) => ({ ...old, title: e.target.value }))} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="The blue hour collection" data-testid="input-portfolio-title" /></label><label className="mt-4 block text-sm font-semibold">Short description<textarea value={portfolioForm.description} onChange={(e) => setPortfolioForm((old) => ({ ...old, description: e.target.value }))} className="mt-2 min-h-20 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="A sentence about the piece or process." data-testid="textarea-portfolio-description" /></label>{uploadError && <p className="mt-4 text-xs font-semibold text-destructive" data-testid="status-upload-error">{uploadError}</p>}<button disabled={requestUpload.isPending || createPortfolio.isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground disabled:opacity-60" data-testid="button-publish-portfolio">{requestUpload.isPending || createPortfolio.isPending ? <><LoaderCircle size={16} className="animate-spin" /> Uploading…</> : <><Plus size={16} /> Publish work</>}</button></form>
      </div>
    </div>
  </div></AppShell>;
}