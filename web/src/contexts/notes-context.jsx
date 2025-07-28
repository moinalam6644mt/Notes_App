"use client"

import { createContext, useContext, useReducer, useEffect } from "react"
import { StorageService } from "@/services/storage-service"

const NotesContext = createContext(null)

const initialState = {
  notes: [],
  searchQuery: "",
  filteredNotes: [],
  isLoading: true,
  error: null,
}

const notesReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false }

    case "LOAD_NOTES":
      // Filter out deleted notes and apply search
      const activeNotes = action.payload.filter((note) => !note.deleted)
      const filteredNotes = activeNotes.filter(
        (note) =>
          note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          note.body.toLowerCase().includes(state.searchQuery.toLowerCase()),
      )

      return {
        ...state,
        notes: action.payload, // Keep all notes including deleted ones
        filteredNotes,
        isLoading: false,
        error: null,
      }

    case "ADD_NOTE":
      // Check if note already exists to prevent duplication
      const existingNoteIndex = state.notes.findIndex((n) => n.id === action.payload.id)

      let newNotes
      if (existingNoteIndex >= 0) {
        // Update existing note instead of adding duplicate
        newNotes = state.notes.map((note) => (note.id === action.payload.id ? action.payload : note))
        console.log("Updated existing note instead of adding duplicate:", action.payload.id)
      } else {
        // Add new note
        newNotes = [...state.notes, action.payload]
        console.log("Added new note:", action.payload.id)
      }

      const newFilteredNotes = newNotes.filter(
        (note) =>
          !note.deleted &&
          (note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            note.body.toLowerCase().includes(state.searchQuery.toLowerCase())),
      )

      return {
        ...state,
        notes: newNotes,
        filteredNotes: newFilteredNotes,
      }

    case "UPDATE_NOTE":
      const updatedNotes = state.notes.map((note) => (note.id === action.payload.id ? action.payload : note))
      const updatedFilteredNotes = updatedNotes.filter(
        (note) =>
          !note.deleted &&
          (note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            note.body.toLowerCase().includes(state.searchQuery.toLowerCase())),
      )

      return {
        ...state,
        notes: updatedNotes,
        filteredNotes: updatedFilteredNotes,
      }

    case "DELETE_NOTE":
      const notesAfterDelete = state.notes.map((note) =>
        note.id === action.payload
          ? { ...note, deleted: true, updatedAt: new Date().toISOString(), isDirty: true }
          : note,
      )
      const filteredAfterDelete = notesAfterDelete.filter(
        (note) =>
          !note.deleted &&
          (note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            note.body.toLowerCase().includes(state.searchQuery.toLowerCase())),
      )

      return {
        ...state,
        notes: notesAfterDelete,
        filteredNotes: filteredAfterDelete,
      }

    case "SET_SEARCH_QUERY":
      const filtered = state.notes.filter(
        (note) =>
          !note.deleted &&
          (note.title.toLowerCase().includes(action.payload.toLowerCase()) ||
            note.body.toLowerCase().includes(action.payload.toLowerCase())),
      )

      return {
        ...state,
        searchQuery: action.payload,
        filteredNotes: filtered,
      }

    case "REFRESH_NOTES":
      // Refresh from storage after sync
      return {
        ...state,
        isLoading: true,
      }

    default:
      return state
  }
}

export function NotesProvider({ children }) {
  const [state, dispatch] = useReducer(notesReducer, initialState)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const notes = await StorageService.getAllNotes()

      // Remove any potential duplicates based on ID
      const uniqueNotes = notes.reduce((acc, note) => {
        const existingIndex = acc.findIndex((n) => n.id === note.id)
        if (existingIndex >= 0) {
          // Keep the one with the latest updatedAt
          const existingNote = acc[existingIndex]
          const currentNoteTime = new Date(note.updatedAt).getTime()
          const existingNoteTime = new Date(existingNote.updatedAt).getTime()

          if (currentNoteTime > existingNoteTime) {
            acc[existingIndex] = note
          }
        } else {
          acc.push(note)
        }
        return acc
      }, [])

      console.log("Loaded notes from storage:", uniqueNotes.length)
      dispatch({ type: "LOAD_NOTES", payload: uniqueNotes })
    } catch (error) {
      console.error("Failed to load notes:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to load notes" })
    }
  }

  const refreshNotes = async () => {
    await loadNotes()
  }

  return <NotesContext.Provider value={{ state, dispatch, refreshNotes }}>{children}</NotesContext.Provider>
}

export function useNotes() {
  const context = useContext(NotesContext)
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider")
  }
  return context
}
