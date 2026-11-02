# ⚖️ SAKSHYA — Legal Intelligence Frontend

SAKSHYA is a legal judgment intelligence interface for uploading Indian court judgment PDFs, generating structured AI analysis, and asking follow-up questions through a legal AI assistant.

**Backend repository:** https://github.com/Sheetal-cell/SAKSHYA-backend

## Architecture at a glance

The frontend is a React single-page application built with Vite. It owns the user interface and browser-side state; all PDF extraction, AI inference, authentication verification, database operations, and RAG retrieval are handled by the Express backend.

```text
Browser
  |
  v
React + Vite application
  |
  +-- Login / Guest entry
  +-- Judgment PDF upload
  +-- Structured analysis dashboard
  +-- Floating AI chat assistant
  +-- Theme, voice input and text-to-speech
  |
  v
REST API (VITE_API_BASE_URL)
  |
  v
SAKSHYA Backend (Express)
```

## Main capabilities

- **Guest access:** users can enter without creating an account, upload a judgment, view its analysis, and chat about that analysis. Guest sessions are temporary; the frontend does not create a database account or save the guest analysis.
- **Authentication foundation:** the application retains its token/profile and Google credential handling code for a future database-backed sign-in flow. The current login screen intentionally shows an *under development* notice when Google sign-in is clicked and directs users to continue as a guest.
- **Judgment analysis:** sends a PDF as Base64 to the backend and displays the returned structured case information, directives, deadlines, risks, legal provisions, and negotiation suggestions.
- **AI chat:** provides follow-up questions using the structured analysis. For authenticated documents with a successfully indexed RAG record, the backend can also retrieve relevant original judgment passages.
- **Voice experience:** the chat interface supports browser speech recognition where available and speech synthesis for reading assistant responses.
- **Presentation:** responsive React UI, animated backgrounds, dark/warm themes, dashboard and judgment result views.

## Technology

- React 18
- Vite 5
- JavaScript (ES modules)
- Browser Fetch API for backend communication
- Web Speech API (browser-dependent)

## Frontend structure

```text
src/
├── components/
│   └── ChatAssistant.jsx   # Floating chat, message history, voice and AI requests
├── assets/                 # UI assets such as the application logo
├── App.jsx                 # Main application, login/guest gate, upload and result flow
├── api.js                  # Backend API helpers and authorization headers
└── main.jsx                # React application entry point

public/                     # Static files and animation frames
index.html
vite.config.js
package.json
```

The exact asset and public-file contents may evolve; the key responsibility split is shown above.

## Request flow

### 1. Entering the application

- **Continue as Guest** creates a client-side guest session only. No JWT is created and no user row is written.
- Clicking **Continue with Google** displays the current development notice. The existing backend Google authentication endpoint and frontend credential handler are retained for future activation.

### 2. Analyzing a judgment

1. The user selects a PDF.
2. `src/api.js` reads it in the browser and converts it to Base64.
3. The frontend sends `POST /api/judgment/analyze` with `base64` and `filename`.
4. Guest requests include `X-Guest-Mode: true`; authenticated requests include the stored JWT.
5. The backend returns structured analysis. The frontend stores it in React state and renders the results.

### 3. Asking follow-up questions

The floating `ChatAssistant` sends the analysis context, recent conversation history, and the user's question to `POST /api/chat`. Guest requests use the guest-mode header and work from the structured analysis. Authenticated requests can include a `summaryId`, allowing the backend to retrieve relevant original passages from the RAG index.

## Local development

### Requirements

- Node.js (LTS recommended)
- npm
- The SAKSHYA backend running locally or remotely

### Install and run

```bash
git clone https://github.com/Sheetal-cell/SAKSHYA-frontend.git
cd SAKSHYA-frontend
npm install
npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

### Environment variables

Create a `.env` file in the frontend root when you need to override the defaults:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

- `VITE_API_BASE_URL` points to the backend origin. The current frontend fallback is the deployed SAKSHYA backend.
- `VITE_GOOGLE_CLIENT_ID` is retained for the Google authentication integration when that flow is re-enabled. The current UI does not start Google sign-in.

Vite exposes variables prefixed with `VITE_` to browser code. Never put private API keys, database passwords, or JWT secrets in this file.

### Build

```bash
npm run build
npm run preview
```

## Deployment

The frontend can be deployed as a static Vite site (for example, on Vercel). Configure `VITE_API_BASE_URL` to the deployed backend URL and ensure that the backend CORS allowlist includes the frontend origin. Redeploy after changing Vite environment variables.

## Current operating mode and limitations

- Guest analysis and chat are stateless. Refreshing or leaving the page can lose the current analysis; guest data is not saved to a user account.
- Guest chat uses the structured analysis supplied by the browser. It does not perform database-backed retrieval of original PDF passages.
- Persistent judgment history, saved chat history, user profiles, and full RAG retrieval require the MySQL database and authenticated account flow.
- Scanned/image-only PDFs may not contain extractable text; OCR is not currently part of this frontend workflow.
- Speech features depend on browser support and permissions.

## Related repository

- [SAKSHYA Backend](https://github.com/Sheetal-cell/SAKSHYA-backend) — REST API, PDF processing, AI analysis, authentication, MySQL persistence, and retrieval-augmented chat.
