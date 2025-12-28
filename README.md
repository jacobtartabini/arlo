# 🧠 Arlo

**Arlo** is a personal AI assistant built to run locally and privately — powered by Ollama and accessible securely through Tailscale. It connects natural language intelligence with real system-level tools like weather, maps, and voice input/output.

It’s designed to be modular, secure, and genuinely useful — not just another chatbot.

---

## ✨ What Arlo Can Do

Arlo’s goal is to feel more like a personal operating system than a web app. Here’s what it can handle:

* **Voice input + speech output** (STT + TTS integration)
* **Location-aware tools** like weather and maps
* **Modular assistant core** that can connect to new tools easily
* **Secure API access** using **Tailscale authentication**
* **Private by design** — everything runs on your local network
* **Expandable backend** with endpoints for chat, requests, and other functions

Each component is written in Python and designed to be simple to extend.

---

## 🧩 Project Structure (Core Files)

* `assistant.py` – main logic for the AI assistant
* `server.py` – API server for local/remote connections
* `security.py` – handles Tailscale authentication and access control
* `stt.py` / `tts.py` – speech recognition and text-to-speech
* `weather.py`, `arlomaps.py`, `location.py` – contextual tools
* `web_search.py`, `google_quota.py` – external data access
* `start-arlo.sh` – starts the full backend + Ollama
* `serve-arlo.sh` – runs the Arlo API server

---

## 🚀 How to Launch Arlo

### Option 1: Start the full Arlo environment

```bash
./start-arlo.sh
```

This script:

* Starts Ollama (Llama 3 model by default)
* Activates your Python virtual environment
* Launches the Arlo backend on port `4000`

### Option 2: Run the API server manually (for Tailscale access)

1. Activate your virtual environment

   ```bash
   source venv/bin/activate
   ```

2. Launch the API server

   ```bash
   uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
   ```

3. Start Tailscale and open your secure tunnel

   ```bash
   sudo tailscale up
   tailscale funnel 8000
   ```

You can now securely access your Arlo API from anywhere on your Tailnet.

---

## 🧭 Next Steps

1. Update `api_server.py` to include **port 4000** in the same Tailscale funnel as port 8000.
2. Connect the `assistant.py` webhook to `api_server.py` for real-time chat and backend communication.
3. Continue expanding backend tools and modules — Arlo is designed to grow with you.

---

## 👤 Created by

**Jacob Tartabini**
Independent developer & designer of Arlo
Focused on building intelligent, private-first AI systems.

---

Would you like me to include a small section for **“Developer Setup”** (Python version, dependencies, venv creation, etc.) at the top for new environments? It would make this README ready for GitHub.
