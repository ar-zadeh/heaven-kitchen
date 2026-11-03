# Heaven's Kitchen and the LLM-Powered Feedback Generator (LPFG)

This repository contains the code for

> Bagherzadeh, A., & Tehranchi, F. *Designing an LLM-Powered Feedback Generator to Enhance Performance.* Manuscript under review at *Artificial Intelligence for Engineering Design, Analysis and Manufacturing* (AI EDAM).

| Folder | Contents |
|---|---|
| `src/`, `public/` | **Heaven's Kitchen**, the multi-cue decision-making simulation used in the study (React). Live demo: https://heaven-kitchen.vercel.app/ |
| `lpfg/` | **LPFG**, the gaze-based feedback generator as deployed in the study (Python), its exact system instruction, and a synthetic expert reference sequence. |
| `analysis/` | R scripts that compute every statistic, table, and figure reported in the paper, the generator for the synthetic dataset, and the original exploratory notebook. |
| `data/synthetic/` | A synthetic dataset with the same structure as the analyzed dataset. |

## What this repository does and does not reproduce

- **Code validation (anyone).** Every analysis script runs end to end on `data/synthetic/Participants_SYNTHETIC.csv`. The numbers it prints are **not** the paper's results; they show that the code runs and what it computes.
- **Reproduction of the reported results (requires the participant data).** The analyzed dataset is not public, to protect participant privacy. De-identified data are available from the corresponding author on request, subject to IRB approval. Running the same scripts on that file reproduces the reported values (see the table below).
- **LPFG.** The code is provided as deployed so that the pipeline, prompt, and response schema can be inspected. Running it live requires the VR eye-tracking setup, Chrome with the bounding-box reporter, and a Gemini API key; see [`lpfg/README.md`](lpfg/README.md).

No participant data and no recording of the expert's gaze are included in this repository.

## Running the analysis

Requirements: R 4.4 or later with the packages `ARTool`, `car`, `dplyr`, `ggplot2`, `readr`, and `tidyr`.

Run every script from the repository root. With no argument a script uses the synthetic data; pass a path to use the participant data:

```sh
Rscript analysis/reviewer_round3_analysis.R                          # synthetic data
Rscript analysis/reviewer_round3_analysis.R path/to/Participants.csv  # participant data
```

The path can also be set once with the environment variable `HK_DATA`. Reports and figures are written to `analysis/output/`, which git ignores. `Rscript analysis/make_synthetic_data.R` regenerates the synthetic dataset.

## Where each reported result comes from

| Result in the paper | Script |
|---|---|
| ART ANOVAs for groups served and failed groups (Tables 6–8) | `analysis/reviewer_round3_analysis.R`, section 2 |
| Session 2 dispersion: Levene, Brown-Forsythe, and Fisher's exact tests | `analysis/reviewer_round3_analysis.R`, section 3 |
| Post hoc comparison after removing participants at or above the 57-group benchmark | `analysis/reviewer_round3_analysis.R`, section 4 |
| Sensitivity analysis for the excluded participants and tipping points (Appendix B, Table A2) | `analysis/reviewer_round3_analysis.R`, section 6 |
| Learning analyses for RQ3: ART mixed model (Session × AI feedback), change-score ART, repeated-measures ANOVA, change-score means and SDs | `analysis/replicate_original_art_analysis.R` |
| Descriptive statistics (means, SDs, medians, modes) | `analysis/validate_paper_analysis.R` and `analysis/replicate_original_art_analysis.R` |
| Figures 3–5 | `analysis/reproduce_paper_figures.R` |
| Supplementary sensitivity tests from an earlier revision (Mann-Whitney, Welch) | `analysis/reviewer_statistical_addendum.R` |

`analysis/notebooks/PlotGenerators.ipynb` is the original exploratory Python analysis. It is kept for transparency, but no reported value depends on it; its outputs were removed because they contained participant-level results.

## Running the game

The game is live at https://heaven-kitchen.vercel.app/. To run it locally (Node.js required):

```sh
npm install
npm start    # development server at http://localhost:3000
npm run build
```

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app); see its documentation for the other available scripts.

## License

Apache License 2.0; see [`LICENSE`](LICENSE).
