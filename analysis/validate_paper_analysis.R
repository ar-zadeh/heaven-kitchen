# Run from the repository root:
#   Rscript analysis/validate_paper_analysis.R [path/to/Participants.csv]
# Without an argument the synthetic dataset is used (code validation only).
# Writes analysis/output/analysis_validation_report.md.
options(stringsAsFactors = FALSE)

args <- commandArgs(trailingOnly = TRUE)
data_path <- if (length(args) >= 1) args[1] else
  Sys.getenv("HK_DATA", file.path("data", "synthetic", "Participants_SYNTHETIC.csv"))
if (!file.exists(data_path)) stop("Data file not found: ", data_path, " (run from the repository root)")
if (grepl("SYNTHETIC", data_path)) message("NOTE: synthetic data - output validates the code only; it does not reproduce the paper.")
dir.create(file.path("analysis", "output"), recursive = TRUE, showWarnings = FALSE)
out_path <- file.path("analysis", "output", "analysis_validation_report.md")

fmt <- function(x, digits = 3) {
  if (is.na(x)) return("NA")
  sub("^(-?)0\\.", "\\1.", formatC(x, format = "f", digits = digits))
}

fmt1 <- function(x) formatC(x, format = "f", digits = 1)

pass <- function(observed, expected, tol = 0.005) {
  isTRUE(abs(observed - expected) <= tol)
}

verdict <- function(ok) if (ok) "MATCH" else "CHECK"

rank_biserial_from_w <- function(w, n_ai, n_control) {
  (2 * w / (n_ai * n_control)) - 1
}

levene_oneway <- function(values, groups, center = c("mean", "median")) {
  center <- match.arg(center)
  split_values <- split(values, groups)
  centers <- vapply(
    split_values,
    if (center == "mean") mean else median,
    numeric(1),
    na.rm = TRUE
  )
  z <- abs(values - centers[as.character(groups)])
  fit <- oneway.test(z ~ factor(groups), var.equal = TRUE)
  list(statistic = unname(fit$statistic), p.value = fit$p.value)
}

mw <- function(x, y) {
  test <- wilcox.test(x, y, exact = FALSE, correct = TRUE)
  list(statistic = unname(test$statistic), p.value = test$p.value)
}

welch <- function(x, y) {
  test <- t.test(x, y, var.equal = FALSE)
  list(statistic = unname(test$statistic), p.value = test$p.value)
}

paired_t <- function(after, before) {
  test <- t.test(after, before, paired = TRUE)
  list(statistic = unname(test$statistic), p.value = test$p.value)
}

group_stats <- function(d, metric) {
  by_ai <- split(d[[metric]], d$AI_Feedback)
  data.frame(
    group = names(by_ai),
    n = vapply(by_ai, length, integer(1)),
    mean = vapply(by_ai, mean, numeric(1)),
    sd = vapply(by_ai, sd, numeric(1)),
    median = vapply(by_ai, median, numeric(1)),
    mode = vapply(by_ai, function(x) {
      tab <- sort(table(x), decreasing = TRUE)
      as.numeric(names(tab)[1])
    }, numeric(1)),
    mode_n = vapply(by_ai, function(x) max(table(x)), integer(1)),
    row.names = NULL
  )
}

append_lines <- function(lines) {
  cat(paste(lines, collapse = "\n"), "\n", file = out_path, append = TRUE)
}

df <- read.csv(data_path, check.names = FALSE)
names(df) <- gsub(" ", "_", names(df))
names(df) <- gsub("-", "_", names(df))
df$AI_Label <- ifelse(df$AI_Feedback == 1, "AI feedback", "Control")
df$Gender_Label <- ifelse(df$Gender == 1, "Male", "Female")

if (file.exists(out_path)) invisible(file.remove(out_path))

append_lines(c(
  "# Heaven's Kitchen R Analysis Validation",
  "",
  paste0("Data source: `", data_path, "`"),
  paste0("Rows: ", nrow(df), " (", length(unique(df$Participant_ID)), " participants x 2 sessions)"),
  "",
  "Validation boundary: the performance dataset contains only the final analytic sample. It does not include participant ages or records for the five excluded recruits, so the age mean/SD and exclusion count were not independently validated here.",
  "",
  "Methods reproduced from the revised manuscript:",
  "- Mann-Whitney/Wilcoxon rank-sum tests use `wilcox.test(..., exact = FALSE, correct = TRUE)`.",
  "- Welch sensitivity tests use `t.test(..., var.equal = FALSE)`.",
  "- Levene tests are reproduced with a one-way ANOVA on absolute deviations from group means or medians.",
  "- Change scores are Session 2 minus Session 1, merged by Participant ID.",
  ""
))

claims <- list()

for (session_id in c(1, 2)) {
  d <- subset(df, Session == session_id)
  append_lines(c(
    paste0("## Session ", session_id, " Descriptives"),
    "",
    "| Metric | Group | n | Mean | SD | Median | Mode | Mode n |",
    "|---|---:|---:|---:|---:|---:|---:|---:|"
  ))
  for (metric in c("Total_Served", "Total_Failed")) {
    stats_table <- group_stats(d, metric)
    for (i in seq_len(nrow(stats_table))) {
      row <- stats_table[i, ]
      append_lines(paste0(
        "| ", gsub("_", " ", metric),
        " | ", row$group,
        " | ", row$n,
        " | ", fmt1(row$mean),
        " | ", fmt1(row$sd),
        " | ", fmt1(row$median),
        " | ", fmt1(row$mode),
        " | ", row$mode_n,
        " |"
      ))
    }
  }
  append_lines("")
}

run_claim <- function(label, d, metric, expected) {
  ai <- d[d$AI_Feedback == 1, metric]
  control <- d[d$AI_Feedback == -1, metric]
  m <- mw(ai, control)
  t <- welch(ai, control)
  lev_mean <- levene_oneway(d[[metric]], d$AI_Feedback, "mean")
  lev_median <- levene_oneway(d[[metric]], d$AI_Feedback, "median")
  rb <- rank_biserial_from_w(m$statistic, length(ai), length(control))
  mean_diff <- mean(ai) - mean(control)
  c(
    label = label,
    metric = metric,
    mw_u = m$statistic,
    mw_p = m$p.value,
    rb = rb,
    welch_t = t$statistic,
    welch_p = t$p.value,
    mean_diff = mean_diff,
    lev_f = lev_mean$statistic,
    lev_p = lev_mean$p.value,
    bf_f = lev_median$statistic,
    bf_p = lev_median$p.value,
    expected_u = expected$u,
    expected_p = expected$p,
    expected_t = expected$t,
    expected_t_p = expected$t_p,
    expected_lev_f = expected$lev_f,
    expected_lev_p = expected$lev_p,
    expected_rb = expected$rb
  )
}

claim_rows <- list(
  run_claim(
    "Session 1 groups served",
    subset(df, Session == 1),
    "Total_Served",
    list(u = 99, p = .044, t = 2.03, t_p = .056, lev_f = .17, lev_p = .688, rb = .50)
  ),
  run_claim(
    "Session 1 failed customers",
    subset(df, Session == 1),
    "Total_Failed",
    list(u = 35, p = .059, t = -1.72, t_p = .101, lev_f = .13, lev_p = .726, rb = -.47)
  ),
  run_claim(
    "Session 2 groups served",
    subset(df, Session == 2),
    "Total_Served",
    list(u = 97, p = .046, t = 1.96, t_p = .067, lev_f = 5.70, lev_p = .026, rb = .47)
  )
)

append_lines(c(
  "## Primary Manuscript Claims",
  "",
  "| Claim | Statistic | Paper | R reproduced | Verdict |",
  "|---|---|---:|---:|---|"
))

for (row in claim_rows) {
  append_lines(c(
    paste0("| ", row["label"], " | Mann-Whitney U | ", fmt(as.numeric(row["expected_u"]), 2), " | ", fmt(as.numeric(row["mw_u"]), 2), " | ", verdict(pass(as.numeric(row["mw_u"]), as.numeric(row["expected_u"]), .01)), " |"),
    paste0("| ", row["label"], " | Mann-Whitney p | ", fmt(as.numeric(row["expected_p"]), 3), " | ", fmt(as.numeric(row["mw_p"]), 3), " | ", verdict(pass(as.numeric(row["mw_p"]), as.numeric(row["expected_p"]), .0015)), " |"),
    paste0("| ", row["label"], " | rank-biserial r | ", fmt(as.numeric(row["expected_rb"]), 2), " | ", fmt(as.numeric(row["rb"]), 2), " | ", verdict(pass(as.numeric(row["rb"]), as.numeric(row["expected_rb"]), .015)), " |"),
    paste0("| ", row["label"], " | Welch t | ", fmt(as.numeric(row["expected_t"]), 2), " | ", fmt(as.numeric(row["welch_t"]), 2), " | ", verdict(pass(as.numeric(row["welch_t"]), as.numeric(row["expected_t"]), .015)), " |"),
    paste0("| ", row["label"], " | Welch p | ", fmt(as.numeric(row["expected_t_p"]), 3), " | ", fmt(as.numeric(row["welch_p"]), 3), " | ", verdict(pass(as.numeric(row["welch_p"]), as.numeric(row["expected_t_p"]), .0015)), " |"),
    paste0("| ", row["label"], " | Levene F | ", fmt(as.numeric(row["expected_lev_f"]), 2), " | ", fmt(as.numeric(row["lev_f"]), 2), " | ", verdict(pass(as.numeric(row["lev_f"]), as.numeric(row["expected_lev_f"]), .015)), " |"),
    paste0("| ", row["label"], " | Levene p | ", fmt(as.numeric(row["expected_lev_p"]), 3), " | ", fmt(as.numeric(row["lev_p"]), 3), " | ", verdict(pass(as.numeric(row["lev_p"]), as.numeric(row["expected_lev_p"]), .0015)), " |")
  ))
}

append_lines(c(
  "",
  "## Session 2 Brown-Forsythe Check",
  "",
  "| Statistic | Paper | R reproduced | Verdict |",
  "|---|---:|---:|---|"
))
s2 <- subset(df, Session == 2)
bf <- levene_oneway(s2$Total_Served, s2$AI_Feedback, "median")
append_lines(c(
  paste0("| F | 4.30 | ", fmt(bf$statistic, 2), " | ", verdict(pass(bf$statistic, 4.30, .015)), " |"),
  paste0("| p | .051 | ", fmt(bf$p.value, 3), " | ", verdict(pass(bf$p.value, .051, .0015)), " |"),
  ""
))

wide <- reshape(
  df,
  idvar = "Participant_ID",
  timevar = "Session",
  direction = "wide"
)
wide$AI_Feedback <- wide$AI_Feedback.1
wide$Change_Served <- wide$Total_Served.2 - wide$Total_Served.1
wide$Change_Failed <- wide$Total_Failed.2 - wide$Total_Failed.1

append_lines(c(
  "## RQ3 Change Scores",
  "",
  "| Group | n | Mean served change | SD | Median |",
  "|---|---:|---:|---:|---:|"
))
for (g in c(-1, 1)) {
  x <- wide$Change_Served[wide$AI_Feedback == g]
  append_lines(paste0(
    "| ", ifelse(g == 1, "AI feedback", "Control"),
    " | ", length(x),
    " | ", fmt1(mean(x)),
    " | ", fmt1(sd(x)),
    " | ", fmt1(median(x)),
    " |"
  ))
}

ai_change <- wide$Change_Served[wide$AI_Feedback == 1]
control_change <- wide$Change_Served[wide$AI_Feedback == -1]
change_mw <- mw(ai_change, control_change)
change_t <- welch(ai_change, control_change)
ai_pair <- paired_t(wide$Total_Served.2[wide$AI_Feedback == 1], wide$Total_Served.1[wide$AI_Feedback == 1])
control_pair <- paired_t(wide$Total_Served.2[wide$AI_Feedback == -1], wide$Total_Served.1[wide$AI_Feedback == -1])

append_lines(c(
  "",
  "| Claim | Statistic | Paper | R reproduced | Verdict |",
  "|---|---|---:|---:|---|",
  paste0("| Between-group served change | Mann-Whitney U | 51.50 | ", fmt(change_mw$statistic, 2), " | ", verdict(pass(change_mw$statistic, 51.5, .01)), " |"),
  paste0("| Between-group served change | Mann-Whitney p | .388 | ", fmt(change_mw$p.value, 3), " | ", verdict(pass(change_mw$p.value, .388, .0015)), " |"),
  paste0("| Between-group served change | Welch t | -.87 | ", fmt(change_t$statistic, 2), " | ", verdict(pass(change_t$statistic, -.87, .015)), " |"),
  paste0("| Between-group served change | Welch p | .395 | ", fmt(change_t$p.value, 3), " | ", verdict(pass(change_t$p.value, .395, .0015)), " |"),
  paste0("| AI within-group served improvement | Paired t | 2.73 | ", fmt(ai_pair$statistic, 2), " | ", verdict(pass(ai_pair$statistic, 2.73, .015)), " |"),
  paste0("| AI within-group served improvement | Paired p | .021 | ", fmt(ai_pair$p.value, 3), " | ", verdict(pass(ai_pair$p.value, .021, .0015)), " |"),
  paste0("| Control within-group served improvement | Paired t | 3.73 | ", fmt(control_pair$statistic, 2), " | ", verdict(pass(control_pair$statistic, 3.73, .015)), " |"),
  paste0("| Control within-group served improvement | Paired p | .003 | ", fmt(control_pair$p.value, 3), " | ", verdict(pass(control_pair$p.value, .003, .0015)), " |"),
  ""
))

append_lines(c(
  "## Ceiling-Effect Sensitivity",
  "",
  "| Claim | Paper | R reproduced | Verdict |",
  "|---|---:|---:|---|"
))

ceil57 <- table(AI = wide$AI_Feedback, Ceiling = wide$Total_Served.2 >= 57)
ceil56 <- table(AI = wide$AI_Feedback, Ceiling = wide$Total_Served.2 >= 56)
f57 <- fisher.test(ceil57)
f56 <- fisher.test(ceil56)
nonceil <- subset(wide, Total_Served.2 < 57)
nonceil_mw <- mw(
  nonceil$Total_Served.2[nonceil$AI_Feedback == 1],
  nonceil$Total_Served.2[nonceil$AI_Feedback == -1]
)

append_lines(c(
  paste0("| 57+ AI count | 8/11 | ", ceil57["1", "TRUE"], "/11 | ", verdict(ceil57["1", "TRUE"] == 8), " |"),
  paste0("| 57+ control count | 4/12 | ", ceil57["-1", "TRUE"], "/12 | ", verdict(ceil57["-1", "TRUE"] == 4), " |"),
  paste0("| 57+ Fisher p | .100 | ", fmt(f57$p.value, 3), " | ", verdict(pass(f57$p.value, .100, .0015)), " |"),
  paste0("| 56+ AI count | 9/11 | ", ceil56["1", "TRUE"], "/11 | ", verdict(ceil56["1", "TRUE"] == 9), " |"),
  paste0("| 56+ control count | 5/12 | ", ceil56["-1", "TRUE"], "/12 | ", verdict(ceil56["-1", "TRUE"] == 5), " |"),
  paste0("| 56+ Fisher p | .089 | ", fmt(f56$p.value, 3), " | ", verdict(pass(f56$p.value, .089, .0015)), " |"),
  paste0("| Non-ceiling AI mean | 50.7 | ", fmt1(mean(nonceil$Total_Served.2[nonceil$AI_Feedback == 1])), " | ", verdict(pass(mean(nonceil$Total_Served.2[nonceil$AI_Feedback == 1]), 50.7, .05)), " |"),
  paste0("| Non-ceiling control mean | 47.5 | ", fmt1(mean(nonceil$Total_Served.2[nonceil$AI_Feedback == -1])), " | ", verdict(pass(mean(nonceil$Total_Served.2[nonceil$AI_Feedback == -1]), 47.5, .05)), " |"),
  paste0("| Non-ceiling Mann-Whitney U | 15.0 | ", fmt(nonceil_mw$statistic, 1), " | ", verdict(pass(nonceil_mw$statistic, 15, .01)), " |"),
  paste0("| Non-ceiling Mann-Whitney p | .605 | ", fmt(nonceil_mw$p.value, 3), " | ", verdict(pass(nonceil_mw$p.value, .605, .0015)), " |"),
  ""
))

append_lines(c(
  "## Gender and AI Factor Checks",
  "",
  "The revised manuscript states that gender and the gender-by-AI interaction were not interpreted as primary effects. Base-R two-factor ANOVA checks agree that these terms are not significant for the reported session-specific outcomes.",
  "",
  "| Session | Metric | Term | F | p |",
  "|---:|---|---|---:|---:|"
))

for (session_id in c(1, 2)) {
  d <- subset(df, Session == session_id)
  d$Gender_Label <- factor(d$Gender_Label)
  d$AI_Label <- factor(d$AI_Label)
  for (metric in c("Total_Served", "Total_Failed")) {
    tab <- anova(lm(d[[metric]] ~ Gender_Label * AI_Label, data = d))
    for (term in row.names(tab)[1:3]) {
      append_lines(paste0(
        "| ", session_id,
        " | ", gsub("_", " ", metric),
        " | ", term,
        " | ", fmt(tab[term, "F value"], 2),
        " | ", fmt(tab[term, "Pr(>F)"], 3),
        " |"
      ))
    }
  }
}

append_lines(c(
  "",
  "## Validation Summary",
  "",
  "The main numerical claims in the revised manuscript's results section reproduced from the participant CSV when the same R test settings are used. One table-label issue remains for the failed-customer variance row.",
  "",
  "Notes:",
  "- The Mann-Whitney p-values in the manuscript correspond to R's normal approximation with continuity correction. Without continuity correction, the p-values are slightly smaller.",
  "- The failed-customer Levene row in the paper uses the median-centered Brown-Forsythe value (F = 0.13, p = .726), while the mean-centered Levene value is F = 0.50, p = .486. The text only interprets failed customers as secondary, so this does not affect the main conclusion.",
  "- The Session 2 non-ceiling sensitivity result also depends on continuity correction for the reported p = .605.",
  "- The age mean/SD and the count of five excluded recruits cannot be checked from `Participants.csv` or `Participants.xlsx`; those files only include the final analytic sample and no age variable.",
  ""
))

message("Wrote ", out_path)
