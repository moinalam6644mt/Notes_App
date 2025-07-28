import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNotes } from '../context/NotesContext';

const NoteEditorScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, createNote, updateNote, deleteNote } = useNotes();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialBody, setInitialBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Use ref to track if we're in the middle of saving to prevent loops
  const isSavingRef = useRef(false);

  const noteId = route.params?.noteId;
  const isEditing = !!noteId;
  const existingNote = noteId ? state.notes.find(note => note.id === noteId && !note.deleted) : null;

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setBody(existingNote.body);
      setInitialTitle(existingNote.title);
      setInitialBody(existingNote.body);
    } else {
      setInitialTitle('');
      setInitialBody('');
    }
  }, [existingNote]);

  useEffect(() => {
    // Don't show changes if we're currently saving
    if (!isSaving) {
      setHasChanges(title !== initialTitle || body !== initialBody);
    }
  }, [title, body, initialTitle, initialBody, isSaving]);

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      Alert.alert('Empty Note', 'Please add some content before saving.');
      return;
    }

    // Prevent multiple saves and navigation loops
    if (isSavingRef.current) return;

    setIsSaving(true);
    isSavingRef.current = true;

    try {
      if (isEditing && noteId) {
        await updateNote(noteId, title, body);
      } else {
        await createNote(title, body);
      }

      // Update initial values to reflect saved state
      setInitialTitle(title);
      setInitialBody(body);
      setHasChanges(false);

      // Small delay to ensure state updates, then navigate
      setTimeout(() => {
        navigation.goBack();
      }, 100);

    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleDelete = () => {
    if (!isEditing || !noteId) return;

    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(noteId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleBackPress = () => {
    // If we're saving, don't show the alert
    if (isSavingRef.current) {
      return;
    }

    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setHasChanges(false);
              navigation.goBack();
            }
          },
          {
            text: 'Save',
            onPress: handleSave
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          {isEditing && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Text style={styles.deleteButton}>🗑️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            style={styles.headerButton}
          >
            <Text style={[
              styles.saveButton,
              (!hasChanges || isSaving) && styles.saveButtonDisabled
            ]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, hasChanges, title, body, isEditing, isSaving]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Don't prevent navigation if we're saving or no changes
      if (!hasChanges || isSavingRef.current) {
        return;
      }

      e.preventDefault();
      handleBackPress();
    });

    return unsubscribe;
  }, [navigation, hasChanges]);

  // Reset saving state when component unmounts
  useEffect(() => {
    return () => {
      isSavingRef.current = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.titleInput}
        placeholder="Note title..."
        value={title}
        onChangeText={setTitle}
        multiline
        autoFocus={!isEditing}
        editable={!isSaving}
      />
      <TextInput
        style={styles.bodyInput}
        placeholder="Start writing..."
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
        editable={!isSaving}
      />

      {/* Status indicator */}
      {(hasChanges || isSaving) && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isSaving ? '• Saving...' : '• Unsaved changes'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButton: {
    fontSize: 24,
    color: '#007AFF',
    marginLeft: 8,
  },
  deleteButton: {
    fontSize: 20,
    marginRight: 8,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 16,
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 100,
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    padding: 16,
    lineHeight: 24,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default NoteEditorScreen;