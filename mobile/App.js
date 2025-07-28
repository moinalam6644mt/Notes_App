import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import NotesListScreen from './src/screens/NotesListScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import { NotesProvider } from './src/context/NotesContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NotesProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName="NotesList">
          <Stack.Screen 
            name="NotesList" 
            component={NotesListScreen}
            options={{ title: 'My Notes' }}
          />
          <Stack.Screen 
            name="NoteEditor" 
            component={NoteEditorScreen}
            options={{ title: 'Edit Note' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </NotesProvider>
  );
}