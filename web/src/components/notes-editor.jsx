"use client"

import { useState, useEffect } from "react"
import { Form, Button, Badge, Row, Col, Spinner } from "react-bootstrap"
import { PencilFill, CheckLg, XLg, ClockFill, CheckCircleFill } from "react-bootstrap-icons"
import { useNotes } from "@/contexts/notes-context"
import { StorageService } from "@/services/storage-service"

export default function NoteEditor({ note, isEditing, onEdit, onClose }) {
  const { dispatch } = useNotes()
  const [title, setTitle] = useState(note.title || "")
  const [body, setBody] = useState(note.body || "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setTitle(note.title || "")
    setBody(note.body || "")
  }, [note])

  const handleSave = async () => {
    if (isSaving) return

    // Prevent saving if both title and body are empty
    if (!title.trim() && !body.trim()) {
      alert("Please enter a title or content for the note")
      return
    }

    setIsSaving(true)

    try {
      const updatedNote = {
        ...note,
        title: title.trim() || "Untitled",
        body: body.trim(),
        updatedAt: new Date().toISOString(),
        isDirty: true,
        deleted: false,
      }

      await StorageService.saveNote(updatedNote)

      // Check if this is a new note (has isNew flag) or existing note
      if (note.isNew) {
        // Remove the isNew flag before dispatching
        const { isNew, ...noteToAdd } = updatedNote
        dispatch({ type: "ADD_NOTE", payload: noteToAdd })
        console.log("New note created:", noteToAdd.id)
      } else {
        // This is an existing note being updated
        dispatch({ type: "UPDATE_NOTE", payload: updatedNote })
        console.log("Note updated:", updatedNote.id)
      }

      onClose()
    } catch (error) {
      console.error("Failed to save note:", error)
      alert("Failed to save note")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (note.isNew) {
      // For new notes, just close without saving
      onClose()
    } else {
      // For existing notes, reset to original values
      setTitle(note.title || "")
      setBody(note.body || "")
      onClose()
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    )
  }

  if (isEditing) {
    return (
      <div>
        <Form>
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              size="lg"
              disabled={isSaving}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Control
              as="textarea"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start writing your note..."
              style={{ resize: "none" }}
              disabled={isSaving}
            />
          </Form.Group>
        </Form>

        <Row className="align-items-center">
          <Col>
            <div className="d-flex align-items-center">
              <small className="text-muted me-3">Last updated: {formatDate(note.updatedAt)}</small>
              {note.isDirty && (
                <Badge bg="warning" className="d-flex align-items-center">
                  <ClockFill className="me-1" size={12} />
                  Unsaved changes
                </Badge>
              )}
            </div>
          </Col>
          <Col xs="auto">
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={handleCancel} disabled={isSaving}>
                <XLg className="me-2" />
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckLg className="me-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <div>
      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="text-dark">{note.title || "Untitled"}</h4>
        </Col>
        <Col xs="auto">
          <Button variant="primary" size="sm" onClick={onEdit}>
            <PencilFill className="me-2" />
            Edit
          </Button>
        </Col>
      </Row>

      <div className="note-content mb-4">{note.body || "This note is empty."}</div>

      <Row className="align-items-center pt-3 border-top">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <small className="text-muted">Last updated: {formatDate(note.updatedAt)}</small>
            <Badge bg="light" text="dark" className="font-monospace">
              ID: {note.id.slice(-8)}
            </Badge>
          </div>
        </Col>
        <Col xs="auto">
          {note.isDirty ? (
            <Badge bg="warning" className="d-flex align-items-center">
              <ClockFill className="me-1" />
              Unsaved changes
            </Badge>
          ) : (
            <Badge bg="success" className="d-flex align-items-center">
              <CheckCircleFill className="me-1" />
              Synced
            </Badge>
          )}
        </Col>
      </Row>
    </div>
  )
}
