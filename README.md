# MOS•AI•C (Memory-Organization-Synthesis AI Companion)

<div align="center">
  <img src="public/img/MOS.AI.C_LOGO.png" alt="MOS•AI•C Logo" width="400">
</div>

A Next.js 14 application implementing an AI-powered knowledge management system with intelligent content processing, semantic search, and interactive visualizations.

## Features

- **Smart Note Management**: AI-powered content analysis with automatic tagging, summarization, and title generation
- **Semantic Search**: Vector embeddings and full-text search powered by OpenAI and PostgreSQL
- **Task & Calendar Integration**: Auto-extract tasks and events from your notes
- **Knowledge Graph**: Visual entity relationships with D3.js force-directed layout
- **Telegram Bot**: Mobile access with voice message transcription
- **Multi-format Support**: Text, audio transcription, and rich media

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with pgvector extension
- **AI**: OpenAI API (embeddings, GPT-4o-mini)
- **Authentication**: JWT with bcrypt
- **Deployment**: Railway platform ready

## Quick Start

### Prerequisites

- Node.js 20+ (required for dependencies)
- PostgreSQL with pgvector extension
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd mos.ai.c-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```env
DATABASE_URL=postgresql://user:password@host:port/database
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=your_admin_email

# Optional: Telegram Integration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

4. Initialize the database:
```bash
npm run setup:db
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Available Scripts

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint

# Database Management
npm run setup:db           # Initialize database schema
npm run migrate            # Run specific migration file

# Telegram Integration (Optional)
npm run setup:telegram     # Setup Telegram webhook (development)
npm run setup:telegram:prod # Setup Telegram webhook (production)
npm run bot                # Run standalone Telegram bot
```

## Key Features

### AI-Powered Processing
- Automatic content analysis and tagging
- Smart chunking for large documents
- Entity extraction for knowledge graphs
- Task and calendar event detection

### Search & Discovery
- Hybrid search combining vector similarity and full-text search
- Tag-based filtering and organization
- Visual knowledge graph exploration

### Task Management
- AI-extracted tasks from note content
- Priority levels and status tracking
- Calendar integration with multiple view modes

### Telegram Integration
- Voice message transcription
- Interactive search and save functionality
- Account linking with web app

## Database Schema

Core tables:
- `profiles` - User accounts and authentication
- `notes` - Main content with AI processing status
- `chunks` - Text segments with vector embeddings
- `tags` - Content categorization
- `tasks` - Task management with dependencies
- `calendar_events` - Scheduling with recurrence
- `entities` - Knowledge graph nodes
- `entity_relationships` - Knowledge graph edges

## Authentication

- JWT-based authentication with httpOnly cookies
- bcrypt password hashing
- Admin role support via environment variable
- Telegram account linking

## Deployment

### Railway Template (One-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

### Manual Railway Deployment

1. Create Railway project with PostgreSQL service
2. Connect your GitHub repository
3. Set required environment variables
4. Deploy the application
5. **Important**: Run database initialization after deployment:
   ```bash
   railway run npm run setup:db
   ```

See [deploy-setup.md](deploy-setup.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please open an issue on GitHub.