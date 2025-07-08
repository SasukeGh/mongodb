import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import validator from "validator";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, email, password } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: "Invalid username" });
  }

  const uri = "mongodb+srv://sasukeshinobi2501:Ds9Hdzt6Lwva8PKR@cluster0.mxpdzkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
  if (!uri) {
    console.error("❌ MONGODB_URI is missing");
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const client = new MongoClient(uri);
  const dbName = "bobflix"; // ✅ replace with your real DB name

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    // One-time index creation (Mongo ignores if already exists)
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ username: 1 }, { unique: true });

    const hash = await bcrypt.hash(password, 10);

    await users.insertOne({
      username,
      email,
      password: hash,
      verified: false,
      createdAt: new Date()
    });

    return res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email or username already exists" });
    }
    console.error("🔥 Account creation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
}
