# Salary Calculator (grossnetto.com)

**Browser-only, privacy-first gross-to-net and total cost of employment (TCO) salary calculator for multiple European markets.**

This project provides a transparent, client-side salary calculator designed for clarity, auditability, and long-term maintainability.  
All calculations run **entirely in your browser** — no backend, no tracking, and no data ever leaves your device.

🌐 **Live Tool:** https://www.grossnetto.com

---

## Preview

![Salary Calculator Screenshot](https://raw.githubusercontent.com/sbozich/salarycalc/main/screenshot.png)

---

## Key Capabilities

- **Gross → Net Salary Calculation**
- **Employer Total Cost (TCO)** breakdown
- **Monthly and Annual Views**
- **Multi-language UI**
- **Deterministic, explainable formulas**
- **Offline-capable (static assets only)**

> ⚠️ Tax systems are complex and country-specific.  
> This calculator provides **indicative results** and should not replace official payroll or tax authority calculations.

---

## Supported Markets

The calculator supports **10 European markets**, all fully implemented and frozen as of **v1.0.0**:

| Code | Country        |
|-----:|----------------|
| DE   | Germany        |
| AT   | Austria        |
| UK   | United Kingdom |
| FR   | France         |
| NL   | Netherlands   |
| ES   | Spain          |
| PL   | Poland         |
| SI   | Slovenia      |
| IT   | Italy         |
| SE   | Sweden        |


---

## Architecture Principles

- **Client-side only**
- **Deterministic calculations**
- **No heuristics, no black boxes**
- **Rule-driven market logic**
- **Explicit versioning of tax rules**

This repository contains **production code only** — no prototypes, no experiments.

---

## Tech Stack

- Pure **HTML**
- Pure **CSS**
- Pure **JavaScript**
- No frameworks
- No build tools
- No dependencies

Designed to run directly on:
- GitHub Pages
- Cloudflare Pages
- Any static file host

---

## Run Locally

Any static file server will work.

Example using Python:

```bash
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

---

## Project Status

- Core UI and calculation logic completed
- First production release: **25 December 2025**
- Current version: **v1.0.0**
- Status: **Maintenance Mode**
  - Bug fixes
  - Annual tax rule updates only

No feature expansion is planned unless mandated by regulatory changes.

---

## License

Released under the **MIT License** — free for personal and commercial use with attribution.

---

**Accurate inputs. Transparent logic. Zero data leakage.**  
Salary Calculator is built for users who want to understand their numbers — not just see them.
