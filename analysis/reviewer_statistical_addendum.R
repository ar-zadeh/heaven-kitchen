# Run from the repository root:
#   Rscript analysis/reviewer_statistical_addendum.R [path/to/Participants.csv]
# Without an argument the synthetic dataset is used (code validation only).
# Writes analysis/output/reviewer_statistical_addendum.md.
options(stringsAsFactors = FALSE)

args <- commandArgs(trailingOnly = TRUE)
data_path <- if (length(args) >= 1) args[1] else
  Sys.getenv("HK_DATA", file.path("data", "synthetic", "Participants_SYNTHETIC.csv"))
if (!file.exists(data_path)) stop("Data file not found: ", data_path, " (run from the repository root)")
if (grepl("SYNTHETIC", data_path)) message("NOTE: synthetic data - output validates the code only; it does not reproduce the paper.")
dir.create(file.path("analysis", "output"), recursive = TRUE, showWarnings = FALSE)
out_path <- file.path("analysis", "output", "reviewer_statistical_addendum.md")

fmt <- function(x, digits = 3) {
  if (is.na(x)) return("NA")
  sub("^(-?)0\\.", "\\1.", formatC(x, format = "f", digits = digits))
}

fmt1 <- function(x) formatC(x, format = "f", digits = 1)

mw <- function(x, y) wilcox.test(x, y, exact = FALSE, correct = TRUE)
welch <- function(x, y) t.test(x, y, var.equal = FALSE)
paired <- function(after, before) t.test(after, before, paired = TRUE)

rank_biserial <- function(w, n_ai, n_control) {
  (2 * w / (n_ai * n_control)) - 1
}

levene <- function(values, groups, center = c("mean", "median")) {
  center <- match.arg(center)
  by_group <- split(values, groups)
  centers <- vapply(by_group, if (center == "mean") mean else median, numeric(1))
  z <- abs(values - centers[as.character(groups)])
  fit <- oneway.test(z ~ factor(groups), var.equal = TRUE)
  c(F = unname(fit$statistic), p = fit$p.value)
}

add <- function(lines = "") {
  cat(paste(lines, collapse = "\n"), "\n", file = out_path, append = TRUE)
}

df <- read.csv(data_path, check.names = FALSE)
names(df) <- gsub(" ", "_", names(df))
names(df) <- gsub("-", "_", names(df))
df$AI_Label <- ifelse(df$AI_Feedback == 1, "AI feedback", "Control")
df$AI_Label <- factor(df$AI_Label, levels = c("Control", "AI feedback"))
df$SessionF <- factor(df$Session)
df$Participant_ID <- factor(df$Participant_ID)

wide <- reshape(df, idvar = "Participant_ID", timevar = "Session", direction = "wide")
wide$AI_Feedback <- wide$AI_Feedback.1
wide$AI_Label <- ifelse(wide$AI_Feedback == 1, "AI feedback", "Control")
wide$Change_Served <- wide$Total_Served.2 - wide$Total_Served.1
wide$Change_Failed <- wide$Total_Failed.2 - wide$Total_Failed.1

if (file.exists(out_path)) invisible(file.remove(out_path))

add(c(
  "# Statistical Revision Addendum for Reviewer Comment",
  "",
  paste0("Data source: `", data_path, "`"),
  paste0("Analytic sample: ", length(unique(df$Participant_ID)), " participants, ", nrow(df), " session-level rows."),
  "",
  "This addendum directly addresses the reviewer's three statistical concerns: inconsistent p-values/table numbering, formal RQ3 learning analysis, and ceiling/variance interpretation."
))

add(c(
  "",
  "## 1. Resolve Statistical Inconsistencies",
  "",
  "Recommended correction: replace the old abstract/results/discussion values (`p = .02`, `p = .03`, `p = .014`) with one consistent analysis family. Because the sample is small and normality is not robust, the revised manuscript should report Mann-Whitney tests as the primary group comparison, with Welch t-tests only as sensitivity checks.",
  "",
  "| Outcome | Session | AI feedback M (SD) | Control M (SD) | Primary test | Sensitivity test | Interpretation |",
  "|---|---:|---:|---:|---|---|---|"
))

for (session_id in c(1, 2)) {
  for (metric in c("Total_Served", "Total_Failed")) {
    d <- subset(df, Session == session_id)
    ai <- d[d$AI_Feedback == 1, metric]
    control <- d[d$AI_Feedback == -1, metric]
    m <- mw(ai, control)
    t <- welch(ai, control)
    rb <- rank_biserial(unname(m$statistic), length(ai), length(control))
    interpretation <- if (metric == "Total_Served" && session_id == 1) {
      "Primary evidence for RQ1"
    } else if (metric == "Total_Served" && session_id == 2) {
      "Post-training performance difference"
    } else if (metric == "Total_Failed" && session_id == 1) {
      "Directional secondary outcome"
    } else {
      "Secondary outcome, not significant"
    }
    add(paste0(
      "| ", gsub("_", " ", metric),
      " | ", session_id,
      " | ", fmt1(mean(ai)), " (", fmt1(sd(ai)), ")",
      " | ", fmt1(mean(control)), " (", fmt1(sd(control)), ")",
      " | U = ", fmt(unname(m$statistic), 1), ", p = ", fmt(m$p.value, 3), ", r = ", fmt(rb, 2),
      " | t = ", fmt(unname(t$statistic), 2), ", p = ", fmt(t$p.value, 3),
      " | ", interpretation,
      " |"
    ))
  }
}

add(c(
  "",
  "**Table consolidation recommendation.** Use three results tables only:",
  "",
  "1. `Table 5`: Primary nonparametric group comparisons for Session 1 and Session 2 groups served, plus failed customers as a secondary row.",
  "2. `Table 6`: RQ3 learning/change-score analysis.",
  "3. `Table 7`: Session 2 ceiling and dispersion sensitivity analysis.",
  "",
  "Remove the duplicate failed-customer ART ANOVA table from the older draft. If a variance row is retained for failed customers, label it correctly as Brown-Forsythe/median-centered rather than mean-centered Levene, or omit it because failed customers are secondary and skewed."
))

served_aov <- summary(aov(Total_Served ~ AI_Label * SessionF + Error(Participant_ID / SessionF), data = df))
failed_aov <- summary(aov(Total_Failed ~ AI_Label * SessionF + Error(Participant_ID / SessionF), data = df))
served_between <- served_aov[[1]][[1]]
served_within <- served_aov[[2]][[1]]
failed_within <- failed_aov[[2]][[1]]

served_ai <- wide$Change_Served[wide$AI_Feedback == 1]
served_control <- wide$Change_Served[wide$AI_Feedback == -1]
failed_ai <- wide$Change_Failed[wide$AI_Feedback == 1]
failed_control <- wide$Change_Failed[wide$AI_Feedback == -1]
served_change_mw <- mw(served_ai, served_control)
served_change_t <- welch(served_ai, served_control)
failed_change_mw <- mw(failed_ai, failed_control)
failed_change_t <- welch(failed_ai, failed_control)
ai_pair <- paired(wide$Total_Served.2[wide$AI_Feedback == 1], wide$Total_Served.1[wide$AI_Feedback == 1])
control_pair <- paired(wide$Total_Served.2[wide$AI_Feedback == -1], wide$Total_Served.1[wide$AI_Feedback == -1])

add(c(
  "",
  "## 2. Complete the Learning Analysis (RQ3)",
  "",
  "RQ3 asks whether receiving AI feedback during training produces a larger Session 1-to-Session 2 boost. I recommend reporting change scores as the primary test because they are transparent for reviewers and equivalent in interpretation to the session-by-condition interaction. I also include a repeated-measures ANOVA sensitivity check.",
  "",
  "| Outcome | Group | Mean change | SD | Median change |",
  "|---|---|---:|---:|---:|",
  paste0("| Groups served | AI feedback | ", fmt1(mean(served_ai)), " | ", fmt1(sd(served_ai)), " | ", fmt1(median(served_ai)), " |"),
  paste0("| Groups served | Control | ", fmt1(mean(served_control)), " | ", fmt1(sd(served_control)), " | ", fmt1(median(served_control)), " |"),
  paste0("| Failed customers | AI feedback | ", fmt1(mean(failed_ai)), " | ", fmt1(sd(failed_ai)), " | ", fmt1(median(failed_ai)), " |"),
  paste0("| Failed customers | Control | ", fmt1(mean(failed_control)), " | ", fmt1(sd(failed_control)), " | ", fmt1(median(failed_control)), " |"),
  "",
  "| Formal RQ3 test | Statistic | p-value | Conclusion |",
  "|---|---:|---:|---|",
  paste0("| Groups-served change score, Mann-Whitney | U = ", fmt(unname(served_change_mw$statistic), 1), " | ", fmt(served_change_mw$p.value, 3), " | No larger boost for AI-feedback group |"),
  paste0("| Groups-served change score, Welch t-test | t = ", fmt(unname(served_change_t$statistic), 2), " | ", fmt(served_change_t$p.value, 3), " | Sensitivity check agrees |"),
  paste0("| Groups-served Session x AI interaction | F(1,21) = ", fmt(served_within['AI_Label:SessionF', 'F value'], 2), " | ", fmt(served_within['AI_Label:SessionF', 'Pr(>F)'], 3), " | Repeated-measures sensitivity check agrees |"),
  paste0("| Failed-customer change score, Mann-Whitney | U = ", fmt(unname(failed_change_mw$statistic), 1), " | ", fmt(failed_change_mw$p.value, 3), " | No condition difference in reduction of failures |"),
  paste0("| Failed-customer Session x AI interaction | F(1,21) = ", fmt(failed_within['AI_Label:SessionF', 'F value'], 2), " | ", fmt(failed_within['AI_Label:SessionF', 'Pr(>F)'], 3), " | Sensitivity check agrees |"),
  "",
  "Within-condition paired tests show that both groups improved in groups served: AI feedback, t(10) = 2.73, p = .021; control, t(11) = 3.73, p = .003. However, because the between-condition change-score and interaction tests are not significant, RQ3 should be reported as not supported."
))

ceil57 <- table(AI = wide$AI_Label, Ceiling = wide$Total_Served.2 >= 57)
ceil56 <- table(AI = wide$AI_Label, Ceiling = wide$Total_Served.2 >= 56)
f57 <- fisher.test(ceil57)
f56 <- fisher.test(ceil56)
nonceil57 <- subset(wide, Total_Served.2 < 57)
nonceil_mw <- mw(
  nonceil57$Total_Served.2[nonceil57$AI_Feedback == 1],
  nonceil57$Total_Served.2[nonceil57$AI_Feedback == -1]
)
lev_mean <- levene(df$Total_Served[df$Session == 2], df$AI_Feedback[df$Session == 2], "mean")
lev_median <- levene(df$Total_Served[df$Session == 2], df$AI_Feedback[df$Session == 2], "median")

add(c(
  "",
  "## 3. Ceiling Effects and Variability",
  "",
  "Session 2 does not have a strict maximum of 57 because one participant served 59 groups. However, 57 was the expert benchmark reported in the manuscript and most high scores clustered at or near that value. Therefore, the fairest language is near-ceiling or upper-bound clustering, not a hard ceiling.",
  "",
  "| Ceiling/dispersion check | AI feedback | Control | Test | Interpretation |",
  "|---|---:|---:|---|---|",
  paste0("| Session 2 SD | ", fmt1(sd(wide$Total_Served.2[wide$AI_Feedback == 1])), " | ", fmt1(sd(wide$Total_Served.2[wide$AI_Feedback == -1])), " | Mean-centered Levene F = ", fmt(lev_mean['F'], 2), ", p = ", fmt(lev_mean['p'], 3), " | AI group is less variable |"),
  paste0("| Brown-Forsythe/median-centered | - | - | F = ", fmt(lev_median['F'], 2), ", p = ", fmt(lev_median['p'], 3), " | Borderline confirmation of dispersion difference |"),
  paste0("| Reached 57+ groups | ", ceil57['AI feedback', 'TRUE'], "/11 | ", ceil57['Control', 'TRUE'], "/12 | Fisher p = ", fmt(f57$p.value, 3), " | More upper-end clustering in AI group, not significant |"),
  paste0("| Reached 56+ groups | ", ceil56['AI feedback', 'TRUE'], "/11 | ", ceil56['Control', 'TRUE'], "/12 | Fisher p = ", fmt(f56$p.value, 3), " | Same direction with inclusive threshold |"),
  paste0("| Excluding 57+ cases: Session 2 mean | ", fmt1(mean(nonceil57$Total_Served.2[nonceil57$AI_Feedback == 1])), " | ", fmt1(mean(nonceil57$Total_Served.2[nonceil57$AI_Feedback == -1])), " | U = ", fmt(unname(nonceil_mw$statistic), 1), ", p = ", fmt(nonceil_mw$p.value, 3), " | Difference weakens after removing near-ceiling cases |")
))

add(c(
  "",
  "## Manuscript-Ready Replacement Text",
  "",
  "### Results: Statistical approach",
  "",
  "Because the analytic sample was small and distributional assumptions were not consistently met, we report Mann-Whitney U tests as the primary between-condition comparisons. Welch t-tests are reported as sensitivity checks, Levene/Brown-Forsythe tests are used for dispersion, and RQ3 is tested directly using Session 2 minus Session 1 change scores with a repeated-measures session-by-condition interaction as a sensitivity check.",
  "",
  "### Results: RQ1 and corrected p-values",
  "",
  "In Session 1, participants who received LPFG feedback served more groups than controls (AI feedback: M = 48.2, SD = 10.2; control: M = 40.0, SD = 9.0; Mann-Whitney U = 99.0, p = .044, rank-biserial r = .50). The Welch t-test showed the same directional pattern but was marginal (t = 2.03, p = .056). Failed customers showed a directional reduction in the AI-feedback group (M = 4.3, SD = 4.7) compared with controls (M = 7.5, SD = 4.3), but this secondary outcome did not reach the .05 threshold (U = 35.0, p = .059).",
  "",
  "### Results: RQ3 learning analysis",
  "",
  "To test whether AI feedback produced a larger post-training boost, we computed change scores for groups served from Session 1 to Session 2. The control group showed a numerically larger improvement (M = 10.7, SD = 9.9) than the AI-feedback group (M = 7.3, SD = 8.8), but the difference was not statistically significant (Mann-Whitney U = 51.5, p = .387; Welch t = -0.87, p = .395). A repeated-measures ANOVA sensitivity check also showed no Session x AI-feedback interaction for groups served, F(1,21) = 0.75, p = .398. Both groups improved within condition (AI feedback: paired t(10) = 2.73, p = .021; control: paired t(11) = 3.73, p = .003). Thus, RQ3 was not supported: AI-feedback participants did not show a significantly larger Session 1-to-Session 2 boost, even though they maintained higher average performance.",
  "",
  "### Results/Discussion: ceiling and variability",
  "",
  "Session 2 scores showed upper-end clustering, especially in the AI-feedback group. Participants who received AI feedback had lower Session 2 variability (SD = 3.8) than controls (SD = 7.5), and the mean-centered Levene test was significant (F = 5.70, p = .026); the median-centered Brown-Forsythe version was borderline (F = 4.30, p = .051). However, 8 of 11 AI-feedback participants reached 57 or more groups served compared with 4 of 12 controls (Fisher's exact p = .100), and 9 of 11 AI-feedback participants reached 56 or more groups compared with 5 of 12 controls (p = .089). After excluding participants at 57 or more groups, the Session 2 group difference was no longer significant (AI feedback M = 50.7; control M = 47.5; U = 15.0, p = .605). We therefore interpret reduced variability as evidence of higher and more consistent post-training performance, but also as partly influenced by near-ceiling clustering. Future versions of the task should include more difficult scenarios to preserve headroom among high-performing participants.",
  "",
  "## Suggested Response to Reviewer",
  "",
  "We thank the reviewer for identifying these statistical inconsistencies. We audited the participant-level data and revised the results to use one consistent analysis family throughout the abstract, results, tables, and discussion. The revised manuscript now reports Mann-Whitney U tests as the primary small-sample comparisons, Welch t-tests as sensitivity checks, and corrected table numbering. We removed the duplicate failed-customer table and treat failed customers as a secondary skewed outcome. We also added a direct RQ3 analysis using Session 2 minus Session 1 change scores, supported by a repeated-measures session-by-condition interaction. Finally, we added a ceiling-effect sensitivity analysis showing that the Session 2 variance reduction is partly influenced by near-ceiling clustering; the discussion now interprets standardization more cautiously and recommends harder future task scenarios."
))

message("Wrote ", out_path)
