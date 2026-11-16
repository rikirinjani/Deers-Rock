# Epic X: research and modelling gaps after `us-v1` (draft, 2026-11-16)

**Draft for the owner; nothing here is started.** No code, push, deletion or Kaggle run was made for this note. "Read" means I read the source or file in this project; "candidate, not read" means I have not opened it and the owner or Research OC must check it before it counts. Evidence is in `docs/us-calibration-targets.md` and `docs/experiments/EXPERIMENT-FREEZE-2026-11-16-us-v1.md`.

| # | Gap | Cost | Order |
|---|---|---|---|
| 6 | Indonesian-default regression re-run | Kaggle, minutes | 1 |
| 4 | Label the scenario overshoot | none (text) | 2 |
| 3 | Suppressed HCUP death rates | laptop (analysis) | 3 |
| 2 | ICD-to-CCSR mapping review | laptop, reviewer time | 4 |
| 1 | Case-mix refit and a new held-out set | Kaggle, 1-2 h per round | 5 |
| 5 | Unsourced inputs | laptop (research) | 6, as sources are found |

## 1. Septicemia case-mix drift (4.4 % vs 8.0 %); T-SEP-1/2 no longer held out

- **Status:** open. Stay-level shares in the frozen run: septicemia (A40+A49) 4.4 vs 8.0, heart failure 2.2 vs 4.1, acute MI 1.2 vs 2.4, cerebral infarction 1.2 vs 1.9; osteoarthritis 5.9 vs 4.1. The seeds 20-29 fit (septicemia 6.7) predates the diagnosis-length stays. Likely cause (not tested): long-stay diagnoses close later, so a closed-stay share under-counts them, and occupancy is 94 %.
- **Proposed method:**
  1. Add admissions by principal diagnosis to the `us-baseline` output (stays that closed are a biased count; admissions are not). One small code change, no engine change.
  2. Compare admission shares (not closed-stay shares) with T-CASE-1; only the part left after that is a real gap.
  3. If a gap remains, refit the existing per-group weight multipliers (`scripts/us-casemix-fit.ts`) on the stay-level ratio, as in the seeds 10-19 round, then stop after one correction, as the 2026-11-10 decision did.
- **Held-out set:** T-SEP-1/2 are spent (sepsis now takes its length of stay and death rate from the HCUP septicemia group, T-LOS-2). Options, cheapest first: (a) hold out about a fifth of the mapped CCSR categories: the seam uses the all-stay mean for them and their HCUP values are checked afterwards (data already read, no new source); (b) hold out 2022 against a 2023 fit (read, but both years are highly correlated, so weak); (c) a new independent source: Medicare Inpatient Hospitals by Provider and Service (T-DRG-4, candidate, not read) for length of stay and charges by DRG. Recommend (a) now, (c) when read.
- **Evidence needed:** admission shares on 10 new seeds (90-99), a refit table, and the held-out comparison. **Cost:** one Kaggle round of 1-2 h per iteration. **Needs the owner:** whether to accept (a).

## 2. ICD-to-CCSR mapping (`US_ICD_TO_CCSR`, 141 codes), unreviewed

- **Status:** my hand mapping of 3-character codes to the nearest CCSR category; CCSR is defined on full ICD-10-CM codes, so a 3-character code can span several categories.
- **Review plan:** (1) a reviewer with coding knowledge (Research OC; a certified coder if the owner has one) checks every code against the CCSR reference documentation (candidate, not read: the HCUP CCSR tool and its code-to-category file), and marks each row agree, split or wrong; (2) priority rows are those with the most simulated stays and the largest HCUP effect: A40/A49 (A49 is bacterial infection unspecified, not CCSR septicemia), I10, J06, F32, N39, M17, I50, I21; (3) where a code spans several categories, weight by the HCUP discharge counts already in `docs/us-hcup-ccsr-2022-2023.csv` rather than choose one; (4) add a test that the mapping file equals the reviewed list.
- **Evidence needed:** the reviewed table with a sign-off. **Cost:** laptop, reviewer time (about half a day for the top 30 codes). **Order:** before the refit in item 1, since both use the same mapping.

## 3. Suppressed HCUP death rates set to 0

- **Status:** HCUPnet suppresses a rate when there are fewer than 11 deaths or the relative standard error exceeds 0.30. The seam uses 0 for these.
- **Affected (read from the merged table and the mapping):** 31 of 141 mapped codes in 27 of 111 CCSR categories, about 21.5 % of the discharges in the seeds 70-79 tier measurement. Largest by simulated stays: depression F32 (74), hypertension I10 (221), upper respiratory J06 (171), fever R50 (91), lipid disorders E78 (46), headache G43/R51, opioid disorders F11, trauma disorders F43, hematuria R31, uncomplicated delivery O80, plus otitis media, cataract, cornea, inner ear, hemorrhoids, tendon, bipolar, neurodevelopmental, nerve disorders, cleft, birth trauma, jaundice, obsessive-compulsive, rheumatic heart disease, pregnancy hypertension, unspecified injury.
- **Bias:** these groups can never die in the US pack. The suppression rule does not mean the true rate is zero: a large category can be suppressed for a high standard error, and a small one for few deaths. The error is a small negative bias in deaths in groups that are mostly low-mortality, but it is untested in size. The pooled rate of the unsuppressed groups (2.10 % in 2023) is a floor, not a target.
- **Options for a source-backed replacement:** (a) use the 2022 value where 2023 is suppressed but 2022 exists: only 4 categories qualify (hemorrhoids, hematuria, unspecified injury, depression), so little gain; (b) assign a small rate bounded by the suppression rule (a ceiling, not a value); (c) pool suppressed categories within a body system using the unsuppressed members' discharge-weighted rate (assumes similar mortality); (d) a record-level source (NIS needs a data-use agreement and fee, an owner decision); (e) keep 0 and label it. Recommend (e) now with the affected list in the freeze record, then (c) as a sensitivity run.
- **Evidence needed:** a sensitivity run with (c) on seeds 80-89 and the change in outside-scenario deaths. **Cost:** laptop for the analysis, one Kaggle round for the run.

## 4. Scenario overshoot (1.9x over all discharges), kept as a surge effect

- **Status:** decided by the owner on 2026-11-16; engine unchanged.
- **Labelling:** (1) the freeze record already reports deaths inside, outside and overall; keep that split in every report. (2) Any death rate quoted from the US pack must say "outside scenario windows (HCUP-comparable)" or "all discharges (includes the scenario surge effect)"; never an unlabelled number. (3) Paper OC must not quote the all-discharge rate (29.9 per mille) against HCUP. (4) `us-baseline` already writes `scenarioWindows`; add the inside/outside split to any future report script. (5) Add one sentence to the `us-v1` README or client guide in 10.6 that scenarios add mortality by design.
- **Cost:** none (text only). **Order:** before any report leaves the project.

## 5. Unsourced inputs

| Input | Where it stands | Candidate public source |
|---|---|---|
| Nursing-assistant roster role | headcount is sourced (BLS OEWS nursing assistants 479,330 in hospitals, T-WORK-3, read); there is no role in the simulator roster, so the gap is the role definition, not the number | none needed for the count; define the role and its tasks from the OEWS occupation description (candidate, not read) |
| Holiday ED multipliers (1.1-1.4) and seasonal boosts | unsourced placeholders; the five federal holidays added 2026-11-13 use multiplier 1 | none found; published studies of ED volume on holidays may exist (candidate, not searched); until then label as placeholder |
| Hospital injectable contract prices | injectables use NADAC retail acquisition cost times the 5.65 markup (T-DRUG-1, T-PRICE-1, read), order of magnitude only; 84 of 214 active drugs still unmatched (20 oral, the rest injectables, topicals, inhalers) | none public for contracts; hospital price-transparency machine-readable files (candidate, not read) show charges and negotiated rates and could replace the markup, at the cost of large downloads (owner approval per file) |
| Spondylopathies (1.9 %) and complication-of-care (1.2 %) case mix | share known from T-CASE-1 (read); no illness group, DRG family or protocol in the engine | share: T-CASE-1; DRG weights and length of stay: CMS Table 5 (read for other families, these families not extracted); protocol: a clinical guideline would have to be found and read (none selected) |

- **Cost:** laptop research; each item is small but needs a source read before any code. **Order:** the nursing-assistant role first (the number is already sourced), spondylopathies second (largest share), the others as sources appear.

## 6. Regression gap for the Indonesian default

- **Status:** I ran E1 (`084024be…` CSV, `068b07b2…` summary), the three finance-golden hashes and the full suite at the step E change and they were unchanged. I did not rerun E1 or the golden after `2e626c3` or at `059214f`/`b2a6922`; at `059214f` I ran `tsc` and the full suite (726 passed, 3 skipped). The only code change after step E is `src/experiment/us-baseline.ts` (an experiment script outside the default path), so the risk is low, but it is unconfirmed by the E1 and finance hashes.
- **Proposal:** one Kaggle kernel from `git archive` of the current HEAD: `npx tsx src/experiment/runner.ts 10 1000` and `npx tsx scripts/_finance_golden.ts`, hash the outputs and compare with the values above; delete the experiment-results outputs afterwards. Optionally add one seed of the frozen Indonesian outcome baseline (`clinical-v3`, 14,400 ticks; an earlier freeze took about 34 min for one seed alone) for a longer check; I would skip it unless step 10.6 moves files.
- **Cost:** Kaggle, minutes for E1 and golden. **Order:** first, and again after every 10.6 move (the 10.6 plan already requires it).

## Decisions for the owner

1. Item 1: accept the 20 % category hold-out (a) as the new held-out set?
2. Item 2: who reviews the mapping?
3. Item 3: keep 0 and label, then run the pooled sensitivity?
4. Item 6: run the regression kernel now?
