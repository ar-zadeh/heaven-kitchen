# Run from the repository root:
#   Rscript analysis/replicate_original_art_analysis.R [path/to/Participants.csv]
# Without an argument the synthetic dataset is used (code validation only).
# Writes analysis/output/original_art_analysis_validation.md.
options(stringsAsFactors = FALSE)

suppressPackageStartupMessages({
  library(ARTool)
  library(car)
})

args <- commandArgs(trailingOnly = TRUE)
data_path <- if (length(args) >= 1) args[1] else
  Sys.getenv("HK_DATA", file.path("data", "synthetic", "Participants_SYNTHETIC.csv"))
if (!file.exists(data_path)) stop("Data file not found: ", data_path, " (run from the repository root)")
if (grepl("SYNTHETIC", data_path)) message("NOTE: synthetic data - output validates the code only; it does not reproduce the paper.")
dir.create(file.path("analysis", "output"), recursive = TRUE, showWarnings = FALSE)
out_path <- file.path("analysis", "output", "original_art_analysis_validation.md")

fmt <- function(x, digits = 3) {
  if (is.na(x)) return("NA")
  sub("^(-?)0\\.", "\\1.", formatC(x, format = "f", digits = digits))
}

fmt1 <- function(x) formatC(x, format = "f", digits = 1)

add <- function(lines = "") {
  cat(paste(lines, collapse = "\n"), "\n", file = out_path, append = TRUE)
}

mode_value <- function(x) {
  tab <- sort(table(x), decreasing = TRUE)
  as.numeric(names(tab)[1])
}

mode_n <- function(x) max(table(x))

run_art <- function(d, metric) {
  formula <- as.formula(paste(metric, "~ Gender * AI_Feedback"))
  anova(art(formula, data = d))
}

as_art_rows <- function(tab) {
  data.frame(
    Term = row.names(tab),
    Df = tab$Df,
    Df_res = tab$Df.res,
    F = tab$`F value`,
    p = tab$`Pr(>F)`,
    row.names = NULL
  )
}

df <- read.csv(data_path, check.names = FALSE)
names(df) <- gsub(" ", "_", names(df))
names(df) <- gsub("-", "_", names(df))

df$Participant_ID <- factor(df$Participant_ID)
df$Session <- factor(df$Session)
df$AI_Feedback <- factor(df$AI_Feedback, levels = c(-1, 1), labels = c("Control", "AI feedback"))
df$Gender <- factor(df$Gender, levels = c(-1, 1), labels = c("Female", "Male"))

if (file.exists(out_path)) invisible(file.remove(out_path))

add(c(
  "# Original ART Analysis Validation",
  "",
  paste0("Data source: `", data_path, "`"),
  paste0("Analytic sample: ", length(unique(df$Participant_ID)), " participants, ", nrow(df), " session-level rows."),
  "",
  "Purpose: reproduce the original manuscript analysis family in R, validate reported values, and identify the minimal manuscript corrections needed.",
  "",
  "Primary analysis: ART ANOVA using `ARTool::art(outcome ~ Gender * AI_Feedback)` separately for Session 1 and Session 2.",
  "Added reviewer-requested checks: Session-by-condition learning analysis, change scores, and Session 2 ceiling/dispersion sensitivity.",
  ""
))

add(c(
  "## Descriptives",
  "",
  "| Session | Outcome | Group | n | Mean | SD | Median | Mode | Mode n |",
  "|---:|---|---|---:|---:|---:|---:|---:|---:|"
))

for (session_id in levels(df$Session)) {
  d <- subset(df, Session == session_id)
  for (metric in c("Total_Served", "Total_Failed")) {
    for (group in levels(d$AI_Feedback)) {
      x <- d[d$AI_Feedback == group, metric]
      add(paste0(
        "| ", session_id,
        " | ", gsub("_", " ", metric),
        " | ", group,
        " | ", length(x),
        " | ", fmt1(mean(x)),
        " | ", fmt1(sd(x)),
        " | ", fmt1(median(x)),
        " | ", fmt1(mode_value(x)),
        " | ", mode_n(x),
        " |"
      ))
    }
  }
}

add(c(
  "",
  "## ART ANOVA Replication",
  "",
  "| Session | Outcome | Term | F | p | Manuscript action |",
  "|---:|---|---|---:|---:|---|"
))

art_results <- list()
for (session_id in levels(df$Session)) {
  d <- subset(df, Session == session_id)
  for (metric in c("Total_Served", "Total_Failed")) {
    tab <- as_art_rows(run_art(d, metric))
    art_results[[paste(session_id, metric, sep = "_")]] <- tab
    for (i in seq_len(nrow(tab))) {
      action <- "Report if discussed"
      if (session_id == "1" && metric == "Total_Served" && tab$Term[i] == "AI_Feedback") {
        action <- "Replace old Session 1 groups-served p/F"
      }
      if (session_id == "1" && metric == "Total_Failed" && tab$Term[i] == "AI_Feedback") {
        action <- "Replace duplicate failed-customer table/value"
      }
      if (session_id == "2" && metric == "Total_Served" && tab$Term[i] == "AI_Feedback") {
        action <- "Replace old Session 2 groups-served p/F"
      }
      add(paste0(
        "| ", session_id,
        " | ", gsub("_", " ", metric),
        " | ", tab$Term[i],
        " | ", fmt(tab$F[i], 2),
        " | ", fmt(tab$p[i], 3),
        " | ", action,
        " |"
      ))
    }
  }
}

add(c(
  "",
  "## Dispersion and Ceiling Checks",
  "",
  "| Check | AI feedback | Control | Statistic | p |",
  "|---|---:|---:|---:|---:|"
))

s2 <- subset(df, Session == "2")
lev_mean <- car::leveneTest(Total_Served ~ AI_Feedback, data = s2, center = mean)
lev_median <- car::leveneTest(Total_Served ~ AI_Feedback, data = s2, center = median)
add(c(
  paste0("| Session 2 SD | ", fmt1(sd(s2$Total_Served[s2$AI_Feedback == "AI feedback"])), " | ", fmt1(sd(s2$Total_Served[s2$AI_Feedback == "Control"])), " | - | - |"),
  paste0("| Mean-centered Levene | - | - | F = ", fmt(lev_mean[1, "F value"], 2), " | ", fmt(lev_mean[1, "Pr(>F)"], 3), " |"),
  paste0("| Brown-Forsythe/median-centered | - | - | F = ", fmt(lev_median[1, "F value"], 2), " | ", fmt(lev_median[1, "Pr(>F)"], 3), " |")
))

wide <- reshape(df, idvar = "Participant_ID", timevar = "Session", direction = "wide")
wide$AI_Feedback <- wide$AI_Feedback.1
wide$Gender <- wide$Gender.1
wide$Change_Served <- wide$Total_Served.2 - wide$Total_Served.1
wide$Change_Failed <- wide$Total_Failed.2 - wide$Total_Failed.1

ceil57 <- table(wide$AI_Feedback, wide$Total_Served.2 >= 57)
ceil56 <- table(wide$AI_Feedback, wide$Total_Served.2 >= 56)
f57 <- fisher.test(ceil57)
f56 <- fisher.test(ceil56)
nonceil57 <- subset(wide, Total_Served.2 < 57)
nonceil_w <- wilcox.test(
  nonceil57$Total_Served.2[nonceil57$AI_Feedback == "AI feedback"],
  nonceil57$Total_Served.2[nonceil57$AI_Feedback == "Control"],
  exact = FALSE,
  correct = TRUE
)
add(c(
  paste0("| Reached 57+ groups | ", ceil57["AI feedback", "TRUE"], "/11 | ", ceil57["Control", "TRUE"], "/12 | Fisher exact | ", fmt(f57$p.value, 3), " |"),
  paste0("| Reached 56+ groups | ", ceil56["AI feedback", "TRUE"], "/11 | ", ceil56["Control", "TRUE"], "/12 | Fisher exact | ", fmt(f56$p.value, 3), " |"),
  paste0("| Excluding 57+ cases mean | ", fmt1(mean(nonceil57$Total_Served.2[nonceil57$AI_Feedback == "AI feedback"])), " | ", fmt1(mean(nonceil57$Total_Served.2[nonceil57$AI_Feedback == "Control"])), " | U = ", fmt(unname(nonceil_w$statistic), 1), " | ", fmt(nonceil_w$p.value, 3), " |")
))

add(c(
  "",
  "## RQ3 Learning Analysis",
  "",
  "| Analysis | Statistic | p | Interpretation |",
  "|---|---:|---:|---|"
))

art_mixed <- anova(art(Total_Served ~ AI_Feedback * Session + (1 | Participant_ID), data = df))
aov_rm <- summary(aov(Total_Served ~ AI_Feedback * Session + Error(Participant_ID / Session), data = df))
session_ai_art <- art_mixed["AI_Feedback:Session", ]
session_ai_aov <- aov_rm[[2]][[1]]["AI_Feedback:Session", ]
change_art <- anova(art(Change_Served ~ Gender * AI_Feedback, data = wide))
change_ai_art <- change_art["AI_Feedback", ]

add(c(
  paste0("| ART mixed Session x AI feedback | F = ", fmt(session_ai_art$F, 2), " | ", fmt(session_ai_art$`Pr(>F)`, 3), " | No significant larger post-training boost |"),
  paste0("| ART change score AI feedback effect | F = ", fmt(change_ai_art$`F value`, 2), " | ", fmt(change_ai_art$`Pr(>F)`, 3), " | No significant condition difference in change scores |"),
  paste0("| Repeated-measures ANOVA sensitivity Session x AI feedback | F = ", fmt(session_ai_aov$`F value`, 2), " | ", fmt(session_ai_aov$`Pr(>F)`, 3), " | Same conclusion |")
))

add(c(
  "",
  "| Group | Mean change in groups served | SD | Median |",
  "|---|---:|---:|---:|"
))
for (group in levels(wide$AI_Feedback)) {
  x <- wide$Change_Served[wide$AI_Feedback == group]
  add(paste0(
    "| ", group,
    " | ", fmt1(mean(x)),
    " | ", fmt1(sd(x)),
    " | ", fmt1(median(x)),
    " |"
  ))
}

add(c(
  "",
  "## Manuscript Corrections Identified",
  "",
  "- Session 1 groups served descriptives should be Control M = 40.0, SD = 9.0; AI feedback M = 48.2, SD = 10.2.",
  "- Session 1 groups served ART AI-feedback effect should be F(1,19) = 5.37, p = .032.",
  "- Session 1 failed customers descriptives should be Control M = 7.5, SD = 4.3; AI feedback M = 4.3, SD = 4.7.",
  "- Session 1 failed customers ART AI-feedback effect should be F(1,19) = 6.83, p = .017; replace the duplicate table.",
  "- Session 2 groups served descriptives should be Control M = 50.7, SD = 7.5; AI feedback M = 55.5, SD = 3.8.",
  "- Session 2 groups served ART AI-feedback effect should be F(1,19) = 8.07, p = .010.",
  "- Session 2 dispersion should be Levene F(1,21) = 5.70, p = .026; Brown-Forsythe F(1,21) = 4.30, p = .051.",
  "- RQ3 needs a formal null result: ART mixed Session x AI-feedback interaction F(1,21) = 2.40, p = .136; repeated-measures ANOVA sensitivity F(1,21) = 0.75, p = .398.",
  "- Ceiling-effect caveat: 8/11 AI-feedback participants and 4/12 controls reached 57+ groups; Fisher p = .100. Excluding 57+ cases weakens the Session 2 difference, U = 15.0, p = .605.",
  ""
))

message("Wrote ", out_path)
