"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Button, Form, Spinner } from "react-bootstrap"
import { PlusLg, Search, ArrowClockwise, X } from "react-bootstrap-icons"
import { useNotes } from "@/contexts/notes-context"
import { useSync } from "@/contexts/sync-context"
import NotesList from "./notes-list"
import NoteEditor from "./notes-editor"
import SyncStatus from "./sync-status"
import { useDebounce } from "@/hooks/use-debounce"

export default function NotesApp() {
  const { state, dispatch, refreshNotes } = useNotes()
  const { triggerSync, isSyncing } = useSync()
  const [selectedNote, setSelectedNote] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchText, setSearchText] = useState("")

  // Debounced search
  const debouncedSearch = useDebounce((query) => {
    dispatch({ type: "SET_SEARCH_QUERY", payload: query })
  }, 300)

  // Auto-sync on component mount
  useEffect(() => {
    const performInitialSync = async () => {
      try {
        await triggerSync()
        await refreshNotes()
      } catch (error) {
        console.log("Initial sync failed:", error)
      }
    }

    // Perform initial sync after a short delay
    const timer = setTimeout(performInitialSync, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchText(value)
    debouncedSearch(value)
  }

  const handleClearSearch = () => {
    setSearchText("")
    dispatch({ type: "SET_SEARCH_QUERY", payload: "" })
  }

  const handleCreateNote = () => {
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: "",
      body: "",
      updatedAt: new Date().toISOString(),
      isDirty: false,
      deleted: false,
      isNew: true, // Flag to identify new notes
    }
    setSelectedNote(newNote)
    setIsEditing(true)
  }

  const handleSelectNote = (note) => {
    setSelectedNote(note)
    setIsEditing(false)
  }

  const handleEditNote = () => {
    setIsEditing(true)
  }

  const handleCloseEditor = () => {
    setSelectedNote(null)
    setIsEditing(false)
  }

  const handleRefresh = async () => {
    try {
      await triggerSync()
      await refreshNotes()
    } catch (error) {
      console.log("Refresh failed:", error)
    }
  }

  if (state.isLoading) {
    return (
      <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="loading-spinner mb-3" />
          <p className="text-muted">Loading notes...</p>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid className="py-4">
      <Container>
        <div className="mb-4">
          <Row className="align-items-center mb-3">
            <Col>
              <h1 className="display-4 text-dark">Offline Notes</h1>
            </Col>
          </Row>
          <SyncStatus />
        </div>

        <Row className="g-4">
          {/* Notes List */}
          <Col lg={6}>
            <Card>
              <Card.Header>
                <Row className="align-items-center">
                  <Col>
                    <h5 className="card-title mb-0">
                      Notes ({state.filteredNotes.length}
                      {state.searchQuery && ` of ${state.notes.filter((n) => !n.deleted).length}`})
                    </h5>
                  </Col>
                  <Col xs="auto">
                    <Button variant="primary" size="sm" onClick={handleCreateNote}>
                      <PlusLg className="me-2" />
                      New Note
                    </Button>
                  </Col>
                </Row>
                <div className="mt-3 position-relative">
                  <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                  <Form.Control
                    type="text"
                    placeholder="Search notes..."
                    className="ps-5 pe-5"
                    value={searchText}
                    onChange={handleSearchChange}
                  />
                  {searchText && (
                    <Button
                      variant="link"
                      className="position-absolute top-50 end-0 translate-middle-y me-3 p-0 text-muted"
                      onClick={handleClearSearch}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </Card.Header>
              <Card.Body>
                <NotesList notes={state.filteredNotes} selectedNote={selectedNote} onSelectNote={handleSelectNote} />
              </Card.Body>
            </Card>
          </Col>

          {/* Note Editor */}
          <Col lg={6}>
            <Card>
              <Card.Header>
                <h5 className="card-title mb-0">
                  {selectedNote ? (isEditing ? "Edit Note" : "View Note") : "Select a note"}
                </h5>
              </Card.Header>
              <Card.Body>
                {selectedNote ? (
                  <NoteEditor
                    note={selectedNote}
                    isEditing={isEditing}
                    onEdit={handleEditNote}
                    onClose={handleCloseEditor}
                  />
                ) : (
                  <div className="text-center text-muted py-5">
                    <p>Select a note to view or create a new one</p>
                    {state.filteredNotes.length === 0 && !state.searchQuery && (
                      <Button variant="primary" onClick={handleCreateNote}>
                        <PlusLg className="me-2" />
                        Create Your First Note
                      </Button>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  )
}
