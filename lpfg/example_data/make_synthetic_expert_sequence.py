"""Generate a synthetic stand-in for the expert reference gaze sequence.

The real expert sequence is a recording of the expert's gaze and is not
released. This file has the same columns and interface-element names, with
random dwell times, so that adviser.py can be run end to end.
"""
import csv
import os
import random

ELEMENTS = ["Restaurant Status", "Money Status", "Inventory Status", "Pending Orders",
            "Order Ingredients", "Alerts", "Hire Cooks", "Event Log", "Menu Details",
            "Waiting Groups"]
WEIGHTS = [16, 23, 6, 16, 6, 2, 1, 1, 1, 1]


def mmss(seconds):
    return "%02d:%02d" % (int(seconds) // 60, int(seconds) % 60)


def main():
    random.seed(20261103)
    t, rows = 0.0, []
    while t < 300:
        dwell = round(min(random.expovariate(1 / 0.4), 3.0), 2)
        rows.append([mmss(t), mmss(min(t + dwell, 300)), random.choices(ELEMENTS, WEIGHTS)[0], dwell])
        t += dwell + random.expovariate(1 / 0.03)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gaze_sequences_expert_SYNTHETIC.csv")
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["start_time", "end_time", "interface_element", "duration_seconds"])
        w.writerows(rows)
    print("wrote", len(rows), "rows to", out)


if __name__ == "__main__":
    main()
