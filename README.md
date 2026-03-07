# Elarova - Medical Assistant Chatbot

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-blue" alt="React">
  <img src="https://img.shields.io/badge/NestJS-10.0-red" alt="NestJS">
  <img src="https://img.shields.io/badge/Flask-3.0-yellow" alt="Flask">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

Elarova is a professional medical assistant chatbot powered by Retrieval-Augmented Generation (RAG) technology. It provides accurate medical information by referencing medical textbooks and documents, making it a valuable tool for healthcare professionals, students, and individuals seeking reliable medical information.

## Features

### Core Features

- **RAG-Powered Responses**: Leverages Pinecone vector database and LangChain for accurate, context-aware answers
- **Multi-Model Support**: Works with Ollama (Llama 3.2), OpenAI GPT, Google Gemini, and Anthropic Claude
- **Document Upload**: Upload and index custom PDF documents for specialized knowledge
- **Conversational Memory**: Remembers conversation context for follow-up questions
- **Source Attribution**: Every answer includes source references with page numbers

### User Interface

- **Modern React Frontend**: Built with React 18, TypeScript, and TailwindCSS
- **Customizable Themes**: 7 built-in gradient themes + custom image upload
- **AI Helper Widget**: Quick access AI assistant for general questions
- **Voice Input**: Microphone support for hands-free input
- **Real-time Chat**: WebSocket-powered instant messaging
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Backend

- **NestJS REST API**: Robust backend with MongoDB database
- **Session Management**: Persistent conversations across sessions
- **Secure Configuration**: All sensitive data stored in environment variables

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │   Sidebar   │  │  ChatArea   │  │    AI Helper Widget     ││
│  └─────────────┘  └─────────────┘  └─────────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                     Backend (NestJS)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Chat API    │  │ Message API │  │    RAG Proxy           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
┌────────────────────────────▼────────────────────────────────────┐
│                    RAG Server (Flask)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Pinecone   │  │  LangChain  │  │   Ollama/GPT/LLM       │ │
│  │ (Vectors)  │  │  (RAG)      │  │   (AI Model)           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Frontend   | React 18, TypeScript, Vite, TailwindCSS, Zustand |
| Backend    | NestJS, MongoDB, Socket.io                       |
| RAG Server | Flask, LangChain, Pinecone, Ollama               |
| AI Models  | Llama 3.2, GPT-4, Gemini, Claude                 |

## Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB (local or Atlas)
- Pinecone API Key
- Ollama (optional, for local AI)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/iamafridi/elarova.git
cd elarova
```

### 2. Environment Setup

Create a `.env` file in the `elarova_backend` directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
RAG_API_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:5173
```

Create a `.env` file in the `elarova_rag` directory:

```env
PINECONE_API_KEY=your_pinecone_api_key
```

### 3. Install Dependencies

**Frontend:**

```bash
cd elarova_frontend
npm install
```

**Backend:**

```bash
cd elarova_backend
npm install
```

**RAG Server:**

```bash
cd elarova_rag
pip install -r requirements.txt
```

### 4. Start the Services

**Start RAG Server (Flask):**

```bash
cd elarova_rag
python app.py
# Runs on http://localhost:8080
```

**Start Backend (NestJS):**

```bash
cd elarova_backend
npm run start:dev
# Runs on http://localhost:3000
```

**Start Frontend:**

```bash
cd elarova_frontend
npm run dev
# Runs on http://localhost:5173
```

## Usage

### Starting a Conversation

1. Open the frontend at `http://localhost:5173`
2. Click "Start a New Chat" to begin
3. Type your medical question in the chat input

### Asking Follow-up Questions

Elarova remembers conversation context. You can ask follow-up questions like:

- "Can you elaborate on that?"
- "Tell me more about..."
- "Explain in more detail"

### Uploading Custom Documents

1. Click the Documents icon in the sidebar
2. Upload a PDF file
3. The document will be indexed and available for queries

### Using AI Helper

Click the robot icon in the top-right corner to access the AI Helper widget for general questions outside the medical context.

### Customizing Background

Click the settings icon (gear) in the top-right corner to:

- Choose from 7 gradient themes
- Upload a custom background image

## API Documentation

### Backend Endpoints

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| POST   | `/auth/session`     | Create/get session     |
| GET    | `/chats`            | List all chats         |
| POST   | `/chats`            | Create new chat        |
| GET    | `/chats/:id`        | Get chat with messages |
| POST   | `/messages`         | Send a message         |
| POST   | `/messages/stream`  | Stream response        |
| POST   | `/documents/upload` | Upload document        |
| DELETE | `/documents/:id`    | Delete document        |
| POST   | `/rag/chat`         | Chat with RAG          |
| POST   | `/rag/chat/stream`  | Stream RAG response    |

### RAG Server Endpoints

| Method | Endpoint           | Description                |
| ------ | ------------------ | -------------------------- |
| GET    | `/`                | Home page                  |
| POST   | `/get`             | Get chat response          |
| POST   | `/get-stream`      | Stream chat response       |
| POST   | `/ai-chat`         | AI Helper chat             |
| POST   | `/upload-pdf`      | Upload and index PDF       |
| DELETE | `/delete-document` | Delete document            |
| POST   | `/clear-history`   | Clear conversation history |

## Project Structure

```
elarova/
├── elarova_frontend/           # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── AiHelper/       # AI Helper widget
│   │   │   ├── ChatArea/       # Main chat component
│   │   │   ├── Documents/      # Document upload panel
│   │   │   ├── Settings/       # Settings panel
│   │   │   └── Sidebar/       # Navigation sidebar
│   │   ├── services/           # API services
│   │   ├── store/              # Zustand state management
│   │   ├── types/              # TypeScript types
│   │   └── App.tsx             # Main app component
│   └── package.json
│
├── elarova_backend/            # NestJS backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication
│   │   │   ├── chat/          # Chat management
│   │   │   ├── message/       # Message handling
│   │   │   ├── document/      # Document management
│   │   │   └── rag/           # RAG integration
│   │   ├── database/          # MongoDB schemas
│   │   └── gateways/          # WebSocket gateways
│   └── package.json
│
├── elarova_rag/               # Flask RAG server
│   ├── src/
│   │   ├── helper.py          # Utility functions
│   │   └── prompt.py          # LLM prompts
│   ├── app.py                 # Main Flask app
│   ├── store_index.py         # Pinecone indexing
│   └── templates/             # HTML templates
│
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

## Configuration

### Supported AI Models

Edit `elarova_rag/app.py` to change the default model:

```python
# Default: Ollama Llama 3.2
llm = ChatOllama(model="llama3.2:1b", temperature=0.4)

# Or use other models via the UI:
# - ollama (Llama 3.2)
# - gpt (OpenAI GPT-4)
# - gemini (Google Gemini)
# - claude (Anthropic Claude)
```

### Vector Database

The app uses Pinecone for vector storage. To re-index your documents:

```bash
cd elarova_rag
python store_index.py
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [LangChain](https://langchain.com/)
- Vector search by [Pinecone](https://www.pinecone.io/)
- UI icons by [Lucide](https://lucide.dev/)
- Created with love for Elara 💜

---

<p align="center">Made with 💜 by <a href="https://iamafrididev.netlify.app/">Afridi</a></p>
