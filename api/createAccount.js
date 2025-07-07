import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import validator from "validator";

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "Cluster0"; // change this if your DB name is different

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

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    // One-time: create unique indexes on email and username
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ username: 1 }, { unique: true });

    const hash = await bcrypt.hash(password, 10);

    await users.insertOne({
      username,
      email,
      password: hash,
      verified: false, // for email verification
      createdAt: new Date()
    });

    return res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email or username already exists" });
    }
    console.error("Account creation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
}
