import { MongoClient } from "mongodb";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "bobflix";

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // 1. Handle GET request to confirm token
  if (req.method === "GET" && token) {
    try {
      await client.connect();
      const db = client.db(dbName);
      const users = db.collection("users");

      const user = await users.findOne({ verifyToken: token });

      if (!user) {
        return new Response("Invalid or expired token.", { status: 400 });
      }

      await users.updateOne(
        { _id: user._id },
        { $set: { verified: true }, $unset: { verifyToken: "" } }
      );

      return new Response("Email verified. You may now log in.");
    } finally {
      await client.close();
    }
  }

  // 2. Handle POST request to trigger email
  if (req.method === "POST") {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = crypto.randomBytes(16).toString("hex");

    try {
      await client.connect();
      const db = client.db(dbName);
      const users = db.collection("users");

      const user = await users.findOne({ email });
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      await users.updateOne(
        { _id: user._id },
        { $set: { verifyToken: token } }
      );

      const link = `https://${process.env.VERCEL_URL}/api/verify.js?token=${token}`;

      await resend.emails.send({
        from: "Bobflix <verify@bobflix.com>",
        to: email,
        subject: "Verify your Bobflix email",
        html: `<p>Click to verify: <a href="${link}">${link}</a></p>`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: "Error sending email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      await client.close();
    }
  }

  return new Response("Not found", { status: 404 });
}

