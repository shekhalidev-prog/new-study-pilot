# 🧠 Suhail Personal AI

> **An AI-powered personal learning companion designed to make studying smarter, more interactive, and personalized.**

**Suhail Personal AI** is an intelligent learning platform that combines AI-powered explanations, structured learning flows, progress tracking, and an interactive modern interface to create a personalized study experience.

The project was originally developed as **StudyPilot AI** and has evolved into **Suhail Personal AI**.

## ✨ What is Suhail Personal AI?

Traditional learning platforms often provide static notes and predefined content.

**Suhail Personal AI takes a different approach.**

It is designed around an AI-first learning workflow where students can interact with concepts, understand difficult topics in simpler language, and move from basic explanations toward deeper understanding.

### 🎯 Core idea

**Learn → Understand → Visualize → Practice → Improve**

The goal is to make studying feel less like reading static notes and more like having a personal AI study companion.

---

## 🚀 Features

### 🤖 AI-Powered Learning

Generate intelligent explanations for academic topics and concepts using AI-powered workflows.

### 🧠 Personalized Understanding

Content can be structured around the learner's level, making complicated technical concepts easier to understand.

### 🌐 Hinglish → English Learning Flow

One of the core ideas behind the project is helping students understand concepts comfortably in **Hinglish first**, followed by more formal **English explanations**.

This makes the transition from casual understanding to academic preparation much easier.

### 📚 Structured Topic Learning

Learning can be organized into a progression such as:

```text
Topic
  ↓
Simple Explanation
  ↓
Hinglish Understanding
  ↓
English Explanation
  ↓
Visual / Diagram
  ↓
Questions
  ↓
Practice
```

### 📊 Learning Progress

The application is designed around tracking learning progress so students can understand what they have studied and where they need improvement.

### 🎨 Modern Interactive UI

Built with a modern component-based interface featuring:

* Responsive layouts
* Interactive components
* Smooth animations
* Modern cards and panels
* Dialogs and navigation components
* Data visualizations
* Accessible UI primitives

### 🎓 Exam Prep Tools

* **Smart Revision (`/revision`)** — pick a subject, chapter and time budget (5 / 15 / 30 / 60 min) and get an exam-focused revision sheet, a 10-question practice test with weak-topic tracking, and AI-predicted exam questions based on the PYQs saved in the admin panel.
* **Mock Viva Simulator** — the AI examiner asks spoken viva questions, you answer with camera + mic, and get confidence / knowledge / fluency scores with per-question feedback. Voice transcription uses Groq Whisper first and falls back to Gemini (then the legacy gateway) automatically.
* **Study Clone (`/clone`)** — paste or upload your own notes and get answers strictly from them (Hinglish + English), plus a one-click revision pack.
* **Exam Plan (`/plan`)** — live exam countdown with an AI-generated hour-by-hour plan and day-wise roadmap.

All of these run through the same multi-provider AI fallback chain (Groq → Gemini → NVIDIA → OpenRouter → Cerebras → OpenAI).

### ⚡ Fast Web Experience

The application uses a modern Vite-based development stack for a fast development and production experience.

---

# 🛠️ Tech Stack

## Frontend

| Technology      | Purpose                     |
| --------------- | --------------------------- |
| React 19        | UI development              |
| TypeScript      | Type-safe development       |
| Vite            | Development & build tooling |
| TanStack Router | Application routing         |
| TanStack Start  | Full-stack React framework  |
| Tailwind CSS    | Styling                     |
| Framer Motion   | Animations                  |
| Lucide React    | Icons                       |
| Recharts        | Data visualization          |

## AI

| Technology            | Purpose                      |
| --------------------- | ---------------------------- |
| AI SDK                | AI application integration   |
| OpenAI-Compatible SDK | AI provider compatibility    |
| Zod                   | Validation & structured data |

## UI

The project uses a combination of:

* Radix UI
* Tailwind CSS
* Custom React components
* Framer Motion
* Lucide Icons

---

# 🏗️ Architecture

A simplified view of the application:

```text
                    ┌─────────────────────┐
                    │       Student       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Suhail Personal AI  │
                    │     Interface       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │ Learning │     │ Progress │     │   AI     │
        │  Flow    │     │ Tracking │     │ Engine   │
        └──────────┘     └──────────┘     └────┬─────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │  AI Provider /  │
                                      │   AI SDK Layer  │
                                      └─────────────────┘
```

---

# 📂 Project Structure

```text
new-study-pilot/
│
├── public/                 # Static assets
│
├── src/                    # Application source code
│   ├── components/         # Reusable UI components
│   ├── routes/             # Application routes (incl. /revision, /clone, /plan)
│   ├── lib/                # Utilities and helpers
│   └── ...
│
├── .env.example            # Environment variable template
├── AGENTS.md               # AI/development instructions
├── components.json         # UI component configuration
├── eslint.config.js        # ESLint configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── README.md
```

---

# ⚙️ Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/shekhalidev-prog/new-study-pilot.git
```

```bash
cd new-study-pilot
```

## 2. Install dependencies

Using npm:

```bash
npm install
```

Or using Bun:

```bash
bun install
```

## 3. Configure environment variables

Create a `.env` file based on the provided example:

```bash
cp .env.example .env
```

Add the required AI provider credentials to your environment file.

> ⚠️ Never commit your actual API keys or secrets to GitHub.

## 4. Start the development server

```bash
npm run dev
```

The application will be available locally through the Vite development server.

---

# 📜 Available Scripts

```bash
npm run dev
```

Start the development server.

```bash
npm run build
```

Create a production build.

```bash
npm run build:dev
```

Create a development-mode production build.

```bash
npm run preview
```

Preview the production build locally.

```bash
npm run lint
```

Run ESLint.

```bash
npm run format
```

Format the project using Prettier.

---

# 🌐 Live Demo

### 🚀 Try the application

**https://new-study-pilot.vercel.app**

---

# 🎯 Project Goals

Suhail Personal AI is built with the following goals:

* Make AI-assisted education more accessible.
* Simplify difficult technical concepts.
* Help students understand before memorizing.
* Combine Hinglish explanations with academic English.
* Create a more interactive learning experience.
* Explore practical applications of generative AI in education.
* Build a foundation for more advanced AI-powered learning features.

---

# 🔮 Future Roadmap

The project can evolve into a complete AI learning ecosystem.

### 🧠 AI Tutor

A conversational AI tutor capable of maintaining learning context.

### 📄 PDF / Notes Understanding

Upload study material and allow the AI to analyze and explain it.

### 🎯 Personalized Study Plans

Generate study schedules based on:

* Subjects
* Exams
* Available time
* Current progress
* Weak topics

### 🖼️ AI-Generated Diagrams

Automatically generate visual explanations for technical concepts.

### 📝 AI Question Generator

Generate:

* MCQs
* Short-answer questions
* Long-answer questions
* Viva questions
* Previous-year-style questions

### 📈 Advanced Analytics

Track:

* Topics completed
* Weak areas
* Learning consistency
* Question accuracy
* Study progress

### 🎙️ Voice Learning

Future versions could support voice-based interaction for a more natural AI tutoring experience.

---

# 💡 Why I Built It

I wanted to explore how AI can be used beyond simply generating answers.

The idea behind **Suhail Personal AI** is to create an environment where AI helps a student actually **understand a concept**, rather than simply giving them a solution.

The project also reflects my interest in combining:

**Artificial Intelligence + Education + Modern Web Development**

---

# 👨‍💻 Developer

## Suhail Ali

**B.Tech CSE (AI & ML)**

I'm a developer interested in:

* Artificial Intelligence
* Machine Learning
* Generative AI
* Full-Stack Development
* Agentic AI
* Modern Web Technologies

This project is part of my journey toward building practical AI-powered products.

### Connect with me

* GitHub: [@shekhalidev-prog](https://github.com/shekhalidev-prog)
* LinkedIn: [Suhail Ali](https://linkedin.com/in/shekh-suhail-426087421)

---

# ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub.

It helps support the project and motivates further development.

---

## 📄 License

This project is intended for learning, experimentation, and portfolio purposes.

© 2026 **Suhail Ali**
