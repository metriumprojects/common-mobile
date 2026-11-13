import axios from "axios";
import { Community, ChatMessage, UserProfile } from "../types";
import { APP_CONFIG } from "../config/appConfig";
import { getStoredToken, getStoredUserData } from "../util/authController";

export const API_BASE_URL = APP_CONFIG.API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const [token, userData] = await Promise.all([
      getStoredToken(),
      getStoredUserData(),
    ]);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (userData?.id) {
      config.headers["x-user-id"] = userData.id;
    }
  } catch (_) {}
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const method = (config?.method || "").toLowerCase();
    const status = error?.response?.status;
    const isTransient = !status || status === 502 || status === 503 || status === 504;
    if (config && method === "get" && isTransient) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      if (config.__retryCount <= 2) {
        await new Promise((resolve) => setTimeout(resolve, 800 * config.__retryCount));
        return apiClient(config);
      }
    }
    return Promise.reject(error);
  }
);

export const mobileApi = {
  async getHealth(): Promise<{ status: string; database: string; timestamp: string }> {
    const res = await apiClient.get("/health");
    return res.data;
  },

  async syncUser(userData: {
    clerkId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    role?: string;
    bio?: string;
  }): Promise<UserProfile> {
    const res = await apiClient.post<UserProfile>("/auth/sync", userData);
    return res.data;
  },

  async updateProfile(profileData: {
    id?: string;
    clerkId?: string;
    name?: string;
    email?: string;
    role?: string;
    bio?: string;
    avatarColor?: string;
    avatarUrl?: string;
  }): Promise<UserProfile> {
    const res = await apiClient.put<UserProfile>("/users/me", profileData);
    return res.data;
  },

  async getUsers(): Promise<UserProfile[]> {
    const res = await apiClient.get<UserProfile[]>("/users");
    return res.data;
  },

  async getCommunities(userId?: string): Promise<Community[]> {
    const res = await apiClient.get<Community[]>("/communities", {
      params: userId ? { userId } : undefined,
    });
    return res.data;
  },

  async updateCommunity(
    communityId: string,
    data: {
      name?: string;
      category?: string;
      location?: string;
      description?: string;
      imageUrl?: string;
    }
  ): Promise<Community> {
    const res = await apiClient.put<Community>(`/communities/${communityId}`, data);
    return res.data;
  },

  async deleteMessage(
    communityId: string,
    messageId: string
  ): Promise<{ communityId: string; messageId: string; deleted: boolean }> {
    const res = await apiClient.delete(
      `/communities/${communityId}/messages/${messageId}`
    );
    return res.data;
  },

  async getCurrentUser(clerkId?: string): Promise<UserProfile> {
    const res = await apiClient.get<UserProfile>("/users/me", {
      params: clerkId ? { clerkId } : undefined,
    });
    return res.data;
  },

  async toggleJoinCommunity(
    communityId: string
  ): Promise<{ communityId: string; isJoined: boolean }> {
    const res = await apiClient.post(`/communities/${communityId}/join`);
    return res.data;
  },

  async deleteCommunity(
    communityId: string
  ): Promise<{ success: boolean; communityId: string }> {
    const res = await apiClient.delete(`/communities/${communityId}`);
    return res.data;
  },

  async removeMember(
    communityId: string,
    memberId: string
  ): Promise<{ success: boolean; communityId: string; memberId: string }> {
    const res = await apiClient.delete(`/communities/${communityId}/members/${memberId}`);
    return res.data;
  },

  async updatePinnedNotice(
    communityId: string,
    author: string,
    text: string
  ): Promise<{ communityId: string; pinnedNotice: { author: string; text: string } }> {
    const res = await apiClient.put(`/communities/${communityId}/pin`, {
      author,
      text,
    });
    return res.data;
  },

  async updateCommunityEvent(
    communityId: string,
    eventData: { tag: string; title: string; location: string }
  ): Promise<any> {
    const res = await apiClient.put(`/communities/${communityId}/event`, eventData);
    return res.data;
  },

  async uploadMedia(
    fileBase64: string,
    fileName?: string
  ): Promise<{ url: string; provider?: string }> {
    const res = await apiClient.post<{ url: string; provider?: string }>("/upload", {
      file: fileBase64,
      fileName,
    });
    return res.data;
  },

  async toggleReaction(
    communityId: string,
    messageId: string,
    emoji: string,
    userId?: string
  ): Promise<{ success: boolean; reactions: Record<string, string[]> }> {
    const res = await apiClient.post(
      `/communities/${communityId}/messages/${messageId}/reaction`,
      { emoji, userId }
    );
    return res.data;
  },

  async reportMessage(
    communityId: string,
    messageId: string,
    reporterId?: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post(
      `/communities/${communityId}/messages/${messageId}/report`,
      { reporterId, reason }
    );
    return res.data;
  },

  async manageModerator(
    communityId: string,
    targetUserId: string,
    action: "promote" | "demote",
    requesterId: string
  ): Promise<{ success: boolean; moderators: string[] }> {
    const res = await apiClient.put(
      `/communities/${communityId}/moderators`,
      { targetUserId, action, requesterId }
    );
    return res.data;
  },

  async sendGroupMessage(
    communityId: string,
    text: string,
    replyTo?: { senderName: string; body: string },
    sender?: any,
    imageUrl?: string
  ): Promise<ChatMessage> {
    const res = await apiClient.post<ChatMessage>(
      `/communities/${communityId}/messages`,
      { text, replyTo, sender, imageUrl }
    );
    return res.data;
  },

  async toggleLikeMessage(
    communityId: string,
    messageId: string,
    userId?: string
  ): Promise<{ messageId: string; likes: number; userLiked: boolean }> {
    const res = await apiClient.post(
      `/communities/${communityId}/messages/${messageId}/like`,
      { userId }
    );
    return res.data;
  },

  async addComment(
    communityId: string,
    messageId: string,
    body: string,
    sender?: { name: string; initials: string; avatarColor: string }
  ): Promise<any> {
    const res = await apiClient.post(
      `/communities/${communityId}/messages/${messageId}/comments`,
      { body, sender }
    );
    return res.data;
  },

  async toggleEventRSVP(communityId: string): Promise<any> {
    const res = await apiClient.post(`/communities/${communityId}/event/rsvp`);
    return res.data;
  },

  async initPrivateChat(
    communityId: string,
    recipientId: string,
    recipientInfo?: { name: string; initials?: string; avatarColor?: string; role?: string }
  ): Promise<any> {
    const res = await apiClient.post(`/communities/${communityId}/private-chats/init`, {
      recipientId,
      recipientInfo,
    });
    return res.data;
  },

  async sendPrivateMessage(
    communityId: string,
    recipientId: string,
    text: string,
    sender?: any,
    replyTo?: { senderName: string; body: string },
    recipientInfo?: { name: string; initials?: string; avatarColor?: string; role?: string },
    imageUrl?: string
  ): Promise<ChatMessage> {
    const res = await apiClient.post<ChatMessage>(
      `/communities/${communityId}/private-chats/${recipientId}/messages`,
      { text, sender, replyTo, recipientInfo, imageUrl }
    );
    return res.data;
  },

  async markPrivateChatRead(
    communityId: string,
    recipientId: string
  ): Promise<{ communityId: string; recipientId: string; unreadCount: number }> {
    const res = await apiClient.post(
      `/communities/${communityId}/private-chats/${recipientId}/read`
    );
    return res.data;
  },

  async createCommunity(data: {
    name: string;
    category?: string;
    location?: string;
    description?: string;
    imageUrl?: string;
  }): Promise<Community> {
    const res = await apiClient.post<Community>("/communities", data);
    return res.data;
  },

  async deleteAccount(): Promise<{ success: boolean; deletedUserId: string }> {
    const res = await apiClient.delete("/users/me");
    return res.data;
  },
};
