"""Records voice lines with Kokoro TTS (ONNX, runs on the CPU).
Reads a JSON list of {"text", "voice", "speed", "out"} on stdin and writes one WAV per line.
Model files live in promo/audio/kokoro/ (kokoro-v1.0.onnx, voices-v1.0.bin)."""
import json, sys, os
import soundfile as sf
from kokoro_onnx import Kokoro

here = os.path.dirname(os.path.abspath(__file__))
k = Kokoro(os.path.join(here, 'kokoro', 'kokoro-v1.0.onnx'), os.path.join(here, 'kokoro', 'voices-v1.0.bin'))
for job in json.load(sys.stdin):
    samples, rate = k.create(job['text'], voice=job['voice'], speed=job.get('speed', 1.0), lang='en-us')
    sf.write(job['out'], samples, rate)
    print(f"{job['voice']:10} {len(samples) / rate:5.2f}s  {job['text']}", flush=True)
