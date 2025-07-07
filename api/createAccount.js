import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import validator from "validator";
import rateLimit from "express-rate-limit";

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "bobflix";

// Rate limiter: max 5 signups per IP per 10 minutes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { error: "Too many signup attempts, try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export default async function handler(req, res) {
  // Apply rate limit manually (Vercel-style API)
  await new Promise((resolve, reject) => {
    limiter(req, res, (result) => {
      return result instanceof Error ? reject(result) : resolve(result);
    });
  }).catch(() => {
    return res.status(429).json({ error: "Rate limit exceeded." });
  });

  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { username, email, password } = req.body;

  // Validation
  if (
    !username ||
    !email ||
    !password ||
    !validator.isAlphanumeric(username) ||
    !validator.isEmail(email) ||
    password.length < 6
  ) {
    return res.status(400).json({ error: "Invalid input." });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    // Check if user exists
    const exists = await users.findOne({
      $or: [{ username }, { email }],
    });
    if (exists) {
      return res.status(409).json({ error: "Username or email already taken." });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert user
    await users.insertOne({
      username,
      email,
      password: hashed,
      verified: false,
      createdAt: new Date(),
    });

    // Placeholder: send email verification link
    // (we’ll build this in verify.js)
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error." });
  } finally {
    await client.close();
  }
}
