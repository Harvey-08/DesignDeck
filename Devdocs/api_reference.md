# DesignDeck — API Reference Manual

DesignDeck uses a standard RESTful API for user authentication, canvas metadata, membership roles, branches, and timeline comments. It utilizes WebSockets (`y-websocket`) for conflict-free CRDT drawing sync, and Socket.IO for cursor positions, chats, and role updates.

All routes except `/api/auth/login` and `/api/auth/register` require a `Bearer <JWT_TOKEN>` in the `Authorization` header.

---

## Authentication & User Profiles (`/api/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Create a new user account. |
| **POST** | `/api/auth/login` | Authenticate user credentials and retrieve a secure JWT session token. |
| **GET** | `/api/auth/me` | Retrieve the currently logged-in user profile context. |
| **PUT** | `/api/auth/update-password` | Update the authenticated user's password. |
| **PUT** | `/api/auth/update-profile` | Update user profile details (username, profile image). |

---

## Canvas Board Management (`/api/canvas`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/canvas/create` | Create a clean, collaborative digital canvas. |
| **GET** | `/api/canvas/my-canvases` | Retrieve a list of canvases owned by or shared with the active user. |
| **GET** | `/api/canvas/:id` | Retrieve active layers, object collections, and permissions for a specific canvas. |
| **PUT** | `/api/canvas/:id/name` | Rename a specific canvas board. |
| **DELETE** | `/api/canvas/:id` | Permanently delete a canvas (Owner permissions required). |
| **PUT** | `/api/canvas/:id/favorite` | Toggle canvas bookmark/favorite status. |
| **POST** | `/api/canvas/:id/invite` | Direct invite a collaborator to a canvas by username or email. |
| **DELETE** | `/api/canvas/:id/members/:userId` | Remove a collaborator member from a canvas. |
| **PUT** | `/api/canvas/:id/members/:userId/role` | Update a collaborator's access role (Viewer <-> Editor) in real-time. |
| **POST** | `/api/canvas/:id/generate-link` | Create a secure invite token link with custom role and timer configurations. |
| **POST** | `/api/canvas/:id/join-via-link` | Join a canvas automatically using a valid generated token link. |

---

## History, Branches & Replays (`/api/canvas`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/canvas/:id/branch` | Create a collaborative, sandboxed branch from any active canvas state. |
| **GET** | `/api/canvas/:id/branches` | Retrieve all branches created from a specific canvas. |
| **GET** | `/api/canvas/:id/timeline` | Retrieve the timeline event stream for time-travel session replays. |
| **POST** | `/api/canvas/:id/tag` | Place a descriptive tag/milestone on a specific timeline state event. |
| **DELETE** | `/api/canvas/:id/tag/:eventId` | Delete a milestone tag from a timeline event. |
| **POST** | `/api/canvas/:id/rollback` | Instantly roll back the live canvas drawing state to a historical event checkpoint. |

---

## Discussion Threads & Comments (`/api/comments`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/comments/:sessionId` | Fetch all chat logs and target-specific element comments for a canvas session. |
| **GET** | `/api/comments/:sessionId/:objectId` | Fetch pinned discussion comment threads linked to a specific shape or drawing. |
| **POST** | `/api/comments` | Manually save a new comment thread or chat message to a canvas. |

---

## AI Co-Pilot Chatbot (`/api/bot`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/bot/chat` | Send canvas context and user instructions to receive streamed AI responses and drawing commands (Server-Sent Events). |

---

## Folders & Workspaces (`/api/folders`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/folders` | Create a new folder workspace. |
| **GET** | `/api/folders` | Retrieve all folders and child canvases. |
| **PATCH** | `/api/folders/:id` | Update folder properties (rename, change color metadata). |
| **DELETE** | `/api/folders/:id` | Delete a folder workspace. |

---

## Video Meetings & Recordings (`/api/meetings`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/meetings` | Create or schedule a new video collaboration room. |
| **GET** | `/api/meetings/history` | Retrieve historical finished meetings. |
| **GET** | `/api/meetings/:meetingId` | Retrieve details for a specific meeting room. |
| **POST** | `/api/meetings/:meetingId/end` | Set meeting status to ended and close connection rooms. |
| **GET** | `/api/meetings/:meetingId/messages` | Fetch chat messages sent during the meeting call. |
| **POST** | `/api/meetings/:meetingId/recordings` | Save a screen share recording segment to Cloudinary. |
| **GET** | `/api/meetings/:meetingId/recordings` | Retrieve all saved screen share recordings for a session. |
| **POST** | `/api/meetings/:meetingId/start` | Trigger state check and start a scheduled meeting room. |
| **POST** | `/api/meetings/:meetingId/cancel` | Cancel a scheduled meeting room. |
| **POST** | `/api/meetings/:meetingId/invite` | Send meeting invitations to multiple users. |

---

## Notifications & Invites (`/api/notifications`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/notifications` | Fetch active user alerts, reminders, and canvas invitations. |
| **PUT** | `/api/notifications/:id/read` | Mark a notification alert as read. |
| **POST** | `/api/notifications/:id/accept` | Accept a canvas collaboration or workspace invitation. |
| **POST** | `/api/notifications/:id/decline` | Decline a canvas collaboration or workspace invitation. |

---

## Real-Time Collaboration Protocols

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **WebSocket** | `ws://localhost:5000/` | Real-time Yjs CRDT synchronization for layers and vector objects. |
| **Socket.io** | `/socket.io/` | Real-time cursor coordinates, comments alerts, and member role propagation. |
