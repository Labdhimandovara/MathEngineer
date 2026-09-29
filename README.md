# MathEngineer

Interactive mathematics learning platform designed specifically for undergraduate engineering students.

## Visual Foundation & Navigation Shell

This repository contains the visual foundation, centralized design system, responsive layout, and initial navigation shell for MathEngineer.

### Aesthetic Foundation
- **Color Palette**:
  - Primary Background: `#F8F5F9`
  - Warm Cream: `#F5F0E6`
  - Soft Lavender: `#C6B5D8`
  - Dusty Lavender: `#A693C2`
  - Deep Lavender: `#806B99`
  - Dark Charcoal Text: `#27242A`
  - Secondary Text: `#6F6874`
  - Soft Border: `#E5DFE8`
- **Color Distribution**: 70% light lavender/cream backgrounds, 20% neutral surfaces, 10% typography and accents.
- **Iconography**: Clean, restrained, human-crafted Lucide icons. (Zero AI sparkle/robot/neon clichés).

### Core Pages
1. **Home**: Welcoming dashboard, "Continue Learning" section for Numerical Techniques, MVP methods progress, Today's Practice prompt, and demo streak record.
2. **Learn**: Course view for Numerical Techniques (Unit 01: Numerical solution of algebraic and transcendental equations), active modules for Bisection, False Position, and Newton-Raphson, and confirmed upcoming syllabus roadmap.
3. **Solve**: Initial question-solving visual shell featuring problem input, exam-photo upload placeholder, and the 3 core actions (*"Try it myself"* prominently highlighted, *"Give me hints"*, *"Show solution"*).
4. **Practice**: Curated question sets categorized by method and difficulty, labeled strictly with neutral tags (*"Practice"*, *"Exam-style"*, *"Numerical Techniques"*).
5. **Progress**: Learning record displaying topics studied, questions completed, current streak, hint reliance tracking, and targeted practice focus.

---

## Running the Project

### With Deno 2 (Recommended)
```bash
# Set system CA store if behind enterprise SSL proxy
$env:DENO_TLS_CA_STORE="system"

# Start the development server
deno task dev

# Build production bundle
deno task build

# Preview production bundle
deno task preview
```

### With Node.js / npm
```bash
npm install
npm run dev
npm run build
```
