# Patient Engagement Webchat Readiness

Worker 3 owns Patient Engagement Webchat as a real product surface.

## Runtime behavior

- Public widget is installed through `/api/webchat/widget.js`.
- Visitor identity, service line, patient status, preferred time, urgency, and privacy-notice acceptance are saved with the session/message metadata.
- Rule-based intent detection classifies scheduling, reschedule, emergency, insurance/price, and general questions.
- Appointment, reschedule, emergency, and insurance intents create internal staff handoff tasks only.
- PMS booking/writeback, patient delivery of operator replies, and external sends remain blocked until the relevant connector status is approved.

## Admin behavior

- `/app/phone?view=webchat` shows setup readiness for widget channel, privacy notice, KB sources, lead capture, scheduling handoff, and external sends.
- Transcript analytics are derived from saved webchat messages: open chats, handoffs, urgent items, staff entries, consent capture, and top intent.
- Staff can add internal notes or staged replies to a transcript. Staged replies are not externally delivered.
- KB source cards can be marked needs-review, approved for retrieval, or blocked for policy review.
- First-party knowledge crawl can be queued from the webchat tab. External source crawl requires `WEBCHAT_CRAWL_TOKEN`.

## Privacy and consent

The widget requires the visitor to accept the privacy notice before sending. The notice states that chat is saved for staff follow-up and does not replace emergency care, diagnosis, payments, or final appointment changes.

## Remaining connector gates

- Live staff replies back to the visitor need a webchat transport connector.
- PMS slot search, holds, reschedule, and writeback need the PMS scheduling connector.
- PMS lead/patient creation and form writeback need the PMS/forms connector.
