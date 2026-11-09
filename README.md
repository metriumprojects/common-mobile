# Common Community — Native Mobile Application

The iOS & Android mobile application for the **Common Community Platform**. Built with React Native, Expo, React Navigation v7, and Clerk Authentication, designed strictly to the modern light-theme Figma prototype specifications.

---

## 🛠 Tech Stack

- **Framework**: React Native `0.80.2` + React 19
- **Navigation**: React Navigation v7 (`@react-navigation/stack`, `@react-navigation/bottom-tabs`)
- **Authentication**: Clerk Expo SDK (`@clerk/clerk-expo`) with SecureStore token cache
- **Real-Time Client**: Socket.io Client (`socket.io-client`)
- **HTTP Client**: Axios (`axios`)
- **UI & Feedback**: React Native SVG, React Native Toast Message, Vector Icons

---

## 📱 Screens & Design System

Built strictly following the light theme (`#F8F9FA` background, `#FFFFFF` cards, `#111827` slate text, `#CEF26D` lime accent):

1. **Home / My Space (`HomeScreen.tsx`)**:
   - Header with `c●mmon` branding & member profile badge.
   - Joined communities list with unread counter badges.
   - Nested Group Chat rows & Scoped Private Side-Chat snippets.
   - Bottom navigation bar: `My Space | Discover | + Create | Activity | Me`.
2. **Discover Directory (`DiscoverScreen.tsx`)**:
   - Dual search filter box ("What are you into?" + "City or neighborhood [Near me]").
   - Filter pills (Trending, Around me, Sport, Money, Girls, Gaming).
   - Distinct community cards with `#CEF26D` Lime, `#FFE566` Yellow, `#FF7A59` Coral, and outlined `Request` action buttons.
3. **Community Channel Chat (`CommunityChatScreen.tsx`)**:
   - Pinned community guidelines bar.
   - Interactive meetup RSVP banner with headcount tracking.
   - Group chat message stream with replies, reactions, and attachments.
4. **Scoped 1-on-1 Side-Chats (`PrivateChatScreen.tsx` & `CommunityInboxScreen.tsx`)**:
   - Private 1-on-1 conversations strictly scoped to members who met within the shared community space.
   - Light `#EAF8E8` inbox header and `#DCFCE7` sent message bubbles with `✓ Read` status.
5. **Activity Stream (`ActivityScreen.tsx`)**:
   - Filterable real-time activity stream for channels, side-chats, and live events.
6. **Profile & Settings (`ProfileScreen.tsx`)**:
   - Member profile, headline/role editor, avatar color picker, and Clerk account management.

---

## 📋 Getting Started

### 1. Prerequisites
- Node.js `>= 18.x`
- Android Studio & Android SDK (for Android emulator/device)
- Xcode (for macOS / iOS simulator)
- EAS CLI (optional, for cloud builds): `npm install -g eas-cli`

### 2. Installation
```bash
cd mobile
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Authentication Publishable Key |
| `EXPO_PUBLIC_API_URL` | Backend REST API endpoint (optional) |
| `EXPO_PUBLIC_SOCKET_URL` | Backend WebSocket endpoint (optional) |

### 4. Running the App
```bash
# Start Metro bundler
npm start

# Run on Android device / emulator
npm run android

# Run on iOS simulator (macOS required)
npm run ios
```

### 5. Build Commands (EAS & Local)
```bash
# Build Android APK preview locally
npm run build:apk:local

# Build Android APK via Expo Cloud
npm run build:apk

# Assemble Android Debug APK
npm run build-android
```

---

## 📁 Project Structure

```
mobile/
├── android/             # Native Android project files
├── ios/                 # Native iOS project files
├── src/
│   ├── config/          # App config & API endpoints
│   ├── context/         # AuthContext with Clerk & SecureStore
│   ├── screens/         # App screens
│   │   ├── Auth/        # LoginScreen & SignupScreen
│   │   ├── HomeScreen.tsx
│   │   ├── DiscoverScreen.tsx
│   │   ├── CommunityChatScreen.tsx
│   │   ├── CommunityInboxScreen.tsx
│   │   ├── PrivateChatScreen.tsx
│   │   ├── ActivityScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/        # API service client & Socket.io client
│   └── util/            # Token cache & storage helpers
├── app.json             # Expo / React Native project metadata
├── eas.json             # EAS Build profiles
└── package.json
```
