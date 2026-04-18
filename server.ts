import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "cats.json");

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware for parsing large JSON bodies (for base64 images)
  app.use(express.json({ limit: "10mb" }));

  // Initialize data file if it doesn't exist
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]));
  }

  // API Routes
  app.get("/api/cats", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read cat data" });
    }
  });

  app.post("/api/cats", async (req, res) => {
    try {
      const newCat = req.body;
      const dataString = await fs.readFile(DATA_FILE, "utf-8");
      const cats = JSON.parse(dataString);
      
      const catWithId = {
        ...newCat,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      cats.push(catWithId);
      await fs.writeFile(DATA_FILE, JSON.stringify(cats, null, 2));
      
      res.status(201).json(catWithId);
    } catch (error) {
      res.status(500).json({ error: "Failed to save cat data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
