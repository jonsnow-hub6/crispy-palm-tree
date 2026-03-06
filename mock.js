const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// -----------------------------
// In-memory mock state
// -----------------------------
let active = false;
let counter = 0;
let preset = null; // <-- NEW

// Optional: auto-increment counter to simulate activity
setInterval(() => {
  counter += 1;
}, 3000);

setInterval(() => {
  console.log(
    "Mock API State - port:",
    PORT,
    "active:",
    active,
    "preset:",
    preset?.presetName || null
  );
}, 3000);

// -----------------------------
// Routes
// -----------------------------

// GET /api/getActive
app.get("/api/getActive", (req, res) => {
  console.log("getActive");
  res.json(active);
});

// POST /api/setActive
app.post("/api/setActive", (req, res) => {
  const { active: newActive } = req.body;
  console.log("setActive -", newActive);

  if (typeof newActive !== "boolean") {
    return res.status(400).json({ error: "active must be boolean" });
  }

  active = newActive;
  res.json({ success: true, active });
});

// GET /api/getCounter
app.get("/api/getCounter", (req, res) => {
  console.log("getCounter");
  res.json(counter);
});

// -----------------------------
// Preset endpoints (NEW)
// -----------------------------

// GET /api/getPreset
app.get("/api/getPreset", (req, res) => {
  console.log("getPreset");
  res.json(preset);
});

// POST /api/setPreset
app.post("/api/setPreset", (req, res) => {
  console.log("setPreset");

  const incoming = req.body;

  // minimal sanity check
  if (
    !incoming ||
    typeof incoming.presetName !== "string" ||
    !Array.isArray(incoming.commands)
  ) {
    return res.status(400).json({
      error: "Invalid preset format",
    });
  }

  preset = {
    presetName: incoming.presetName,
    commands: incoming.commands,
  };

  res.json({
    success: true,
    preset,
  });
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`Mock Link API running on http://localhost:${PORT}`);
});
