# LiveKit Voice AI Widget: Technical Architecture Audit & Production Hardening

This report provides a deep-dive technical analysis of the proposed Voice AI Widget architecture, identifying critical edge cases and providing specific hardening strategies for production deployment.

---

## A. LiveKit Server & Webhook Reliability

### 1. Webhook Edge Cases & Idempotency
LiveKit webhooks are delivered via HTTP POST with a retry mechanism, but they are **not guaranteed** to be delivered exactly once or in strict chronological order due to network variability.

*   **Missed `participant_left` Events**: On "hard" disconnects (e.g., app crash, battery death, tunnel collapse), the server may take up to **15-30 seconds** to detect a timeout before firing `participant_left`. Relying solely on this for billing can lead to overcharging.
*   **Duplicate Events**: Events like `participant_joined` can fire multiple times if a client flaps during signaling.
*   **Hardening Strategy**:
    *   **Idempotency Key**: Every LiveKit Webhook includes a unique `id` (UUID). Store these IDs in a Redis/Postgres cache with a 24-hour TTL. If an ID is already processed, discard the duplicate.
    *   **Session Reconciliation**: Do not treat `participant_left` as the "Source of Truth" for duration. Instead, use the `createdAt` timestamps from `room_started` and `room_finished`.
    *   **Backend Heartbeat**: For critical billing, implement a side-channel "heartbeat" via WebRTC Data Channels from the frontend to your FastAPI backend to confirm the user is still active.

### 2. State Synchronization & Latency
Synchronizing the AI Agent's tool execution (e.g., booking an appointment) with your database must minimize perceived latency.

*   **Best Practice**: Use **LiveKit RPC (Remote Procedure Calls)** instead of relying on backend webhooks for UI updates. 
    *   When the Agent executes a tool, it should call `localParticipant.performRpc` to notify the Frontend immediately.
    *   The Frontend updates the local UI state **optimistically**.
    *   The Backend update happens asynchronously via the Agent's internal logic or a separate API call.
*   **Latency Comparison**:
    | Method | Typical Latency | Reliability |
    | :--- | :--- | :--- |
    | **LiveKit RPC** | ~50ms - 150ms | High (Direct Peer/SFU) |
    | **Data Channels** | ~50ms - 200ms | Medium (Unordered/Lossy) |
    | **Webhooks** | 500ms - 2s+ | Low (HTTP Overhead) |

---

## B. Token Management & Security

### 1. Multi-Tenancy JWT Grants
Using `X-Tenant-ID` requires strict isolation. Your token generation logic should enforce the following:

*   **Human User**: 
    *   `roomJoin: true`, `roomList: false`.
    *   `canPublish: true`, `canSubscribe: true`.
    *   **Crucial**: Set `participantIdentity` to a composite string: `tenant_{tenant_id}_user_{user_id}`.
*   **AI Agent**:
    *   `roomJoin: true`, `canPublishData: true`.
    *   `hidden: true` (if you don't want the agent to appear in the participant list UI).
*   **Security Boundary**: Ensure your FastAPI backend validates that the `tenant_id` in the request header matches the `room_name` prefix or metadata before signing the token.

### 2. Token Expiration & Silent Refresh
*   **Connection Behavior**: If a token expires *during* an active session, LiveKit **does not** drop the current WebRTC connection. However, if the client needs to reconnect (e.g., network switch), the expired token will cause a `401 Unauthorized`.
*   **Refresh Pipeline**: Implement a `TokenRefresh` logic in your React FSM. 
    *   Listen for `RoomEvent.TokenRefreshRequested`.
    *   When triggered, fetch a new token from FastAPI and call `room.prepareConnection(newToken)`.
    *   This ensures seamless transitions during long-running calls (>1 hour).

---

## C. AI Agent & RAG Scalability

### 1. VAD & Interruption Management
"Barge-in" (human interrupting the agent) is the hardest problem in Voice AI.

*   **Adaptive Interruption**: Enable LiveKit's **Adaptive Interruption Handling**. This uses a specialized model to distinguish between "Backchanneling" (e.g., user saying "mm-hmm") and a "Genuine Interruption".
*   **Implementation**:
    ```python
    turn_handling = TurnHandlingOptions(
        interruption={"mode": "adaptive"}
    )
    ```
*   **Hardening**: If using raw `livekit-client`, ensure you call `track.stop()` and `track.detach()` on the Agent's audio track the moment the `UserStartedSpeaking` event is detected to kill the local audio buffer immediately.

### 2. SIP/Telephony Integration
*   **Codecs**: LiveKit Telephony prefers **G.722 (Wideband)** for HD voice. If your SIP provider only supports G.711 (Narrowband), LiveKit's internal MCU will transcode to Opus, adding ~20-50ms latency.
*   **Bypass**: If you allow direct dialing, ensure your SIP Trunk is configured for **Early Media (183 Session Progress)**. This allows the AI Agent to start greeting the user before the "Answer" signal, reducing the initial silence.

---

## D. Frontend Edge Cases (Raw JS SDK)

### 1. Mobile Audio-Context Suspension
iOS Safari is notorious for suspending `AudioContext` when the app goes to the background or a call is interrupted by a system alert.

*   **The Bug**: Even if `connect()` was triggered by a user gesture, the `AudioContext` can enter a `suspended` or `interrupted` state.
*   **The Fix**:
    *   Add a `visibilitychange` listener. When `document.visibilityState === 'visible'`, check `room.engine.client.audioContext.state`.
    *   If `suspended`, display a "Resume Audio" overlay. **You cannot resume programmatically without a new user gesture.**
    *   **Pro Tip**: Use a "Silent Loop" audio element. Play a 0.1s silent MP3 on a loop. This often tricks iOS into keeping the audio session "Active" even in the background.

### 2. React 18 Strict Mode & Zombie Tracks
In Strict Mode, components mount, unmount, and remount instantly.
*   **Risk**: `track.attach()` creates an `<audio>` element. If the remount happens too fast, the first `detach()` might fail to find the element, leaving a "Zombie" audio tag playing in the background.
*   **Solution**: Always store the `HTMLAudioElement` in a `useRef`. In the `useEffect` cleanup, explicitly check `audioRef.current.pause()` and `audioRef.current.srcObject = null` before calling `track.detach()`.

---

## Final Hardening Checklist
1. [ ] Implement **Webhook Idempotency** using Event UUIDs.
2. [ ] Use **LiveKit RPC** for Agent-to-Frontend state sync.
3. [ ] Configure **Adaptive Interruption** in the Agent SDK.
4. [ ] Implement a **User Gesture Overlay** for iOS AudioContext resumption.
5. [ ] Verify **JWT Room Prefixing** matches your Multi-Tenant `tenant_id`.
