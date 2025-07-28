"use client"
import './globals.css'

import { NotesProvider } from "@/contexts/notes-context"
import { SyncProvider } from "@/contexts/sync-context"
import NotesApp from "@/components/notes-app"


export default function Home() {
  return (
    <SyncProvider>
      <NotesProvider>
        <NotesApp />
      </NotesProvider>
    </SyncProvider>
  )
}
