# Smart Workflow-Based Queue & Administrative Service Management System
# Final Engineering Architecture & Tech Stack Guide

---

# 1. PROJECT OVERVIEW

This project is a workflow-first educational administrative management system that combines:

- Workflow-driven request processing
- Hybrid queue + appointment handling
- Stateful authentication
- Role-based access control
- Real-time queue updates
- AI chatbot assistance
- Document verification workflows
- Redis-backed background jobs

The architecture is designed for:
- Fast development using Cursor + Claude
- Modular scalability
- Clean business logic separation
- Real-world deployment readiness
- Educational institution use cases

The system follows a:

MODULAR MONOLITH ARCHITECTURE

NOT microservices.

---

# 2. FINAL TECH STACK

# FRONTEND

## Core
- React
- Vite
- JavaScript

## Styling
- Tailwind CSS
- ShadCN UI

## State Management
- Zustand

## API Layer
- Axios

## Data Fetching / Caching
- TanStack Query

## Routing
- React Router DOM

## Forms
- React Hook Form

## Validation
- Zod

## Realtime
- Socket.IO Client

## Notifications
- Sonner

## Charts
- Recharts

## Date Utilities
- Day.js

## File Upload
- React Dropzone

---

# BACKEND

## Runtime
- Node.js

## Framework
- Express.js

## Language
- JavaScript

## Database
- MongoDB

## ODM
- Mongoose

## Cache / Session Store
- Redis

## Queue Engine
- BullMQ

## Realtime
- Socket.IO

## Validation
- Zod

## Authentication
- Stateful Session Authentication

## Password Hashing
- bcrypt

## Cookies
- cookie-parser

## Security
- Helmet
- CORS
- Rate Limiting

## Logging
- Pino

## API Documentation
- Swagger/OpenAPI

---

# AI / CHATBOT STACK

## LLM
- Gemini API

## Embeddings
- Gemini Embeddings

## RAG Framework
- LangChain

## Vector Database
- Qdrant

## Knowledge Sources
- Markdown
- PDFs
- Service metadata
- Workflow data
- FAQ documents

---

# STORAGE & INFRASTRUCTURE

## File Storage
- ImageKit

---

# TESTING

## Unit Testing
- Jest

## API Testing
- Supertest

---

# 3. CORE ENGINEERING PRINCIPLES

# DO

- Modular monolith
- Feature-first backend organization
- Service-layer architecture
- Stateful authentication
- Redis-backed sessions
- BullMQ workers
- Workflow-first request handling
- Queue abstraction
- Background workers
- RAG chatbot architecture
- Thin controllers
- Centralized validation
- DTO-based request handling

---

# DO NOT

- Microservices initially
- Kubernetes initially
- CQRS/Event sourcing
- GraphQL
- Native mobile apps
- Premature abstraction
- Overengineering infrastructure

---

# 4. FRONTEND ARCHITECTURE

/src

    App.jsx
    main.jsx

    /assets

    /common

    /components
        /auth
        /layouts
        /services
        /ui
        /workflow

    /config

    /hooks

    /lib

    /menus

    /pages
        /admin
        /auth
        /admissions
        /exams
        /profile

    /routes

    /api

    /store

    /utils

---

# FRONTEND RULES

# RULE 1

Pages must stay thin.

Pages should:
- compose components
- manage layouts
- connect stores/hooks

NOT contain large business logic.

---

# RULE 2

API calls belong ONLY inside:

/api

Example:

/api
    auth.api.js
    workflow.api.js
    queue.api.js

---

# RULE 3

Business state belongs inside Zustand stores.

---

# RULE 4

Convert ALL TypeScript files to JavaScript.

Convert:
- .ts → .js
- .tsx → .jsx

Especially:
- /components/ui/*
- /lib/utils.ts

---

# RULE 5

ShadCN components should remain:
- reusable
- dumb
- presentation-only

---

# 5. FINAL BACKEND ARCHITECTURE (MANDATORY)

The backend MUST follow:

FEATURE-FIRST MODULE ARCHITECTURE

---

# FINAL BACKEND STRUCTURE

/src

    /modules

        /auth
            auth.controller.js
            auth.service.js
            auth.model.js
            auth.validator.js
            auth.dto.js
            auth.router.js
            auth.swagger.js

        /users
            user.controller.js
            user.service.js
            user.model.js
            user.validator.js
            user.dto.js
            user.router.js
            user.swagger.js

        /institutes
            institute.controller.js
            institute.service.js
            institute.model.js
            institute.validator.js
            institute.dto.js
            institute.router.js
            institute.swagger.js

        /services
            service.controller.js
            service.service.js
            service.model.js
            service.validator.js
            service.dto.js
            service.router.js
            service.swagger.js

        /workflow
            workflow.controller.js
            workflow.service.js
            workflowTemplate.model.js
            workflowInstance.model.js
            workflow.validator.js
            workflow.dto.js
            workflow.router.js
            workflow.swagger.js

        /service-requests
            serviceRequest.controller.js
            serviceRequest.service.js
            serviceRequest.model.js
            serviceRequest.validator.js
            serviceRequest.dto.js
            serviceRequest.router.js
            serviceRequest.swagger.js

        /documents
            document.controller.js
            document.service.js
            document.model.js
            document.validator.js
            document.dto.js
            document.router.js
            document.swagger.js

        /queue
            queue.controller.js
            queue.service.js
            queue.manager.js
            queue.optimizer.js
            queue.register.js
            queueCounter.model.js
            queueTicket.model.js
            queue.validator.js
            queue.dto.js
            queue.router.js
            queue.swagger.js

        /appointments
            appointment.controller.js
            appointment.service.js
            appointment.model.js
            appointment.validator.js
            appointment.dto.js
            appointment.router.js

        /chat
            chat.controller.js
            chat.service.js
            chatFaq.model.js
            chat.validator.js
            chat.dto.js
            chat.router.js
            chat.swagger.js

        /notifications
            notification.controller.js
            notification.service.js
            notification.model.js
            notification.validator.js
            notification.router.js
            notification.swagger.js

        /exports
            export.controller.js
            export.service.js
            export.router.js
            export.swagger.js

    /core

        /config
            db.js
            redis.js
            s3.js
            imagekit.js
            websocket.js
            mailer.js

        /middlewares
            auth.middleware.js
            authorize.middleware.js
            requireAuth.middleware.js
            userSession.middleware.js
            globalErrorHandler.js

        /constants
            permission.js
            roles_permission.js

        /utils

        /validators

        /logger

    /shared

        /enums
        /helpers
        /types
        /constants

    /workers

    /templates

    app.js
    server.js

---

# WHY THIS STRUCTURE IS FINAL

Benefits:
- Better Cursor understanding
- Better Claude context handling
- Cleaner feature ownership
- Easier scaling
- Less import chaos
- Easier onboarding
- Better modularity
- Better long-term maintainability

---

# 6. MOST IMPORTANT BACKEND RULES

# RULE 1

Controllers must stay THIN.

Controllers should ONLY:
- validate
- call services
- return responses

NO business logic inside controllers.

---

# RULE 2

ALL business logic belongs inside services.

---

# RULE 3

Workers NEVER directly access DB models.

Correct:

Worker
→ Service Layer
→ DB

Wrong:

Worker
→ DB directly

---

# RULE 4

MongoDB is source of truth.

Redis is NEVER source of truth.

Redis should only store:
- sessions
- cache
- queue state
- realtime state
- BullMQ jobs

---

# RULE 5

All APIs must follow consistent response formats.

SUCCESS:

{
    success: true,
    message: "",
    data: {}
}

ERROR:

{
    success: false,
    message: "",
    errors: []
}

---

# RULE 6

Use JSDoc heavily.

Example:

/**
 * Create a new service request
 * @param {Object} payload
 * @returns {Promise<Object>}
 */

This greatly improves:
- Cursor autocomplete
- Claude understanding
- maintainability

---

# 7. AUTHENTICATION ARCHITECTURE

The system uses:

STATEFUL SESSION AUTHENTICATION

NOT pure JWT auth.

---

# AUTH FLOW

1. User logs in
2. Session created in Redis
3. Session ID stored in signed httpOnly cookie
4. Every request validates session via Redis

---

# SESSION FEATURES

- Max 2 active devices
- Logout current device
- Logout all devices
- Session expiry
- Session revocation

---

# COOKIE SETTINGS

httpOnly: true
secure: true
sameSite: "strict"

---

# JWT USAGE

JWT should ONLY be used for:
- password reset tokens
- email verification tokens
- temporary actions

NOT primary auth.

---

# 8. DATABASE DESIGN PRINCIPLES

# COLLECTIONS

/users
/institutes
/services
/service_offerings
/workflow_templates
/workflow_instances
/workflow_step_instances
/service_requests
/documents
/appointments
/queues
/chat_sessions
/chat_messages
/notifications
/audit_logs

---

# DATABASE RULES

- Use indexes aggressively
- Avoid deep nesting
- Prefer references over huge embedded docs
- Store workflow history separately
- Soft delete critical entities

---

# 9. REDIS USAGE

Redis responsibilities:

- Sessions
- BullMQ backend
- Queue state
- Caching
- Rate limiting
- WebSocket scaling
- Real-time counters

---

# REDIS KEY CONVENTIONS

session:{sessionId}

queue:{serviceId}

request:{requestId}

chat:{sessionId}

cache:services

---

# 10. WORKFLOW ENGINE ARCHITECTURE

Each request is:

A WORKFLOW INSTANCE

Each workflow contains:
- ordered steps
- assigned roles
- SLA timings
- approvals/rejections
- document verification states

---

# WORKFLOW FLOW

Request Created
→ Workflow Instance Created
→ Step Processing
→ Approval/Rejection
→ Next Step
→ Completion

---

# IMPORTANT

Workflow progression MUST be controlled centrally.

Never allow frontend-controlled transitions.

---

# 11. QUEUE SYSTEM ARCHITECTURE

# QUEUE TYPES

## Virtual Queue
For walk-ins.

## Appointment Queue
For scheduled visits.

---

# BULLMQ RESPONSIBILITIES

- Queue scheduling
- ETA calculation
- Escalation
- Notifications
- Delayed jobs
- Retries
- Priority handling

---

# IMPORTANT

Queue logic should remain abstracted inside:

/modules/queue

---

# 12. REALTIME ARCHITECTURE

Use Socket.IO.

Realtime features:
- Queue updates
- Appointment updates
- Workflow updates
- Notifications
- Chatbot responses
- Admin monitoring

---

# IMPORTANT

Socket auth MUST validate Redis sessions.

---

# 13. CHATBOT ARCHITECTURE

Use HYBRID AI architecture.

RAG + Gemini

Used for:
- Complex guidance
- Contextual assistance
- Multi-step explanations
- Smart support

---

# CHATBOT FLOW

User Query
→ Intent Detection
→ Deterministic Check
→ If insufficient:
→ Vector Search (Qdrant)
→ Context Retrieval
→ Gemini Generation
→ Response

---

# VECTOR DATABASE COLLECTIONS

/services_knowledge
/workflow_docs
/policies
/faqs

---

# 14. FILE STORAGE STRATEGY

# STORAGE PROVIDER

Use:

ImageKit

Reason:
- Simpler setup
- Built-in CDN
- Easy file optimization
- Fast integration with Node.js
- Better developer velocity
- Good enough for current scale

---

# IMAGEKIT RESPONSIBILITIES

- Document uploads
- Image uploads
- PDF storage
- File optimization
- CDN delivery
- Signed upload authentication

---

# UPLOAD FLOW

Frontend
→ Backend Upload Auth Endpoint
→ ImageKit Upload
→ Metadata stored in MongoDB

---

# FILE METADATA

Store in MongoDB:

- uploadedBy
- requestId
- workflowStep
- verificationStatus
- fileUrl
- fileId
- mimeType
- size
- uploadedAt

---

# IMPORTANT RULES

# RULE 1

MongoDB stores ONLY metadata.

Actual files remain inside ImageKit.

---

# RULE 2

Always validate:
- file type
- mime type
- file extension
- file size

before upload.

---

# RULE 3

Documents should support statuses:

- pending
- verified
- rejected

---

# RULE 4

Document verification must remain tied to:
- workflow steps
- staff approvals
- service requests

---

# 15. NOTIFICATION SYSTEM

# PHASE 1
- Email notifications

# PHASE 2
- In-app notifications

# PHASE 3
- WhatsApp/SMS

---

# EMAIL PROVIDERS

Development:
- Nodemailer

Production:
- Resend
or
- SendGrid

---

# 16. INITIAL DEVELOPMENT PRIORITIES

# BUILD NOW

## FOUNDATION
- Auth
- Sessions
- RBAC
- Institute management

## CORE WORKFLOW
- Workflow templates
- Workflow instances
- Request state transitions

## REQUEST SYSTEM
- Service requests
- Status tracking
- Document linking

## QUEUE SYSTEM
- Queue tickets
- Queue counters
- ETA calculation

## DOCUMENT SYSTEM
- Upload
- Verification
- Reject/approve

---

# 17. CURSOR + CLAUDE DEVELOPMENT RULES

# CURSOR RULES

Create:

.cursor/rules

Include rules for:
- thin controllers
- service-first architecture
- no duplicated logic
- centralized validation
- reusable UI patterns
- clean imports

---

# CLAUDE BEST USAGE

Use Claude for:
- architecture
- service logic
- validation schemas
- refactoring
- workflow logic

Use GPT for:
- UI generation
- edge cases
- product logic
- UX improvements

---

# 18. ESLINT & CODE QUALITY

Use STRICT ESLint.

This becomes your:
“poor man’s TypeScript”.

Mandatory:
- no unused vars
- import sorting
- no console.logs in production
- consistent return patterns

---

# 19. PERFORMANCE TARGETS

- API response < 500ms
- Cached response < 100ms
- Realtime queue updates
- 100+ concurrent users initially

---


# 20. FINAL ENGINEERING PHILOSOPHY

Focus on:

BUSINESS FLOWS FIRST.

NOT infrastructure perfection.

Prioritize:
- workflows
- queues
- requests
- chatbot
- staff processing

NOT:
- overengineering
- unnecessary refactors
- infra obsession

The biggest current risk is:
OVERENGINEERING

not scaling.

---

# END