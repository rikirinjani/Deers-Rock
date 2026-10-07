# DR Figure Package

Production figures for the Deers Rock JAMIA submission. Each figure is provided as a **Mermaid** source (`.mmd`). Mermaid renders deterministically to SVG/PNG and is the non-fabricating source of record.

## Production files

The four figures are provided as **vector SVG** (journal-ready):

| Figure | SVG | Source | Type |
|---|---|---|---|
| 1 | `figure-1-architecture.svg` | `figure-1-architecture.mmd` | Schematic |
| 2 | `figure-2-handler-pipeline.svg` | `figure-2-handler-pipeline.mmd` | Schematic |
| 3 | `figure-3-calendar-modifiers.svg` | `figure-3-calendar-modifiers.mmd` | Empirical |
| 4 | `figure-4-per-seed-los.svg` | `figure-4-per-seed-los.mmd` | Empirical |

The `.mmd` Mermaid sources are retained for traceability. SVG is the production format; if the journal requires raster (PNG/TIFF), convert the SVGs at ≥300 dpi with any SVG renderer (e.g. `rsvg-convert`, Inkscape, or `mmdc`), e.g.:

```
rsvg-convert -d 300 -p 300 figure-1-architecture.svg -o figure-1-architecture.png
```

All SVGs use Arial/Helvetica at legible sizes (axis labels 11.5–12 px, node text 12–15 px) and a consistent palette (#2c7bb6 primary, #e08a2e secondary). No placeholders, no clipping.

## Figure list

| Figure | File | Type | Data source |
|---|---|---|---|
| 1 | `figure-1-architecture.mmd` | Schematic | Manuscript §3 (architecture) |
| 2 | `figure-2-handler-pipeline.mmd` | Schematic | Manuscript §3 (38-handler pipeline) |
| 3 | `figure-3-calendar-modifiers.mmd` | Empirical (fixed modifiers) | Manuscript §4.6 |
| 4 | `figure-4-per-seed-los.mmd` | Empirical | E1 artifact `experiment-2026-06-28T18-23-06-472Z-summary.json` |

## Excluded legacy artifacts (do not use)

The following pre-existing files in `docs/papers/` are **excluded** and must not be submitted:

- `fig1-architecture.svg` — **stale**: labels "35 handlers per tick" (should be 38) and "FHIR R4 Adapter: Patient, Observation, Encounter" (should be Patient + Observation only).
- `fig2-los-histogram.png` / `fig2_los_histogram.py` — **fabricated**: the script synthesizes LOS values with `np.random` (exponential + uniform), not the actual E1 records.
- `fig3-bed-occupancy.png` / `fig3_bed_occupancy.py` — **fabricated**: the script synthesizes a logistic occupancy curve with `np.random` noise, not the actual E1 trajectory.

No new experiment was performed; the replacement figures use only values already established in the manuscript/evidence.
