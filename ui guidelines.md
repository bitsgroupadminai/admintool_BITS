# Smart Workflow Admin System
# UI / UX Guidelines Document

---

# 1. DESIGN PHILOSOPHY

The UI should feel:

- Modern
- Calm
- Premium
- Efficient
- Intelligent
- Minimal
- Structured
- Fast

The interface should NOT feel:
- cluttered
- overly colorful
- enterprise-ugly
- government-portal-like
- “template dashboard”
- intimidating

This is NOT a banking dashboard.

This is NOT SAP.

This is NOT a hospital ERP from 2009 held together with emotional duct tape 🧵

The experience should feel like:

“Linear meets Notion meets Stripe Dashboard meets modern university tooling.”

---

# 2. CORE UI PRINCIPLES

# PRINCIPLE 1

Reduce cognitive load.

Admins handle:
- workflows
- queues
- approvals
- documents
- student issues

The UI should reduce stress, not increase it.

---

# PRINCIPLE 2

Information hierarchy > decoration.

Important actions should stand out naturally.

Avoid:
- excessive colors
- heavy borders
- giant cards everywhere
- too many shadows

---

# PRINCIPLE 3

Whitespace is a feature.

Use generous spacing.

The interface should breathe.

---

# PRINCIPLE 4

Motion should feel subtle and intelligent.

Avoid:
- dramatic animations
- bouncing effects
- flashy transitions

Prefer:
- smooth fades
- soft hover states
- elegant panel transitions

---

# PRINCIPLE 5

Every screen should answer:

“What should the admin do next?”

without confusion.

---

# 3. DESIGN STYLE DIRECTION

# VISUAL TONE

Elegant operational software.

Think:
- muted colors
- soft surfaces
- strong typography
- structured layouts
- focused actions

---

# AESTHETIC GOAL

“Powerful but calm.”

The UI should make admins feel:
- organized
- in control
- efficient
- smart

---

# 4. COLOR SYSTEM

# PRIMARY COLORS

Use:
- neutral/slate base
- white surfaces
- dark typography
- subtle accent color

Recommended palette:

Background:
- #FAFAFA

Surface:
- #FFFFFF

Primary Text:
- #111827

Secondary Text:
- #6B7280

Border:
- #E5E7EB

---

# ACCENT COLORS

Choose ONE primary accent.

Recommended:
- Indigo
- Blue
- Emerald

Avoid:
- bright neon
- saturated purple
- aggressive red-heavy UI

---

# SEMANTIC COLORS

Success:
- soft green

Warning:
- amber

Error:
- muted red

Info:
- soft blue

Colors should feel:
- restrained
- premium
- professional

NOT:
“gaming RGB dashboard.”

---

# 5. TYPOGRAPHY

# FONT STYLE

Use:
- Inter

Fallbacks:
- system-ui
- sans-serif

---

# TYPOGRAPHY FEEL

Modern SaaS typography.

Readable.
Clean.
Sharp.

---

# FONT WEIGHTS

Use mostly:
- 400
- 500
- 600

Avoid excessive boldness.

---

# FONT SIZES

Page Title:
- 28–32px

Section Header:
- 20–24px

Card Header:
- 16–18px

Body:
- 14–15px

Table Text:
- 13–14px

Helper Text:
- 12px

---

# 6. LAYOUT SYSTEM

# SIDEBAR

Use:
- collapsible sidebar
- icon + label navigation
- grouped sections

Sidebar should feel:
- elegant
- lightweight
- structured

NOT:
- oversized
- bulky
- dark-black gaming panel

---

# TOPBAR

Minimal topbar.

Include:
- search
- notifications
- profile menu
- quick actions

Avoid overcrowding.

---

# CONTENT WIDTH

Use:
- max-width layouts
- consistent gutters
- large whitespace margins

Avoid edge-to-edge chaos.

---

# GRID SYSTEM

Prefer:
- 12-column responsive layout

Cards should align perfectly.

---

# 7. CARD DESIGN

Cards should be:
- soft
- subtle
- informative

Avoid:
- thick borders
- giant shadows
- nested cards everywhere

---

# CARD STYLE

Use:
- rounded-xl or rounded-2xl
- subtle border
- tiny shadow

Example feel:
- modern Stripe
- Linear
- Vercel dashboard

---

# 8. TABLE DESIGN

Tables are CRITICAL in admin software.

Most time will be spent here.

---

# TABLE RULES

Use:
- compact spacing
- sticky headers
- clean row hover states
- soft zebra striping (optional)

---

# IMPORTANT

Tables must NEVER feel:
- cramped
- spreadsheet ugly
- over-bordered

---

# TABLE FEATURES

Support:
- filters
- search
- pagination
- sorting
- row actions
- bulk actions

---

# 9. FORMS

Forms should feel:
- guided
- calm
- progressive

NOT:
“40 fields dumped onto screen.”

---

# FORM RULES

Use:
- grouped sections
- progressive disclosure
- inline validation
- helper text

---

# INPUT STYLING

Use:
- soft borders
- medium height
- clean focus rings

Avoid:
- harsh blue glows
- thick outlines

---

# 10. BUTTON SYSTEM

# BUTTON HIERARCHY

Primary:
- filled accent

Secondary:
- outline

Ghost:
- minimal

Danger:
- muted red

---

# BUTTON RULES

Buttons should:
- feel intentional
- not oversized
- not too rounded

Avoid:
- giant pill buttons everywhere

---

# 11. MODALS & DRAWERS

Prefer:
- drawers for workflows/forms
- modals for confirmations

Reason:
Drawers preserve context better.

---

# MODAL STYLE

Use:
- soft overlay
- subtle blur
- rounded corners

Avoid:
- giant fullscreen modals

---

# 12. WORKFLOW UI

Workflow screens are CORE product identity.

---

# WORKFLOW VISUALIZATION

Use:
- step indicators
- timelines
- approval chains
- progress states

Workflow progression should feel:
- visual
- understandable
- traceable

---

# WORKFLOW STATES

Pending:
- neutral

In Progress:
- blue/indigo

Approved:
- green

Rejected:
- muted red

Escalated:
- amber

---

# 13. QUEUE UI

Queue experience should feel:
- realtime
- smooth
- operational

---

# SHOW

- current token
- estimated wait
- active counters
- queue status
- priority state

---

# REALTIME UPDATES

Use subtle:
- fades
- count animations
- status pulses

Avoid:
- flashy ticker effects

---

# 14. CHATBOT UI

The chatbot should feel:
- assistant-like
- smart
- lightweight

NOT:
“customer support widget spam.”

---

# CHAT STYLE

Use:
- clean conversation layout
- soft message bubbles
- contextual suggestions

---

# SUGGESTED ACTIONS

Allow quick actions:
- “Upload documents”
- “Track request”
- “Book appointment”

---

# 15. ICONOGRAPHY

Use:
- Lucide Icons

Reason:
- modern
- minimal
- consistent

Avoid:
- skeuomorphic icons
- emoji-heavy interfaces

---

# 16. MOTION & ANIMATIONS

Use Framer Motion sparingly.

---

# GOOD ANIMATIONS

- panel transitions
- subtle hover states
- accordion expansion
- loading skeletons
- smooth filtering

---

# AVOID

- bouncing
- spinning chaos
- dramatic page transitions
- excessive microanimations

---

# 17. LOADING STATES

Never leave blank screens.

Use:
- skeleton loaders
- shimmer placeholders
- optimistic updates

---

# 18. EMPTY STATES

Empty states should feel:
- helpful
- intelligent
- optimistic

Example:

“No workflow templates yet.
Create your first workflow to start processing requests.”

---

# 19. RESPONSIVENESS

Primary target:
- desktop

Secondary:
- tablet

Minimal support:
- mobile

This is admin software.
Optimize for large screens first.

---

# 20. ACCESSIBILITY

Mandatory:
- keyboard navigation
- focus states
- readable contrast
- accessible forms
- semantic HTML

---

# 21. DARK MODE

Support dark mode later.

Do NOT prioritize initially.

Perfect light mode first.

---

# 22. DESIGN SYSTEM RULES

Create reusable:

- typography styles
- spacing tokens
- button variants
- table patterns
- form patterns
- status badges
- card layouts

Consistency is more important than creativity.

---

# 23. UI STACK RECOMMENDATION

Use:

- Tailwind CSS
- ShadCN UI
- Framer Motion
- Lucide Icons
- TanStack Table

---

# 24. FINAL UI PHILOSOPHY

The UI should feel like:

“Administrative complexity made invisible.”

The software should make university admins feel:
- calmer
- faster
- more organized
- less overwhelmed

The best compliment is:

“This feels surprisingly easy to use.”

NOT:

“Wow so many animations.”