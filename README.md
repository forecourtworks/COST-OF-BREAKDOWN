# FORECOURT WORKS — Dispenser Breakdown Loss Calculator

Demonstration tool for Reliability & Maintenance sales conversations.

## Purpose
Quantify fuel sales exposure (litres + KES) when a dispenser / product stream is offline, so clients can see downtime in financial terms.

## Products
- **PMS** — Petrol / Motor Spirit  
- **AGO** — Automotive Gas Oil (Diesel)  
- **V. POWER** — Premium grade  
- **IK** — Illuminating Kerosene  

## Periods calculated
Per minute · hour · day · week · month (30d) · quarter (90d) · semi-annual (182.5d) · annual (365d)

## Core formulas
- Effective L/hour = f(daily|hourly|monthly volume, operating hours, utilisation, nozzles)
- Loss (L) = Effective L/hour × hours in period (open-hours model)
- Revenue loss (KES) = Loss (L) × selling price
- Margin loss (KES) = Loss (L) × gross margin (optional)

## Tabs
Inputs are **not destroyed** when switching tabs (no full page refresh / re-mount of form).

## PDF
Share as PDF uses double navy boundary, FORECOURT-SWL logo mark, company header, footer with doc id and page numbers — aligned with FSW controlled-document presentation rules.

## How to run
Open `index.html` in a browser (keep logo PNG files in the same folder).
