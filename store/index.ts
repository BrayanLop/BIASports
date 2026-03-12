import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { FeedItem, FeedFilterType, SportFilterType, User } from "@/types";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "pick_result";
  message: string;
  read: boolean;
  createdAt: Date;
  linkTo?: string;
}

interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

interface FeedState {
  items: FeedItem[];
  isLoading: boolean;
  hasMore: boolean;
  cursor: string | undefined;
  filter: FeedFilterType;
  sportFilter: SportFilterType;
  setItems: (items: FeedItem[]) => void;
  appendItems: (items: FeedItem[]) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: string | undefined) => void;
  setFilter: (filter: FeedFilterType) => void;
  setSportFilter: (sport: SportFilterType) => void;
  toggleLike: (pickId: string, liked: boolean, likesCount: number) => void;
  reset: () => void;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set) => ({
      currentUser: null,
      isLoading: true,
      setCurrentUser: (user) => set({ currentUser: user }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    { name: "user-store" }
  )
);

export const useFeedStore = create<FeedState>()(
  devtools(
    (set) => ({
      items: [],
      isLoading: false,
      hasMore: true,
      cursor: undefined,
      filter: "all",
      sportFilter: "all",
      setItems: (items) => set({ items }),
      appendItems: (items) =>
        set((state) => ({ items: [...state.items, ...items] })),
      setLoading: (loading) => set({ isLoading: loading }),
      setHasMore: (hasMore) => set({ hasMore }),
      setCursor: (cursor) => set({ cursor }),
      setFilter: (filter) => set({ filter }),
      setSportFilter: (sportFilter) => set({ sportFilter }),
      toggleLike: (pickId, liked, likesCount) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === pickId
              ? {
                  ...item,
                  isLiked: liked,
                  _count: { ...item._count, likes: likesCount },
                }
              : item
          ),
        })),
      reset: () =>
        set({
          items: [],
          isLoading: false,
          hasMore: true,
          cursor: undefined,
        }),
    }),
    { name: "feed-store" }
  )
);

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        })),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      clearNotifications: () =>
        set({ notifications: [], unreadCount: 0 }),
    }),
    { name: "notification-store" }
  )
);
