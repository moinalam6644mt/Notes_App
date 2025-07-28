import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://68852bc3f52d34140f694e84.mockapi.io/api/v1/notes/notes';
const LAST_SYNC_KEY = 'lastSyncTimestamp';
const PENDING_CHANGES_KEY = 'pendingChanges';

class SyncService {
  async syncNotes(localNotes) {
    try {
      console.log('🔄 === SYNC START ===');
      console.log(`📱 Local notes count: ${localNotes.length}`);
      
      // Step 1: Push pending changes to server
      await this.pushPendingChanges();
      
      // Step 2: Pull latest data from server
      const serverNotes = await this.fetchNotesFromServer();
      console.log(`🌐 Server notes count: ${serverNotes.length}`);
      
      // Step 3: Get last sync timestamp
      const lastSyncTime = await this.getLastSyncTime();
      console.log(`⏰ Last sync time: ${lastSyncTime}`);
      
      // Step 4: Merge server data with local data
      const mergedNotes = await this.mergeNotes(localNotes, serverNotes, lastSyncTime);
      console.log(`🔀 Merged notes count: ${mergedNotes.length}`);
      
      // Step 5: Update last sync timestamp
      await this.updateLastSyncTime();
      
      // Step 6: Clear pending changes
      await this.clearPendingChanges();
      
      console.log('✅ === SYNC COMPLETE ===');
      return mergedNotes;
    } catch (error) {
      console.error('❌ === SYNC FAILED ===', error);
      throw error;
    }
  }

  async saveNoteOffline(note) {
    console.log('💾 Saving note offline:', note.id);
    
    const pendingChange = {
      noteId: note.id,
      action: note.id.startsWith('temp_') ? 'create' : 'update',
      note: { ...note, isDirty: true },
      timestamp: new Date().toISOString(),
    };
    
    await this.addPendingChange(pendingChange);
    console.log('📋 Added to pending changes:', pendingChange.action, note.id);
  }

  async deleteNoteOffline(noteId) {
    console.log('🗑️ Deleting note offline:', noteId);
    
    const pendingChange = {
      noteId,
      action: 'delete',
      timestamp: new Date().toISOString(),
    };
    
    await this.addPendingChange(pendingChange);
    console.log('📋 Added deletion to pending changes:', noteId);
  }

  async pushPendingChanges() {
    const pendingChanges = await this.getPendingChanges();
    
    if (pendingChanges.length === 0) {
      console.log('📋 No pending changes to push');
      return;
    }

    console.log(`📤 Pushing ${pendingChanges.length} pending changes...`);

    for (const change of pendingChanges) {
      try {
        console.log(`🔄 Processing ${change.action} for note ${change.noteId}`);
        
        switch (change.action) {
          case 'create':
            if (change.note) {
              const created = await this.createNoteOnServer(change.note);
              console.log('✅ Created note on server:', created.id);
            }
            break;
          case 'update':
            if (change.note) {
              const updated = await this.updateNoteOnServer(change.note);
              console.log('✅ Updated note on server:', updated.id);
            }
            break;
          case 'delete':
            await this.deleteNoteOnServer(change.noteId);
            console.log('✅ Deleted note on server:', change.noteId);
            break;
        }
      } catch (error) {
        console.error(`❌ Failed to push change for note ${change.noteId}:`, error);
        // Log the full error details
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        // Continue with other changes even if one fails
      }
    }
  }

  async createNoteOnServer(note) {
    // Clean the note data for server
    const noteToCreate = {
      title: note.title || '',
      body: note.body || '',
      updatedAt: note.updatedAt || new Date().toISOString(),
    };

    console.log('📤 Creating note on server:', noteToCreate);

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteToCreate),
      });

      console.log('📡 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Failed to create note: ${response.status} ${errorText}`);
      }

      const created = await response.json();
      console.log('✅ Server created note:', created);
      return created;
    } catch (error) {
      console.error('❌ Network error creating note:', error);
      throw error;
    }
  }

  async updateNoteOnServer(note) {
    // Skip temp notes that haven't been created on server yet
    if (note.id.startsWith('temp_')) {
      console.log('🔄 Converting temp note to create:', note.id);
      return this.createNoteOnServer(note);
    }

    const noteToUpdate = {
      title: note.title || '',
      body: note.body || '',
      updatedAt: note.updatedAt || new Date().toISOString(),
    };

    console.log('📤 Updating note on server:', note.id, noteToUpdate);

    try {
      const response = await fetch(`${API_BASE_URL}/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteToUpdate),
      });

      console.log('📡 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Failed to update note: ${response.status} ${errorText}`);
      }

      const updated = await response.json();
      console.log('✅ Server updated note:', updated);
      return updated;
    } catch (error) {
      console.error('❌ Network error updating note:', error);
      throw error;
    }
  }

  async deleteNoteOnServer(noteId) {
    // Skip temp notes that were never synced
    if (noteId.startsWith('temp_')) {
      console.log('⏭️ Skipping delete for temp note:', noteId);
      return;
    }

    console.log('📤 Deleting note on server:', noteId);

    try {
      const response = await fetch(`${API_BASE_URL}/${noteId}`, {
        method: 'DELETE',
      });

      console.log('📡 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Failed to delete note: ${response.status} ${errorText}`);
      }

      console.log('✅ Successfully deleted note on server:', noteId);
    } catch (error) {
      console.error('❌ Network error deleting note:', error);
      throw error;
    }
  }

  async fetchNotesFromServer() {
    console.log('📥 Fetching notes from server...');
    
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Failed to fetch notes: ${response.status} ${errorText}`);
      }

      const notes = await response.json();
      console.log(`📥 Fetched ${notes.length} notes from server`);
      
      // Log first few notes for debugging
      if (notes.length > 0) {
        console.log('📄 Sample server note:', notes[0]);
      }
      
      // Ensure all notes have required fields and clean state
      const cleanNotes = notes.map((note) => ({
        id: note.id.toString(),
        title: note.title || '',
        body: note.body || '',
        updatedAt: note.updatedAt || new Date().toISOString(),
        isDirty: false,
        deleted: false,
      }));

      return cleanNotes;
    } catch (error) {
      console.error('❌ Network error fetching notes:', error);
      throw error;
    }
  }

  async mergeNotes(localNotes, serverNotes, lastSyncTime) {
    console.log('🔀 Merging notes...');
    const mergedMap = new Map();

    // Add all server notes first
    serverNotes.forEach(note => {
      mergedMap.set(note.id, note);
    });

    // Handle local notes
    localNotes.forEach(localNote => {
      const serverNote = mergedMap.get(localNote.id);
      
      if (localNote.id.startsWith('temp_')) {
        // Temporary local note - keep it for sync
        console.log('📝 Keeping temp note:', localNote.id);
        mergedMap.set(localNote.id, localNote);
      } else if (!serverNote) {
        // Local note not on server - might have been deleted on server
        if (new Date(localNote.updatedAt) > new Date(lastSyncTime)) {
          // Local note is newer than last sync, keep it
          console.log('📝 Keeping newer local note:', localNote.id);
          mergedMap.set(localNote.id, localNote);
        } else {
          console.log('🗑️ Removing old local note (deleted on server):', localNote.id);
        }
      } else if (localNote.isDirty) {
        // Conflict resolution: compare timestamps
        const localTime = new Date(localNote.updatedAt).getTime();
        const serverTime = new Date(serverNote.updatedAt).getTime();
        
        if (localTime > serverTime) {
          // Local version is newer, keep it
          console.log('📝 Local version newer, keeping:', localNote.id);
          mergedMap.set(localNote.id, localNote);
        } else {
          console.log('🌐 Server version newer, keeping:', serverNote.id);
          // Server version already in map
        }
      }
    });

    const result = Array.from(mergedMap.values()).filter(note => !note.deleted);
    console.log(`🔀 Merge result: ${result.length} notes`);
    return result;
  }

  // Pending changes management
  async addPendingChange(change) {
    const pendingChanges = await this.getPendingChanges();
    
    // Remove any existing change for the same note
    const filteredChanges = pendingChanges.filter(c => c.noteId !== change.noteId);
    
    // Add the new change
    filteredChanges.push(change);
    
    await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filteredChanges));
    console.log(`📋 Added pending change: ${change.action} for ${change.noteId}`);
  }

  async getPendingChanges() {
    try {
      const stored = await AsyncStorage.getItem(PENDING_CHANGES_KEY);
      const changes = stored ? JSON.parse(stored) : [];
      console.log(`📋 Retrieved ${changes.length} pending changes`);
      return changes;
    } catch (error) {
      console.error('❌ Error getting pending changes:', error);
      return [];
    }
  }

  async clearPendingChanges() {
    await AsyncStorage.removeItem(PENDING_CHANGES_KEY);
    console.log('🧹 Cleared pending changes');
  }

  // Sync timestamp management
  async getLastSyncTime() {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp || '1970-01-01T00:00:00.000Z';
    } catch (error) {
      console.error('❌ Error getting last sync time:', error);
      return '1970-01-01T00:00:00.000Z';
    }
  }

  async updateLastSyncTime() {
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
    console.log('⏰ Updated last sync time:', timestamp);
  }

  // Utility methods
  async hasPendingChanges() {
    const changes = await this.getPendingChanges();
    return changes.length > 0;
  }

  async getSyncInfo() {
    const lastSyncTime = await this.getLastSyncTime();
    const pendingChanges = await this.getPendingChanges();
    
    return {
      lastSyncTime,
      pendingChanges: pendingChanges.length,
    };
  }

  // Debug method to clear all sync data
  async clearAllSyncData() {
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    await AsyncStorage.removeItem(PENDING_CHANGES_KEY);
    console.log('🧹 Cleared all sync data');
  }
}

export const syncService = new SyncService();