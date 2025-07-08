export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  console.log("📥 Signup attempt:");
  console.log("Username:", username);
  console.log("Email:", email);
  console.log("Password:", password); // ⚠️ For dev only

  return res.status(200).json({ success: true, message: "Data received" });
}
