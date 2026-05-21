# Dental Intelligence Feature Map And 1DentalAI Build Targets

Research source:
- Dental Intelligence Online Scheduling page, reviewed May 21, 2026.
- Dental Intelligence product navigation and public pages for Morning Huddle, Follow Ups, Patient Finder, Kiosk, Virtual Check-In, Online Forms, and knowledge-base metric definitions.

## Online Scheduling Feature Inventory

1. Public booking links on website, social, Google/Maps, QR codes, recall messages, and treatment invitations.
2. Custom booking links by appointment type, service, provider, location, patient audience, and booking window.
3. Real-time PMS availability with direct PMS appointment writeback.
4. Block scheduling and open-time scheduling.
5. Multi-location scheduling rules with location-specific SOPs.
6. New-patient booking with PMS chart creation.
7. Returning-patient recognition with chart matching and duplicate prevention.
8. Existing-patient treatment links for unscheduled treatment.
9. Recall links for hygiene recare.
10. Online scheduling dashboard showing who booked, new/returning status, appointment type, notes, and source.
11. Bulk scheduling invitations from patient lists.
12. Patient Finder lists for unscheduled hygiene, broken appointments, ASAP, unscheduled treatment, insurance opportunity, and AR.
13. Earliest-booking rules to control when invite recipients can book.
14. Perfect Time Slot recommendations from patient history.
15. Reservation fee policies to reduce no-shows.
16. Insurance capture during booking.
17. Payer acceptance policy and eligibility status at booking time.
18. Link performance analytics: opens/clicks/bookings, new vs returning patients, insurance mix, and source attribution.

## Adjacent DI Product Surface To Map Into 1DentalAI

| DI Area | Production Workflow | 1DentalAI Native Owner |
| --- | --- | --- |
| Analytics | Morning Huddle, performance dashboard, scorecards, goals | PMS Reports, Command, Provider/Team Scorecards |
| Patient Finder | Saved patient lists and bulk scheduling | PMS Online Scheduling, Follow Ups |
| Follow Ups | Role-owned outreach for recare, AR, unscheduled treatment, claims | PMS Tasks, Engagement Events |
| Smart Schedule | Fill schedule openings with best-fit patients | PMS Schedule + Online Scheduling |
| Online Scheduling | Booking links, direct writeback, patient recognition | PMS Online Scheduling |
| Digital Forms | Pre-appointment forms, writeback, kiosk/mobile/browser | PMS Forms |
| Kiosk | Check-in, forms, treatment plans, consent signatures | PMS Forms + Patient Flow |
| Virtual Check-In | Arrival update, forms, waiting-room control | PMS Schedule + Engagement |
| Reminders | Confirmations, recall, appointment prep | Engagement Events |
| Reviews | Post-service review request and service recovery | Reputation Recovery |
| Payments | Online payment and reservation fee | Ledger + Payments |
| Insurance | Eligibility, validation, claims, ERA | Insurance + RCM |

## Current Implementation Started

The first native online scheduling foundation includes:
- `PmsOnlineSchedulingLink`
- `PmsOnlineBooking`
- `PmsSchedulingInviteCampaign`
- `PmsSchedulingInviteRecipient`
- Staff workbench at `/app/pms/online-scheduling`
- Public booking route at `/book/[slug]`
- Real PMS appointment writeback into `PmsAppointment`
- Patient match-or-create logic before booking
- Insurance payer policy evaluation
- Reservation-fee policy captured as due, without pretending payment was collected
- Staged bulk invitation lists, without pretending SMS/email was sent

## Next Build Targets

1. Add click/open event tracking for public booking links and invite recipients.
2. Add Perfect Time Slot scoring from appointment history, no-show history, provider preference, treatment value, and family scheduling.
3. Add online booking insurance verification adapter with direct connector-ready status fields.
4. Add reservation-fee payment collection through a real payment connector before confirming fee-required bookings.
5. Add Virtual Check-In status updates and arrival inbox.
6. Add Kiosk mode that combines check-in, due forms, consents, and treatment plan review.
7. Add Patient Finder saved filters and task/bulk invitation generation.
8. Add scorecards for scheduling team conversion, booked dollars, calls/staged outreach, and source performance.
