# Smart Workflow Admin System
# Backend Engineering Guidelines

---

# 1. BACKEND PHILOSOPHY

The backend should feel:

- Predictable
- Modular
- Scalable
- Clean
- Observable
- Maintainable
- AI-friendly
- Business-flow-first

This is NOT:
- a hackathon backend
- a random collection of routes
- “controller spaghetti”
- “Mongo queries directly everywhere”

The backend must optimize for:

- long-term maintainability
- Cursor + Claude understanding
- feature scalability
- business workflow clarity
- operational reliability

---

# 2. CORE ARCHITECTURE STYLE

The backend follows:

MODULAR MONOLITH ARCHITECTURE

NOT microservices.

---

# WHY MODULAR MONOLITH

Benefits:
- simpler deployment
- faster development
- easier debugging
- easier AI assistance
- shared transactions
- less infrastructure complexity

This project is NOT at a scale requiring:
- service mesh
- distributed tracing chaos
- Kubernetes orchestration madness 🌋

---

# 3. BACKEND DESIGN PRINCIPLES

# PRINCIPLE 1

Business logic must be centralized.

Never scatter logic across:
- controllers
- routes
- workers
- middlewares

Business logic belongs in:
SERVICES.

---

# PRINCIPLE 2

Controllers should remain thin.

Controllers should ONLY:
- validate requests
- call services
- return responses

Nothing else.

---

# PRINCIPLE 3

MongoDB is source of truth.

Redis is NOT source of truth.

Redis stores:
- sessions
- queue state
- cache
- realtime state
- BullMQ jobs

---

# PRINCIPLE 4

Every major feature should be isolated into modules.

Features should own:
- controllers
- services
- models
- validators
- DTOs
- routes

---

# PRINCIPLE 5

Optimize for readability over cleverness.

Prefer:
- boring code
- explicit naming
- predictable patterns

Avoid:
- “genius abstractions”
- magic utility factories
- overly dynamic patterns

Future-you will thank present-you.

---

# 4. FINAL BACKEND STRUCTURE

/src

    /modules

        /auth
        /users
        /institutes
        /services
        /workflow
        /service-requests
        /documents
        /queue
        /appointments
        /chat
        /notifications
        /exports

    /core

        /config
        /middlewares
        /logger
        /utils
        /validators

    /shared

        /constants
        /enums
        /helpers

    /workers

    /templates

    app.js
    server.js

---

# 5. MODULE STRUCTURE RULES

Every module should contain:

/feature

    feature.controller.js
    feature.service.js
    feature.model.js
    feature.validator.js
    feature.dto.js
    feature.router.js
    feature.swagger.js

---

# WHY THIS STRUCTURE

Benefits:
- better feature ownership
- easier navigation
- better AI context understanding
- easier refactoring
- lower coupling

---

# 6. CONTROLLER GUIDELINES

# CONTROLLERS MUST NOT

- contain business logic
- access DB directly
- contain workflow decisions
- contain queue calculations
- contain large try/catch jungles

---

# CONTROLLERS SHOULD ONLY

- validate input
- call services
- format responses
- handle status codes

---

# GOOD CONTROLLER EXAMPLE

Controller
→ Service
→ Response

---

# BAD CONTROLLER EXAMPLE

Controller
→ DB queries
→ Redis
→ Queue logic
→ Workflow logic
→ Notifications
→ Existential collapse

---

# 7. SERVICE LAYER GUIDELINES

Services are the HEART of the backend.

All business logic belongs here.

---

# SERVICES HANDLE

- workflows
- permissions
- validations
- queue orchestration
- document handling
- state transitions
- notifications
- business rules

---

# SERVICES MUST BE

- reusable
- composable
- predictable
- testable

---

# IMPORTANT

Workers should ONLY call services.

NEVER DB models directly.

Correct:

Worker
→ Service
→ DB

Wrong:

Worker
→ DB directly

---

# 8. ROUTING GUIDELINES

Use REST APIs.

Version all APIs.

Use:

/api/v1/

Examples:

/api/v1/auth/login
/api/v1/services
/api/v1/queue
/api/v1/workflows

---

# ROUTE NAMING RULES

Use:
- nouns
- consistency
- plural resources

Avoid:
- weird verbs in URLs
- inconsistent naming

---

# 9. RESPONSE FORMAT GUIDELINES

All APIs must return consistent responses.

---

# SUCCESS FORMAT

{
    success: true,
    message: "",
    data: {}
}

---

# ERROR FORMAT

{
    success: false,
    message: "",
    errors: []
}

---

# WHY

Consistency improves:
- frontend integration
- debugging
- AI generation quality
- developer speed

---

# 10. DATABASE GUIDELINES

# DATABASE

MongoDB

---

# MONGOOSE RULES

Use:
- indexes aggressively
- references over deep nesting
- timestamps everywhere

---

# AVOID

- giant nested objects
- huge documents
- inconsistent schemas

---

# IMPORTANT COLLECTIONS

/users
/institutes
/services
/workflow_templates
/workflow_instances
/service_requests
/documents
/queues
/appointments
/chat_sessions
/chat_messages
/notifications
/audit_logs

---

# 11. WORKFLOW ENGINE GUIDELINES

The workflow engine is CORE product infrastructure.

Treat it carefully.

---

# WORKFLOW PRINCIPLES

Every request:
- has state
- has steps
- has ownership
- has history

---

# WORKFLOW STATES MUST BE

Explicit.

Never use:
- random booleans
- unclear status naming

Use enums.

---

# WORKFLOW TRANSITIONS

Transitions must be:
- validated centrally
- role-checked
- logged
- deterministic

Frontend should NEVER control workflow progression.

---

# 12. QUEUE SYSTEM GUIDELINES

Use:
- BullMQ
- Redis

---

# QUEUE RESPONSIBILITIES

- scheduling
- ETA calculation
- retries
- delayed jobs
- escalation
- reminders
- priority handling

---

# IMPORTANT

Queue logic belongs ONLY inside:
- queue services
- queue managers
- workers

NOT controllers.

---

# 13. AUTHENTICATION GUIDELINES

Use:

STATEFUL SESSION AUTH

NOT pure JWT auth.

---

# WHY

Because this system requires:
- RBAC
- admin controls
- device tracking
- session invalidation
- realtime auth

---

# SESSION FLOW

1. User logs in
2. Redis session created
3. Signed cookie stored
4. Session validated on every request

---

# SESSION FEATURES

- logout all devices
- session expiry
- device limits
- revocation support

---

# JWT USAGE

JWT only for:
- password reset
- email verification
- temporary secure actions

---

# 14. REDIS GUIDELINES

Redis should handle:
- sessions
- BullMQ backend
- caching
- queue state
- realtime state
- rate limiting

---

# IMPORTANT

Redis is NOT source of truth.

MongoDB always wins.

---

# REDIS KEY CONVENTIONS

session:{id}

queue:{serviceId}

request:{requestId}

cache:services

chat:{sessionId}

---

# 15. VALIDATION GUIDELINES

Use:
- Zod

---

# VALIDATE

- request body
- params
- query
- env variables

---

# NEVER TRUST

- frontend validation
- client-side checks

The backend validates EVERYTHING.

---

# 16. ERROR HANDLING GUIDELINES

Use centralized error handling.

---

# DO

- create consistent errors
- log errors
- sanitize responses

---

# DO NOT

- leak stack traces
- expose internal DB errors
- return inconsistent messages

---

# 17. LOGGING GUIDELINES

Use:
- Pino

---

# LOG IMPORTANT EVENTS

- auth actions
- workflow transitions
- queue escalations
- failed uploads
- permission denials
- worker failures

---

# LOGS SHOULD BE

- structured
- searchable
- readable

---

# 18. FILE STORAGE GUIDELINES

Use:
- ImageKit

---

# STORE IN MONGODB

ONLY metadata:
- fileUrl
- fileId
- uploadedBy
- requestId
- verificationStatus

Actual files remain in ImageKit.

---

# VALIDATE FILES

Always validate:
- mime type
- extension
- size
- upload limits

---

# DOCUMENT STATES

- pending
- verified
- rejected

---

# 19. CHATBOT BACKEND GUIDELINES

Use hybrid chatbot architecture.

---

# LAYER 1

Deterministic responses:
- FAQs
- workflow rules
- deadlines
- eligibility

---

# LAYER 2

RAG + Gemini:
- contextual support
- explanations
- guidance

---

# IMPORTANT

The chatbot should NOT hallucinate workflow rules.

Critical operational responses must remain deterministic.

---

# 20. SECURITY GUIDELINES

Mandatory:
- Helmet
- CORS
- Rate limiting
- Secure cookies
- RBAC
- Session validation
- Input sanitization
- File validation

---

# NEVER

- trust client role
- trust client workflow state
- expose internal IDs unnecessarily

---

# 21. CODE STYLE GUIDELINES

Prefer:
- explicit naming
- readable functions
- smaller files
- predictable structure

---

# FUNCTION RULES

Functions should:
- do one thing well
- have clear names
- avoid side-effect chaos

---

# AVOID

- giant 700-line service files
- deeply nested conditionals
- utility hell

---

# 22. JSDOC GUIDELINES

Use JSDoc heavily.

Example:

/**
 * Create workflow instance
 * @param {Object} payload
 * @returns {Promise<Object>}
 */

This improves:
- Cursor autocomplete
- Claude understanding
- maintainability

---

# 23. TESTING GUIDELINES

Test:
- services
- workflow logic
- queue logic
- auth
- validations

---

# PRIORITIZE TESTING

Critical flows:
- auth
- workflows
- queue transitions
- approvals
- document verification

---

# 24. OBSERVABILITY GUIDELINES

Eventually add:
- monitoring
- metrics
- alerting

Track:
- API latency
- Redis health
- worker failures
- queue delays
- socket failures

---

# 25. PERFORMANCE GUIDELINES

Target:
- API < 500ms
- cached reads < 100ms

---

# OPTIMIZE

- indexes
- Redis caching
- query efficiency

NOT premature infra complexity.

---

# 26. SCALING STRATEGY

# PHASE 1
Single VPS

# PHASE 2
Separate worker server

# PHASE 3
Managed Redis + Mongo Atlas

# PHASE 4
Horizontal scaling

---

# IMPORTANT

Do NOT architect for 10 million users today.

Architect for:
- maintainability
- clarity
- operational correctness

---

# 27. CURSOR + CLAUDE GUIDELINES

# CURSOR RULES

Create:
.cursor/rules

Include:
- thin controllers
- service-first logic
- reusable validators
- centralized responses
- modular architecture

---

# USE CLAUDE FOR

- architecture
- workflow logic
- refactoring
- validation schemas

---

# USE GPT FOR

- edge cases
- API ergonomics
- debugging ideas
- product logic

---

# 28. FINAL BACKEND PHILOSOPHY

The backend should feel like:

“A clean operational engine.”

Not:
“A pile of routes slowly gaining consciousness.”

The best backend is:
- boring
- predictable
- understandable
- reliable

Business clarity always beats technical cleverness.