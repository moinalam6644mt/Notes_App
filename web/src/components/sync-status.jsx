"use client"

import { Row, Col, Badge, Button, Alert } from "react-bootstrap"
import { Wifi, WifiOff, ArrowClockwise, ExclamationTriangleFill, CheckCircleFill } from "react-bootstrap-icons"
import { useSync } from "@/contexts/sync-context"

export default function SyncStatus() {
  const { isOnline, isSyncing, lastSyncTime, syncError, triggerSync } = useSync()

  const formatSyncTime = (timeString) => {
    if (!timeString) return "Never"
    const date = new Date(timeString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Alert variant="light" className="sync-status border">
      <Row className="align-items-center">
        {/* Online/Offline Status */}
        <Col xs="auto">
          <div className="d-flex align-items-center">
            {isOnline ? (
              <>
                <Wifi className="text-success me-2" />
                <Badge bg="success" className="me-3">
                  Online
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="text-danger me-2" />
                <Badge bg="danger" className="me-3">
                  Offline
                </Badge>
              </>
            )}
          </div>
        </Col>

        {/* Sync Status */}
        <Col>
          <div className="d-flex align-items-center">
            <small className="text-muted me-3">Last sync: {formatSyncTime(lastSyncTime)}</small>

            {syncError ? (
              <div className="d-flex align-items-center text-danger">
                <ExclamationTriangleFill className="me-1" size={14} />
                <small>Sync failed</small>
              </div>
            ) : (
              lastSyncTime && (
                <div className="d-flex align-items-center text-success">
                  <CheckCircleFill className="me-1" size={14} />
                  <small>Synced</small>
                </div>
              )
            )}
          </div>
        </Col>

        {/* Sync Button */}
        <Col xs="auto">
          <Button variant="outline-primary" size="sm" onClick={triggerSync} disabled={!isOnline || isSyncing}>
            <ArrowClockwise className={`me-2 ${isSyncing ? "spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
        </Col>
      </Row>

      {/* Error Details */}
      {syncError && (
        <div className="mt-2">
          <small className="text-danger">{syncError}</small>
        </div>
      )}
    </Alert>
  )
}
