import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { syncService } from '../services/SyncService';

const initialState = {
  notes: [],
  syncStatus: {
    isOnline: false,
    isSyncing: false,
  }
};

const notesReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.payload] };
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(note => 
          note.id === action.payload.id ? action.payload : note
        )
      };
    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.map(note => 
          note.id === action.payload 
            ? { ...note, deleted: true, isDirty: true, updatedAt: new Date().toISOString() }
            : note
        )
      };
    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: { ...state.syncStatus, ...action.payload }
      };
    default:
      return state;
  }
};

const NotesContext = createContext(null);

export const NotesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notesReducer, initialState);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🚀 Initializing app...');
    await loadNotesFromStorage();
    setupNetworkListener();
    
    // Check initial network state
    const netInfo = await NetInfo.fetch();
    console.log('📶 Initial network state:', netInfo.isConnected);
    
    if (netInfo.isConnected) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: { isOnline: true } });
      // Try initial sync after a short delay
      setTimeout(() => {
        syncNotes();
      }, 1000);
    }
  };

  const loadNotesFromStorage = async () => {
    try {
      console.log('📱 Loading notes from storage...');
      const storedNotes = await AsyncStorage.getItem('notes');
      if (storedNotes) {
        const notes = JSON.parse(storedNotes);
        console.log(`📱 Loaded ${notes.length} notes from storage`);
        dispatch({ type: 'SET_NOTES', payload: notes });
      }
    } catch (error) {
      console.error('❌ Error loading notes from storage:', error);
    }
  };

  const saveNotesToStorage = async (notes) => {
    try {
      await AsyncStorage.setItem('notes', JSON.stringify(notes));
      console.log(`💾 Saved ${notes.length} notes to storage`);
    } catch (error) {
      console.error('❌ Error saving notes to storage:', error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(async (netState) => {
      const wasOffline = !state.syncStatus.isOnline;
      const isNowOnline = netState.isConnected ?? false;
      
      console.log('📶 Network state changed:', { wasOffline, isNowOnline });
      
      dispatch({ 
        type: 'SET_SYNC_STATUS', 
        payload: { isOnline: isNowOnline } 
      });
      
      // Auto-sync when coming back online
      if (isNowOnline && wasOffline) {
        console.log('🔄 Network restored, starting auto-sync...');
        setTimeout(() => {
          syncNotes();
        }, 500);
      }
    });

    return unsubscribe;
  };

  const createNote = async (title, body) => {
    console.log('✏️ Creating note:', { title: title.substring(0, 20), body: body.substring(0, 20) });
    
    const newNote = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      body,
      updatedAt: new Date().toISOString(),
      isDirty: true,
    };

    // Add to local state immediately
    dispatch({ type: 'ADD_NOTE', payload: newNote });
    
    // Get current state for storage (we need to manually build the updated array)
    const currentNotes = state.notes;
    const updatedNotes = [...currentNotes, newNote];
    await saveNotesToStorage(updatedNotes);

    // Queue for sync
    await syncService.saveNoteOffline(newNote);
    console.log('📝 Note queued for sync:', newNote.id);

    // Try immediate sync if online
    if (state.syncStatus.isOnline && !state.syncStatus.isSyncing) {
      console.log('🔄 Triggering immediate sync for new note...');
      setTimeout(() => {
        syncNotes();
      }, 100);
    }
  };

  const updateNote = async (id, title, body) => {
    console.log('📝 Updating note:', { id, title: title.substring(0, 20) });
    
    const updatedNote = {
      id,
      title,
      body,
      updatedAt: new Date().toISOString(),
      isDirty: true,
    };

    // Update local state immediately
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
    
    // Get current state for storage
    const updatedNotes = state.notes.map(note => 
      note.id === id ? updatedNote : note
    );
    await saveNotesToStorage(updatedNotes);

    // Queue for sync
    await syncService.saveNoteOffline(updatedNote);
    console.log('📝 Note update queued for sync:', id);

    // Try immediate sync if online
    if (state.syncStatus.isOnline && !state.syncStatus.isSyncing) {
      console.log('🔄 Triggering immediate sync for updated note...');
      setTimeout(() => {
        syncNotes();
      }, 100);
    }
  };

  const deleteNote = async (id) => {
    console.log('🗑️ Deleting note:', id);
    
    // Mark as deleted locally
    dispatch({ type: 'DELETE_NOTE', payload: id });
    
    // Get current state for storage
    const updatedNotes = state.notes.map(note => 
      note.id === id 
        ? { ...note, deleted: true, isDirty: true, updatedAt: new Date().toISOString() }
        : note
    );
    await saveNotesToStorage(updatedNotes);

    // Queue for sync
    await syncService.deleteNoteOffline(id);
    console.log('🗑️ Note deletion queued for sync:', id);

    // Try immediate sync if online
    if (state.syncStatus.isOnline && !state.syncStatus.isSyncing) {
      console.log('🔄 Triggering immediate sync for deleted note...');
      setTimeout(() => {
        syncNotes();
      }, 100);
    }
  };

  const syncNotes = async () => {
    if (!state.syncStatus.isOnline) {
      console.log('⚠️ Skipping sync - offline');
      return;
    }
    
    if (state.syncStatus.isSyncing) {
      console.log('⚠️ Skipping sync - already syncing');
      return;
    }

    console.log('🔄 Starting sync...');
    dispatch({ type: 'SET_SYNC_STATUS', payload: { isSyncing: true, error: undefined } });

    try {
      // Check if we have pending changes
      const hasPending = await syncService.hasPendingChanges();
      console.log('📋 Has pending changes:', hasPending);

      const syncedNotes = await syncService.syncNotes(state.notes);
      console.log(`✅ Sync completed - got ${syncedNotes.length} notes`);
      
      // Update local state with synced notes
      dispatch({ type: 'SET_NOTES', payload: syncedNotes });
      await saveNotesToStorage(syncedNotes);
      
      // Get sync info for status display
      const syncInfo = await syncService.getSyncInfo();
      
      dispatch({ 
        type: 'SET_SYNC_STATUS', 
        payload: { 
          isSyncing: false, 
          lastSyncAt: syncInfo.lastSyncTime,
          pendingChanges: syncInfo.pendingChanges,
        } 
      });
      
      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      dispatch({ 
        type: 'SET_SYNC_STATUS', 
        payload: { 
          isSyncing: false, 
          error: error instanceof Error ? error.message : 'Sync failed' 
        } 
      });
    }
  };

  const loadInitialData = async () => {
    console.log('🔄 Loading initial data...');
    if (state.syncStatus.isOnline) {
      await syncNotes();
    } else {
      await loadNotesFromStorage();
    }
  };

  // Auto-save to storage whenever notes change
  useEffect(() => {
    if (state.notes.length >= 0) {
      saveNotesToStorage(state.notes);
    }
  }, [state.notes]);

  return (
    <NotesContext.Provider value={{
      state,
      dispatch,
      createNote,
      updateNote,
      deleteNote,
      syncNotes,
      loadInitialData,
    }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};