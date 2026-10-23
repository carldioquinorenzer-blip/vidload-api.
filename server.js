
import express from "express";

const app = express();
app.use(express.json({ limit: "10kb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});
app.get("/", (_req, res) => {
  res.json({
    app: "VidLoad API",
    status: "online",
    message: "Backend is running."
  });
});

app.get("/api/check", (req, res) => {
  const value = req.query.url;

  if (typeof value !== "string" || value.length > 2048) {
    return res.status(400).json({
      ok: false,
      message: "Please provide a valid URL."
    });
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      throw new Error("HTTPS required");
    }

    return res.json({
      ok: true,
      host: url.hostname,
      message:
        "URL format is valid. Download support for this source has not been connected."
    });
  } catch {
    return res.status(400).json({
      ok: false,
      message: "Enter a valid HTTPS URL."
    });
  }
});

import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        message: "Transcription service is not configured."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an audio or video file."
      });
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
      "audio/ogg",
      "video/mp4",
      "video/webm"
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Use a supported MP3, WAV, WebM, or MP4 file."
      });
    }

    const form = new FormData();
    const file = new Blob([req.file.buffer], {
      type: req.file.mimetype
    });

    form.append("file", file, req.file.originalname);
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: form,
        signal: AbortSignal.timeout(120000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        message: "Transcription failed. Please try another file."
      });
    }

    const formatTime = (seconds) => {
      const total = Math.floor(seconds || 0);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = total % 60;

      return hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        : `${minutes}:${String(secs).padStart(2, "0")}`;
    };

    const lines = (data.segments || []).map(segment =>
      `${formatTime(segment.start)} ${segment.text.trim()}`
    );

    return res.json({
      ok: true,
      transcript: data.text || "",
      timestampedTranscript: lines.join("\n"),
      segments: data.segments || []
    });
  } catch (error) {
    console.error("Transcription error:", error.message);

    return res.status(500).json({
      message: "Couldn't transcribe this file. Please try again."
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`VidLoad API listening on port ${port}`);
});
