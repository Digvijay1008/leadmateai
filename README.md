# 🚀 Leadmate AI

<div align="center">
  <p><strong>A Next-Generation Multi-Tenant AI Voice SaaS Platform</strong></p>
</div>

---

## 📖 Overview

**Leadmate AI** is an enterprise-grade AI Voice Agent platform designed for modern sales, real estate, and customer support teams. It allows organizations (Tenants) to deploy hyper-realistic AI Voice Agents capable of executing complex inbound and outbound calling campaigns. 

Built with a **SIP-First, Bring Your Own Device (BYOD)** architecture, Leadmate entirely bypasses legacy telephony constraints by deeply integrating with **LiveKit** as its core voice and media engine.

## 🏗 Architecture & Tech Stack

Leadmate is built on a scalable, decoupled microservices architecture designed for ultra-low latency voice communication and robust multi-tenancy.

### 💻 1. Frontend (Next.js / React)
The user-facing dashboard for tenants and admins.
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS & modern UI components
- **Responsibilities:** Campaign management, AI persona configuration, RAG knowledge base uploads, SIP trunk BYOD setup, and real-time billing/analytics.

### ⚙️ 2. Backend (Node.js / TypeScript)
The central orchestrator of the platform.
- **Runtime:** Node.js (TypeScript)
- **Responsibilities:** 
  - **Multi-Tenant State Management:** Managing wallets, leads, campaigns, and phone numbers.
  - **Telephony Provisioning:** Registering BYOD SIP Trunks directly with LiveKit via the LiveKit Server SDK.
  - **Session Lifecycle:** Initiating outbound calls via dialer workers, handling inbound dispatches, placing financial holds, and managing billing.

### 🧠 3. AI Agent Service (Python)
The intelligence engine powering the conversations.
- **Runtime:** Python
- **Engine:** LiveKit Agents Framework
- **Responsibilities:** 
  - Connects to LiveKit Rooms spawned by the backend.
  - Executes conversational AI flows based on tenant-configured personas, prompts, and RAG knowledge bases.
  - Handles ultra-low latency STT (Speech-to-Text), LLM generation, and TTS (Text-to-Speech).

---

## 🔗 How It All Connects (The SIP-First LiveKit Paradigm)

Leadmate uses a proactive provisioning model rather than reactive webhooks.

1. **BYOD SIP Integration:** Tenants add their SIP provider details (e.g., Twilio, Telnyx). The Node.js backend registers these directly into LiveKit as Inbound/Outbound Trunks.
2. **Outbound Flow:** When a campaign starts, the backend creates a Session and tells LiveKit to dial the user (E.164 format) and place them into a specific LiveKit Room. Simultaneously, the Python AI Agent is dispatched to that exact room.
3. **Inbound Flow:** The backend pre-configures a `RoomAgentDispatch` rule in LiveKit. When a user calls a tenant's number, LiveKit instantly creates a room and dispatches the AI Agent without waiting for backend approval, ensuring zero latency.
4. **Billing & Tracking:** The backend asynchronously monitors LiveKit webhooks for session duration to calculate and deduct wallet balances accurately.

## 🚀 Getting Started

*(Ensure you have your environment variables set up across all three services: frontend, backend, and agent).*

1. **Start the Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Start the AI Agent:**
   ```bash
   cd agent
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   python src/main.py
   ```

---
*Built for scale, engineered for ultra-low latency voice AI.*
