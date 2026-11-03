# Generates data/synthetic/Participants_SYNTHETIC.csv
#
# A synthetic dataset with the same columns and design as the analysed dataset
# (23 participants x 2 sessions; 11 LPFG and 12 control participants; 6 male and
# 5 female LPFG participants, 6 male and 6 female controls). Scores are random
# draws around the group means and SDs reported in the paper; no participant's
# data are used. Results computed from this file validate the code only.
#
# Run from the repository root:  Rscript analysis/make_synthetic_data.R

set.seed(20261103)
clamp <- function(x, lo, hi) pmin(hi, pmax(lo, x))

ai     <- c(rep(1, 11), rep(-1, 12))
gender <- c(rep(1, 6), rep(-1, 5), rep(1, 6), rep(-1, 6))
n      <- length(ai)

served1 <- round(clamp(rnorm(n, ifelse(ai == 1, 48.2, 40.0), ifelse(ai == 1, 10.2, 9.0)), 20, 59))
served2 <- round(clamp(rnorm(n, ifelse(ai == 1, 55.5, 50.7), ifelse(ai == 1, 3.8, 7.5)), 30, 59))
failed1 <- rpois(n, ifelse(ai == 1, 4.3, 7.5))
failed2 <- rpois(n, ifelse(ai == 1, 2.2, 4.0))

session_time <- function(served) {
  ifelse(served >= 55, 300, round(clamp(300 * served / 57 + rnorm(length(served), 0, 8), 120, 299)))
}
time1 <- session_time(served1)
time2 <- session_time(served2)
left  <- function(t) ifelse(t == 300, round(runif(length(t), 0, 150)), 0)

one <- function(s, served, failed, t) data.frame(
  `Participant ID` = seq_len(n), Session = s, Gender = gender, `AI-Feedback` = ai,
  `Total Served` = served, `Total Failed` = failed, `Money Left` = left(t),
  `Net Money` = 63 * served, Time = t, check.names = FALSE)

d <- rbind(one(1, served1, failed1, time1), one(2, served2, failed2, time2))
d <- d[order(d$`Participant ID`, d$Session), ]
dir.create(file.path("data", "synthetic"), recursive = TRUE, showWarnings = FALSE)
write.csv(d, file.path("data", "synthetic", "Participants_SYNTHETIC.csv"), row.names = FALSE, quote = FALSE)
cat("Wrote", nrow(d), "rows to data/synthetic/Participants_SYNTHETIC.csv\n")
