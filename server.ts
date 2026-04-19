import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { spawn } from "child_process"

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "cats.json");
//const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_URI = "mongodb://ajfergus_db_user:5rKX!4!2!GcpFRK@ac-fukbepf-shard-00-00.5homxhh.mongodb.net:27017,ac-fukbepf-shard-00-01.5homxhh.mongodb.net:27017,ac-fukbepf-shard-00-02.5homxhh.mongodb.net:27017/catArchive?ssl=true&replicaSet=atlas-7m4cri-shard-0&authSource=admin&retryWrites=true&w=majority";
const USERS_FILE = path.join(__dirname, "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_key_123";

//Tracker Schema
const trackerSchema = new mongoose.Schema({
  temperature: Number,
  velocity: Number,
  latitude: Number,
  longitude: Number,
  arduino_mac: String,
  is_connected: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});
const Tracker = mongoose.model("Tracker", trackerSchema);

// MongoDB Schema
const catSchema = new mongoose.Schema({
  catName: String,
  species: String,
  color: String,
  fur: String,
  other: String,
  image: String,
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  isLost: { type: Boolean, default: false },
  submittedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Cat = mongoose.model("Cat", catSchema);

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// Auth Middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) return res.status(401).json({ error: "Access Denied: No token provided" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    (req as any).user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware for parsing large JSON bodies (for base64 images)
  app.use(express.json({ limit: "10mb" }));

  // Connect to MongoDB if URI is available
  let useMongo = false;
  if (MONGODB_URI && MONGODB_URI !== "MY_MONGODB_CONNECTION_STRING") {
    try {
      await mongoose.connect(MONGODB_URI, { family: 4 });
      console.log("Connected to MongoDB successfully");
      useMongo = true;
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  } else {
    console.log("No MONGODB_URI found. Falling back to local cats.json and users.json");
    // Initialize data files if they don't exist for fallback
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([]));
    }
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify([]));
    }
  }

  // API Routes

  // Tracker Route
  app.post("/api/tracker", async (req, res) => {
    try {
      if (useMongo) {
        const ping = new Tracker(req.body);
        await ping.save();
        res.status(201).json(ping);
      } else {
        const data = await fs.readFile(TRACKER_FILE, "utf-8").catch(() => "[]");
        const history = JSON.parse(data);
        const newEntry = { ...req.body, timestamp: new Date() };
        history.push(newEntry);
        await fs.writeFile(TRACKER_FILE, JSON.stringify(history, null, 2));
        res.status(201).json(newEntry);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save tracker data" });
    }
  });

  app.get("/api/tracker/:mac", async (req, res) => {
    try {
      if (useMongo) {
        const history = await Tracker.find({ arduino_mac: req.params.mac }).sort({ timestamp: -1 }).limit(100);
        res.json(history);
      } else {
        const data = await fs.readFile(TRACKER_FILE, "utf-8").catch(() => "[]");
        const history = JSON.parse(data).filter((i: any) => i.arduino_mac === req.params.mac);
        res.json(history.reverse().slice(0, 100));
      }
    } catch (error) {
      res.status(500).json({ error: "Fetch failed" });
    }
  });

  // Auth Routes
  app.post("/api/register", async (req, res) => {
    //make new account
    try {
      const { password, username } = req.body;
      const email = req.body.email?.toLowerCase();

      if (!username) return res.status(400).json({ error: "Username is required" });

      const hashedPassword = await bcrypt.hash(password, 10);

      if (useMongo) {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) return res.status(400).json({ error: "Email or username already exists" });

        const user = new User({ email, username, password: hashedPassword });
        await user.save();
      } else {
        const dataString = await fs.readFile(USERS_FILE, "utf-8");
        const users = JSON.parse(dataString);
        
        if (users.find((u: any) => u.email === email || u.username === username)) {
          return res.status(400).json({ error: "Email or username already exists" });
        }
        
        users.push({ 
          id: Date.now().toString(), 
          email,
          username,
          password: hashedPassword,
          createdAt: new Date().toISOString()
        });
        
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
      }

      res.status(201).json({ message: "Registration successful" });
    } catch (error: any) {
      console.error("REGISTER ERROR:", error);
      res.status(500).json({ error: "Registration failed: " + (error?.message || "Unknown error") });
    }
  });

  //login path
  app.post("/api/login", async (req, res) => {
    try {
      const { password } = req.body;
      const email = req.body.email?.toLowerCase();

      
      let user;
      
      if (useMongo) {
        user = await User.findOne({ email });
      } else {
        const dataString = await fs.readFile(USERS_FILE, "utf-8");
        const users = JSON.parse(dataString);
        user = users.find((u: any) => u.email === email);
      }

      if (!user) return res.status(400).json({ error: "User not found" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: "Invalid password" });

      const token = jwt.sign({ id: user._id || user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ token, email: user.email, username: user.username });
    } catch (error: any) {
      console.error("LOGIN ERROR:", error);
      res.status(500).json({ error: "Login failed: " + (error?.message || "Unknown error") });
    }
  });

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

  app.post("/api/cats", authenticateToken, async (req, res) => {
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

  // Start Python breed prediction server
const pythonProcess = spawn('uvicorn', ['main:app', '--port', '8000'], {
  cwd: 'C:\\Users\\Velri\\OneDrive\\Desktop\\VSC2\\Hackathon\\CatFinder',
  stdio: 'inherit',
  shell: true // needed on Windows
});

pythonProcess.on('error', (err) => {
  console.error('Failed to start Python server:', err);
});

pythonProcess.on('close', (code) => {
  console.log(`Python server exited with code ${code}`);
});

console.log('Starting Python breed prediction server on port 8000...');

  // Breed prediction proxy
  app.post("/api/predict-breed", async (req, res) => {
    try {
      const { imageBase64 } = req.body;

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const boundary = '----FormBoundary' + Math.random().toString(36);
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="cat.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        imageBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length.toString()
        },
        body
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Breed prediction error:', error);
      res.status(500).json({ error: 'Failed to predict breed' });
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
