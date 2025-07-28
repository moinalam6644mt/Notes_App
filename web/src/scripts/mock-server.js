const express = require("express")
const cors = require("cors")
const fs = require("fs").promises
const path = require("path")

const app = express()
const PORT = 3001
const DATA_FILE = path.join(__dirname, "notes-data.json")

app.use(cors())
app.use(express.json())

// Initialize data file
async function initDataFile() {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ notes: [] }))
  }
}

// Read notes from file
async function readNotes() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return { notes: [] }
  }
}

// Write notes to file
async function writeNotes(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

// Get all notes
app.get("/api/notes", async (req, res) => {
  try {
    const data = await readNotes()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: "Failed to read notes" })
  }
})

// Sync notes (push local changes)
app.post("/api/notes/sync", async (req, res) => {
  try {
    const { notes: incomingNotes } = req.body
    const data = await readNotes()

    // Merge incoming notes with existing ones
    const existingNotesMap = new Map(data.notes.map((note) => [note.id, note]))

    for (const note of incomingNotes) {
      const existing = existingNotesMap.get(note.id)

      if (!existing || new Date(note.updatedAt) > new Date(existing.updatedAt)) {
        existingNotesMap.set(note.id, note)
      }
    }

    data.notes = Array.from(existingNotesMap.values())
    await writeNotes(data)

    res.json({ success: true, count: incomingNotes.length })
  } catch (error) {
    res.status(500).json({ error: "Failed to sync notes" })
  }
})

// Start server
initDataFile().then(() => {
  app.listen(PORT, () => {
    console.log(`Mock server running on http://localhost:${PORT}`)
  })
})
