import os
import subprocess
import tempfile
import asyncio
import time
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import zipfile
import urllib.request
from pathlib import Path
import logging
from logging.handlers import RotatingFileHandler

try:
    from vosk import Model as VoskModel, KaldiRecognizer
except Exception:  # pragma: no cover
    VoskModel = None  # type: ignore
    KaldiRecognizer = None  # type: ignore

try:
    from faster_whisper import WhisperModel
except Exception as e:  # pragma: no cover
    WhisperModel = None  # type: ignore
    _IMPORT_ERROR = e


ROOT_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = ROOT_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger("mevenda-stt")
logger.setLevel(logging.INFO)
_fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

_file = RotatingFileHandler(LOGS_DIR / "backend.log", maxBytes=5_000_000, backupCount=3, encoding="utf-8")
_file.setFormatter(_fmt)
logger.addHandler(_file)

_console = logging.StreamHandler()
_console.setFormatter(_fmt)
logger.addHandler(_console)

app = FastAPI(title="Transcrição local (faster-whisper)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _startup_log():
    logger.info("Backend iniciado (logging persistente ativo)")


_model = None
_vosk_model = None


def get_model():
    global _model
    if _model is not None:
        return _model
    if WhisperModel is None:
        raise RuntimeError(f"faster-whisper não importou: {_IMPORT_ERROR}")

    model_size = os.getenv("WHISPER_MODEL", "small")
    device = os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

    _model = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _model


def get_vosk_model():
    global _vosk_model
    if _vosk_model is not None:
        return _vosk_model
    if VoskModel is None:
        raise RuntimeError("vosk não importou. Instale as deps do backend.")
    model_path = os.getenv("VOSK_MODEL_PATH", "").strip()
    # Por padrão, usa modelo maior para mais acurácia (download maior, +RAM/CPU)
    model_size = os.getenv("VOSK_MODEL_SIZE", "large").strip().lower()
    model_dir_name = "vosk-model-pt-0.3" if model_size in ("large", "full", "big") else "vosk-model-small-pt-0.3"
    local_model_dir = Path(__file__).resolve().parent / "models" / model_dir_name

    if model_path:
        _vosk_model = VoskModel(model_path)
        return _vosk_model

    # Auto-download para facilitar
    if not local_model_dir.exists():
        local_model_dir.parent.mkdir(parents=True, exist_ok=True)
        zip_name = f"{model_dir_name}.zip"
        zip_path = local_model_dir.parent / zip_name
        default_url = f"https://alphacephei.com/vosk/models/{zip_name}"
        url = os.getenv("VOSK_MODEL_URL", default_url)

        try:
            urllib.request.urlretrieve(url, zip_path)  # nosec - URL controlada por env
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(local_model_dir.parent)
        finally:
            try:
                if zip_path.exists():
                    zip_path.unlink()
            except Exception:
                pass

    _vosk_model = VoskModel(str(local_model_dir))
    return _vosk_model


def webm_to_wav_16k_mono(src_path: str, dst_path: str):
    # requer ffmpeg no PATH
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        src_path,
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "wav",
        dst_path,
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr[-2000:] if p.stderr else "ffmpeg falhou")


@app.get("/health")
def health():
    logger.info("GET /health")
    return {"ok": True}


@app.post("/client-log")
async def client_log(payload: dict):
    """
    Recebe logs do frontend para depurar ponta a ponta.
    Escreve em logs/client.log (JSONL).
    """
    try:
        line = json.dumps(payload, ensure_ascii=False)
        with open(LOGS_DIR / "client.log", "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception as e:
        logger.error(f"Falha escrevendo client-log: {e}")
        raise HTTPException(status_code=500, detail="Falha escrevendo log")
    logger.info(f"client-log: {payload.get('event')}")
    return {"ok": True}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if file.content_type not in ("audio/webm", "video/webm", "audio/wav", "audio/x-wav", "audio/mpeg"):
        raise HTTPException(status_code=400, detail=f"Tipo não suportado: {file.content_type}")

    model = get_model()

    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, "in.webm")
        wav = os.path.join(td, "in.wav")

        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Arquivo vazio")
        with open(src, "wb") as f:
            f.write(data)

        try:
            if file.content_type in ("audio/wav", "audio/x-wav"):
                wav = src
            else:
                webm_to_wav_16k_mono(src, wav)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Falha convertendo áudio: {e}")

        # PT-BR
        segments, info = model.transcribe(
            wav,
            language="pt",
            vad_filter=True,
        )
        text = "".join(seg.text for seg in segments).strip()

        return {
            "text": text,
            "language": info.language,
            "duration": info.duration,
        }


def transcribe_file(model, wav_path: str) -> str:
    segments, _info = model.transcribe(
        wav_path,
        language="pt",
        vad_filter=True,
    )
    return "".join(seg.text for seg in segments).strip()


def merge_with_overlap(base: str, addition: str, max_overlap: int = 80) -> str:
    """
    Junta textos evitando repetição: tenta encontrar o maior overlap entre o final de base e o início de addition.
    """
    b = (base or "").strip()
    a = (addition or "").strip()
    if not b:
        return a
    if not a:
        return b

    tail = b[-max_overlap:]
    best = 0
    upper = min(len(tail), len(a))
    for k in range(upper, 5, -1):
        if tail[-k:].lower() == a[:k].lower():
            best = k
            break
    if best > 0:
        return (b + a[best:]).strip()
    return (b + " " + a).strip()


@app.websocket("/ws/transcribe")
async def ws_transcribe(websocket: WebSocket):
    await websocket.accept()

    model = get_model()
    interval_ms = int(os.getenv("WS_TRANSCRIBE_INTERVAL_MS", "1500"))

    with tempfile.TemporaryDirectory() as td:
        last_transcribe_ts = 0.0
        accumulated_text = ""
        chunk_idx = 0

        try:
            await websocket.send_json({"type": "ready"})
            loop = asyncio.get_running_loop()

            while True:
                msg = await websocket.receive()

                if msg.get("type") == "websocket.disconnect":
                    break

                # texto (controle)
                if "text" in msg and msg["text"] is not None:
                    txt = msg["text"].strip().lower()
                    if txt in ("stop", "close", "fim"):
                        break
                    continue

                # binário (chunk de audio)
                chunk = msg.get("bytes")
                if not chunk:
                    continue

                now = time.time()
                if (now - last_transcribe_ts) * 1000 < interval_ms:
                    continue
                last_transcribe_ts = now

                # cada chunk do MediaRecorder é um "arquivo" webm válido por si só.
                chunk_idx += 1
                src = os.path.join(td, f"chunk_{chunk_idx}.webm")
                wav = os.path.join(td, f"chunk_{chunk_idx}.wav")
                with open(src, "wb") as f:
                    f.write(chunk)

                try:
                    webm_to_wav_16k_mono(src, wav)
                    chunk_text = await loop.run_in_executor(None, lambda: transcribe_file(model, wav))
                except Exception:
                    continue

                if chunk_text:
                    accumulated_text = merge_with_overlap(accumulated_text, chunk_text)
                    await websocket.send_json({"type": "partial", "text": accumulated_text})

            # final (tenta uma última vez)
            await websocket.send_json({"type": "final", "text": accumulated_text})

        except WebSocketDisconnect:
            return
        finally:
            try:
                await websocket.close()
            except Exception:
                pass


@app.websocket("/ws/vosk")
async def ws_vosk(websocket: WebSocket):
    """
    Streaming STT de baixa latência (local) com Vosk.
    Espera frames PCM16 mono 16kHz (bytes).
    Retorna {"type":"partial","text":...} e {"type":"final","text":...}
    """
    await websocket.accept()
    try:
        model = get_vosk_model()
    except Exception as e:
        logger.error(f"/ws/vosk erro modelo: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()
        return

    rec = KaldiRecognizer(model, 16000)  # type: ignore
    rec.SetWords(True)
    # Mais compute, mais chance de acertar (especialmente no modelo grande)
    try:
        rec.SetMaxAlternatives(int(os.getenv("VOSK_MAX_ALTERNATIVES", "1")))
    except Exception:
        pass
    last_partial = ""
    bytes_total = 0
    frames = 0

    try:
        logger.info("/ws/vosk connection accepted")
        await websocket.send_json({"type": "ready"})
        while True:
            msg = await websocket.receive()
            if msg.get("type") == "websocket.disconnect":
                break

            if "text" in msg and msg["text"] is not None:
                txt = msg["text"].strip().lower()
                if txt in ("stop", "close", "fim"):
                    break
                continue

            data = msg.get("bytes")
            if not data:
                continue
            bytes_total += len(data)
            frames += 1
            if frames % 50 == 0:
                logger.info(f"/ws/vosk recebendo audio: frames={frames} bytes_total={bytes_total}")

            # Aceita audio e emite partials
            if rec.AcceptWaveform(data):
                j = json.loads(rec.Result())
                text = (j.get("text") or "").strip()
                if text:
                    logger.info(f"/ws/vosk final: {text[:120]}")
                    await websocket.send_json({"type": "final", "text": text})
                    last_partial = ""
            else:
                j = json.loads(rec.PartialResult())
                partial = (j.get("partial") or "").strip()
                if partial and partial != last_partial:
                    last_partial = partial
                    if len(partial) % 40 < 8:
                        logger.info(f"/ws/vosk partial: {partial[:120]}")
                    await websocket.send_json({"type": "partial", "text": partial})

        # flush final
        j = json.loads(rec.FinalResult())
        text = (j.get("text") or "").strip()
        logger.info(f"/ws/vosk flush final: {text[:120]}")
        await websocket.send_json({"type": "final", "text": text})

    except WebSocketDisconnect:
        logger.info("/ws/vosk disconnect")
        return
    except Exception as e:
        logger.error(f"/ws/vosk erro: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

