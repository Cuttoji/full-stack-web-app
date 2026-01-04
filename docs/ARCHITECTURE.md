# Architecture Documentation

## Overview

This is a full-stack Task Management System built with Next.js 16, designed for managing tasks, leave requests, and team resources in a Thai language environment.

## Technology Stack

### Frontend
- **Next.js 16.1.1** - React framework with App Router
- **React 19.2** - UI library
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Hook Form** - Form handling
- **TanStack Query** - Data fetching and caching
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Prisma ORM** - Database client and migration tool
- **PostgreSQL 16** - Primary database
- **JWT (jsonwebtoken)** - Authentication tokens
- **bcryptjs** - Password hashing
- **Zod** - Runtime validation

### Development & Testing
- **TypeScript** - Type safety
- **Vitest** - Unit and integration testing
- **Playwright** - E2E testing
- **Storybook** - Component documentation
- **ESLint** - Code linting
- **Docker** - Containerization

## Project Structure

```
full-stack-web-app/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── dashboard/       # Dashboard data
│   │   ├── tasks/           # Task management
│   │   ├── leaves/          # Leave management
│   │   ├── users/           # User management
│   │   ├── departments/     # Departments
│   │   ├── notifications/   # Notifications
│   │   └── ...
│   ├── (pages)/             # Page components
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── leaves/
│   │   └── ...
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
│
├── components/               # React components
│   ├── layout/              # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── DashboardLayout.tsx
│   ├── tasks/               # Task-specific components
│   │   ├── TaskCard.tsx
│   │   └── CreateTaskForm.tsx
│   └── ui/                  # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       └── Modal.tsx
│
├── contexts/                 # React contexts
│   ├── AuthContext.tsx      # Authentication state
│   ├── OfflineContext.tsx   # Offline support
│   └── Providers.tsx        # Combined providers
│
├── lib/                      # Utility libraries
│   ├── prisma.ts            # Prisma client singleton
│   ├── auth.ts              # Auth utilities & JWT
│   ├── env.ts               # Environment validation
│   ├── dbErrors.ts          # Database error handling
│   ├── apiResponse.ts       # API response utilities
│   ├── apiMiddleware.ts     # Auth middleware
│   ├── logger.ts            # Structured logging
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # General utilities
│
├── prisma/                   # Database
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Seed data
│   └── migrations/          # Migration files
│
├── __tests__/               # Test files
│   ├── lib/                 # Unit tests
│   └── api/                 # Integration tests
│
├── e2e/                     # End-to-end tests
│   └── auth.spec.ts
│
├── docs/                    # Documentation
│   ├── API.md
│   └── ARCHITECTURE.md
│
└── docker/                  # Docker configuration
    └── init.sql
```

## Architecture Patterns

### API Design

The API follows REST conventions with consistent response formats:

```typescript
// Success response
{
  success: true,
  data: { ... },
  message?: string
}

// Error response
{
  success: false,
  error: string,  // Thai language
  code?: string   // Machine-readable code
}
```

### Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Server validates credentials against database
3. On success, JWT token is generated with user info
4. Token is returned and stored client-side
5. Subsequent requests include token in `Authorization` header
6. Server validates token using middleware

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Login   │────▶│ Database │
│          │◀────│  API     │◀────│          │
└──────────┘     └──────────┘     └──────────┘
     │                                  
     │ Token                           
     ▼                                  
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│Protected │────▶│ Database │
│  + JWT   │◀────│  API     │◀────│          │
└──────────┘     └──────────┘     └──────────┘
```

### Role-Based Access Control (RBAC)

The system implements hierarchical RBAC:

```
ADMIN
  └── HEAD_TECH
       └── LEADER
            └── TECH
  └── FINANCE_LEADER
       └── FINANCE
  └── SALES_LEADER
       └── SALES
  └── CUSTOMER_SERVICE
```

Permissions are defined in `lib/types.ts`:
- `canViewTasks`, `canCreateTasks`, `canEditTaskDetails`
- `canApproveLeave`, `canViewLeaveRequests`
- `canManageUsers`, `canViewAllUsers`
- etc.

### Database Schema

Key entities and relationships:

```
User
├── Department (N:1)
├── SubUnit (N:1)
├── Tasks (via TaskAssignment)
├── Leaves
├── LeaveQuotas
└── Notifications

Task
├── Creator (User)
├── Assignments (TaskAssignment)
├── Comments
├── Attachments
└── PrinterLogs

Leave
├── User
├── Approver
└── Type, Status, Dates

Department
├── SubUnits
└── Users
```

## Security Measures

### Authentication
- JWT tokens with 7-day expiry
- bcrypt password hashing (12 rounds)
- Token validation on every protected request

### Rate Limiting
- Login endpoint: 5 requests per 60 seconds per IP
- Uses `rate-limiter-flexible` for in-memory rate limiting

### Input Validation
- Zod schemas for request validation
- Environment variable validation at startup
- SQL injection prevention via Prisma parameterized queries

### Security Headers (Recommended)
```typescript
// next.config.ts
headers: [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]
```

## Error Handling

### Database Errors
Prisma errors are caught and transformed to user-friendly Thai messages:

| Prisma Code | Error Type | HTTP Status |
|-------------|------------|-------------|
| P2002 | Unique constraint | 400 |
| P2003 | Foreign key constraint | 409 |
| P2025 | Record not found | 404 |
| P2024 | Connection timeout | 503 |

### API Errors
All errors return consistent format:
```typescript
{
  success: false,
  error: "Thai error message",
  code: "ERROR_CODE"
}
```

## Logging

Structured logging with levels:
- **DEBUG**: Development details
- **INFO**: Normal operations
- **WARN**: Potential issues
- **ERROR**: Actual errors

Log format includes timestamp, level, context, and optional data.

## Testing Strategy

### Unit Tests (`__tests__/lib/`)
- Utility functions
- Auth helpers
- Error handlers
- Data transformations

### Integration Tests (`__tests__/api/`)
- API endpoint testing with mocked Prisma
- Authentication flow testing
- Request/response validation

### E2E Tests (`e2e/`)
- Full user flows
- Login process
- Critical business flows

## Deployment

### Environment Variables

Required:
```
DATABASE_URL=postgresql://...
JWT_SECRET=<min 16 chars>
NODE_ENV=production
```

Optional:
```
POSTGRES_PASSWORD=<for docker>
PGADMIN_DEFAULT_PASSWORD=<for pgadmin>
NEXT_PUBLIC_APP_URL=https://...
```

### Docker Compose

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=task_management
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Production Build
```bash
npm run build
npm start
```

## Performance Considerations

### Database
- Use indexes on frequently queried columns
- Implement pagination for large datasets
- Use Prisma's `select` to fetch only needed fields

### Caching (Future)
- Consider Redis for session caching
- Implement query result caching
- Use Next.js ISR for semi-static content

### Frontend
- Lazy loading for routes
- Image optimization with next/image
- TanStack Query for client-side caching

## Monitoring (Recommended)

### Health Checks
- Database connectivity check
- API endpoint `/api/health`

### Logging
- Centralized log aggregation
- Error tracking (Sentry, etc.)

### Metrics
- Response times
- Error rates
- Active users

## Future Improvements

1. **API Documentation**: OpenAPI/Swagger integration
2. **Real-time Updates**: WebSocket for notifications
3. **File Storage**: S3/Cloudflare R2 for attachments
4. **Search**: Full-text search with PostgreSQL or Elasticsearch
5. **Analytics**: Dashboard metrics and reports
6. **Mobile App**: React Native companion app
