# Direct private feedback

The in-app Feedback form sends a POST to FormSubmit's AJAX endpoint for `lucas@wybrandt.dk`. Visitors stay in the app. Topic, title, message and optional reply email are included; circuit documents, simulation state, private schematic names, URL queries and hashes are not automatically attached. An optional email supplies Reply-To. Public GitHub reporting and the existing-issues link remain separate options.

The app imposes no character minimum or maximum. Title and message must be non-empty, and an optional reply email must be valid. Message content is sent intact, including whitespace; no 1,200-character prefill truncation remains. Provider and transport limits are outside the app.

Only boolean `true` or string `"true"` indicates provider success. HTTP 200 with `"false"`, activation responses, HTTP errors, non-JSON responses and connection failures do not display “sent.” Inputs remain intact after failures. In-flight submissions are disabled, unchanged successful messages are not posted again, and uncertain requests are never retried automatically. A 60-second timeout accommodates provider email setup latency.

FormSubmit needs the recipient to activate the inbox once. The owner confirmed activation on 12 October 2026. No credentials or mail passwords are embedded in the static website. Tests intercept deliveries; only the deliberate setup request and final live connection check target the actual inbox. The About page describes this separate feedback data flow.

References: [AJAX API](https://formsubmit.co/ajax-documentation), [optional Reply-To and activation](https://formsubmit.co/documentation), [activation help](https://formsubmit.co/help), [provider privacy](https://formsubmit.co/privacy.pdf).

Validation: `node tools/check-feedback.cjs` covers one-character and >20,000-character messages, optional Reply-To, intact text, duplicate requests, and HTTP 200/string-false, activation, server and network failures at desktop and phone sizes. The integrated control suites intercept this endpoint too, so normal tests send no emails. Evidence lives in `../cwas/tmp/feedback-direct-2026-10-12/`.

Live verification: after the owner activated the inbox, the setup delivery check submitted through the real in-app website returned “Feedback sent. Thank you!” No public website release was made.
