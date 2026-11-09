export interface UserProfile {
  id: string;
  clerkId?: string;
  email?: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  role: string;
  online: boolean;
  joinedDate: string;
  bio?: string;
}

export interface ChatMessage {
  id: string;
  communityId?: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderAvatarColor: string;
  senderAvatarUrl?: string;
  senderRole?: string;
  body: string;
  imageUrl?: string;
  timestamp: string;
  rawTime: number;
  isSelf?: boolean;
  replyTo?: {
    senderName: string;
    body: string;
  };
  likes: number;
  userLiked?: boolean;
  reactions?: Record<string, string[]>;
  isReported?: boolean;
  commentCount: number;
  comments?: Array<{
    id: string;
    senderName: string;
    senderInitials: string;
    senderAvatarColor: string;
    body: string;
    timestamp: string;
  }>;
  status?: "pending" | "sent" | "read";
}

export interface PrivateSideChat {
  id: string;
  communityId: string;
  recipient: UserProfile;
  lastMessage: string;
  lastMessageTime: string;
  rawTime: number;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface CommunityEvent {
  id: string;
  tag: string;
  title: string;
  location: string;
  isJoined: boolean;
  attendeesCount: number;
}

export interface Community {
  id: string;
  name: string;
  category: string;
  onlineCount: number;
  memberCount: string;
  location: string;
  description: string;
  imageUrl: string;
  verified: boolean;
  creatorId?: string;
  moderators?: string[];
  pinnedNotice?: {
    author: string;
    text: string;
  };
  event?: CommunityEvent;
  groupMessages: ChatMessage[];
  privateChats: PrivateSideChat[];
  isJoined?: boolean;
}
