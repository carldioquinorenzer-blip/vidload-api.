
import express from "express";

const app = express();
app.use(express.json({ limit: "10kb" }));

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

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`VidLoad API listening on port ${port}`);
});
