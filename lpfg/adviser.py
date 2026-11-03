"""LPFG (LLM-Powered Feedback Generator) as deployed in the Heaven's Kitchen study.

Only credential and path handling differ from the deployed file: the Gemini API
key, the expert reference sequence and the model name are read from environment
variables instead of being hard-coded. Everything else, including the system
instruction (reproduced verbatim, with its original spelling), is unchanged.

Environment variables
  GOOGLE_API_KEY   Gemini API key (required)
  LPFG_EXPERT_CSV  expert reference gaze sequence (defaults to the synthetic example)
  LPFG_MODEL       model name (defaults to the model used in the study)

See lpfg/README.md for the hardware and browser setup.
"""
import asyncio
import websockets
import json
import threading
import socket
from multiprocessing import Process, Queue
import pygetwindow as gw
import cv2
import numpy as np
from mss import mss
from cv2 import COLOR_BGRA2BGR, cvtColor
from numpy import asarray
import win32gui
import win32con
import win32api
import csv
import time
from datetime import datetime, timedelta
import pandas as pd
import os

# ===== Google Generative AI Integration =====
import google.generativeai as genai
import typing_extensions as typing

# ===== Flask for Serving Advice to JS =====
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

advice_data = {
    "advices": []
}
genai.configure(
    api_key=os.environ["GOOGLE_API_KEY"])

EXPERT_CSV = os.environ.get(
    "LPFG_EXPERT_CSV",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "example_data",
                 "gaze_sequences_expert_SYNTHETIC.csv"))
document_expert = genai.upload_file(path=EXPERT_CSV, mime_type='text/csv')
model_name = os.environ.get("LPFG_MODEL", "models/gemini-1.5-flash-002")  # model used in the study
cache = genai.caching.CachedContent.create(
    model=model_name,
    system_instruction=(
        "You are an expert analyzing gaze data. "
        "I will provide you with the expert gaze data. The first two columns are the starting and finishing time of the gaze. "
        "The third column includes the name of the information box they were looking at and the fourth column is the duration of the gaze. "
        "It is important to note that the data is ordered chronologically. "
        "Now based on this data, I will provide you with novice data and ask you to analyze it "
        "and provide one or two feedbacks to the novice user to looking more similar to experts. Please be concise and provide advice directly to the novice user. "
        "Your output should only be the two prices of feedback and nothing else. The advices should be on the information boxes they are not paying enough attention to. Please be consise. Each feedback shoudl be at most 10 to 15 words. and most importantly, VALUE MORE RECENT DATA OF THE NOVICE MORE."
    ),
    contents=[document_expert]
)
import pygame
from gtts import gTTS
import json
i = 0

def generate_advice():
    global advice_data
    global CSV_PATH
    global i
    print("Calling generate advice")
    print(f"{CSV_PATH=}")
    genai.configure(
        api_key=os.environ["GOOGLE_API_KEY"])
    sequences_csv_path = CSV_PATH.replace("gaze_data_", "gaze_sequences_")
    process_gaze_data(CSV_PATH, sequences_csv_path)
    print("almost there")
    document_novice = genai.upload_file(path=sequences_csv_path,mime_type='text/csv')
    print("creating the feedback")
    response = model.generate_content(
        contents=document_novice,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=list[advices]
        )
    )

    advice_data = json.loads(response.text)[0]['advices']
    print(advice_data)

    combined_advice_text = " ".join(advice_data)

    tts = gTTS(text=combined_advice_text, lang='en', slow=False)
    audio_file = f"advice_output_{i}.mp3"
    tts.save(audio_file)
    i+=1
    pygame.mixer.init()
    pygame.mixer.music.load(audio_file)
    pygame.mixer.music.play()
    document_novice.delete()
    while pygame.mixer.music.get_busy():
        continue

    print("Advice audio playback finished.")

def periodic_advice_updater():
    while True:
        time.sleep(60)
        generate_advice()
        print("Updated advice_data periodically.")

@app.route('/current_advice', methods=['GET'])
def get_current_advice():
    return jsonify(advice_data)

def run_flask_app():
    app.run(host='0.0.0.0', port=5000, debug=False)

flask_thread = threading.Thread(target=run_flask_app, daemon=True)
flask_thread.start()

class advices(typing.TypedDict):
    advices: list[str]

model = genai.GenerativeModel.from_cached_content(cache)

gaze_point = None
bounding_boxes = []
connected_clients = set()

def process_gaze_data(input_csv, output_csv):
    try:
        df = pd.read_csv(input_csv)
        print(f"Successfully read {len(df)} rows from {input_csv}")
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return

    def convert_to_seconds(ts):
        try:
            dt = pd.to_datetime(ts)
            return dt.hour * 3600 + dt.minute * 60 + dt.second + dt.microsecond / 1000000
        except Exception as e:
            print(f"Error converting timestamp {ts}: {e}")
            return 0

    df['seconds'] = df['timestamp'].apply(convert_to_seconds)
    first_timestamp = df['seconds'].iloc[0]

    current_area = None
    start_time = None
    sequences = []

    for index, row in df.iterrows():
        if pd.notna(row['bounding_box_name']):
            if current_area != row['bounding_box_name']:
                if current_area is not None:
                    sequences.append({
                        'start_time': start_time - first_timestamp,
                        'end_time': row['seconds'] - first_timestamp,
                        'area': current_area
                    })
                current_area = row['bounding_box_name']
                start_time = row['seconds']

    if current_area is not None:
        sequences.append({
            'start_time': start_time - first_timestamp,
            'end_time': df['seconds'].iloc[-1] - first_timestamp,
            'area': current_area
        })

    formatted_sequences = []
    for seq in sequences:
        start_time_delta = str(timedelta(seconds=int(seq['start_time']))).split(':')[1:3]
        end_time_delta = str(timedelta(seconds=int(seq['end_time']))).split(':')[1:3]

        formatted_sequences.append({
            'start_time': ':'.join(start_time_delta),
            'end_time': ':'.join(end_time_delta),
            'interface_element': seq['area'],
            'duration_seconds': round(seq['end_time'] - seq['start_time'], 2)
        })

    output_df = pd.DataFrame(formatted_sequences)
    try:
        output_df.to_csv(output_csv, index=False)
    except Exception as e:
        print(f"Error writing to CSV file: {e}")

async def handle_websocket():
    async with websockets.serve(handle_connection, "localhost", 8080):
        print("WebSocket server started on ws://localhost:8080")
        await asyncio.Future()

async def handle_connection(websocket, path):
    global bounding_boxes
    connected_clients.add(websocket)
    print("Client connected:", websocket.remote_address)
    try:
        async for message in websocket:
            elements_data = json.loads(message)
            if isinstance(elements_data, list):
                for data in elements_data:
                    xpath = data.get("xpath")
                    x = data.get("x")
                    y = data.get("y")
                    width = data.get("width")
                    height = data.get("height")
                    name = data.get("name")

                    bounding_boxes = [box for box in bounding_boxes if box['xpath'] != xpath]
                    if xpath and x is not None and y is not None and width and height:
                        bounding_boxes.append({
                            'xpath': xpath,
                            'name': name,
                            'x': int(x),
                            'y': int(y),
                            'width': int(width),
                            'height': int(height)
                        })
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected:", websocket.remote_address)
    finally:
        connected_clients.remove(websocket)

def create_output_directories(user_id):
    video_dir = "recorded_videos"
    csv_dir = "gaze_data"
    os.makedirs(video_dir, exist_ok=True)
    os.makedirs(csv_dir, exist_ok=True)

    video_path = os.path.join(video_dir, f"screen_recording_{user_id}.mp4")
    csv_path = os.path.join(csv_dir, f"gaze_data_{user_id}.csv")
    return video_path, csv_path

def draw_cursor(frame, x, y, cursor_type):
    cv2.drawMarker(frame, (x, y), (0, 0, 0), cv2.MARKER_CROSS, 10, 2)

CSV_PATH = ""

def broadcast_chrome_content(queue_gaze, user_id):
    global document_novice
    chrome_windows = [window for window in gw.getWindowsWithTitle('Chrome') if 'Chrome' in window.title]
    toolbar_height = 100
    if not chrome_windows:
        print("No Chrome window found.")
        return

    chrome_window = chrome_windows[0]
    left, top, right, bottom = chrome_window.left, chrome_window.top + toolbar_height, chrome_window.right, chrome_window.bottom
    sct = mss()

    video_path, CSV_PATH_local = create_output_directories(user_id)
    global CSV_PATH
    CSV_PATH = CSV_PATH_local

    frame_sample = asarray(sct.grab({"top": top, "left": left, "width": right - left, "height": bottom - top}))
    frame_height, frame_width = frame_sample.shape[:2]
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, 30.0, (frame_width, frame_height))

    # We'll open CSV only after recording starts
    csv_file = None
    csv_writer = None

    window_name = "Chrome Content Broadcast"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.moveWindow(window_name, -1920, 0)
    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    ws_thread = threading.Thread(target=lambda: asyncio.run(handle_websocket()))
    ws_thread.daemon = True
    ws_thread.start()

    last_gaze_point = None
    recording_started = False
    periodic_thread = None

    print("Press 'r' to start recording and data logging. Press 'q' to quit.")

    try:
        while True:
            monitor = {"top": top, "left": left, "width": right - left, "height": bottom - top}
            sct_img = sct.grab(monitor)
            frame = asarray(sct_img)
            frame = cvtColor(frame, COLOR_BGRA2BGR)

            for box in bounding_boxes:
                x, y, w, h = box['x'], box['y'], box['width'], box['height']
                cv2.rectangle(frame, (x - 10, y - 12), (x + w + 20, y + h + 20), (0, 255, 0), 2)
                if box['name']:
                    cv2.putText(frame, box['name'], (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            cursor_x, cursor_y = win32gui.GetCursorPos()
            cursor_x -= left
            cursor_y -= top

            if 0 <= cursor_x < (right - left) and 0 <= cursor_y < (bottom - top):
                cursor_handle = win32gui.GetCursor()
                cursor_type = win32gui.GetClassLong(cursor_handle, win32con.GCL_HCURSOR)
                draw_cursor(frame, cursor_x, cursor_y, cursor_type)

            while not queue_gaze.empty():
                last_gaze_point = queue_gaze.get()

            if recording_started:
                # If recording is started, then write frames and CSV
                if last_gaze_point:
                    gaze_x, gaze_y = last_gaze_point
                    cv2.circle(frame, (gaze_x, gaze_y - top), 5, (0, 255, 0), -1)

                    found_box = None
                    for box in bounding_boxes:
                        bx, by, bw, bh = box['x'], box['y'], box['width'], box['height']
                        if bx <= gaze_x <= bx + bw and by <= gaze_y <= by + bh:
                            found_box = box['name'] or box['xpath']
                            break
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
                    csv_writer.writerow([timestamp, gaze_x, gaze_y, found_box])
                    csv_file.flush()

                out.write(frame)

            # Show the window at all times
            cv2.imshow(window_name, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                document_expert.delete()
                try:
                    document_novice.delete()
                except:
                    pass
                break
            elif key == ord('r') and not recording_started:
                # Start recording and periodic advice updater
                print("Recording started.")
                recording_started = True
                # Open CSV file and start writing
                csv_file = open(CSV_PATH, 'w', newline='')
                csv_writer = csv.writer(csv_file)
                csv_writer.writerow(['timestamp', 'gaze_x', 'gaze_y', 'bounding_box_name'])

                # Start periodic advice updater thread
                periodic_thread = threading.Thread(target=periodic_advice_updater, daemon=True)
                periodic_thread.start()

    finally:
        out.release()
        if csv_file:
            csv_file.close()
        cv2.destroyAllWindows()
        print("Process finished. Files saved successfully.")

async def send_advice_to_clients(adv_text):
    global connected_clients
    message = json.dumps({"type": "advice", "payload": adv_text})
    await asyncio.gather(*[client.send(message) for client in connected_clients])


def tcp_server(queue_gaze):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind(('127.0.0.1', 6554))
        server.listen(1)
        print("TCP Server listening for gaze data...")

        while True:
            print("Waiting for client to connect...")
            conn, addr = server.accept()
            print(f"Client connected: {addr}")

            # Remove or extend timeouts so we don't kill the connection if the client is idle
            server.settimeout(None)
            conn.settimeout(None)

            with conn:
                while True:
                    data = conn.recv(1024).decode('utf-8').strip()
                    if not data:
                        print("Connection closed by client, waiting for new client...")
                        break

                    if data == "Finished":
                        print("We are done recording, closing connection...")
                        break
                    else:
                        # Process gaze data
                        data_list = data.split(',')
                        if len(data_list) == 2:
                            try:
                                gaze_x = int(float(data_list[0]))
                                gaze_y = int(float(data_list[1]))
                                queue_gaze.put((gaze_x, gaze_y))
                            except ValueError:
                                print("Invalid gaze data received.")

            print("Returning to listening for new connections...")



if __name__ == "__main__":
    user_id = input("Please enter the id of the user: ")
    queue_gaze = Queue()

    # Start TCP server process for gaze data
    tcp_server_process = Process(target=tcp_server, args=(queue_gaze,))
    tcp_server_process.start()

    # Start everything else immediately, but will only record after 'r' is pressed in opencv window
    gaze_thread = threading.Thread(target=broadcast_chrome_content, args=(queue_gaze, user_id), daemon=True)
    gaze_thread.start()

    gaze_thread.join()
    tcp_server_process.join()
