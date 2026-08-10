# User Manual

How to use the platform day-to-day (Admin, Staff, Student).

## Portals

| Portal | Local URL | Who |
| --- | --- | --- |
| Admin & Staff | http://localhost:5173 | Institute admin, reviewers, counter staff |
| Student | http://localhost:5174 | Applicants / students |
| Backend API | http://localhost:5001 | Used by the UIs automatically |

---

## Words you will see in the app

- **Service** — a campus process (example: Undergraduate Admissions)
- **Offering** — one concrete intake of that service (example: B.Tech CSE 2026)
- **Knowledge document** — PDF/DOCX policy file used for AI help and chatbot
- **Workflow step** — one review/action step (handled by Staff, AI, or Student)
- **Application / request** — a student’s submitted form + documents
- **Queue / Appointment** — visit handling after the request is ready

---

## A) Admin guide

### A1. First setup

1. Open http://localhost:5173/signup  
2. Create institute + first admin account  
3. Complete wizard:
   - Institute profile
   - Add staff
   - Review & finish  
4. You land on the Admin dashboard

### A2. Create a service

1. **Services → Create service**  
2. Enter name + description  
3. Open service detail  
4. Upload knowledge PDF/DOCX  
5. Optional: **Generate understanding** (needs OpenAI key)  
6. Create an **Offering**

### A3. Configure & activate offering

Complete all wizard steps:

1. Details  
2. Eligibility  
3. Documents  
4. Workflow  
5. Queue (`queue_only` / `appointment_only` / `hybrid`)  
6. Review → **Activate**

Activation is blocked if required sections are incomplete.

### A4. Students & operations

- **Students** — create / manage student accounts  
- **Applications** — monitor all requests  
- **Queue board / Appointments** — visit operations  
- **Payments / Notifications** — when configured  
- **System Health** — MongoDB / Redis / workers status  
- **Exports / ERP** — data export & sync hooks  

### Admin tip

Always review AI suggestions before activating. Uncertain AI verification should escalate to humans (that is by design).

---

## B) Staff guide

### B1. Login

1. Open http://localhost:5173/login  
2. Use staff credentials created by admin (staff cannot self-signup)

### B2. Review applications

1. Open **Applications**  
2. Open an assigned request  
3. Check documents + fields  
4. Take an allowed action:
   - Approve  
   - Return for correction (add notes)  
   - Reject (add reason)  
   - Handle escalated AI cases  

### B3. Queue & appointments

1. **Queue board** — call next, complete ticket  
2. **Appointments** — manage booked / virtual slots  

### Staff tip

Write clear return notes so students know exactly what to fix.

---

## C) Student guide

### C1. Open portal

1. Go to http://localhost:5174  
2. Select / open your institute  
3. Login, or start enrollment if public intake is open

### C2. First login

If admin created your account:

1. Login with issued password  
2. Change password when asked  
3. Complete profile if required  

### C3. Apply

1. Browse **Services**  
2. Read eligibility + required documents  
3. Use **Guidance / Chat** if unsure  
4. **Apply** → fill fields → upload docs → submit  
5. Track status in **Request history**

### C4. Returned for correction

1. Open the returned request  
2. Read staff notes  
3. Fix fields/documents  
4. Resubmit  

### C5. Queue or appointment

When visit-ready:

- Join live **queue**, or  
- Book an **appointment** slot (Meet link may appear if configured)

### C6. Payment (if required)

Pay from the payment step, then wait for confirmation.

---

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Cannot login | Check password; ask admin if locked |
| Offering not visible | Offering may not be Activated |
| Upload fails | Wrong type or file too large |
| Weak chat answers | Missing knowledge docs or AI keys |
| No queue option | Not visit-ready, or mode is appointment-only |
| No emails | SMTP not configured; check in-app notifications |

Install/setup problems → see `docs/INSTALLATION.md`  
Code layout → see `docs/ARCHITECTURE.md`
