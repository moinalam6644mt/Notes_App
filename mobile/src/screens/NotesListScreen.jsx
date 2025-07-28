import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNotes } from '../context/NotesContext';
import { useDebounce } from '../hooks/useDebounce';
import { syncService } from '../services/SyncService';

const NotesListScreen = () => {
  const navigation = useNavigation();
  const { state, syncNotes, deleteNote, loadInitialData } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [syncInfo, setSyncInfo] = useState({ lastSyncTime: '', pendingChanges: 0 });
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadInitialData();
    updateSyncInfo();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      updateSyncInfo();
    }, [state.notes])
  );

  useEffect(() => {
    updateSyncInfo();
  }, [state.syncStatus]);

  const updateSyncInfo = async () => {
    try {
      const info = await syncService.getSyncInfo();
      setSyncInfo(info);
    } catch (error) {
      console.error('Error getting sync info:', error);
    }
  };

  const filteredNotes = useMemo(() => {
    return state.notes
      .filter(note => !note.deleted)
      .filter(note =>
        debouncedSearchQuery === '' ||
        note.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        note.body.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [state.notes, debouncedSearchQuery]);

  const handleNotePress = (noteId) => {
    navigation.navigate('NoteEditor', { noteId });
  };

  const handleDeleteNote = (noteId, noteTitle) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${noteTitle || 'Untitled'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(noteId);
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note. Please try again.');
            }
          }
        },
      ]
    );
  };

  const formatSyncTime = (timestamp) => {
    if (!timestamp || timestamp === '1970-01-01T00:00:00.000Z') {
      return 'Never';
    }
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderNote = ({ item }) => (
    <View style={[styles.noteItem, item.isDirty && styles.noteItemDirty]}>
      <TouchableOpacity
        style={styles.noteContent}
        onPress={() => handleNotePress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle}>{item.title || 'Untitled'}</Text>
          {item.isDirty && <View style={styles.dirtyIndicator} />}
        </View>
        <Text style={styles.noteBody} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          <Text style={styles.noteId}>
            {item.id.startsWith('temp_') ? 'Local' : 'Synced'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNote(item.id, item.title)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Enhanced Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: state.syncStatus.isOnline ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.statusText}>
            {state.syncStatus.isOnline ? 'Online' : 'Offline'}
          </Text>
          {state.syncStatus.isSyncing && (
            <Text style={styles.syncingText}> - Syncing...</Text>
          )}
        </View>

        <View style={styles.statusRight}>
          {syncInfo.pendingChanges > 0 && (
            <Text style={styles.pendingText}>
              {syncInfo.pendingChanges} pending
            </Text>
          )}
          <Text style={styles.lastSyncText}>
            Last sync: {formatSyncTime(syncInfo.lastSyncTime)}
          </Text>
        </View>
      </View>

      {/* Error Display */}
      {state.syncStatus.error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>
            Sync Error: {state.syncStatus.error}
          </Text>
          <TouchableOpacity onPress={syncNotes}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search notes..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        refreshControl={
          <RefreshControl
            refreshing={state.syncStatus.isSyncing}
            onRefresh={syncNotes}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No notes found' : 'No notes yet. Tap + to create one!'}
            </Text>
            {!state.syncStatus.isOnline && (
              <Text style={styles.offlineHint}>
                You're offline. Notes will sync when connection is restored.
              </Text>
            )}
          </View>
        }
      />

      {/* Add Note Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('NoteEditor', {})}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* Manual Sync Button */}
      {state.syncStatus.isOnline && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={syncNotes}
          disabled={state.syncStatus.isSyncing}
        >
          <Text style={styles.syncButtonText}>
            {state.syncStatus.isSyncing ? '⟳' : '↻'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRight: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
  },
  errorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
  },
  retryText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noteItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  noteItemDirty: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  noteContent: {
    flex: 1,
    padding: 16,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  dirtyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
  },
  noteBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  noteId: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 10,
  },
  offlineHint: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  syncButton: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default NotesListScreen;