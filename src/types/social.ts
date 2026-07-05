/**
 * Social system — type definitions for follows and notifications.
 */

export interface FollowDoc {
  followerId: string;
  followingId: string;
  followerDisplayName: string;
  followerPhotoURL: string | null;
  followingDisplayName: string;
  followingPhotoURL: string | null;
  createdAt: number; // Unix ms
}

export interface FollowUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  followedAt: number; // Unix ms
}

export type NotificationType = 'follow' | 'comment_like' | 'new_comment';

export interface NotificationDoc {
  id: string;
  type: NotificationType;
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  createdAt: number; // Unix ms
  read: boolean;
}

export interface FollowContextType {
  /** Set of UIDs the current user is following */
  followingIds: Set<string>;
  followersCount: number;
  followingCount: number;
  /** Unread notification count */
  unreadCount: number;
  notifications: NotificationDoc[];
  isFollowing: (uid: string) => boolean;
  isMutual: (uid: string, theirFollowingIds?: Set<string>) => boolean;
  follow: (target: { uid: string; displayName: string; photoURL: string | null }) => Promise<void>;
  unfollow: (targetUid: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  isLoading: boolean;
}
