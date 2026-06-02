# StudioFlow — Competitor Pain-Point Research

> **Date:** 2026-06-02 · Companion to `2026-06-02-studioflow-platform-design.md`
> Source: four parallel research agents (script/breakdown, scheduling/call-sheets, budgeting, all-in-one/sync/UX). Findings filtered to those with structural/data-model implications. **Caveat:** Reddit/forum threads largely blocked automated access; some findings lean on vendor support docs and comparison blogs rather than raw user complaints — a vendor publishing a "how to work around X" article is still strong evidence X hurts, but re-validate severity against direct user interviews before it drives priority.

---

## A. Script & Breakdown

1. **Tagged breakdown is keyed to scene number; renumbering destroys it.** "If you create a breakdown for Scene 4, but later change that scene to Scene 3A, those tagged elements will be lost." → **Immutable `scene_id` decoupled from `scene_number`.** The single most important schema decision. [scene numbering](https://www.studiobinder.com/blog/scene-numbering/) · [tagged elements disappear](https://support.studiobinder.com/en/articles/3009805-why-did-my-tagged-elements-disappear) — **High**
2. **Re-breakdown on revision loses tags.** → `ScriptVersion` needs diff/reconciliation mapping scenes old→new so `SceneElement` links migrate. [filmustage breakdown](https://filmustage.com/script-breakdown/) · [studiobinder sync](https://support.studiobinder.com/en/articles/2071922-how-to-sync-a-script-to-the-project) — **High**
3. **AI breakdown false positives must be scrubbed before scheduling.** → `SceneElement` needs provenance (auto/manual), confidence, status (suggested/confirmed/rejected) + text-anchor; suggestions don't flow downstream until confirmed. [noamkroll review](https://noamkroll.com/review-testing-filmustages-ai-powered-script-breakdown-app-on-a-feature-film/) · [trustpilot](https://www.trustpilot.com/review/filmustage.com) — **High**
4. **Same character under multiple names → duplicate cast.** → `Character` needs an alias set + a merge op that re-points links. [merge cast](https://support.studiobinder.com/en/articles/419692-how-to-merge-multiple-cast-members) · [synconset merging](https://support.synconset.com/article/uc58ny6ihq-linking-and-merging-characters) — **High**
5. **Character vs Cast-presence vs Person conflated.** → cast↔scene link carries presence-type (speaking/silent/background/VO); DOOD needs physical presence, not dialogue. [identify cast](https://www.studiobinder.com/blog/identify-cast-breaking-down-script/) — **High**
6. **Final Draft .fdx tags don't survive into MM Scheduling.** → on import, map existing tags into `SceneElement`; the graph (not the script file) is the system of record. [FD→MMS](https://kb.finaldraft.com/hc/en-us/articles/15574927910036-How-do-I-get-my-tagged-FD-script-into-Movie-Magic-Scheduling) — **Med**
7. **Fountain silently loses dual-dialogue, pagination, notes.** → store those as first-class fields on ScriptVersion/Scene; eighths/page-count is derived-but-stored. [fountain FAQ](https://fountain.io/faq/) · [fountain import/export](https://www.screenweaver.ai/blog/fountain-import-export-formatting) — **Med**
8. **Locked pages / colored revisions are mandatory.** → ScriptVersion `locked` state + revision color; Scene lock + letter-suffix inserts that don't renumber neighbors. [revision colors](https://www.studiobinder.com/blog/what-are-script-revision-colors/) · [locking pages](https://www.screenwriting.info/locking-your-script-pages-and-locking-your-scenes/) — **Med-High**
9. **Collaboration: file-lock / last-write-wins on structured docs.** → fine-grained per-Scene/per-SceneElement edits; separate lock domains for script text vs breakdown. [FD collaborative](https://www.finaldraft.com/blog/collaborative-writing) — **Med**
10. **Minimal export / lock-in.** → whole graph exportable in a structured, re-importable format (not just PDF). [Celtx Capterra](https://www.capterra.com/p/235136/Celtx/reviews/) — **Med**
11. **Breakdown↔schedule desync; scenes split for scheduling.** → schedule unit ≠ Scene; a `SceneSegment` references a fraction of a scene. [split scene](https://www.studiobinder.com/blog/how-to-split-a-scene-for-scheduling/) — **Med-High**

**Model gaps:** immutable scene_id; presence-type on cast link; Character alias set + merge; richer SceneElement (provenance/confidence/status/anchor); version diff entity; SceneSegment; stored eighths; lock/revision-color; slug↔Location as many-to-many; category→Department→account as configurable mapping (not hardcoded on Element).

---

## B. Scheduling / Stripboard / Call Sheets

1. **Call times can't be set per-department or bulk-pushed.** → `CallTime` resolves via Person→Position→Department precedence + bulk-offset op. [Capterra](https://www.capterra.co.uk/software/166472/studiobinder) — **High**
2. **Splitting a scene across days loses elements.** → `SceneSegment` (eighths) is the schedulable unit; SceneElements partition across segments. [split scene](https://www.studiobinder.com/blog/how-to-split-a-scene-for-scheduling/) — **High**
3. **Auto-reorder silently deletes day breaks.** → day-breaks/banners are first-class Strip subtypes ordered *within* a ShootDay, not a global flat sort. [auto-reorder](https://support.studiobinder.com/en/articles/419884-auto-reorder-scene-strips) — **High**
4. **Strips can't hold enough text.** → Strip references rich fields (synopsis, derived cast, notes); the view decides rows, not the data. [production strip](https://junglesoftware.com/production-strip/) — **Med**
5. **Multi-unit scheduling double-books crew.** → `unit` (Main/2nd/Splinter) on ShootDay; one date → many ShootDays; cross-unit conflict detection on shared elements. [multi-unit guide](https://blockreeldao.com/blog/the-complete-guide-to-film-scheduling-and-stripboard-management-2026) — **High**
6. **Can't add a scene to a call sheet post-generation without retyping.** → CallSheet is a live projection of its ShootDay; snapshot only at publish. [Capterra](https://www.capterra.co.uk/software/166472/studiobinder) — **High**
7. **Breakdown gaps → call sheets omit basics.** → some categories always appear (cast, location); pre-publish validation flags missing elements. [Yamdu reviews](https://www.capterra.com/p/186025/Yamdu/reviews/) — **Med**
8. **No cast/crew confirmation tracking.** → per-recipient `DistributionRecord` (sent/delivered/viewed/confirmed), per version. [SetHero comparison](https://sethero.com/blog/best-call-sheet-software-comparison/) — **Med**
9. **Call-sheet revisions risk stale versions on set.** → CallSheet versioning + published-at + per-version distribution log. [SetHero republish](https://help.sethero.com/en/articles/1524020-revising-and-republishing-a-call-sheet) — **Med**
10. **Schedule changes don't sync back to breakdown/budget.** → the shared-graph thesis: ShootDay/Strip/CallSheet/budget derive from Scene+SceneElement; changes recompute dependents. [scheduling conflicts](https://filmustage.com/blog/solving-common-scheduling-conflicts-in-film-production/) — **High**
11. **DOOD hold/drop-pickup "Do Not Match" discrepancies.** → `CastDayStatus` (Person × date: Work/Hold/Travel/Start/Finish/Drop/Pickup) with rules. [EP DOOD do-not-match](https://entertainmentpartners.my.site.com/s/article/Movie-Magic-Scheduling-MMS-Day-Out-of-Days-DOOD-Do-Not-Match) · [DOOD rules](https://mms-docs.ep.com/DayOutofDays/DOODRules.html) — **High**
12. **No .mms import.** → import-mapping layer; our SceneElement categories should map to MM element categories. [MM→StudioBinder](https://support.studiobinder.com/en/articles/2039676-go-from-movie-magic-scheduling-to-studiobinder) — **Med**
13. **MM is offline/single-seat, decade-stale.** → confirms shared, multi-user, versioned cloud graph; PDF as export not source. [StudioBinder vs MM](https://www.studiobinder.com/movie-magic-scheduling-software-vs-studiobinder/) — **Med**
14. **Locations can't hold multiple sets/photos under one address.** → Location(address) → Set/Area; company-move keys on parent address; geo/timezone on Location. [Yamdu reviews](https://www.capterra.com/p/186025/Yamdu/reviews/) — **Med**

**Model gaps:** SceneSegment + eighths; Strip subtypes (scene/day-break/banner); Unit dimension; CastDayStatus/DOOD; CallTime scoping; CallSheet live-projection + versioning + DistributionRecord; Location→Set hierarchy + geo; company-move concept; page-count rollups on ShootDay; MM-aligned element category enum.

---

## C. Budgeting

1. **Budget & actuals are disconnected systems.** → `actual` is a rollup of an append-only `BudgetTransaction` ledger, not a column. [wrapbook](https://www.wrapbook.com/blog/best-film-budgeting-software) · [saturation](https://saturation.io/blog/production-cost-report) — **High**
2. **No "committed"/PO state.** → states: estimate → committed (PO/contract) → actual → derived EFC/variance; PO is a first-class entity. [saturation cost report](https://saturation.io/blog/production-cost-report) — **High**
3. **Fringes vs Globals vs Groups are three different things.** → add `Global` (named scalars) + `Group` (cross-account subtotals); don't collapse into Fringe. [MMB apply tools](https://mmb-docs.ep.com/ApplyTools/Apply_Tools_Overview.html) — **High**
4. **Fringe caps/cutoffs need per-person aggregation (fringe ranges).** → Fringe attaches at line level with cap/cutoff/basis; aggregates per-Person across lines. [MMB fringes](https://mmb-docs.ep.com/Setup/fringes.html) — **High**
5. **Single-user, no realtime.** → row-level concurrency + change attribution + audit log. [saturation vs MMB](https://saturation.io/versus/movie-magic-budgeting) — **High**
6. **Locked/approved budget vs working scenarios.** → immutable `BudgetVersion` baseline; variance vs baseline; scenario branches. [film budget guide](https://www.shamelstudio.com/blog/film-budget-guide) — **High**
7. **Multi-currency breaks on co-productions.** → `currency` + `fx_rate` on line (and transaction). [MMB currencies](https://mmb-docs.ep.com/Setup/currencies.html) — **Med**
8. **Tax-incentive/qualified-spend is per-line, jurisdiction-specific.** → `qualifies_for_incentive` flag + `Jurisdiction`/`IncentiveProgram` entities; parallel qualified-spend pool. [saturation tax](https://saturation.io/blog/best-tools-for-film-tax-incentive-tracking-and-compliance) — **High**
9. **Proprietary format = interoperability dead end.** → serialize to/from MMB Category/Account/SubAccount/Set + XML. [filext mbd](https://filext.com/file-extension/MBD) · [MMB import/export](https://mmb-docs.ep.com/Projects_and_Budgets/importexport.html) — **Med**
10. **Rigid account-code digit structure.** → configurable code-mask per level + optional 4th sub-level. [MMB account coding](https://mmb-docs.ep.com/Budget_Preferences/Budget_Prefs_Account_Coding.html) — **Med**
11. **Budget loosely coupled to schedule/script.** → live derivation links; distinguish read-only derived qty from user-entered rate; recompute/dirty-flag. [wrapbook](https://www.wrapbook.com/blog/best-film-budgeting-software) — **High**
12. **Excel/Hot Budget formula fragility.** → structured server-evaluated calc_type, not free-form cells; derived values not hand-editable. [hotbudget faqs](https://hotbudget.com/faqs/) — **Med**
13. **Steep learning curve / abandonment to Excel.** → "show-the-math" derivation trace so users trust derived numbers. [sethero budgeting](https://sethero.com/blog/top-6-film-budgeting-softwares-compared/) — **Med**
14. **Subscription/web distrust; offline need.** → export/snapshot ownership; offline-capable working copies later. [stage32 thread](https://www.stage32.com/lounge/producing/Showbiz-Budgeting-vs-Movie-Magic-Budgeting-7) — **Low/Med**

**Model gaps:** transaction ledger for actuals; committed/PO entity + EFC/variance; Globals + Groups (distinct from Fringe); Fringe caps/ranges/stacking at line level; Jurisdiction/IncentiveProgram + qualified flag; per-line currency/fx; BudgetVersion lock/baseline; configurable account depth + code-mask; recompute semantics + math-trace.

---

## D. All-in-one / Sync / UX / Adoption

1. **"All-in-one" is often siloed-in-one-login.** → genuine single graph; "change script → everything updates" must be automatic, not a re-import button. [digitalfilmmaker](https://digitalfilmmaker.net/film-budgeting-software/) · [pzaz](https://pzaz.io/producer-blog/filmmaking-software-comparison/) — **High**
2. **No budget module / budget in separate tool.** → budget feeds structurally from schedule; also support spreadsheet export/round-trip. [wrapbook](https://www.wrapbook.com/blog/best-film-budgeting-software) — **High**
3. **Manual re-entry tax when script changes.** → script→auto-breakdown is the wedge; change-propagation is the retention feature. — **High**
4. **Offline/on-set reliability is top-demanded, often missing.** → Tauri desktop offline-first (later phase) for call sheets/schedule on set. [Studiovity reviews](https://us.fitgap.com/products/056054/studiovity-film-pre-production-software) — **High**
5. **Fragile/destructive imports destroy trust on day one.** → non-destructive staged import + diff + version history; never silently drop scenes. [indietalk](https://indietalk.com/threads/celtx-sophocles-or-movie-magic.8012/) — **High**
6. **Per-seat/per-project pricing punishes inviting the crew.** → per-project pricing or cheap view/limited-edit crew seats; don't gate cross-project People. [Capterra compare](https://www.capterra.com/creative-management-software/compare/166472-186025/StudioBinder-vs-Yamdu) — **High**
7. **Granular per-module/per-field permissions wanted.** → membership + roles + module-scoped grants + sensitive-field hiding + time-bounded access + budget lock. [saturation accounting](https://saturation.io/blog/film-production-accounting-software) · Yamdu — **High**
8. **Distrust of cloud for the master budget.** → version history, snapshots, one-click xlsx/PDF export, audit log, designated owner/lock. [firstdraftfilmworks](https://firstdraftfilmworks.com/blog/complete-guide-to-film-budget-format-expert-tips-for-creating-production-budgets-in-2026/) — **High**
9. **Data lock-in/migration anxiety.** → frictionless full-project export from launch (FDX/xlsx/PDF/CSV). — **Med**
10. **Non-negotiable imports: FDX, Movie Magic, Google Sheets.** → import adapters as a launch requirement; auto-generate scene numbers on import; tolerant taxonomy preserves unmapped tags. [FD KB](https://kb.finaldraft.com/hc/en-us/articles/15575252743316-Can-Final-Draft-export-to-Movie-Magic-Scheduling-and-Budgeting) — **High**
11. **Learning curve / onboarding-data-entry burden kills adoption.** → import a script → instant breakdown + draft schedule + budget skeleton; no blank cold start. — **High**
12. **Mobile vs desktop mismatch.** → mobile-read-optimized on-set views; don't ship a shrunk desktop grid. [sethero] — **Med**

**Model/permissions gaps:** project membership + roles; per-module grants + per-field sensitivity; time-bounded/scoped access (revoke at wrap); cross-project People at org level; budget lock + variance; audit log / point-in-time snapshots; import-adapter layer with staging/diff + tolerant taxonomy; explicit change-propagation/dependency edges; estimate/actual on budget lines.

**Adoption killers (get wrong = dead):** (1) cold-start data entry with no immediate payoff; (2) destructive/fragile imports; (3) fake all-in-one where modules don't share one model. Runner-ups: per-seat pricing that discourages inviting crew; no offline on set; budget trust (no export/version history).
