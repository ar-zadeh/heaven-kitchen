# Run from the repository root:
#   Rscript analysis/reproduce_paper_figures.R [path/to/Participants.csv]
# Writes Figures 3-5 (PNG and PDF) to analysis/output/figures/.
options(stringsAsFactors = FALSE)

suppressPackageStartupMessages({
  library(dplyr)
  library(ggplot2)
  library(readr)
  library(tidyr)
})

args <- commandArgs(trailingOnly = TRUE)
data_path <- if (length(args) >= 1) args[1] else
  Sys.getenv("HK_DATA", file.path("data", "synthetic", "Participants_SYNTHETIC.csv"))
if (!file.exists(data_path)) stop("Data file not found: ", data_path, " (run from the repository root)")
if (grepl("SYNTHETIC", data_path)) message("NOTE: synthetic data - output validates the code only; it does not reproduce the paper.")
out_dir <- file.path("analysis", "output", "figures")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

theme_paper <- function(base_size = 12) {
  theme_classic(base_size = base_size) +
    theme(
      axis.title = element_text(color = "black"),
      axis.text = element_text(color = "black"),
      legend.position = "top",
      legend.title = element_blank(),
      plot.title = element_blank(),
      plot.margin = margin(10, 12, 10, 12)
    )
}

save_plot <- function(plot, name, width = 7.2, height = 4.6, dpi = 600) {
  png_path <- file.path(out_dir, paste0(name, ".png"))
  pdf_path <- file.path(out_dir, paste0(name, ".pdf"))
  ggsave(png_path, plot, width = width, height = height, units = "in", dpi = dpi, bg = "white")
  ggsave(pdf_path, plot, width = width, height = height, units = "in", bg = "white")
  invisible(c(png_path, pdf_path))
}

mode_label <- function(x) {
  tab <- sort(table(x), decreasing = TRUE)
  paste0("Mode: ", names(tab)[1], " (n=", as.integer(tab[1]), ")")
}


df <- read_csv(data_path, show_col_types = FALSE) %>%
  rename(
    participant_id = `Participant ID`,
    ai_feedback_raw = `AI-Feedback`,
    total_served = `Total Served`,
    total_failed = `Total Failed`,
    money_left = `Money Left`,
    net_money = `Net Money`
  ) %>%
  mutate(
    participant_id = factor(participant_id),
    session = factor(Session, levels = c(1, 2), labels = c("Session 1", "Session 2")),
    session_num = as.integer(Session),
    gender = factor(Gender, levels = c(-1, 1), labels = c("Female", "Male")),
    ai_feedback = factor(
      ai_feedback_raw,
      levels = c(-1, 1),
      labels = c("No AI Feedback", "With AI Feedback")
    )
  )

summary_table <- df %>%
  group_by(session, ai_feedback) %>%
  summarise(
    n = n(),
    mean_total_served = mean(total_served),
    sd_total_served = sd(total_served),
    median_total_served = median(total_served),
    mean_total_failed = mean(total_failed),
    sd_total_failed = sd(total_failed),
    .groups = "drop"
  )

write_csv(summary_table, file.path(out_dir, "figure_data_summary.csv"))

palette_feedback <- c("No AI Feedback" = "#5BA7A5", "With AI Feedback" = "#E49A55")

boxplot_served <- function(session_number) {
  d <- filter(df, session_num == session_number)
  ggplot(d, aes(x = ai_feedback, y = total_served, fill = ai_feedback)) +
    geom_boxplot(width = 0.55, outlier.shape = 21, outlier.size = 2.4, color = "black", alpha = 0.88) +
    stat_summary(fun = mean, geom = "point", shape = 23, size = 3.1, fill = "white", color = "black") +
    scale_fill_manual(values = palette_feedback) +
    scale_y_continuous(limits = c(20, 62), breaks = seq(20, 60, 10), expand = expansion(mult = c(0.02, 0.05))) +
    labs(x = NULL, y = "Total groups served") +
    theme_paper() +
    theme(legend.position = "none")
}

fig3 <- boxplot_served(1)
save_plot(fig3, "Figure_3_session1_total_served_by_ai_feedback")

fig4 <- boxplot_served(2)
save_plot(fig4, "Figure_4_session2_total_served_by_ai_feedback")

learning_summary <- df %>%
  group_by(ai_feedback, session) %>%
  summarise(
    mean_served = mean(total_served),
    sd_served = sd(total_served),
    .groups = "drop"
  )

fig5 <- ggplot(learning_summary, aes(x = ai_feedback, y = mean_served, fill = session)) +
  geom_col(
    position = position_dodge(width = 0.82),
    width = 0.82,
    color = NA,
    alpha = 0.95
  ) +
  geom_errorbar(
    aes(ymin = mean_served - sd_served, ymax = mean_served + sd_served),
    position = position_dodge(width = 0.82),
    width = 0.16,
    linewidth = 0.72,
    color = "#3f3f3f"
  ) +
  scale_fill_manual(values = c("Session 1" = "#72B6A1", "Session 2" = "#E99675"), labels = c("1", "2")) +
  scale_y_continuous(limits = c(0, 62), breaks = seq(0, 60, 10), expand = expansion(mult = c(0, 0.02))) +
  labs(x = NULL, y = "Mean Total Served +/- 1 SD") +
  theme_minimal(base_size = 12) +
  theme(
    panel.grid.major.x = element_blank(),
    panel.grid.minor = element_blank(),
    panel.border = element_rect(color = "#4a4a4a", fill = NA, linewidth = 0.7),
    axis.text = element_text(color = "black"),
    axis.title = element_text(color = "black"),
    legend.position = "inside",
    legend.position.inside = c(0.07, 0.88),
    legend.background = element_rect(color = "#d9d9d9", fill = "white"),
    legend.title = element_text(size = 11),
    plot.margin = margin(8, 10, 8, 10)
  )

save_plot(fig5, "Figure_5_learning_total_served_by_ai_feedback")


cat(
  "Reproduced paper figures in:\n",
  normalizePath(out_dir, winslash = "/", mustWork = FALSE),
  "\n\n",
  "Generated from:\n",
  normalizePath(data_path, winslash = "/", mustWork = FALSE),
  "\n\n",
  "Files:\n",
  paste(sort(basename(list.files(out_dir, full.names = TRUE))), collapse = "\n"),
  "\n",
  sep = ""
)
