# =============================================================================
# reviewer_round3_analysis.R
#
# Computes the ART ANOVAs, the Session 2 dispersion tests, the post hoc
# benchmark comparison and the exclusion sensitivity analysis (Appendix B)
# reported in the AI EDAM manuscript (AIE-2026-0019).
#
# Run from the repository root:
#   Rscript analysis/reviewer_round3_analysis.R [path/to/Participants.csv]
# Without an argument the synthetic dataset is used (code validation only).
# Requires: ARTool, car (R 4.4.2 used for the reported output)
#
# Sections
#   1. Descriptives
#   2. Published ART ANOVA (Session 1 and Session 2)          [unchanged results]
#   3. Session 2 dispersion: Levene / Brown-Forsythe / Fisher [reviewer point 2]
#   4. Post-hoc excluding the 57-group benchmark              [reviewer point 2]
#   5. Dispersion-reduction metrics
#   6. Exclusion sensitivity / bounding + tipping point       [reviewer point 4c]
# =============================================================================

suppressMessages(library(ARTool))

args <- commandArgs(trailingOnly = TRUE)
DATA <- if (length(args) >= 1) args[1] else
  Sys.getenv("HK_DATA", file.path("data", "synthetic", "Participants_SYNTHETIC.csv"))
if (!file.exists(DATA)) stop("Data file not found: ", DATA, " (run from the repository root)")
if (grepl("SYNTHETIC", DATA)) message("NOTE: synthetic data - output validates the code only; it does not reproduce the paper.")
d <- read.csv(DATA)
d$Gender <- factor(d$Gender)          #  1 = male,   -1 = female
d$AI     <- factor(d$AI.Feedback)     #  1 = LPFG,   -1 = control

hdr <- function(x) cat("\n\n========== ", x, " ==========\n")

# ---------------------------------------------------------------- 1. Descriptives
hdr("1. DESCRIPTIVES: Total Served")
for (s in 1:2) {
  x <- subset(d, Session == s)
  for (g in c(1, -1)) {
    v <- x$Total.Served[x$AI.Feedback == g]
    cat(sprintf("Session %d  %-7s n=%2d  M=%5.2f  SD=%5.2f  median=%4.1f  min=%2d  max=%2d\n",
                s, ifelse(g == 1, "LPFG", "control"),
                length(v), mean(v), sd(v), median(v), min(v), max(v)))
  }
}

hdr("1b. DESCRIPTIVES: Failed Groups")
for (s in 1:2) {
  x <- subset(d, Session == s)
  for (g in c(1, -1)) {
    v <- x$Total.Failed[x$AI.Feedback == g]
    cat(sprintf("Session %d  %-7s n=%2d  M=%5.2f  SD=%5.2f  n_zero=%2d\n",
                s, ifelse(g == 1, "LPFG", "control"),
                length(v), mean(v), sd(v), sum(v == 0)))
  }
}

# ------------------------------------------------- 2. Published ART ANOVA (2x2)
# Manuscript Tables 5-7. These are UNCHANGED by the round-3 revision.
hdr("2. PUBLISHED ART ANOVA  (Gender * AI-Feedback)")
for (s in 1:2) {
  x <- subset(d, Session == s)
  cat("\n--- Session", s, ": Total Served ---\n")
  print(anova(art(Total.Served ~ Gender * AI, data = x)))
}
cat("\n--- Session 1 : Failed Groups ---\n")
print(anova(art(Total.Failed ~ Gender * AI, data = subset(d, Session == 1))))

# -------------------------------------------- 3. Session 2 dispersion (point 2)
hdr("3. SESSION 2 DISPERSION  (reviewer point 2)")
s2 <- subset(d, Session == 2)
ai <- s2$Total.Served[s2$AI.Feedback ==  1]
ct <- s2$Total.Served[s2$AI.Feedback == -1]

# Levene / Brown-Forsythe implemented directly so the script has no `car` dependency.
lev <- function(a, b, center = mean) {
  g <- factor(rep(c("a", "b"), c(length(a), length(b))))
  y <- c(abs(a - center(a)), abs(b - center(b)))
  anova(lm(y ~ g))[1, c("F value", "Pr(>F)")]
}
cat("SD: LPFG =", round(sd(ai), 2), " control =", round(sd(ct), 2), "\n")
cat("Levene (mean-centred)      : F =", round(lev(ai, ct, mean)[[1]], 3),
    " p =", round(lev(ai, ct, mean)[[2]], 4), "\n")
cat("Brown-Forsythe (median)    : F =", round(lev(ai, ct, median)[[1]], 3),
    " p =", round(lev(ai, ct, median)[[2]], 4), "\n")

tbl <- matrix(c(sum(ai >= 57), sum(ai < 57), sum(ct >= 57), sum(ct < 57)), nrow = 2)
cat("\nBenchmark attainment (>= 57 groups served):\n")
cat("  LPFG    :", sum(ai >= 57), "/", length(ai), "\n")
cat("  control :", sum(ct >= 57), "/", length(ct), "\n")
cat("  Fisher exact p =", round(fisher.test(tbl)$p.value, 4),
    " OR =", round(fisher.test(tbl)$estimate, 3), "\n")

# ------------------------------- 4. Post-hoc excluding the benchmark (point 2)
# The reviewer asked for sample sizes, test statistic, effect size, exact p.
hdr("4. POST-HOC EXCLUDING PARTICIPANTS AT/ABOVE THE 57-GROUP BENCHMARK")
a2 <- ai[ai < 57]; c2 <- ct[ct < 57]
cat(sprintf("LPFG    n=%d  M=%.2f  SD=%.2f   values: %s\n",
            length(a2), mean(a2), sd(a2), paste(sort(a2), collapse = ", ")))
cat(sprintf("control n=%d  M=%.2f  SD=%.2f   values: %s\n",
            length(c2), mean(c2), sd(c2), paste(sort(c2), collapse = ", ")))
w <- suppressWarnings(wilcox.test(a2, c2, exact = FALSE))
U <- unname(w$statistic)

# wilcox.test() cannot give an exact p here because of ties, so enumerate all
# choose(11, 3) = 165 rank-sum permutations directly. This is the exact p-value
# the reviewer asked for.
allv <- c(a2, c2); n1 <- length(a2); rk <- rank(allv)
perm <- apply(combn(length(allv), n1), 2, function(i) sum(rk[i]))
obs  <- sum(rk[seq_len(n1)])
p_exact <- mean(abs(perm - mean(perm)) >= abs(obs - mean(perm)))

cat(sprintf("\nMann-Whitney U = %.1f\n", U))
cat(sprintf("EXACT two-sided permutation p = %.4f   (all %d permutations enumerated)\n",
            p_exact, length(perm)))
cat(sprintf("asymptotic (tie-corrected) p  = %.4f\n", w$p.value))
cat(sprintf("rank-biserial r = %.3f   (2U/(n1*n2) - 1)\n",
            2 * U / (length(a2) * length(c2)) - 1))
cat(sprintf("Levene (mean)   : F = %.3f  p = %.4f\n",
            lev(a2, c2, mean)[[1]],   lev(a2, c2, mean)[[2]]))
cat(sprintf("Brown-Forsythe  : F = %.3f  p = %.4f\n",
            lev(a2, c2, median)[[1]], lev(a2, c2, median)[[2]]))
cat("\nNOTE: n = 3 vs 8. Both the location and the dispersion difference vanish,\n")
cat("but the comparison is uninformative in either direction at this sample size.\n")

# ---------------------------- 5. Dispersion-reduction metrics
hdr("5. SESSION 2 DISPERSION REDUCTION, LPFG vs CONTROL")
iqr <- function(x) diff(quantile(x, c(.25, .75)))
for (m in c("sd", "var", "iqr", "range", "cv")) {
  f <- switch(m, sd = sd, var = var, iqr = iqr,
              range = function(x) diff(range(x)),
              cv = function(x) sd(x) / mean(x))
  cat(sprintf("  %-6s LPFG = %6.2f   control = %6.2f   reduction = %5.1f%%\n",
              m, f(ai), f(ct), 100 * (1 - f(ai) / f(ct))))
}

# -------------------------- 6. Exclusion sensitivity / bounding  (point 4c)
# 5 participants were excluded and replaced: 3 LPFG, 2 control. No data survives
# for them, so a true ITT analysis is impossible. These bounds substitute for it.
# Condition-only model (gender dropped: never significant, and the gender x
# condition crosstab of the excluded five is unknown).
hdr("6. EXCLUSION SENSITIVITY / BOUNDING ANALYSIS  (reviewer point 4c)")

art_p <- function(df) {
  df$AI <- factor(df$AI.Feedback)
  a <- anova(art(Total.Served ~ AI, data = df))
  c(F = a[["F value"]][1], p = a[["Pr(>F)"]][1])
}
impute <- function(df, ai_val, ct_val, n_ai = 3, n_ct = 2) {
  rbind(df, data.frame(AI.Feedback = c(rep(1, n_ai), rep(-1, n_ct)),
                       Total.Served = c(rep(ai_val, n_ai), rep(ct_val, n_ct))))
}

for (s in 1:2) {
  b  <- subset(d, Session == s)[, c("AI.Feedback", "Total.Served")]
  A  <- b$Total.Served[b$AI.Feedback ==  1]
  C  <- b$Total.Served[b$AI.Feedback == -1]
  lo <- min(b$Total.Served); hi <- max(b$Total.Served)
  q10 <- unname(quantile(b$Total.Served, .10))

  cat("\n---- SESSION", s, " (observed min =", lo, ", max =", hi, ") ----\n")
  r0 <- art_p(b)
  cat(sprintf("  %-38s n=%2d/%2d  F=%6.3f  p=%.4f\n",
              "published (23 analysed, condition only)",
              length(A), length(C), r0[1], r0[2]))

  scen <- list(
    "10th pctile of own condition" = c(unname(quantile(A, .10)), unname(quantile(C, .10))),
    "own-condition mean"           = c(mean(A), mean(C)),
    "own-condition minimum"        = c(min(A), min(C)),
    "overall 10th pctile, both"    = c(q10, q10),
    "adversarial: LPFG min, ctl max" = c(lo, hi))
  for (n in names(scen)) {
    r <- art_p(impute(b, scen[[n]][1], scen[[n]][2]))
    cat(sprintf("  %-38s LPFG@%5.1f ctl@%5.1f  F=%6.3f  p=%.4f%s\n",
                n, scen[[n]][1], scen[[n]][2], r[1], r[2],
                ifelse(r[2] >= .05, "   <-- n.s.", "")))
  }

  # Tipping point: controls held at their condition mean, sweep the value
  # imputed for the 3 excluded LPFG participants.
  prev <- NA
  for (x in seq(hi, 0, by = -1)) {
    p <- art_p(impute(b, x, mean(C)))[2]
    if (!is.na(prev) && prev < .05 && p >= .05) {
      cat(sprintf("  tipping point: p crosses .05 between X = %d and X = %d\n", x + 1, x))
      break
    }
    prev <- p
  }
}

cat("\n\nNOTE: section 6 is a sensitivity analysis under the stated imputation\n")
cat("assumptions (see Appendix B of the paper); it does not establish robustness to the\n")
cat("exclusions. With synthetic data none of the values above are meaningful.\n")

cat("\n\n===== END =====\n")
