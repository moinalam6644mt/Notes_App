class StorageServiceClass {
  constructor() {
    this.dbName = "NotesAppDB"
    this.dbVersion = 1
    this.storeName = "notes"
    this.metaStoreName = "metadata"
    this.db = null
  }

  async initDB() {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create notes store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const notesStore = db.createObjectStore(this.storeName, { keyPath: "id" })
          notesStore.createIndex("updatedAt", "updatedAt", { unique: false })
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(this.metaStoreName)) {
          db.createObjectStore(this.metaStoreName, { keyPath: "key" })
        }
      }
    })
  }

  async getAllNotes() {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], "readonly")
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          const notes = request.result || []

          // Remove duplicates and ensure all notes have proper structure
          const uniqueNotesMap = new Map()

          notes.forEach((note) => {
            const existingNote = uniqueNotesMap.get(note.id)
            const currentNoteTime = new Date(note.updatedAt).getTime()

            if (!existingNote || new Date(existingNote.updatedAt).getTime() < currentNoteTime) {
              uniqueNotesMap.set(note.id, {
                id: note.id,
                title: note.title || "",
                body: note.body || "",
                updatedAt: note.updatedAt,
                deleted: note.deleted || false,
                isDirty: note.isDirty || false,
              })
            }
          })

          const validNotes = Array.from(uniqueNotesMap.values())
          console.log(`Storage: Loaded ${validNotes.length} unique notes from IndexedDB`)
          resolve(validNotes)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn("IndexedDB failed, falling back to localStorage:", error)
      // Fallback to localStorage
      const notes = localStorage.getItem("notes")
      const parsedNotes = notes ? JSON.parse(notes) : []

      // Remove duplicates from localStorage too
      const uniqueNotesMap = new Map()

      parsedNotes.forEach((note) => {
        const existingNote = uniqueNotesMap.get(note.id)
        const currentNoteTime = new Date(note.updatedAt).getTime()

        if (!existingNote || new Date(existingNote.updatedAt).getTime() < currentNoteTime) {
          uniqueNotesMap.set(note.id, {
            id: note.id,
            title: note.title || "",
            body: note.body || "",
            updatedAt: note.updatedAt,
            deleted: note.deleted || false,
            isDirty: note.isDirty || false,
          })
        }
      })

      const validNotes = Array.from(uniqueNotesMap.values())
      console.log(`Storage: Loaded ${validNotes.length} unique notes from localStorage`)
      return validNotes
    }
  }

  async saveNote(note) {
    const noteToSave = {
      id: note.id,
      title: note.title || "",
      body: note.body || "",
      updatedAt: note.updatedAt,
      deleted: note.deleted || false,
      isDirty: true,
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)

      return new Promise((resolve, reject) => {
        const request = store.put(noteToSave)
        request.onsuccess = () => {
          console.log(`Storage: Saved note ${noteToSave.id} to IndexedDB`)
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn("IndexedDB failed, falling back to localStorage:", error)
      // Fallback to localStorage
      const notes = await this.getAllNotes()
      const updatedNotes = notes.filter((n) => n.id !== note.id)
      updatedNotes.push(noteToSave)
      localStorage.setItem("notes", JSON.stringify(updatedNotes))
      console.log(`Storage: Saved note ${noteToSave.id} to localStorage`)
    }
  }

  async deleteNote(id) {
    const notes = await this.getAllNotes()
    const note = notes.find((n) => n.id === id)
    if (note) {
      await this.saveNote({
        ...note,
        deleted: true,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  async getDirtyNotes() {
    const notes = await this.getAllNotes()
    return notes.filter((note) => note.isDirty)
  }

  async markNotesClean(noteIds) {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)

      for (const id of noteIds) {
        const getRequest = store.get(id)
        getRequest.onsuccess = () => {
          const note = getRequest.result
          if (note) {
            note.isDirty = false
            store.put(note)
          }
        }
      }
    } catch (error) {
      // Fallback to localStorage
      const notes = await this.getAllNotes()
      const updatedNotes = notes.map((note) => (noteIds.includes(note.id) ? { ...note, isDirty: false } : note))
      localStorage.setItem("notes", JSON.stringify(updatedNotes))
    }
  }

  async replaceAllNotes(notes) {
    // Remove duplicates before storing
    const uniqueNotesMap = new Map()

    notes.forEach((note) => {
      const existingNote = uniqueNotesMap.get(note.id)
      const currentNoteTime = new Date(note.updatedAt).getTime()

      if (!existingNote || new Date(existingNote.updatedAt).getTime() < currentNoteTime) {
        uniqueNotesMap.set(note.id, {
          id: note.id,
          title: note.title || "",
          body: note.body || "",
          updatedAt: note.updatedAt,
          deleted: note.deleted || false,
          isDirty: note.isDirty || false,
        })
      }
    })

    const validNotes = Array.from(uniqueNotesMap.values())

    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)

      // Clear existing notes
      await new Promise((resolve, reject) => {
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => resolve()
        clearRequest.onerror = () => reject(clearRequest.error)
      })

      // Add new notes
      for (const note of validNotes) {
        await new Promise((resolve, reject) => {
          const addRequest = store.add(note)
          addRequest.onsuccess = () => resolve()
          addRequest.onerror = () => reject(addRequest.error)
        })
      }

      console.log(`Storage: Replaced all notes with ${validNotes.length} unique notes in IndexedDB`)
    } catch (error) {
      // Fallback to localStorage
      localStorage.setItem("notes", JSON.stringify(validNotes))
      console.log(`Storage: Replaced all notes with ${validNotes.length} unique notes in localStorage`)
    }
  }

  async getLastSyncTime() {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.metaStoreName], "readonly")
      const store = transaction.objectStore(this.metaStoreName)

      return new Promise((resolve) => {
        const request = store.get("lastSyncTime")
        request.onsuccess = () => {
          resolve(request.result?.value || null)
        }
        request.onerror = () => resolve(null)
      })
    } catch (error) {
      return localStorage.getItem("lastSyncTime")
    }
  }

  async setLastSyncTime(time) {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.metaStoreName], "readwrite")
      const store = transaction.objectStore(this.metaStoreName)

      return new Promise((resolve, reject) => {
        const request = store.put({ key: "lastSyncTime", value: time })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      localStorage.setItem("lastSyncTime", time)
    }
  }

  async clearAllData() {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName, this.metaStoreName], "readwrite")
      const notesStore = transaction.objectStore(this.storeName)
      const metaStore = transaction.objectStore(this.metaStoreName)

      await Promise.all([
        new Promise((resolve) => {
          const request = notesStore.clear()
          request.onsuccess = () => resolve()
        }),
        new Promise((resolve) => {
          const request = metaStore.clear()
          request.onsuccess = () => resolve()
        }),
      ])
    } catch (error) {
      localStorage.removeItem("notes")
      localStorage.removeItem("lastSyncTime")
    }
  }
}

export const StorageService = new StorageServiceClass()
