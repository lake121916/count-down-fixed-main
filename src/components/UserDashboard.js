import React, { useEffect, useState, useCallback } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc, query, where, orderBy, updateDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import "./UserDashboard.css";

// Lucide icons
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Eye,
  Trash2,
  PlusCircle,
  XCircle,
  Mail,
  Bell
} from "lucide-react";

function UserDashboard() {
  const { currentUser } = useAuth();
  const [dashboardEvents, setDashboardEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [replies, setReplies] = useState([]);
  const [activeTab, setActiveTab] = useState("events"); // "events" or "messages"

  // ------------------ FETCH DASHBOARD EVENTS ------------------
  const fetchDashboardEvents = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snapshot = await getDocs(collection(db, "users", currentUser.uid, "dashboard"));
      setDashboardEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDashboardEvents();
    fetchReplies();
  }, [fetchDashboardEvents, fetchReplies]);

  // ------------------ IMAGE VIEWER FUNCTIONS -------------------
  const handleViewImage = (imageURL) => {
    setViewImage(imageURL);
  };

  const handleCloseImageViewer = () => {
    setViewImage(null);
  };

  // ------------------ FETCH REPLIES ------------------
  const fetchReplies = useCallback(async () => {
    if (!currentUser || !currentUser.email) return;
    try {
      const q = query(
        collection(db, "admin_replies"),
        where("recipientEmail", "==", currentUser.email.toLowerCase().trim())
      );
      const snapshot = await getDocs(q);
      let list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Sort manually to avoid indexing issues
      list.sort((a, b) => (b.sentAt?.seconds || 0) - (a.sentAt?.seconds || 0));

      setReplies(list);
    } catch (err) {
      console.error("Error fetching replies:", err);
    }
  }, [currentUser]);

  const markAsRead = async (replyId) => {
    try {
      await updateDoc(doc(db, "admin_replies", replyId), { read: true });
      setReplies(replies.map(r => r.id === replyId ? { ...r, read: true } : r));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  // ------------------ HELPERS ------------------
  const formatDate = (date) => {
    if (!date) return "N/A";
    if (date.seconds) {
      const d = new Date(date.seconds * 1000);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date;
  };

  const formatTime = (time) => {
    if (!time) return "N/A";
    if (typeof time === 'string') return time;
    if (time.seconds) {
      const d = new Date(time.seconds * 1000);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return time;
  };

  const getEventType = (event) => {
    if (event.eventType) return event.eventType;
    if (event.type) return event.type;
    if (event.category) return event.category;
    if (event.eventCategory) return event.eventCategory;
    return "General";
  };

  // Helper to get event name
  const getEventName = (event) => {
    return event.eventName || event.name || event.title || "Untitled Event";
  };

  // Helper to get event title
  const getEventTitle = (event) => {
    return event.title || "No Title";
  };

  // ------------------ DASHBOARD FUNCTIONS ------------------
  const removeFromDashboard = async (eventId) => {
    if (!window.confirm("Are you sure you want to remove this event from your dashboard?")) {
      return;
    }

    try {
      const dashboardRef = doc(db, "users", currentUser.uid, "dashboard", eventId);
      await deleteDoc(dashboardRef);

      setDashboardEvents(dashboardEvents.filter(event => event.id !== eventId));
      alert("Event removed from dashboard!");
    } catch (err) {
      console.error("Error removing from dashboard:", err);
      alert("Error removing event from dashboard: " + err.message);
    }
  };

  // ------------------ RENDER ------------------
  const unreadCount = replies.filter(r => !r.read).length;

  return (
    <div className="user-dashboard-container">
      <div className="dashboard-header">
        <h1>My Dashboard</h1>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab("events")}
          style={{
            padding: '12px 24px',
            background: activeTab === "events" ? '#3b82f6' : 'transparent',
            color: activeTab === "events" ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === "events" ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '16px'
          }}
        >
          My Events
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          style={{
            padding: '12px 24px',
            background: activeTab === "messages" ? '#3b82f6' : 'transparent',
            color: activeTab === "messages" ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === "messages" ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Mail size={18} />
          Messages
          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === "events" && (
        <>
          {dashboardEvents.length === 0 ? (
            <div className="empty-dashboard">
              <div className="empty-state">
                <PlusCircle size={64} className="empty-icon" />
                <h3>No events saved yet</h3>
                <p>Start exploring events and add them to your dashboard to see them here.</p>
              </div>
            </div>
          ) : (
            <div className="dashboard-content">
              <div className="dashboard-grid">
                {dashboardEvents.map((event) => (
                  <div key={event.id} className="dashboard-card">
                    <div className="dashboard-card-content">
                      <h4>{getEventName(event)}</h4>
                      {getEventTitle(event) && getEventTitle(event) !== getEventName(event) && (
                        <p className="event-subtitle">Title: {getEventTitle(event)}</p>
                      )}

                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}

                      <div className="event-meta">
                        <div className="meta-item">
                          <Calendar size={14} />
                          <span><strong>Date:</strong> {formatDate(event.date)}</span>
                        </div>

                        {event.time && (
                          <div className="meta-item">
                            <Clock size={14} />
                            <span><strong>Time:</strong> {formatTime(event.time)}</span>
                          </div>
                        )}

                        {event.location && (
                          <div className="meta-item">
                            <MapPin size={14} />
                            <span><strong>Location:</strong> {event.location}</span>
                          </div>
                        )}

                        {event.eventType && (
                          <div className="meta-item">
                            <Tag size={14} />
                            <span><strong>Type:</strong> {getEventType(event)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image at the bottom */}
                    {event.imageURL ? (
                      <>
                        <div className="dashboard-image-container">
                          <img
                            src={event.imageURL}
                            alt="event"
                            className="dashboard-image"
                          />
                          <button
                            className="view-full-image-btn"
                            onClick={() => handleViewImage(event.imageURL)}
                          >
                            <Eye size={14} /> View Full Image
                          </button>
                        </div>
                        <div className="remove-btn-container">
                          <button
                            className="btn-dashboard-remove"
                            onClick={() => removeFromDashboard(event.id)}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="remove-btn-container">
                        <button
                          className="btn-dashboard-remove"
                          onClick={() => removeFromDashboard(event.id)}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div className="messages-container">
          {replies.length === 0 ? (
            <div className="empty-dashboard">
              <div className="empty-state">
                <Mail size={64} className="empty-icon" />
                <h3>No messages yet</h3>
                <p>Admin replies to your contact messages will appear here.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  style={{
                    background: reply.read ? '#f9fafb' : '#eff6ff',
                    border: reply.read ? '1px solid #e5e7eb' : '2px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '20px',
                    position: 'relative'
                  }}
                >
                  {!reply.read && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#3b82f6',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Bell size={12} /> New
                    </div>
                  )}
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Mail size={18} color="#3b82f6" />
                      <strong style={{ fontSize: '16px', color: '#111827' }}>Admin Reply</strong>
                    </div>
                    <small style={{ color: '#6b7280' }}>
                      {formatDate(reply.sentAt)} at {formatTime(reply.sentAt)}
                    </small>
                  </div>

                  {/* Original Message */}
                  {reply.originalMessage && (
                    <div style={{
                      background: '#f3f4f6',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      borderLeft: '3px solid #9ca3af'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: '#6b7280' }}>Your Original Message:</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', fontStyle: 'italic' }}>
                        "{reply.originalMessage}"
                      </p>
                    </div>
                  )}

                  {/* Admin Reply */}
                  <div style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '6px',
                    marginBottom: '15px',
                    borderLeft: '4px solid #3b82f6'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '14px', color: '#111827' }}>Admin's Response:</strong>
                    </div>
                    <p style={{ margin: 0, lineHeight: '1.6', color: '#374151' }}>
                      {reply.replyMessage}
                    </p>
                  </div>
                  {!reply.read && (
                    <button
                      onClick={() => markAsRead(reply.id)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Image Viewer Modal */}
      {viewImage && (
        <div className="image-viewer-overlay" onClick={handleCloseImageViewer}>
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="image-viewer-header">
              <h3>Event Image</h3>
              <button className="close-image-btn" onClick={handleCloseImageViewer}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="image-viewer-content">
              <img
                src={viewImage}
                alt="Full event"
                className="full-size-image"
              />
            </div>

            <div className="image-viewer-footer">
              <p>Click outside the image to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;