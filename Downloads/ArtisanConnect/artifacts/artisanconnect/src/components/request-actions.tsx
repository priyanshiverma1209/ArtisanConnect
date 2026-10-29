import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, ChevronDown, Phone, Send, UserRound } from 'lucide-react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListConnectionMessagesQueryKey,
  getListConnectionsQueryKey,
  getListRequestsQueryKey,
  useAcceptConnection,
  useCompleteConnection,
  useConnectToRequest,
  useListConnectionMessages,
  useListConnections,
  useSendConnectionMessage,
} from '@workspace/api-client-react';
import type { Connection } from '@workspace/api-client-react';
import { ReviewForm } from '@/components/reviews';

const inputClass = 'mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary';

function useConnectionsList() {
  return useListConnections({ query: { queryKey: getListConnectionsQueryKey(), refetchInterval: 8000 } });
}

/** Real chat between a customer and the artisan whose response they accepted. */
function ChatPanel({ connectionId, side }: { connectionId: string; side: 'customer' | 'artisan' }) {
  const queryClient = useQueryClient();
  const messages = useListConnectionMessages(connectionId, {
    query: { queryKey: getListConnectionMessagesQueryKey(connectionId), refetchInterval: 4000 },
  });
  const send = useSendConnectionMessage();
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [error, setError] = useState('');
  const items = messages.data ?? [];

  const post = (body: string, kind: 'text' | 'contact', onDone: () => void) => {
    setError('');
    send.mutate(
      { connectionId, data: { body, kind } },
      {
        onSuccess: () => {
          onDone();
          queryClient.invalidateQueries({ queryKey: getListConnectionMessagesQueryKey(connectionId) });
        },
        onError: () => setError('Your message was not sent. Please try again.'),
      },
    );
  };

  const submitText = (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    post(body, 'text', () => setText(''));
  };

  const submitContact = (event: FormEvent) => {
    event.preventDefault();
    const body = contact.trim();
    if (!body) return;
    post(body, 'contact', () => {
      setContact('');
      setContactOpen(false);
    });
  };

  return <div className="mt-3 rounded-xl border border-border bg-background p-3" data-testid={`chat-${connectionId}`}>
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {messages.isLoading ? <div className="h-16 animate-pulse-soft rounded-xl bg-muted" /> : items.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No messages yet. Say hello to start planning the work.</p> : items.map((item) => {
        const mine = item.senderRole === side;
        return <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${item.kind === 'contact' ? 'border border-accent bg-accent/30' : mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {item.kind === 'contact' && <p className="mb-0.5 flex items-center gap-1 text-xs font-bold"><Phone size={12} /> {mine ? 'You shared your contact details' : `Contact details from the ${item.senderRole}`}</p>}
            <p className="whitespace-pre-wrap break-words">{item.body}</p>
            <p className="mt-0.5 text-[10px] opacity-60">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>;
      })}
    </div>
    <form onSubmit={submitText} className="mt-3 flex gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Type a message" data-testid={`input-message-${connectionId}`} />
      <button disabled={send.isPending || !text.trim()} className="grid w-11 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50" aria-label="Send message" data-testid={`button-send-message-${connectionId}`}><Send size={15} /></button>
    </form>
    {contactOpen ? <form onSubmit={submitContact} className="mt-2 flex gap-2">
      <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Phone number or email" data-testid={`input-contact-${connectionId}`} />
      <button disabled={send.isPending || !contact.trim()} className="rounded-xl bg-secondary px-3 text-xs font-bold text-secondary-foreground disabled:opacity-50">Share</button>
      <button type="button" onClick={() => setContactOpen(false)} className="rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">Cancel</button>
    </form> : <button type="button" onClick={() => setContactOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-secondary hover:text-primary" data-testid={`button-share-contact-${connectionId}`}><Phone size={12} /> Share my contact details (optional)</button>}
    {error && <p className="mt-2 text-xs font-semibold text-destructive" role="alert">{error}</p>}
  </div>;
}

function ArtisanConnectionCard({ connection }: { connection: Connection }) {
  const { status, request } = connection;
  return <div className="mt-4 rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary" data-testid={`status-responded-${connection.requestId}`}>
    {status === 'accepted' ? <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={15} /> {request.status === 'completed' ? 'Job completed' : 'The customer accepted your response'}</p>
      : status === 'declined' ? <p className="font-bold">The customer chose another artisan</p>
      : <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={15} /> You responded{connection.quote > 0 ? ` with a quote of ₹${connection.quote.toLocaleString()}` : ''}. Waiting for the customer to choose.</p>}
    <p className="mt-1 text-foreground/70">{connection.message}</p>
    {status === 'accepted' && <ChatPanel connectionId={connection.id} side="artisan" />}
  </div>;
}

/** Shown to an artisan under each customer request: respond, then follow the job through chat. */
export function RespondPanel({ requestId, isOpen }: { requestId: string; isOpen: boolean }) {
  const queryClient = useQueryClient();
  const connections = useConnectionsList();
  const connect = useConnectToRequest();
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [quote, setQuote] = useState('');
  const [error, setError] = useState('');

  const existing = (connections.data ?? []).find((item) => item.requestId === requestId);
  if (existing) return <ArtisanConnectionCard connection={existing} />;
  if (!isOpen) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 5) {
      setError('Please write a short message (at least 5 characters).');
      return;
    }
    setError('');
    connect.mutate(
      { requestId, data: { message: message.trim(), ...(Number(quote) > 0 ? { quote: Math.round(Number(quote)) } : {}) } },
      {
        onSuccess: () => {
          setFormOpen(false);
          setMessage('');
          setQuote('');
          queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        },
        onError: () => setError('We could not send your response. Please try again.'),
      },
    );
  };

  if (!formOpen) {
    return <button onClick={() => setFormOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid={`button-respond-${requestId}`}><Send size={15} /> I can help</button>;
  }
  return <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4" data-testid={`form-respond-${requestId}`}>
    <label className="block text-sm font-semibold">Your message to the customer<textarea value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="Say how you would make this and when you could start." data-testid={`textarea-respond-${requestId}`} /></label>
    <label className="block text-sm font-semibold">Your price in ₹ <span className="font-normal text-muted-foreground">(optional)</span><input type="number" min="0" value={quote} onChange={(e) => setQuote(e.target.value)} className={inputClass} placeholder="2500" data-testid={`input-quote-${requestId}`} /></label>
    {error && <p className="text-sm font-semibold text-destructive" role="alert">{error}</p>}
    <div className="flex gap-2">
      <button disabled={connect.isPending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid={`button-send-response-${requestId}`}>{connect.isPending ? 'Sending…' : 'Send response'}</button>
      <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted">Cancel</button>
    </div>
  </form>;
}

/** Shown to a customer under their own request: review responses, accept one, chat, and finish the job. */
export function ResponsesPanel({ requestId, count }: { requestId: string; count: number }) {
  const queryClient = useQueryClient();
  const connections = useConnectionsList();
  const accept = useAcceptConnection();
  const complete = useCompleteConnection();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');

  const items = (connections.data ?? [])
    .filter((item) => item.requestId === requestId)
    .sort((a, b) => Number(b.status === 'accepted') - Number(a.status === 'accepted'));
  const chosen = items.find((item) => item.status === 'accepted');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
  };

  const label = chosen
    ? chosen.request.status === 'completed' ? `Job completed with ${chosen.artisan.name}` : `In progress with ${chosen.artisan.name}`
    : count > 0 ? `${count} artisan${count === 1 ? '' : 's'} responded` : 'No responses yet';

  return <div className="mt-4">
    <button onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-2 text-sm font-bold text-primary" data-testid={`button-view-responses-${requestId}`}>
      {label}
      {(count > 0 || chosen) && <ChevronDown size={15} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />}
    </button>
    {expanded && (connections.isLoading ? <div className="mt-3 h-20 animate-pulse-soft rounded-xl bg-muted" /> : connections.isError ? <p className="mt-3 text-sm text-destructive">We could not load the responses. Please try again.</p> : <div className="mt-3 space-y-3">
      {items.map((item) => <div key={item.id} className={`rounded-xl border border-border p-4 ${item.status === 'declined' ? 'bg-muted/20 opacity-60' : 'bg-muted/40'}`} data-testid={`card-response-${item.id}`}>
        <div className="flex items-center justify-between gap-3">
          <Link href={`/artisans/${item.artisan.id}`} className="flex items-center gap-3 font-bold hover:text-primary" data-testid={`link-response-artisan-${item.id}`}>
            {item.artisan.imageUrl ? <img src={item.artisan.imageUrl} alt={item.artisan.name} className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground"><UserRound size={18} /></span>}
            <span><span className="block text-sm">{item.artisan.name}</span><span className="block text-xs font-normal text-muted-foreground">{item.artisan.craft} · {item.artisan.region}</span></span>
          </Link>
          <div className="flex items-center gap-2">
            {item.status === 'accepted' && <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">Accepted</span>}
            {item.status === 'declined' && <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">Not chosen</span>}
            {item.quote > 0 && <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">₹{item.quote.toLocaleString()}</span>}
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-foreground/80">{item.message}</p>
        <Link href={`/artisans/${item.artisan.id}`} className="mt-3 inline-block text-xs font-bold text-secondary hover:text-primary">View profile and work</Link>
        {item.status === 'sent' && item.request.status === 'open' && <div className="mt-3">
          <button disabled={accept.isPending} onClick={() => { setError(''); accept.mutate({ connectionId: item.id }, { onSuccess: refresh, onError: () => setError('We could not accept this response. Please try again.') }); }} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" data-testid={`button-accept-${item.id}`}>{accept.isPending ? 'Accepting…' : 'Accept this artisan'}</button>
        </div>}
        {item.status === 'accepted' && <>
          {item.request.status === 'in_progress' && <div className="mt-3">
            <button disabled={complete.isPending} onClick={() => { setError(''); complete.mutate({ connectionId: item.id }, { onSuccess: refresh, onError: () => setError('We could not complete this job. Please try again.') }); }} className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground disabled:opacity-50" data-testid={`button-complete-${item.id}`}>{complete.isPending ? 'Saving…' : 'Mark job completed'}</button>
          </div>}
          {item.request.status === 'completed' && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-secondary"><CheckCircle2 size={15} /> Job completed</p>}
          {item.request.status === 'completed' && <ReviewForm connectionId={item.id} artisanName={item.artisan.name} />}
          <ChatPanel connectionId={item.id} side="customer" />
        </>}
      </div>)}
      {error && <p className="text-sm font-semibold text-destructive" role="alert">{error}</p>}
    </div>)}
  </div>;
}