import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

// Hooks for the reviews + notifications features. They use the same fetch
// helper as the generated API client, so sign-in cookies/headers work the same.

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
};
export type NotificationsResponse = { unreadCount: number; items: AppNotification[] };

export type Review = { id: string; rating: number; comment: string; createdAt: string; customerName: string };
export type ReviewsResponse = {
  average: number;
  count: number;
  distribution: Record<string, number>;
  reviews: Review[];
};

export const notificationsKey = ['notifications'] as const;

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => customFetch<NotificationsResponse>('/api/notifications'),
    enabled,
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    retry: false,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => customFetch('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
}

export function useArtisanReviews(artisanId: string) {
  return useQuery({
    queryKey: ['reviews', 'artisan', artisanId],
    queryFn: () => customFetch<ReviewsResponse>(`/api/artisans/${artisanId}/reviews`),
    enabled: Boolean(artisanId),
  });
}

export function useMyReviewedJobs() {
  return useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: () => customFetch<string[]>('/api/reviews/mine'),
    retry: false,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { connectionId: string; rating: number; comment: string }) =>
      customFetch(`/api/connections/${input.connectionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: input.rating, comment: input.comment }),
      }),
    // Refresh everything that shows a rating (cards, storefront, lists).
    onSuccess: () => queryClient.invalidateQueries(),
  });
}