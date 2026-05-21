# Platform Layering Strategy

## Product boundary

1DentalAI / OutreachHub.ai is becoming an AI healthcare operations platform, but the product must not blur every adjacent category into the PMS build.

## Layer 1: Core PMS

Build first. This is the operational system of record.

- Patient management
- Family accounts and guarantors
- Scheduling, chairs, operatories, providers, recall, waitlists
- Clinical charting, odontogram, perio, SOAP notes
- Imaging and image-document linkage
- Treatment planning, estimates, signatures, acceptance
- Insurance plans, eligibility, fee schedules, benefits, deductibles, frequency limitations
- Billing, ledger, invoices, statements, balances, adjustments, write-offs, payment posting
- Claims, attachments, ERA/EOB posting, claim tracking, denial management
- Payments, financing, payment plans, autopay
- Reporting for production, collections, providers, scheduling, insurance aging

## Layer 2: Patient Experience

Build with the PMS because it creates operational lock-in and owns patient access workflows.

- AI voice
- Reminders
- Online booking
- Texting
- AI receptionist
- Reviews
- Forms
- Intake

## Layer 3: RCM and Financial Operations

Build after the PMS has the system-of-record data needed for accurate billing.

- Clearinghouse workflows
- ERA/EOB
- Denials
- Collections
- Insurance intelligence
- AI billing

## Layer 4: Clinical AI

Build after chart, imaging, treatment planning, and clinical note workflows are stable.

- AI scribe
- Voice perio
- Imaging AI
- Treatment AI
- Clinical decision support

## Layer 5: Enterprise AI Operating System

Build after the operational modules are real.

- Workflow orchestration
- AI agents
- AI governance
- Analytics
- Command center
- Automation engine
- Operational intelligence

## Current execution rule

The active build focus is Layer 1 Core PMS plus patient experience foundations only. RCM, Clinical AI, and enterprise AI OS are in scope for the platform, but they must not dilute the PMS implementation or be used to excuse incomplete PMS workflows.
