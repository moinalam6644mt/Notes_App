"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { SyncService } from "@/services/sync-service"
import { StorageService } from "@/services/storage-service"

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const [syncState, setSyncState] = useState({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
    hasInitialSynced: false,
  })

  useEffect(() => {
    // Load last sync time from storage
    const loadLastSyncTime = async () => {
      const lastSync = await StorageService.getLastSyncTime()
      setSyncState((prev) => ({ ...prev, lastSyncTime: lastSync }))
    }
    loadLastSyncTime()

    // Set up online/offline listeners
    const handleOnline = () => {
      console.log("🌐 Network: Online")
      setSyncState((prev) => ({ ...prev, isOnline: true }))
      // Auto-sync when coming back online
      setTimeout(() => {
        triggerSync()
      }, 1000)
    }

    const handleOffline = () => {
      console.log("📴 Network: Offline")
      setSyncState((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const triggerInitialSync = async () => {
    if (syncState.hasInitialSynced || syncState.isSyncing) {
      console.log("⏭️ Initial sync skipped - already done or syncing")
      return null
    }

    console.log("🚀 Starting initial sync...")
    setSyncState((prev) => ({ ...prev, isSyncing: true, syncError: null }))

    try {
      // Check connection first
      const isConnected = await SyncService.checkConnection()
      if (!isConnected) {
        console.log("📴 No connection - loading local data only")
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          hasInitialSynced: true,
          syncError: "No internet connection",
        }))
        return await StorageService.getAllNotes()
      }

      const serverNotes = await SyncService.initialSync()
      const now = new Date().toISOString()
      await StorageService.setLastSyncTime(now)

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: now,
        syncError: null,
        hasInitialSynced: true,
      }))

      console.log("✅ Initial sync completed successfully")
      return serverNotes
    } catch (error) {
      console.error("❌ Initial sync failed:", error)
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : "Initial sync failed",
        hasInitialSynced: true, // Mark as attempted even if failed
      }))

      // Return local data as fallback
      return await StorageService.getAllNotes()
    }
  }

  const triggerSync = async () => {
    if (!syncState.isOnline || syncState.isSyncing) {
      console.log("⏭️ Sync skipped - offline or already syncing")
      return null
    }

    console.log("🔄 Starting manual sync...")
    setSyncState((prev) => ({ ...prev, isSyncing: true, syncError: null }))

    try {
      // Check connection first
      const isConnected = await SyncService.checkConnection()
      if (!isConnected) {
        throw new Error("Unable to connect to server")
      }

      const serverNotes = await SyncService.syncNotes()
      const now = new Date().toISOString()
      await StorageService.setLastSyncTime(now)

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: now,
        syncError: null,
      }))

      console.log("✅ Manual sync completed successfully")
      return serverNotes
    } catch (error) {
      console.error("❌ Manual sync failed:", error)
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : "Sync failed",
      }))
      return null
    }
  }

  return (
    <SyncContext.Provider value={{ ...syncState, triggerSync, triggerInitialSync }}>{children}</SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider")
  }
  return context
}
