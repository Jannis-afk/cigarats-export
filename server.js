const express = require("express")
const path = require("path")
const cors = require("cors")
const crypto = require("crypto")

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors()) // ✅ Enable CORS before other middleware
app.use(express.static(path.join(__dirname, "app")))
app.use(express.json()) // Add JSON body parser for API endpoints

// ImageKit authentication endpoint
app.get("/auth-imagekit", (req, res) => {
  try {
    // Replace with your ImageKit private key
    const privateKey = "private_r7117s//COr0v/lKB/yI5fRCAaE="

    // Generate a random token if not provided
    const token = req.query.token || crypto.randomBytes(16).toString("hex")

    // Set expiry time (10 minutes from now)
    const expire = Math.floor(Date.now() / 1000) + 60 * 10

    // Generate signature
    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex")

    console.log("ImageKit auth generated:", { signature, expire, token })

    // Return the authentication parameters
    res.json({
      signature,
      expire,
      token,
    })
  } catch (error) {
    console.error("ImageKit auth error:", error)
    res.status(500).json({ error: "Authentication failed" })
  }
})

// Add endpoint for Supabase storage URL
app.post("/api/avatar-upload", async (req, res) => {
  try {
    // This endpoint would handle any server-side processing needed for avatar uploads
    // For now, we'll just return success as we're handling uploads directly with Supabase client
    res.json({ success: true })
  } catch (error) {
    console.error("Avatar upload error:", error)
    res.status(500).json({ error: "Failed to process avatar upload" })
  }
})

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "app", "index.html"))
})

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`)
})
