# GNL Admin Frontend

Vue.js-based dashboard for managing GNL esports leagues, including team management, match scheduling, fantasy betting, and player statistics. Built with Vue 3, Vuetify 3, and Vite.

## Prerequisites

- **Node.js** (LTS version) - [Download](https://nodejs.org/en)
- **Docker Desktop** (optional, for containerized deployment) - [Install Docker](https://www.docker.com/products/docker-desktop)
- **Visual Studio Code** (recommended) - [Download](https://code.visualstudio.com/)
- **VS Code Extensions** (optional):
  - Volar (Vue Language Features)
  - Docker (Microsoft)

## Quick Start - Local Development

> **⚠️ Recommended for Development:** Use `npm run dev` locally instead of Docker during development. The Vite dev server provides automatic proxy configuration to the backend, hot-reload, and faster iteration. Docker is primarily for production builds and deployment testing.

### 1. Clone Repository

```bash
git clone <repository-url>
cd admin_frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5003
- **Backend API (proxy):** http://localhost:5002

**Note:** The dev server is configured to proxy API requests to `http://localhost:5002`. Ensure the GNL backend is running before accessing the frontend.

## Docker Development Setup

> **Note:** Docker setup is primarily for production builds and deployment testing. For active development, use `npm run dev` locally instead (see Quick Start above) for better performance and automatic backend proxy handling.

### Using VS Code Docker Tasks

The project includes VS Code tasks for Docker-based development.

#### 1. Configure tasks.json

Tasks are configured in `.vscode/tasks.json`. The Docker debug task is already set up:

```json
{
  "type": "docker-run",
  "label": "docker-run: debug",
  "dependsOn": ["docker-build"],
  "dockerRun": {
    "command": "npm run dev",
    "ports": [{ "hostPort": 5003, "containerPort": 5003 }]
  },
  "node": {
    "enableDebugging": true
  }
}
```

**Key Configuration Points:**
- `command`: Runs `npm run dev` inside the container for hot-reload development
- `ports`: Maps container port 5003 to host port 5003
- `enableDebugging`: Enables Node.js debugging in VS Code

#### 2. Run with Docker

1. Open **Run and Debug** panel (Ctrl+Shift+D)
2. Select **"docker-run: debug"** from the dropdown
3. Press F5 or click the green play button

This will:
- Build the Docker image (`eashibby/gnl_admin_ui:latest`)
- Start the container with Vite dev server
- Enable hot-reload for development
- Attach debugger for breakpoint support

### Manual Docker Commands

```bash
# Build image
docker build -t eashibby/gnl_admin_ui:latest .

# Run container for production (serves static build)
docker run -d -p 5003:5003 eashibby/gnl_admin_ui:latest

# Run container for development (with volume mounting for hot-reload)
docker run -d \
  -p 5003:5003 \
  -v $(pwd):/app \
  -v /app/node_modules \
  eashibby/gnl_admin_ui:latest \
  npm run dev
```

## Backend API Configuration

### Development Mode (Vite Dev Server)

The Vite dev server uses a proxy configuration in `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5002',  // Backend API URL
    changeOrigin: true,
    secure: false,
    rewrite: path => path.replace(/^\/api/, '')
  }
}
```

**How it works:**
- Frontend makes requests to `/api/users`
- Vite proxies to `http://localhost:5002/users`
- No CORS issues during development

**Backend URL Options:**
- **Local backend in Docker:** Use `http://host.docker.internal:5002` (if frontend is also in Docker)
- **Local backend not in Docker:** Use `http://localhost:5002` (default)
- **Remote backend:** Update target to backend URL (e.g., `https://backend.warcraft-gym.com`)

### Production Mode (Static Build)

In production, the built app makes direct API calls. Update stores to use the correct backend URL:

```javascript
// Example from stores/*.store.js
const backendUrl = 'https://backend.warcraft-gym.com';  // Production backend
```

Alternatively, you can use environment variables (requires rebuild):

1. Create `.env` file:
```env
VITE_BACKEND_URL=https://backend.warcraft-gym.com
```

2. Update store files to use:
```javascript
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002';
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start Vite dev server (http://localhost:5003) |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview production build locally (http://localhost:5050) |
| `npm run lint` | Run ESLint and auto-fix issues |

## Project Structure

```
admin_frontend/
├── public/                 # Static assets (served as-is)
├── src/
│   ├── App.vue            # Root component with navigation
│   ├── main.js            # Application entry point
│   ├── assets/            # Images, styles, media
│   │   ├── base.css       # Global styles
│   │   ├── media/         # Logos, icons
│   │   └── raceIcons/     # Warcraft 3 race icons
│   ├── components/        # Reusable Vue components
│   │   ├── CountrySelect.vue
│   │   ├── PlayerDetailsDialog.vue
│   │   ├── RaceIcon.vue
│   │   └── ...
│   ├── helpers/           # Utility modules
│   │   ├── fetch-wrapper.js  # API request wrapper
│   │   └── router.js         # Vue Router configuration
│   ├── stores/            # Pinia state management
│   │   ├── auth.store.js
│   │   ├── users.store.js
│   │   ├── teams.store.js
│   │   └── ...
│   └── views/             # Page components
│       ├── HomeView.vue
│       ├── UsersView.vue
│       ├── TeamsView.vue
│       └── ...
├── .vscode/
│   └── tasks.json         # VS Code Docker tasks
├── Dockerfile             # Docker image definition
├── vite.config.js         # Vite configuration
├── package.json           # Dependencies and scripts
└── index.html             # HTML entry point
```

## Development Workflow

1. **Start backend API** (see [backend README](../backend/README.md))
   ```bash
   # Backend should be running at http://localhost:5002
   ```

2. **Start frontend dev server**
   ```bash
   npm run dev
   ```

3. **Make changes** - Vite hot-reloads automatically

4. **Test in browser** - http://localhost:5003

5. **Lint code** before committing
   ```bash
   npm run lint
   ```

## Building for Production

### Build Static Assets

```bash
npm run build
```

Output is generated in `dist/` directory.

### Preview Production Build Locally

```bash
npm run preview
# Access at http://localhost:5050
```

### Deploy Production Build

The `dist/` folder can be:
- Served by any static file server (nginx, Apache, http-server)
- Deployed to hosting platforms (Netlify, Vercel, AWS S3)
- Containerized with Docker (using the provided Dockerfile)

## Troubleshooting

### API Requests Failing (404/CORS Errors)

**Symptom:** Network errors or CORS issues in browser console

**Solutions:**
1. Verify backend is running at `http://localhost:5002`
2. Check Swagger docs accessible: `http://localhost:5002/apidocs/`
3. Verify proxy configuration in `vite.config.js` matches backend URL
4. For Docker: Ensure backend URL uses `host.docker.internal` if both services are in Docker

### Port 5003 Already in Use

**Solution:** Kill existing process or change port

```bash
# Find process using port (Windows)
netstat -ano | findstr :5003

# Kill process
taskkill /PID <pid> /F

# Or change port in vite.config.js
server: { port: 5004 }
```

### Hot Reload Not Working

**Solutions:**
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `npm run dev -- --force`
3. Restart Vite dev server

### Build Fails with Memory Error

**Solution:** Increase Node.js memory limit

```bash
# Windows
set NODE_OPTIONS=--max-old-space-size=4096 && npm run build

# Mac/Linux
export NODE_OPTIONS=--max-old-space-size=4096 && npm run build
```

## Authentication

The admin UI requires authentication via JWT tokens:

1. Login with admin token at login page
2. Token is stored in Pinia auth store
3. All API requests include `Authorization: Bearer <token>` header
4. Token auto-refreshes using refresh token

**Admin Token:** Same token configured in backend's `ADMIN_TOKEN` environment variable.

## Additional Resources

- [Frontend Architecture Guide](.github/copilot-instructions.md)
- [User Guide](ADMIN_UI_USER_GUIDE.md)
- [Backend Setup](../backend/README.md)
- [Vuetify Documentation](https://vuetifyjs.com/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)

## Vercel

The Vercel project `wc3-gym-frontend` builds this repository.

`main` deploys to production at https://wc3-gym-frontend.vercel.app. Every other branch gets its own preview deployment when it is pushed.

The backend the build talks to is the `VITE_BACKEND_URL` environment variable in the Vercel project, which overrides the value in `.env`. It is set for production, preview and development.

A branch that needs an unmerged backend points at that backend's own preview: add `VITE_BACKEND_URL` in the Vercel project scoped to the preview environment and to that git branch. Delete it once the backend is merged, and the branch falls back to the shared value.
