# Asterisk Provider for Discagem Automática (BDR) — Implementation Strategy

<<<<<<< HEAD
=======
The current behavior of the dialer is documented in [bdr-dialer.md](./bdr-dialer.md). This file keeps the Asterisk design notes and the dialplan that has to be installed on the PBX.

>>>>>>> module/bdr
## 1. Goal

Let the BDR dialer place real calls through the client's **Vono SIP trunk**, using our own **Asterisk** server as the PBX, controlled by the API through **ARI** (Asterisk REST Interface).

This is an additional provider alongside `falevono` and `simulated`. It uses the existing dialer contract, and the Vono trunk credentials remain on Asterisk rather than in the IMP API.

**Implementation status:** The outbound ARI provider, customer settings, encrypted ARI password storage, admin UI, CLI configuration, process-local channel cap, and mocked provider tests are implemented. This is not yet production-complete; see [Remaining work](#remaining-work-and-production-gate).

## 2. Guiding principle

The dialer already talks to telephony through one small contract, `TelephonyProvider`
<<<<<<< HEAD
(`apps/api/src/modules/bdr/telephony/types.ts`). It has five operations:

| Operation | Meaning |
|---|---|
| originate | Start a call to the lead |
| liveState | Report whether the call is ringing, talking, or gone |
| hangup | End the call |
=======
(`apps/api/src/modules/bdr/telephony/types.ts`). The operations are:

| Operation | Meaning |
|---|---|
| originate | Start a call to the lead. A `connectPhone` value makes the second leg another external number and reserves two trunk slots |
| liveState | Report ringing, talking, or gone. `ringingSince` is set once the second leg starts ringing |
| hangup | End the call |
| transfer | Move a connected call to another extension (Asterisk only) |
| listen | Keep the ARI socket open for inbound DID calls (Asterisk only) |
>>>>>>> module/bdr
| finalOutcome | Explain why an unanswered call ended (busy, no answer, invalid…) |
| fetchRecording | Return the call audio after it ends |

**Strategy: build a new `asterisk` provider that fulfils this same contract.**
The queue, retries, lead states, history, recordings sweeper, AI summaries and UI stay as they are. This also keeps the platform independent of the carrier: changing carrier later means changing Asterisk's trunk config, not platform code.

## 3. Architecture

```
 Browser (operator)            IMP API (Node)                 Asterisk server              Vono
 ───────────────────           ──────────────                 ───────────────              ────
 Discagem page  ──poll──▶  dialer.service  ──▶ asterisk provider ──ARI REST──▶  PBX  ──SIP trunk──▶ PSTN
                                                   ▲                              │
                                                   └──────ARI events (WebSocket)──┘
<<<<<<< HEAD
 Operator phone (softphone now, WebRTC later) ◀──────────SIP──────────────────────┘
=======
 Browser WebRTC softphone ◀────────────── SIP over WSS / WebRTC audio ─────────────┘
>>>>>>> module/bdr
```

- **Asterisk runs on its own server** (a VPS with a public IP), not inside the API host. Telephony stays isolated from the rest of the platform.
- **API → Asterisk**: ARI REST commands (originate, hang up, bridge) plus an ARI WebSocket event stream.
- **Asterisk → Vono**: SIP trunk with the credentials Vono provided. These live only on the Asterisk server, never in the repo.
<<<<<<< HEAD
- **Operators**: each operator has a SIP extension on Asterisk. For testing it is a softphone; in a later phase it becomes a WebRTC phone inside the browser.
=======
- **Operators**: each operator has a SIP extension on Asterisk. It can be registered by a softphone or the browser WebRTC client.
>>>>>>> module/bdr

## 4. Call flow

The current call flow is: **the lead rings first, and the operator is called only after the lead leg answers.** Answering-machine detection is not in place, so this does not yet distinguish a person from voicemail.

1. **Operator clicks Dial.** The dialer creates an attempt and asks the provider to originate.
2. **Provider asks Asterisk to call the lead** through the configured PJSIP trunk endpoint. The attempt id is passed in Stasis application arguments so ARI events can be correlated with the dial attempt.
3. **The lead's phone rings.** The dialer keeps polling, and the provider reports "ringing".
<<<<<<< HEAD
4. **The lead answers.** Asterisk enters the configured Stasis application. The provider creates a mixing bridge and originates the operator's configured PJSIP endpoint.
5. **Operator answers.** They join the bridge and the provider reports "talking". The existing save-call flow takes over.
6. **A side hangs up.** The provider attempts to end the peer leg and close the bridge. Updating the already-connected browser session and saved-call state when the remote party hangs up is not implemented yet.
7. **Unanswered calls.** The provider translates available Asterisk hangup causes into busy, no answer, or failed. The dialer's retry rules apply as today.
8. **After the call.** Asterisk recordings are not yet retrieved by this provider. The recording sweeper and post-call AI continue to work only with providers that support recording retrieval.
=======
4. **The lead answers.** Asterisk enters the configured Stasis application. If AMD is enabled, the API resumes the channel into the `imp-bdr-amd` dialplan; a `MACHINE` result ends the attempt as voicemail, while other AMD results proceed to the operator. With AMD disabled, it proceeds directly.
5. **Operator answers.** With browser WebRTC, the operator accepts the incoming SIP call in the dialer; Asterisk joins the endpoint to the bridge and the provider reports "talking". A separately registered SIP handset may also answer.
6. **A side hangs up.** The provider attempts to end the peer leg and close the bridge. Updating the already-connected browser session and saved-call state when the remote party hangs up is not implemented yet.
7. **Unanswered calls.** The provider translates available Asterisk hangup causes into busy, no answer, or failed. The dialer's retry rules apply as today.
8. **After the call.** The bridge recording is fetched as WAV by the recording sweeper and is available through the existing authorized call playback and post-call transcription flow.
>>>>>>> module/bdr

Answering-machine detection is not performed by the provider. Asterisk-side AMD and the corresponding call outcome must be implemented and tested before voicemail filtering is claimed.

## Current provider configuration

Set a stable Stasis application name in the API environment:

```env
ASTERISK_ARI_APP=imp-bdr
```

Set `TELEPHONY_SECRET_KEY` to a private random value of at least 32 characters. It is used to encrypt ARI passwords saved from the BDR settings page. Do not use the placeholder value in `apps/api/.env.example`.

As a customer administrator, choose **Asterisk (ARI)** in BDR **Central telefônica** and enter:

- ARI base URL, for example `https://pbx.example.com:8089/ari` (local loopback can use HTTP).
- A dedicated ARI username and password.
- The Asterisk PJSIP trunk endpoint name.
<<<<<<< HEAD
=======
- For browser phones, the SIP WSS endpoint (for example `wss://pbx.example.com:8089/ws`) and SIP domain.
>>>>>>> module/bdr
- Optional caller ID, dialing prefix, and per-customer channel cap.

The API derives the ARI WebSocket event URL from the base URL and authenticates with the ARI username/password. The ARI password is encrypted at rest and never returned by the settings API. Carrier SIP credentials are configured only in Asterisk. Save each operator's PJSIP endpoint name separately in the dialer setup.

<<<<<<< HEAD
=======
For WebRTC, enable Asterisk's HTTPS/WSS listener and configure each operator PJSIP endpoint for WebRTC (WSS transport, ICE, DTLS-SRTP, and AVPF). Use a publicly trusted TLS certificate when operators connect over the internet, and expose the configured SIP TLS/WSS and RTP ports to authorized clients. The application itself must be served in a secure browser context (HTTPS, or localhost during development) for microphone access. Each operator saves their extension and SIP password in the dialer setup; the password is encrypted at rest and is returned only to that authenticated operator in a `Cache-Control: no-store` response when the browser phone connects. The browser phone registers using SIP.js and asks the operator to accept the call leg when the external party answers. Migration `020_bdr_webrtc_settings.sql` stores the customer WSS/domain values, and `021_bdr_operator_sip_credentials.sql` adds encrypted per-user credentials. WebRTC connectivity through restrictive NATs may require a TURN service; TURN is not configured by this module yet.

>>>>>>> module/bdr
The equivalent `npm run telephony` CLI flags are `--ari-url`, `--ari-username`, `--ari-password`, `--trunk-endpoint`, `--caller-id`, and `--max-channels`. Passing a password as a command-line argument may expose it in shell history or process listings; prefer the settings UI where possible.

## 5. Work packages

### A. Asterisk server
- Install Asterisk on a dedicated VPS.
- Configure the Vono trunk (registration plus outbound calls) and confirm with Vono the dial format and caller ID (the DID).
- Enable ARI over HTTPS, reachable only by the API.
- Add a small dialplan step for answering-machine detection that then hands the call to our application.
- Create operator extensions. Operators must **not** be able to dial the trunk directly (toll-fraud protection).
- Firewall: SIP only from Vono, the RTP media port range open, ARI only from the API.

<<<<<<< HEAD
=======
For answering-machine detection, add this dialplan context on Asterisk and reload the dialplan before enabling **Detectar caixa postal** in the BDR customer settings:

```ini
[imp-bdr-amd]
exten => _!,1,NoOp(BDR AMD attempt ${EXTEN})
 same => n,AMD(2500,1500,800,5000,100,50,3,256,1500)
 same => n,Stasis(imp-bdr,${EXTEN},amd,${AMDSTATUS},${AMDCAUSE})
 same => n,Hangup()
```

The Stasis application name must match `ASTERISK_ARI_APP`. Asterisk's AMD module and the selected thresholds must be tested against the carrier audio and local voicemail greetings; AMD is heuristic and can misclassify. Only a definitive `MACHINE` result is automatically classified as voicemail. `HUMAN`, `NOTSURE`, and `TIMEOUT` are sent to the operator. The dialplan context is a required Asterisk-side configuration, not installed by the API.

>>>>>>> module/bdr
### B. API: provider and its connection
- **Implemented:** authenticated ARI REST calls, an ARI WebSocket event stream, outbound lead/operator legs, bridge creation, hangup cleanup, and basic cause mapping.
- **Implemented:** durable, trunk-scoped channel leases stored in MariaDB and serialized with a database advisory lock; the cap is shared across API instances using the same MariaDB and trunk endpoint.
- **Implemented:** deterministic ARI channel IDs and a startup/periodic recovery pass that reattaches active attempts from the persisted leases to Asterisk's active channels and bridges.
<<<<<<< HEAD
- **Not yet implemented:** automatic reconnect during active calls after a transport outage, recording control/download, answering-machine detection, and invalid-number disposition.

### C. API: configuration
- **Implemented:** `asterisk` provider option; per-customer ARI URL, user, encrypted password, PJSIP trunk endpoint, caller ID, and channel limit through the settings API, `npm run telephony` CLI, and admin panel. Migration `018_bdr_asterisk_settings.sql` adds the settings fields; `019_bdr_asterisk_channel_leases.sql` adds durable active-channel leases. The ARI Stasis app name is set by `ASTERISK_ARI_APP` in the API environment.
- Answering-machine detection configuration remains future work until the Asterisk-side AMD flow is implemented.

### D. Small adjustments to existing code
- **Recordings:** not implemented for the Asterisk provider. The current provider reports that it does not support recording retrieval; WAV storage, playback and transcription support remain future work.
=======
- **Implemented:** answered bridge audio is recorded as WAV with an attempt-specific name. Active recordings are resumed/reconciled during call recovery and downloaded from ARI after hangup into the existing private recordings store.
- **Implemented:** authenticated operators can fetch their own encrypted SIP credentials for a no-store WebRTC session. The frontend registers with Asterisk over WSS and accepts the operator call leg before the dialer reports the call connected.
- **Implemented:** optional dialplan-based AMD, enabled per customer after installing the `imp-bdr-amd` dialplan context below. Asterisk `MACHINE` results are closed as voicemail; `HUMAN`, `NOTSURE`, and `TIMEOUT` continue to the operator to avoid dropping people based on uncertain detection.
- **Implemented:** Q.850 unallocated, no-route, number-changed, and invalid-format causes close the lead as `invalid` with no retry.
- **Implemented:** optional calling window, inbound DID ringing, attended transfer to another extension, and a two-number bridge.
- **Not yet implemented:** automatic reconnect during active calls after a transport outage.

### C. API: configuration
- **Implemented:** `asterisk` provider option; per-customer ARI URL, user, encrypted password, PJSIP trunk endpoint, caller ID, and channel limit through the settings API, `npm run telephony` CLI, and admin panel. Migration `018_bdr_asterisk_settings.sql` adds the settings fields; `019_bdr_asterisk_channel_leases.sql` adds durable active-channel leases; `020_bdr_webrtc_settings.sql` configures WebRTC WSS/domain; `021_bdr_operator_sip_credentials.sql` stores encrypted operator SIP passwords; `022_bdr_asterisk_amd.sql` adds the opt-in AMD setting. The ARI Stasis app name is set by `ASTERISK_ARI_APP` in the API environment.

### D. Small adjustments to existing code
- **Recordings:** ARI bridge recordings are downloaded as WAV and use the existing authenticated playback, storage, and transcription pipeline. Recording consent, retention policy, and production integration testing still need to be confirmed.
>>>>>>> module/bdr
- **Optional:** add an "invalid number" outcome so dead numbers are closed immediately instead of retried.

### E. Diagnostics
- ARI/trunk health diagnostics from the CLI and settings panel remain future work.
- Event-handler failures are logged in JSON form; complete structured per-call event audit logging remains future work.

## Remaining work and production gate

<<<<<<< HEAD
The current provider is an outbound integration baseline, not the complete VoIP/AI module. It does not provide inbound calls, WebRTC audio, live AI conversation, interruption handling, human transfer, recording retrieval, voicemail/AMD detection, or post-answer remote-hangup synchronization in the operator UI. Recovery and channel leases require all API instances to share the same MariaDB and Asterisk trunk configuration. A MariaDB outage blocks new channel reservations; a prolonged Asterisk outage may temporarily retain leases until the recovery worker reconnects and reconciles active channels.
=======
The provider now covers outbound dialing, inbound DID delivery to one extension, transfer, two-number bridge, invalid-number classification, and an optional calling window. Browser WebRTC provides the operator audio leg. It does not yet provide a live AI conversation, interruption handling, or complete post-answer remote-hangup synchronization in the operator UI. TURN configuration and real PBX/browser integration testing are also outstanding.

Inbound calls need this dialplan context on the Vono trunk, with the Stasis application name matching `ASTERISK_ARI_APP`. Set **Ramal que recebe ligações** to the operator extension that should ring. With that field empty, the call is logged as missed and hung up.

```ini
[from-vono]
exten => _X.,1,NoOp(Inbound ${CALLERID(num)})
 same => n,Stasis(imp-bdr,inbound,${FILTER(0-9,${CALLERID(num)})})
 same => n,Hangup()
``` Recovery and channel leases require all API instances to share the same MariaDB and Asterisk trunk configuration. A MariaDB outage blocks new channel reservations; a prolonged Asterisk outage may temporarily retain leases until the recovery worker reconnects and reconciles active channels.
>>>>>>> module/bdr

Before production, finish or explicitly remove those requirements, add resilient ARI reconnection and diagnostics, verify asterisk events and cause mapping against the actual Vono trunk, implement recording consent/retention controls, and run carrier/PBX integration, concurrency, failure, and security tests. Keep Asterisk on a host that supports persistent PBX services and the required SIP/RTP network traffic; confirm separately whether the chosen Hostinger plan can run it.

## 6. Delivery order

| Step | What | Done when |
|---|---|---|
| 1 | Asterisk server and Vono trunk | A softphone on Asterisk can call a mobile and a landline, and receive a call on the DID |
| 2 | ARI reachable from the API host | A manual REST call returns Asterisk info |
| 3 | Settings and provider skeleton | `asterisk` can be selected and saved, and secrets are never returned |
<<<<<<< HEAD
| 4 | Outbound call and hang up | The dialer rings a real phone and the operator softphone connects |
| 5 | Outcomes and voicemail detection | Busy, no answer, voicemail and invalid numbers are classified correctly |
| 6 | Recording | The audio appears on the saved call, and the AI summary uses the transcript |
| 7 | Line limit, health check, logs | A sixth simultaneous call is refused cleanly, and diagnostics show trunk status |
| 8 | Acceptance tests (section 7) | All pass, then switch the client to production |

WebRTC in the browser, inbound AI attendant and real-time AI conversation are **later phases**. They build on the same Asterisk server and ARI connection.
=======
| 4 | Outbound call and hang up | The dialer rings a real phone and the operator softphone or browser connects |
| 5 | Outcomes and voicemail detection | Busy, no answer and voicemail are classified correctly; AMD results are calibrated on real Vono calls |
| 6 | Recording | The audio appears on the saved call, and the AI summary uses the transcript |
| 7 | Browser WebRTC | Operator registers over WSS, accepts a test call, and sends/receives audio |
| 8 | Line limit, health check, logs | A sixth simultaneous call is refused cleanly, and diagnostics show trunk status |
| 9 | Acceptance tests (section 7) | All pass, then switch the client to production |

Inbound AI attendant and real-time AI conversation remain later phases. They build on the same Asterisk server and ARI connection.
>>>>>>> module/bdr

## 7. Testing approach

1. **Unit tests** with a fake ARI client. Cover the cause mapping, the call-flow reactions, the line limit and error handling. No real Asterisk is needed.
2. **Integration tests** with the existing BDR test suite. Run them to confirm the dialer behaves the same with the new provider selected.
3. **Lab tests** on the real Asterisk server and trunk:
   - Calls to a real mobile, a landline, a voicemail, a busy line and an invalid number.
   - Operator closes the tab mid-ring.
   - Five operators dialing at once.
   - Asterisk stopped while a call is in progress.
4. **Measurements:** time from click to ring, audio quality, and recording availability time.
5. **Production gate:** the simulated provider is off, secrets are real, LGPD recording notice and allowed calling hours are in place, and the Asterisk config and recordings are backed up.

## 8. Using coding agents

Work one step at a time from section 6. For each step, give the agent:

- **Context:** "Read `docs/bdr-asterisk-provider.md`, the `TelephonyProvider` contract, and `telephony/falevono.ts` as the reference implementation."
- **Scope:** the single step to implement, with its "done when" criterion.
- **Constraints:** do not change `dialer.service.ts` behaviour, follow the existing code style, never commit credentials, and add tests.
- **Check:** run typecheck, lint and tests before finishing, and report anything left unverified.

Use a planning agent first for steps 3–5, where several files change, then an implementation pass. Use a review pass at the end of each step.

## 9. Points to confirm

- **With Vono:** SIP server and port, number format (0 + DDD, 55 + DDD, or DDD only), caller-ID rules, codec (G.711 A-law / μ-law), and the channel limit.
- **In the lab:** how answering-machine detection performs on Brazilian greetings and carrier announcements, and the exact hangup causes Vono returns for each case.
- **Hosting:** a VPS for Asterisk, a domain and TLS certificate, and a fixed IP for the API so ARI can be locked down.
