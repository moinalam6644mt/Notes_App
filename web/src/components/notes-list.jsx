"use client"

import { Card, Button, Badge, Row, Col } from "react-bootstrap"
import { TrashFill, FileTextFill, ClockFill } from "react-bootstrap-icons"
import { useNotes } from "@/contexts/notes-context"
import { StorageService } from "@/services/storage-service"

export default function NotesList({ notes, selectedNote, onSelectNote }) {
  const { dispatch } = useNotes()

  const handleDeleteNote = async (e, noteId) => {
    e.stopPropagation()

    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await StorageService.deleteNote(noteId)
        dispatch({ type: "DELETE_NOTE", payload: noteId })
      } catch (error) {
        console.error("Failed to delete note:", error)
        alert("Failed to delete note")
      }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (notes.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <FileTextFill size={48} className="text-muted mb-3" />
        <p>No notes found</p>
        <small>Create your first note to get started</small>
      </div>
    )
  }

  return (
    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
      {notes.map((note) => (
        <Card
          key={note.id}
          className={`note-card mb-3 ${selectedNote?.id === note.id ? "selected" : ""}`}
          onClick={() => onSelectNote(note)}
        >
          <Card.Body>
            <Row className="align-items-start">
              <Col>
                <div className="d-flex align-items-center mb-2">
                  <h6 className="card-title mb-0 me-2 text-truncate">{note.title || "Untitled"}</h6>
                  {note.isDirty && (
                    <Badge bg="warning" className="d-flex align-items-center">
                      <ClockFill className="me-1" size={12} />
                      Unsaved
                    </Badge>
                  )}
                </div>
                <p
                  className="card-text text-muted small mb-2"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {note.body || "No content"}
                </p>
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">{formatDate(note.updatedAt)}</small>
                  <Badge bg="light" text="dark" className="font-monospace">
                    ID: {note.id.slice(-8)}
                  </Badge>
                </div>
              </Col>
              <Col xs="auto">
                <Button variant="outline-danger" size="sm" onClick={(e) => handleDeleteNote(e, note.id)}>
                  <TrashFill />
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ))}
    </div>
  )
}
