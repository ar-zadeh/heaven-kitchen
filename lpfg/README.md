# LPFG: LLM-Powered Feedback Generator

`adviser.py` is the feedback generator used in the study. The only changes from the deployed file are that the Gemini API key, the expert reference sequence, and the model name are read from environment variables instead of being hard-coded. `system_instruction.txt` is the exact instruction sent to the model, including its original spelling and wording.

## How it works

1. **Gaze.** Gaze coordinates arrive over TCP on `127.0.0.1:6554` from the VR eye-tracking application [VRAT](https://github.com/HCAI-Lab/Virtual-Reality-Analysis-Tool-VRAT-), which mirrors the desktop into a Meta Quest Pro headset.
2. **Interface elements.** The position and name of each tracked interface element arrive over a WebSocket on `ws://localhost:8080`. In the study they were sent by the Tampermonkey script `bounding_box_reporter_tampermonkey.txt` from [Visual_Item_tracking_In_HTML](https://github.com/ar-zadeh/Visual_Item_tracking_In_HTML), configured with the XPaths of the ten labeled elements: Restaurant Status, Money Status, Inventory Status, Pending Orders, Order Ingredients, Alerts, Hire Cooks, Event Log, Menu Details, and Waiting Groups. Money Status and Inventory Status are regions inside the Restaurant Status box; the kitchen view was not labeled.
3. **Recording.** `adviser.py` captures the Chrome window, maps each gaze sample to the element under it, and logs `timestamp, gaze_x, gaze_y, bounding_box_name`. Pressing `r` in the preview window starts logging and the feedback thread; in the study this was done when the participant started the game.
4. **Feedback cycle.** Wait 60 s, then convert the participant's cumulative gaze log into a sequence of dwell events (start, end, element, duration), upload it to Gemini together with the cached system instruction and expert sequence, receive a JSON list of short advice strings, and speak them with gTTS. Because the next 60-s wait starts only after the audio has finished, consecutive cues are about 76 s apart.
5. The latest advice is also served as JSON at `http://localhost:5000/current_advice`.

## Running it

Windows only (the script uses `pywin32` and captures the Chrome window).

```sh
pip install -r requirements.txt
set GOOGLE_API_KEY=your-key
set LPFG_EXPERT_CSV=path\to\expert_sequence.csv   # optional; defaults to the synthetic example
set LPFG_MODEL=models/your-model                  # optional; see the note below
python adviser.py
```

The study used `models/gemini-1.5-flash-002` with context caching, which is the default. Gemini 1.5 models may no longer be served by the Gemini API; if so, set `LPFG_MODEL` to a current model that supports context caching. Results obtained with a different model are not a reproduction of the study's feedback.

## Files

| File | Description |
|---|---|
| `adviser.py` | The deployed LPFG (context caching, API-level JSON response schema). |
| `system_instruction.txt` | The system instruction exactly as executed. |
| `requirements.txt` | Python packages imported by `adviser.py`. |
| `example_data/gaze_sequences_expert_SYNTHETIC.csv` | Synthetic stand-in for the expert reference sequence, with the same columns and element names. The real sequence is a recording of the expert's gaze and is not released. |
| `example_data/make_synthetic_expert_sequence.py` | Generates the synthetic expert sequence. |
| `legacy/adviser_no_caching.py` | An earlier development version (no context caching, a different system instruction). It is not the configuration reported in the paper. |
