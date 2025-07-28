import { StorageService } from "./storage-service"

class SyncServiceClass {
  constructor() {
    // Updated to use your MockAPI endpoint
    this.baseUrl = "https://68852bc3f52d34140f694e84.mockapi.io/api/v1/notes"
  }

  async syncNotes() {
    try {
      console.log("Starting sync process...")

      // Get dirty notes (local changes)
      const dirtyNotes = await StorageService.getDirtyNotes()
      console.log(`Found ${dirtyNotes.length} dirty notes to sync`)

      // Push local changes to server
      if (dirtyNotes.length > 0) {
        await this.pushNotes(dirtyNotes)
        await StorageService.markNotesClean(dirtyNotes.map((n) => n.id))
        console.log("Successfully pushed local changes")
      }

      // Pull latest from server
      const serverNotes = await this.pullNotes()
      console.log(`Pulled ${serverNotes.length} notes from server`)

      // Merge with local notes
      await this.mergeNotes(serverNotes)
      console.log("Sync completed successfully")
    } catch (error) {
      console.error("Sync failed:", error)
      throw error
    }
  }

  async pushNotes(notes) {
    try {
      console.log("Pushing notes to server...")

      // Push each note individually to MockAPI
      for (const note of notes) {
        if (note.deleted) {
          // Delete note from server
          await this.deleteNoteFromServer(note.id)
        } else {
          // Create or update note on server
          await this.saveNoteToServer(note)
        }
      }
    } catch (error) {
      console.error("Push notes failed:", error)
      throw error
    }
  }

  async saveNoteToServer(note) {
    try {
      // Check if note exists on server
      const existingNote = await this.getNoteFromServer(note.id)

      const noteData = {
        id: note.id,
        title: note.title,
        body: note.body,
        updatedAt: note.updatedAt,
        deleted: note.deleted || false,
      }

      if (existingNote) {
        // Update existing note
        console.log(`Updating note ${note.id} on server`)
        const response = await fetch(`${this.baseUrl}/notes/${note.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(noteData),
        })

        if (!response.ok) {
          throw new Error(`Failed to update note: ${response.statusText}`)
        }
      } else {
        // Create new note
        console.log(`Creating note ${note.id} on server`)
        const response = await fetch(`${this.baseUrl}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(noteData),
        })

        if (!response.ok) {
          throw new Error(`Failed to create note: ${response.statusText}`)
        }
      }
    } catch (error) {
      console.error("Save note to server failed:", error)
      throw error
    }
  }

  async getNoteFromServer(noteId) {
    try {
      const response = await fetch(`${this.baseUrl}/notes/${noteId}`)

      if (response.status === 404) {
        return null // Note doesn't exist
      }

      if (!response.ok) {
        throw new Error(`Failed to get note: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Get note from server failed:", error)
      return null
    }
  }

  async deleteNoteFromServer(noteId) {
    try {
      console.log(`Deleting note ${noteId} from server`)
      const response = await fetch(`${this.baseUrl}/notes/${noteId}`, {
        method: "DELETE",
      })

      // MockAPI returns 200 even if note doesn't exist, so we don't check for 404
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete note: ${response.statusText}`)
      }
    } catch (error) {
      console.error("Delete note from server failed:", error)
      // Don't throw error for delete operations to prevent sync failures
    }
  }

  async pullNotes() {
    try {
      console.log("Pulling notes from server...")
      const response = await fetch(`${this.baseUrl}/notes`)

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Raw API response:", data)

      // Handle the data structure from your API
      let notes = []

      if (Array.isArray(data)) {
        // If data is an array, extract notes from each item
        notes = data.reduce((allNotes, item) => {
          if (item.notes && Array.isArray(item.notes)) {
            // Extract notes from the nested structure
            const validNotes = item.notes.filter((note) => note.id && !note.deleted)
            return [...allNotes, ...validNotes]
          } else if (item.id && item.title !== undefined) {
            // If the item itself is a note and not deleted
            if (!item.deleted) {
              return [...allNotes, item]
            }
          }
          return allNotes
        }, [])
      }

      // Ensure proper structure and filter out deleted notes
      const processedNotes = notes
        .filter((note) => note.id && !note.deleted)
        .map((note) => ({
          id: note.id,
          title: note.title || "",
          body: note.body || "",
          updatedAt: note.updatedAt,
          deleted: false,
          isDirty: false,
        }))

      console.log(`Processed ${processedNotes.length} notes from server`)
      return processedNotes
    } catch (error) {
      console.error("Pull notes failed:", error)
      throw error
    }
  }

  async mergeNotes(serverNotes) {
    console.log("Merging notes...")
    const localNotes = await StorageService.getAllNotes()
    const mergedNotes = []

    // Create a map for faster lookup
    const localNotesMap = new Map(localNotes.map((note) => [note.id, note]))
    const serverNotesMap = new Map(serverNotes.map((note) => [note.id, note]))

    // Process all unique note IDs
    const allNoteIds = new Set([...localNotes.map((n) => n.id), ...serverNotes.map((n) => n.id)])

    for (const noteId of allNoteIds) {
      const localNote = localNotesMap.get(noteId)
      const serverNote = serverNotesMap.get(noteId)

      if (!localNote && serverNote) {
        // Server-only note
        mergedNotes.push({ ...serverNote, isDirty: false })
      } else if (localNote && !serverNote) {
        // Local-only note (keep as is)
        mergedNotes.push(localNote)
      } else if (localNote && serverNote) {
        // Both exist - resolve conflict
        const resolvedNote = this.resolveConflict(localNote, serverNote)
        mergedNotes.push(resolvedNote)
      }
    }

    // Save merged notes
    await StorageService.replaceAllNotes(mergedNotes)
    console.log(`Merged ${mergedNotes.length} notes`)
  }

  resolveConflict(localNote, serverNote) {
    // Simple last-writer-wins strategy
    const localTime = new Date(localNote.updatedAt).getTime()
    const serverTime = new Date(serverNote.updatedAt).getTime()

    if (localTime > serverTime) {
      console.log(`Local note ${localNote.id} is newer, keeping local version`)
      return { ...localNote, isDirty: false }
    } else {
      console.log(`Server note ${serverNote.id} is newer, keeping server version`)
      return { ...serverNote, isDirty: false }
    }
  }

  // Health check method
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/notes?limit=1`)
      return response.ok
    } catch (error) {
      return false
    }
  }
}

export const SyncService = new SyncServiceClass()
