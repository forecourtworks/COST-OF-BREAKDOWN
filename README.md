# FORECOURT WORKS — Breakdown Loss Calculator

## Layout (single-window, three columns)

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| **Revenue at full assets capacity** | **Revenue with breakdown** | **Loss interpretation** |
| Daily volume, nozzles, price per product | Nozzles out of service | Losses per second → annually |
| Full-capacity revenue tables | Reduced revenue tables | Per-nozzle cost of delay |

Everything is designed to stay visible in one viewport (no scrolling required for the comparison).

## Model

- Enter **volume sold per product per day** (all nozzles of that grade).
- Enter **number of nozzles** selling that product → app derives litres/nozzle/day.
- Enter **how many nozzles are out of service**.
- Revenue with breakdown = (working nozzles × litres/nozzle) × price.
- Loss = full capacity − breakdown.
- Operating hours/day and days/week scale all periods.
- Up to **3 products** concurrently (PMS, AGO, V.POWER, IK).

## Loss periods shown

Second · Minute · Hour · Day · Week · Month · Quarter · Semi-annual · Annual

## Open

Open `index.html` in a browser (or serve the folder). Logos must sit in the same directory.
