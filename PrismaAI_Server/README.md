📦 src
│
├── 📁 config/                              # 🧩 Centralized configuration & environment validation
│   ├── configuration.ts                    # Loads all env vars into structured config objects (app, db, jwt, etc.)
│   └── validation.ts                       # Uses Joi to validate env variables at startup (prevents missing/invalid values)
│
├── 📁 prisma/                              # 🗄️ Prisma ORM setup for database access
│   ├── prisma.module.ts                    # Global NestJS module providing PrismaService (dependency injection)
│   └── prisma.service.ts                   # Wraps PrismaClient and handles DB connection lifecycle (connect/disconnect)
│
├── 📁 modules/                             # 📦 All feature modules live here (e.g., auth, user, etc.)
│   │
│   ├── 📁 user/                            # 👤 User management (CRUD)
│   │   ├── dto/                            # Data Transfer Objects — validation for user input
│   │   │   ├── create-user.dto.ts          # Validation schema for creating users
│   │   │   └── update-user.dto.ts          # Validation schema for updating users
│   │   ├── user.controller.ts              # Handles incoming HTTP requests (routes like GET /users, POST /users)
│   │   ├── user.service.ts                 # Business logic and DB interactions (via PrismaService)
│   │   └── user.module.ts                  # Groups all user-related providers/controllers for modularity
│   │
│   └── 📁 auth/                            # 🔐 Authentication & Authorization system
│       ├── dto/                            # Input validation for authentication routes
│       │   ├── login.dto.ts                # Validates login credentials (email, password)
│       │   └── register.dto.ts             # Validates registration data for new users
│       ├── auth.controller.ts              # Defines auth routes (POST /login, POST /register, etc.)
│       ├── auth.service.ts                 # Core auth logic (JWT generation, password hashing, validation)
│       ├── auth.module.ts                  # Bundles all auth providers, controllers, and strategies
│       └── 📁 strategies/                  # Passport strategies for authentication
│           ├── jwt.strategy.ts             # Handles JWT validation (for protected routes)
│           └── google.strategy.ts           
│
├── 📁 common/                              # 🧰 Shared utilities, guards, interceptors, and decorators
│   ├── 📁 guards/                          # Authorization guards (JWT Guard, Role Guard, etc.)
│   ├── 📁 utils/                           # Helper utilities (hashing passwords, verifying tokens, etc.)
│   ├── 📁 interceptors/                    # Response interceptors (e.g., transform or log responses)
│   ├── 📁 filters/                         # Global exception filters (custom error formatting)
│   └── 📁 decorators/                      # Custom decorators (e.g., @User(), @Roles())
│
├── app.controller.ts                       # Root controller (optional) — handles base route (GET /)
├── app.service.ts                          # Root service — contains shared logic or base messages
├── app.module.ts                           # Root NestJS module — imports config, prisma, and all feature modules
├── main.ts                                 # 🚀 Application entry point — bootstraps the Nest app and global pipes
│
├── .env                                    # 🌍 Default environment file (used in development if none specified)
├── .env.development                        # 🧪 Dev environment — contains local DB and JWT configs
├── .env.production                         # 🚀 Production environment — contains production DB and secure JWT values
│
└── prisma/schema.prisma                    # Prisma schema defining your database models and relations


--Initial Architecture--
                    ┌─────────────────────────────┐
                    │         Mobile App           │
                    │       (React Native)         │
                    │  - UI/UX                     │
                    │  - Auth, Search, Playback    │
                    │  - Calls only NestJS APIs    │
                    └────────────┬────────────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │         NestJS Server        │
                   │      (Gateway + Backend)     │
                   │----------------------------- │
                   │  - REST APIs for Mobile App  │
                   │  - Auth (JWT/OAuth2)         │
                   │  - CRUD (Users, Podcasts)    │
                   │  - API Validation (DTOs)     │
                   │  - PostgreSQL (Main DB)      │
                   │  - Caching (Redis - optional)│
                   │  - Requests AI tasks via     │
                   │    FastAPI microservice      │
                   └────────────┬────────────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │        FastAPI Server        │
                   │      (AI Microservice)       │
                   │----------------------------- │
                   │  - NLP: Transcription,       │
                   │    Summarization, NER, etc.  │
                   │  - CV: Keyframe Detection    │
                   │  - Highlight Generation      │
                   │  - ML Model Inference (GPU)  │
                   │  - Async job processing      │
                   │  - Returns JSON results to   │
                   │    NestJS over REST or gRPC  │
                   └────────────┬────────────────┘
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │     Shared Infrastructure       │
                 │-------------------------------- │
                 │  - PostgreSQL (Main Data)       │
                 │  - MinIO / S3 (Video Storage)   │
                 │  - Redis (Cache/Queue)          │
                 │  - Message Broker (RabbitMQ /   │
                 │    Kafka for async tasks)       │
                 │  - Docker / Kubernetes for      │
                 │    orchestration                │
                 └────────────────────────────────┘
