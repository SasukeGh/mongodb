import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { ironSession } from "iron-session/edge";

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "bobflix";

// Session config
const sessionOptions = {
  password: "complex_password_12345678901234567890", // replace with long secret in prod
  cookieName: "bobflix_session",
  cookieOptions: {
    secure: true,
    sameSite: "strict",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30 // 30 days
  },
};

const session = ironSession(sessionOptions);

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { username, password } = await req.json();

  if (
    !username || !password ||
    typeof username !== "string" || typeof password !== "string"
  ) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const user = await db.collection("users").findOne({ username });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Incorrect password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.verified) {
      return new Response(JSON.stringify({ error: "Email not verified" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const sessionStore = session(req, res);
    await sessionStore.set("user", { username });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await client.close();
  }
}
