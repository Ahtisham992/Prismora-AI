import torch, faster_whisper

print("Python OK")
print("Torch:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None")

from faster_whisper import WhisperModel
model = WhisperModel("tiny", device="cuda", compute_type="float16")
print("faster-whisper GPU OK")
