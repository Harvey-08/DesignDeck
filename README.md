# DesignDeck — Real-Time Collaborative Digital Canvas

DesignDeck is a premium real-time collaborative digital canvas designed for team brainstorming, canvas drawing, and interactive session replays. It integrates modern WebSockets, CRDT-based state synchronization, and a sleek user interface to empower teams to work together seamlessly.

---

## Key Features

*   **Real-Time CRDT Canvas Collaboration**: Powered by `Yjs` and WebSocket endpoints for low-latency, conflict-free drawing and object synchronization.
*   **Granular Layer Control**: Create, reorder, delete, rename, lock, toggle visibility, and adjust opacity of multiple layers on the canvas.
*   **Time-Travel Replays**: Record updates, play, pause, step forward/backward, and control playback speed of canvas state changes using custom timeline playback controls.
*   **Collaborator Tracking**: View who is active on the canvas with color-coded tags and cursor position tracking.
*   **Persistent & Interactive Comments**: Direct chat box communication combined with targeted object-specific comments.
*   **Sharing & Security Control**: Securely share canvases with specific collaborator access roles (Viewer/Editor) and custom expiration timers.
*   **Real-Time Role Synchronization**: Instant interface layout updates and permission enforcement when a collaborator's access role (Viewer <-> Editor) is changed by the owner in real-time.
*   **Premium Responsive Dashboard**: Secure User authentication (JWT) with forms for login and registration, profile customization, and intuitive management of active canvases.

---

## Tech Stack

### Frontend
*   **Framework**: React (Vite-powered)
*   **Styling**: Tailwind CSS & Modern Design CSS Tokens
*   **Real-time Collaboration**: Yjs, `y-websocket` client
*   **Communication**: Socket.IO-client for interactive comments, chat, and role synchronization
*   **Icons**: Lucide React

### Backend
*   **Runtime Environment**: Node.js
*   **Web Framework**: Express
*   **Database**: MongoDB with Mongoose ODM
*   **Real-time Services**: WebSocketServer (`ws`), `y-websocket` utility hub, and Socket.IO
*   **Authentication**: JSON Web Token (JWT) & bcryptjs hashing

---

## Project Structure

The clean, standardized folder structure is organized as follows:

```text
DesignDeck/
├── Backend/                                                 # Server-side backend environment
│   ├── controllers/                                         # REST API controllers
│   │   ├── authController.js                                # Handles user login and registration routes
│   │   └── canvasController.js                              # Handles canvases, memberships, links, and role sockets
│   ├── middleware/                                          # Express routing middleware
│   │   └── authMiddleware.js                                # Secures routes using JWT authorization guards
│   ├── models/                                              # MongoDB schema definitions (Mongoose)
│   │   ├── Canvas.js                                        # Canvas database model with layers and metadata
│   │   ├── Comment.js                                       # Canvas object-level comments database schema
│   │   ├── Event.js                                         # Replay timeline updates database structure
│   │   └── User.js                                          # Registered user accounts database schema
│   ├── routes/                                              # Express API routes
│   │   ├── authRoutes.js                                    # Maps auth endpoints to authController
│   │   ├── canvasRoutes.js                                  # Maps canvas and branch endpoints to canvasController
│   │   └── commentRoutes.js                                 # Maps comment endpoints to commentController
│   ├── check_events.js                                      # Diagnostic script to list database timeline events
│   ├── check_routes.js                                      # Helper utility to inspect Express routes mapping
│   ├── package-lock.json                                    # Node.js backend dependencies lockfile
│   ├── package.json                                         # Node.js backend configuration and scripts
│   └── server.js                                            # Main server starting HTTP, socket.io, and WS servers
├── Devdocs/                                                 # Technical reference manuals & system specifications
│   ├── api_reference.md                                     # Complete REST API directory and collaborative WebSocket protocols
│   └── engine_architecture.md                               # Modular drawing engine components and Yjs CRDT synchronization
├── Frontend/                                                # React frontend powered by Vite
│   ├── public/                                              # Public static assets
│   │   └── vite.svg                                         # Vite static branding resource icon
│   ├── src/                                                 # Frontend source code
│   │   ├── assets/                                          # Static media assets and logos
│   │   │   └── react.svg                                    # React logo graphic asset
│   │   ├── components/                                      # Modular React interface elements
│   │   │   ├── Sidebar/                                     # Right side sidebar panels
│   │   │   │   ├── LayerRow.jsx                             # Renders a single layer row with controls
│   │   │   │   ├── LayersPanel.jsx                          # Renders layers lists, locks, and visibilities
│   │   │   │   ├── PropertiesPanel.jsx                      # Custom color picker, sizes, fonts, and grids
│   │   │   │   └── SidebarPanel.jsx                         # Direct container for Layers and Properties
│   │   │   ├── __tests__/                                   # Automated UI component tests
│   │   │   │   ├── Dashboard.test.jsx                       # Tests user dashboard canvases search and listings
│   │   │   │   ├── RBAC_Components.test.jsx                 # Verifies role-based restrictions on topbar and toolbar
│   │   │   │   └── ShareDialog.test.jsx                     # Asserts link sharing and collaborator role updates
│   │   │   ├── Canvas.jsx                                   # React wrapper initializing CanvasEngineController
│   │   │   ├── ChatPanel.jsx                                # Object-level discussion threads using Socket.io
│   │   │   ├── CollaboratorList.jsx                         # Active collaborator lists and follow modes
│   │   │   ├── Dashboard.jsx                                # Active canvases lists, favorites, and creation forms
│   │   │   ├── Footer.jsx                                   # Collaborative bottom details bar
│   │   │   ├── JoinCanvas.jsx                               # Invites link target verification screen
│   │   │   ├── LandingPage.jsx                              # Premium promotional welcome page
│   │   │   ├── Login.jsx                                    # Premium secure user session forms
│   │   │   ├── NotificationSystem.jsx                       # Displays real-time collaborator popups
│   │   │   ├── Profile.jsx                                  # Customizes user profile details and settings
│   │   │   ├── Register.jsx                                 # Form to create new user accounts
│   │   │   ├── ReplayCanvas.jsx                             # Replay modal canvas window
│   │   │   ├── ShareDialog.jsx                              # Link sharing and team permissions manager
│   │   │   ├── TimelineControls.jsx                         # Custom timeline controls for playback
│   │   │   ├── Toolbar.jsx                                  # Drawing tool selector bar with RBAC checks
│   │   │   └── TopBar.jsx                                   # Canvas header displaying share triggers
│   │   ├── context/                                         # Contextual state providers
│   │   │   ├── ThemeContext.js                              # Theme Context definition
│   │   │   ├── ThemeProvider.jsx                            # Renders Tailwind custom wrappers for theme styles
│   │   │   └── themes.js                                    # Global stylesheet attributes map
│   │   ├── Engine/                                          # Core Figma-style canvas drawing engine
│   │   │   ├── __tests__/                                   # Drawing engine unit tests
│   │   │   │   └── YjsSync.test.js                          # Verifies collaborative syncing and conflict resolution
│   │   │   ├── managers/                                    # Orchestrators and state controllers
│   │   │   │   ├── HistoryManager.js                        # Implements local undo/redo actions (Command Pattern)
│   │   │   │   ├── LayerManager.js                          # Controls active layers list and rendering ordering
│   │   │   │   ├── ReplayManager.js                         # Handles timeline travel playback loop
│   │   │   │   ├── SceneManager.js                          # Stores active objects list and order index map
│   │   │   │   └── ToolManager.js                           # Handles tool selection and contextual options
│   │   │   ├── scene/                                       # Structural geometry nodes
│   │   │   │   ├── geometry.js                              # Core vector bounds math definitions
│   │   │   │   ├── hitTest.js                               # Element collision utilities
│   │   │   │   ├── selectionBox.js                          # Draws dashed select box around selected items
│   │   │   │   └── StrokeNode.js                            # Formats freehand pen lines into geometric maps
│   │   │   ├── ToolManager.js                               # Component managing sidebar settings options
│   │   │   ├── Tools/                                       # Drawing and modification tools
│   │   │   │   ├── __tests__/                               # Tools unit testing suite
│   │   │   │   │   └── EngineTools.test.js                  # Asserts tool activation, cursor, and preview events
│   │   │   │   ├── BaseTool.js                              # Abstract parent class for all drawing tools
│   │   │   │   ├── CircleTool.js                            # Handles drawing and updates for circle shapes
│   │   │   │   ├── DrawTool.js                              # Handles freehand brush drawing on the canvas
│   │   │   │   ├── EraserTool.js                            # Handles element deletion and eraser strength paths
│   │   │   │   ├── EyedropperTool.js                        # Custom tool to pick colors from elements
│   │   │   │   ├── FillTool.js                              # Custom tool to toggle shape background colors
│   │   │   │   ├── LineTool.js                              # Handles drawing straight connection lines
│   │   │   │   ├── RectangleTool.js                         # Handles drawing and editing box shapes
│   │   │   │   ├── SelectTool.js                            # Core tool for selecting, dragging, resizing elements
│   │   │   │   ├── ShapeTools.js                            # Parent class and logic for complex shapes
│   │   │   │   ├── TextTool.js                              # Handles text input overlay, fonts, and geometry
│   │   │   │   └── Tool.js                                  # Base interface for active canvas tools
│   │   │   ├── utils/                                       # Core engine mathematical helpers
│   │   │   │   ├── BezierSmoothing.js                       # Smooths pencil strokes using Bezier curve algorithms
│   │   │   │   ├── BoundsCalculation.js                     # Determines exact bounding boxes for shapes and strokes
│   │   │   │   ├── CanvasRenderer.js                        # Custom loop for drawing layers and shapes using HTML5 Canvas
│   │   │   │   ├── CoordinateMapper.js                      # Converts raw screen coordinates to zoom/pan coords
│   │   │   │   └── HitTest.js                               # Complex shape and stroke path intersection check
│   │   │   ├── canvasEngine.js                              # Instantiates global providers and Yjs doc maps
│   │   │   ├── CanvasEngineController.js                    # Core engine hub connecting tools, sync, and rendering
│   │   │   └── collabEventDispatcher.js                     # Emits events for collaborator joins/leaves/locks
│   │   ├── hooks/                                           # React custom hooks
│   │   │   └── useLayers.js                                 # Synchronizes canvas layers with local React states
│   │   ├── test/                                            # Vitest helper utilities
│   │   │   └── setup.js                                     # Automated testing runner scripts
│   │   ├── ui/                                              # Custom icon components mapping
│   │   │   ├── iconMap.js                                   # Maps tool icons for application navigation
│   │   │   └── icons.js                                     # Custom collection of UI icons
│   │   ├── App.jsx                                          # Core routing context, state controls, socket feeds
│   │   ├── config.js                                        # Connects configuration files endpoints
│   │   ├── index.css                                        # Global styling system layout styles
│   │   ├── main.jsx                                         # Frontend application start file
│   │   └── setupTests.js                                    # Asserts dynamic interface states metrics
│   ├── tailwind.config.js                                   # Tailwind styling system layout properties
│   ├── vercel.json                                          # Dynamic edge cloud routing parameters
│   └── vite.config.js                                       # Frontend bundler optimization controls
└── README.md                                                # Application architecture and project handbook documentation
```

---

## Prerequisites & Initial Setup

Before launching the project, ensure you have the following installed on your machine:
*   **Node.js**: `v18.x` or higher
*   **NPM**: `v9.x` or higher
*   **MongoDB**: Running instance (Local MongoDB Community Server or MongoDB Atlas cluster connection string)

---

## Project Configuration

The project uses separate `.env` files for the Backend and Frontend.

### Backend (`Backend/.env`)
Create a `.env` file inside the `Backend/` directory with the following variables:
```text
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/Canvas
JWT_SECRET=your_jwt_secret_key_here
```

### Frontend (`Frontend/.env`)
Create a `.env` file inside the `Frontend/` directory with the following variables:
```text
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```
Make sure the URLs match the `PORT` set in the backend `.env`.

---

## Project Installation & Local Development

### 1. Backend Server Setup
1.  Navigate into the `/Backend` directory:
    ```bash
    cd Backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the backend server:
    *   **Development mode** (runs with Nodemon watch):
        ```bash
        npm run dev
        ```
    *   **Production mode** (standard launch):
        ```bash
        npm start
        ```
    *The backend server will launch on the port specified in `Backend/.env`.*

### 2. Frontend Application Setup
1.  Open a new terminal window and navigate into the `/Frontend` directory:
    ```bash
    cd Frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the Frontend application:
    ```bash
    npm run dev
    ```
4.  Open the URL `http://localhost:5173` in your browser.

---

## Technical Reference Documents

Detailed structural manuals and full developer specifications are maintained inside the `Devdocs/` directory:
*   **[API Reference Manual](./Devdocs/api_reference.md)**: A complete directory of all REST API and WebSocket events, detailing parameters, payloads, and role permissions.
*   **[Drawing Engine Architecture](./Devdocs/engine_architecture.md)**: A deep architectural dive explaining coordinate mapping, Bezier pen smoothing, Z-order layers managers, hit tests, and Yjs CRDT synchronization.

---

## Future Improvements

Here are the planned and recommended next steps for extending the DesignDeck codebase:
1.  **Canvas Drawing Enhancements**: Support for custom shapes, text box insertions, image imports, and grid snap-to alignments.
2.  **Undo/Redo Stack**: Integrating local custom history stacks to allow individual undo/redo alongside global real-time synchronization.
3.  **Enhanced Canvas Templates**: A gallery of ready-to-use canvas wireframes, Kanban boards, flowcharts, and customer journey templates.
4.  **Offline Sync Support**: Leveraging client-side persistent storage (IndexDB) through Yjs to support full offline drawing states that sync up on reconnection.
5.  **Built-in Audio/Video Rooms**: WebRTC integration to allow voice and video calls directly inside active canvas rooms during collaborative sessions.
