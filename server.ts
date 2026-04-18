import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "cats.json");
const MONGODB_URI = process.env.MONGODB_URI;
// MongoDB Schema
const catSchema = new mongoose.Schema({
  species: String,
  color: String,
  fur: String,
  other: String,
  image: String,
  createdAt: { type: Date, default: Date.now }
});

const Cat = mongoose.model("Cat", catSchema);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware for parsing large JSON bodies (for base64 images)
  app.use(express.json({ limit: "10mb" }));

  // Connect to MongoDB if URI is available
  let useMongo = false;
  if (MONGODB_URI && MONGODB_URI !== "MY_MONGODB_CONNECTION_STRING") {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("Connected to MongoDB successfully");
      useMongo = true;
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  } else {
    console.log("No MONGODB_URI found. Falling back to local cats.json");
    // Initialize data file if it doesn't exist for fallback
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([]));
    }
  }

  // API Routes
  app.get("/api/cats", async (req, res) => {
    try {
      if (useMongo) {
        const cats = await Cat.find().sort({ createdAt: -1 });
        res.json(cats);
      } else {
        const data = await fs.readFile(DATA_FILE, "utf-8");
        res.json(JSON.parse(data));
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cat data" });
    }
  });

  app.post("/api/cats", async (req, res) => {
    try {
      const newCatData = req.body;
      const specimenName = newCatData.species || "Unknown specimen";
      
      if (useMongo) {
        console.log(`ARCHIVING: Sending specimen [${specimenName}] to MongoDB Atlas...`);
        const cat = new Cat(newCatData);
        await cat.save();
        console.log(`SUCCESS: [${specimenName}] successfully committed to MongoDB.`);
        res.status(201).json(cat);
      } else {
        console.warn(`NOTICE: MONGODB NOT DETECTED. Archiving [${specimenName}] to local cats.json fallback.`);
        const dataString = await fs.readFile(DATA_FILE, "utf-8");
        const cats = JSON.parse(dataString);
        
        const catWithId = {
          ...newCatData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        };
        
        cats.push(catWithId);
        await fs.writeFile(DATA_FILE, JSON.stringify(cats, null, 2));
        console.log(`SUCCESS: [${specimenName}] saved to local disk.`);
        res.status(201).json(catWithId);
      }
    } catch (error) {
      console.error(`CRITICAL ERROR: Failed to archive specimen:`, error);
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

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();