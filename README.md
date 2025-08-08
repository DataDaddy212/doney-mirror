# 🐝 Doney Product Roadmap  
*(From fun personal app → global goal network)*

---

## **Phase 1 — Personal Core (MVP)**  
🎯 **Goal:** Be the most delightful personal task + goal tracker.  
🔑 **Focus:** Simple, fun, ultra-fast to use.

**Features:**
- Add **Goal** (Level 1) in one click.  
- Add infinite nested **To-Dos** under goals (Level 2+).  
- Feed view of all goals (filter by level/status).  
- Duolingo-style mascot (Doney Bee 🐝) for motivation.  
- AI-assisted task breakdown *optional*.  
- Private by default — no accounts needed initially.  

**Example Uses:**
- Grocery list  
- House move checklist  
- Personal learning plan  

[➡ Go to Phase 2](#phase-2--small-group-collaboration)

---

## **Phase 2 — Small Group Collaboration**  
🎯 **Goal:** Be the easiest tool for families, clubs, and small teams to coordinate.  

**Features:**
- Password-protected workspaces.  
- Invite links to join a goal/workspace.  
- Real-time updates across devices.  
- Goal-level chat/comments.  
- Assign to-dos to members.  

**Example Uses:**
- PTA fundraiser planning  
- Family home renovation  
- Startup project sprints  

[⬅ Back to Phase 1](#phase-1--personal-core-mvp) | [➡ Go to Phase 3](#phase-3--public-goals--discover-feed)

---

## **Phase 3 — Public Goals & Discover Feed**  
🎯 **Goal:** Turn Doney into a goal-sharing network.  

**Features:**
- Public/Private toggle for goals.  
- **Discover Feed** to browse public goals.  
- Filter public goals by level, category, location, "needs help" flag.  
- Pick up someone's to-do as your own.  
- Follow goals for updates.  

**Example Uses:**
- Join a community garden build.  
- Help a student with a science fair project.  
- Collaborate on public research.  

[⬅ Back to Phase 2](#phase-2--small-group-collaboration) | [➡ Go to Phase 4](#phase-4--gamified-collaboration)

---

## **Phase 4 — Gamified Collaboration**  
🎯 **Goal:** Incentivize helping and growing the network.  

**Features:**
- Bee Points 🐝 for completing your own/others' tasks.  
- Streaks, badges, and helper leaderboards.  
- Skill profiles ("Completed 23 gardening tasks").  
- Suggested goals to help with based on skills/interests.  

**Example Uses:**
- Volunteer reward systems.  
- Skill-based community challenges.  

[⬅ Back to Phase 3](#phase-3--public-goals--discover-feed) | [➡ Go to Phase 5](#phase-5--the-do-graph--marketplace)

---

## **Phase 5 — The Do Graph & Marketplace**  
🎯 **Goal:** Aggregate all human goals into a searchable, AI-powered "Do Graph".

**Features:**
- AI learns from public goals to improve breakdowns & templates.  
- "Trending" goals & skills in demand.  
- Marketplace for helpers, contractors, orgs.  
- API for other platforms to embed Doney's goal data.  

**Example Uses:**
- Nonprofits find volunteers for disaster relief tasks.  
- Cities crowdsource public project execution.  
- Contractor marketplace for jobs from public goals.  

[⬅ Back to Phase 4](#phase-4--gamified-collaboration)

---

## 🗝 Guiding Principles
- **Same UI across all phases** → Always feels like "just a simple to-do app."  
- **Private → Group → Public → Network** progression.  
- **AI as an assistant, not a requirement** → Works with or without automation.  
- **Infinite hierarchy of goals/todos** for maximum flexibility.  

---

## 🚀 Development Status

**Current Branch:** `phase1-roadmap-refactor`  
**Phase:** 1 - Personal Core (MVP)  
**Status:** In development with Monday.com meets Duolingo design system

### Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the current implementation.

### Tech Stack
- **Frontend:** Next.js 14, React, TypeScript
- **Styling:** Tailwind CSS with custom design system
- **State:** React hooks (useState, useEffect)
- **Architecture:** Component-based with infinite nesting support
