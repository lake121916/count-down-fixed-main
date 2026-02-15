import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  CalendarDays,
  BarChart3,
  ArrowLeftCircle,
  Eye,
  Check,
  X,
  Trash,
  XCircle,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Clock,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  Edit3,
  Tag,
  Crown,
  Briefcase
} from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import "./adminpanel.css";

const AdminPanel = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [dashboardEvents, setDashboardEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRoleSelection, setNewRoleSelection] = useState("");
  const [replyingToMessageId, setReplyingToMessageId] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(null);

  // ------------------- LOAD DATA -------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching users:", err);
    }
    setLoading(false);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "events"));
      const eventsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsData);
      console.log("Events data:", eventsData);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "contact_messages"));
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMessages(msgs);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snapshot = await getDocs(
        collection(db, "users", currentUser.uid, "dashboard")
      );
      setDashboardEvents(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchUsers();
      fetchEvents();
      fetchMessages();
      fetchDashboard();
    }
  }, [currentUser, fetchUsers, fetchEvents, fetchMessages, fetchDashboard]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (updateError || updateSuccess) {
      const timer = setTimeout(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [updateError, updateSuccess]);

  // ------------------- IMAGE VIEWER FUNCTIONS -------------------
  const handleViewImage = (imageURL) => {
    setViewImage(imageURL);
    setImageZoom(1);
    setImageRotation(0);
  };

  const handleCloseImageViewer = () => {
    setViewImage(null);
    setImageZoom(1);
    setImageRotation(0);
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setImageZoom(1);
  };

  const handleRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const handleDownloadImage = () => {
    if (viewImage) {
      const link = document.createElement('a');
      link.href = viewImage;
      link.download = `event-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ------------------- REMOVE FROM DASHBOARD FUNCTION -------------------
  const removeFromDashboard = async (eventId) => {
    if (!window.confirm("Are you sure you want to remove this event from your dashboard?")) {
      return;
    }

    try {
      const dashboardRef = doc(db, "users", currentUser.uid, "dashboard", eventId);
      await deleteDoc(dashboardRef);
      setDashboardEvents(dashboardEvents.filter(event => event.id !== eventId));
      setUpdateSuccess("Event removed from dashboard!");
    } catch (err) {
      console.error("Error removing from dashboard:", err);
      setUpdateError("Error removing event from dashboard: " + err.message);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, "contact_messages", id));
      setMessages(messages.filter(m => m.id !== id));
      setUpdateSuccess("Message deleted successfully!");
    } catch (err) {
      console.error("Error deleting message:", err);
      setUpdateError("Error deleting message: " + err.message);
    }
  };

  const handleToggleReply = (msgId) => {
    if (replyingToMessageId === msgId) {
      setReplyingToMessageId(null);
      setReplyMessage("");
    } else {
      setReplyingToMessageId(msgId);
      setReplyMessage("");
    }
  };

  const handleSendReply = async (msg) => {
    if (!replyMessage.trim()) {
      setUpdateError("Please enter a reply message.");
      return;
    }

    try {
      await addDoc(collection(db, "admin_replies"), {
        originalMessageId: msg.id,
        originalMessage: msg.message,
        recipientEmail: msg.email.toLowerCase().trim(),
        recipientName: msg.name,
        replyMessage: replyMessage,
        sentBy: currentUser.email,
        sentAt: serverTimestamp(),
        read: false
      });

      setUpdateSuccess("Reply sent successfully! The user will see it in their Messages tab.");
      setReplyingToMessageId(null);
      setReplyMessage("");
    } catch (err) {
      console.error("Error sending reply:", err);
      setUpdateError("Error sending reply: " + err.message);
    }
  };

  // ------------------- HELPERS -------------------
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

  const getEventName = (event) => {
    return event.name || event.eventName || event.title || "Untitled Event";
  };

  const getEventTitle = (event) => {
    return event.title || event.eventTitle || "No Title";
  };

  // ------------------- ROLE MANAGEMENT FUNCTIONS -------------------
  const startEditing = (user) => {
    setEditingUserId(user.id);
    setNewRoleSelection(user.role || 'user');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setNewRoleSelection("");
  };

  const validateRoleUpdate = (userId, newRole) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      setUpdateError("User not found");
      return false;
    }
    
    // Prevent admin from changing their own role (optional)
    if (user.email === currentUser?.email && newRole !== 'admin') {
      if (!window.confirm("You are changing your own admin role. Are you sure?")) {
        return false;
      }
    }
    
    return true;
  };

  const handleSaveRole = async (userId) => {
    try {
      // Validate role selection
      if (!newRoleSelection) {
        setUpdateError("Please select a role");
        return;
      }

      // Validate user
      if (!validateRoleUpdate(userId, newRoleSelection)) {
        return;
      }

      setLoading(true);

      // Get reference to the user document
      const userRef = doc(db, "users", userId);
      
      // Update the role
      await updateDoc(userRef, { 
        role: newRoleSelection,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRoleSelection }
            : user
        )
      );

      // Reset editing state
      setEditingUserId(null);
      setNewRoleSelection("");
      
      // Show success message
      setUpdateSuccess("Role updated successfully!");
      
    } catch (err) {
      console.error("Error updating role:", err);
      
      // Detailed error message
      let errorMessage = "Failed to update role. ";
      
      if (err.code === 'permission-denied') {
        errorMessage += "You don't have permission to update roles.";
      } else if (err.code === 'not-found') {
        errorMessage += "User not found.";
      } else if (err.code === 'unavailable') {
        errorMessage += "Network error. Please check your connection.";
      } else {
        errorMessage += err.message || "Please try again.";
      }
      
      setUpdateError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e, userId) => {
    if (e.key === 'Enter') {
      handleSaveRole(userId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      fetchUsers();
      setUpdateSuccess("User deleted successfully!");
    } catch (err) {
      console.error("Error deleting user:", err);
      setUpdateError("Error deleting user: " + err.message);
    }
  };

  const handleApproveEvent = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { status: "approved" });
      fetchEvents();
      setUpdateSuccess("Event approved successfully!");
    } catch (err) {
      console.error("Error approving event:", err);
      setUpdateError("Error approving event: " + err.message);
    }
  };

  const handleRejectEvent = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { status: "rejected" });
      fetchEvents();
      setUpdateSuccess("Event rejected successfully!");
    } catch (err) {
      console.error("Error rejecting event:", err);
      setUpdateError("Error rejecting event: " + err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
      fetchEvents();
      setUpdateSuccess("Event deleted successfully!");
    } catch (err) {
      console.error("Error deleting event:", err);
      setUpdateError("Error deleting event: " + err.message);
    }
  };

  // Filter events based on pending filter
  const displayedEvents = showPendingOnly
    ? events.filter((event) => event.status === "pending_admin")
    : events;

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // User statistics calculations
  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    heads: users.filter(u => u.role === 'head').length,
    officers: users.filter(u => u.role === 'Officer' || u.role === 'worker').length,
    regular: users.filter(u => !u.role || u.role === 'user').length
  };

  // Function to display role in UI
  const displayRole = (role) => {
    if (role === 'worker') return 'Officer';
    return role || 'user';
  };

  if (!currentUser) return <p>Loading...</p>;
  if (!currentUser.isAdmin) return <p>Access denied. You are not an admin.</p>;

  // ------------------- UI -------------------
  return (
    <div className="admin-panel-container">
      {/* Notification Messages */}
      {updateError && (
        <div className="notification error">
          <X size={16} />
          <span>{updateError}</span>
        </div>
      )}
      {updateSuccess && (
        <div className="notification success">
          <Check size={16} />
          <span>{updateSuccess}</span>
        </div>
      )}

      {/* Sidebar */}
      <div className={`admin-tabs-vertical ${isCollapsed ? "collapsed" : ""}`}>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand" : "Collapse"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ArrowLeftCircle
            className={`collapse-icon ${isCollapsed ? "rotated" : ""}`}
          />
        </button>

        <button
          className={activeTab === "users" ? "active" : ""}
          onClick={() => setActiveTab("users")}
          aria-label="Users"
        >
          <Users />
          {!isCollapsed && <span>Users</span>}
        </button>

        <button
          className={activeTab === "events" ? "active" : ""}
          onClick={() => setActiveTab("events")}
          aria-label="Events"
        >
          <CalendarDays />
          {!isCollapsed && <span>Events</span>}
        </button>

        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
          aria-label="Dashboard"
        >
          <BarChart3 />
          {!isCollapsed && <span>Dashboard</span>}
        </button>

        <button
          className={activeTab === "analytics" ? "active" : ""}
          onClick={() => setActiveTab("analytics")}
          aria-label="Analytics"
        >
          <BarChart3 />
          {!isCollapsed && <span>Analytics</span>}
        </button>

        <button
          className={activeTab === "messages" ? "active" : ""}
          onClick={() => setActiveTab("messages")}
          aria-label="Messages"
        >
          <Mail />
          {!isCollapsed && <span>Messages</span>}
        </button>
      </div>

      {/* Main Content */}
      <div className={`admin-main-content ${isCollapsed ? "expanded" : ""}`}>
        {/* USERS TAB */}
        {activeTab === "users" && (
          <>
            <div className="tab-header">
              <h2>User Management</h2>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search users by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  aria-label="Search users"
                />
              </div>
            </div>

            <div className="stats-cards">
              <div className="stat-card">
                <Users size={24} />
                <div>
                  <h3>Total Users</h3>
                  <p>{userStats.total}</p>
                </div>
              </div>
              <div className="stat-card">
                <Crown size={24} />
                <div>
                  <h3>Admins</h3>
                  <p>{userStats.admins}</p>
                </div>
              </div>
              <div className="stat-card">
                <User size={24} />
                <div>
                  <h3>Heads</h3>
                  <p>{userStats.heads}</p>
                </div>
              </div>
              <div className="stat-card">
                <Briefcase size={24} />
                <div>
                  <h3>Officers</h3>
                  <p>{userStats.officers}</p>
                </div>
              </div>
              <div className="stat-card">
                <Edit3 size={24} />
                <div>
                  <h3>Regular Users</h3>
                  <p>{userStats.regular}</p>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="loading-message">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="no-data-message">No users found.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Full Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Join Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td data-label="No">{index + 1}</td>
                        <td data-label="Full Name">
                          <div className="user-info">
                            <strong>{user.fullName || "N/A"}</strong>
                          </div>
                        </td>
                        <td data-label="Phone">{user.phoneNumber || "N/A"}</td>
                        <td data-label="Email">{user.email}</td>
                        <td data-label="Role">
                          {editingUserId === user.id ? (
                            <div className="role-edit-container">
                              <select
                                value={newRoleSelection}
                                onChange={(e) => setNewRoleSelection(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, user.id)}
                                className="role-select"
                                autoFocus
                                aria-label="Select role"
                              >
                                <option value="user">User</option>
                                <option value="officer">Officer</option>
                                <option value="head">Head</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleSaveRole(user.id)}
                                className="save-btn"
                                title="Save role"
                                aria-label="Save role"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="cancel-btn"
                                title="Cancel"
                                aria-label="Cancel editing"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <span className={`role-badge role-${user.role || 'user'}`}>
                              {displayRole(user.role)}
                            </span>
                          )}
                        </td>
                        <td data-label="Join Date">{formatDate(user.createdAt)}</td>
                        <td data-label="Actions">
                          <div className="action-buttons">
                            <button
                              className="view-btn"
                              onClick={() => setSelectedUser(user)}
                              title="View Details"
                              aria-label="View user details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="edit-btn"
                              onClick={() => startEditing(user)}
                              title="Edit Role"
                              disabled={editingUserId !== null}
                              aria-label="Edit user role"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Delete User"
                              aria-label="Delete user"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
          <>
            <div className="tab-header">
              <h2>Event Management</h2>
              <div className="filter-controls">
                <button
                  className={`admin-btn ${showPendingOnly ? 'active' : ''}`}
                  onClick={() => setShowPendingOnly(!showPendingOnly)}
                  aria-label={showPendingOnly ? "Show all events" : "Show pending only"}
                >
                  {showPendingOnly ? "Show All Events" : "Show Pending Only"}
                </button>
                <span className="event-count">
                  {displayedEvents.length} event(s) found
                </span>
              </div>
            </div>

            <div className="stats-cards">
              <div className="stat-card">
                <CalendarDays size={24} />
                <div>
                  <h3>Total Events</h3>
                  <p>{events.length}</p>
                </div>
              </div>
              <div className="stat-card">
                <Tag size={24} />
                <div>
                  <h3>With Titles</h3>
                  <p>{events.filter(e => e.title && e.title.trim() !== '').length}</p>
                </div>
              </div>
              <div className="stat-card">
                <Check size={24} />
                <div>
                  <h3>Approved</h3>
                  <p>{events.filter(e => e.status === 'approved').length}</p>
                </div>
              </div>
              <div className="stat-card">
                <Clock size={24} />
                <div>
                  <h3>Pending</h3>
                  <p>{events.filter(e => e.status === 'pending_admin').length}</p>
                </div>
              </div>
              <div className="stat-card">
                <X size={24} />
                <div>
                  <h3>Rejected</h3>
                  <p>{events.filter(e => e.status === 'rejected').length}</p>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="loading-message">Loading events...</p>
            ) : displayedEvents.length === 0 ? (
              <p className="no-data-message">No events found.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Event Title</th>
                      <th>Type</th>
                      <th>Proposed By</th>
                      <th>Date & Time</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td data-label="Event Name">
                          <strong>{getEventName(ev)}</strong>
                          {ev.description && (
                            <div className="event-description-preview">
                              {ev.description.length > 100
                                ? `${ev.description.substring(0, 100)}...`
                                : ev.description
                              }
                            </div>
                          )}
                        </td>
                        <td data-label="Event Title">
                          <div className="event-title-cell">
                            {ev.title ? (
                              <span className="event-title-badge">{getEventTitle(ev)}</span>
                            ) : (
                              <span className="no-title">No Title</span>
                            )}
                          </div>
                        </td>
                        <td data-label="Type">
                          <span className="event-type">{getEventType(ev)}</span>
                        </td>
                        <td data-label="Proposed By">{ev.proposedBy || "N/A"}</td>
                        <td data-label="Date & Time">
                          <div>
                            <div>{formatDate(ev.date)}</div>
                            {ev.time && <small>{formatTime(ev.time)}</small>}
                          </div>
                        </td>
                        <td data-label="Location">{ev.location || "N/A"}</td>
                        <td data-label="Status">
                          <span className={`status-badge status-${ev.status || 'pending'}`}>
                            {ev.status || "pending"}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="action-buttons">
                            <button
                              className="view-btn"
                              onClick={() => {
                                console.log("Selected event:", ev);
                                setSelectedEvent(ev);
                              }}
                              title="View Details"
                              aria-label="View event details"
                            >
                              <Eye size={16} />
                            </button>
                            {ev.status === 'pending_admin' && (
                              <>
                                <button
                                  className="approve-btn"
                                  onClick={() => handleApproveEvent(ev.id)}
                                  title="Approve Event"
                                  aria-label="Approve event"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  className="reject-btn"
                                  onClick={() => handleRejectEvent(ev.id)}
                                  title="Reject Event"
                                  aria-label="Reject event"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteEvent(ev.id)}
                              title="Delete Event"
                              aria-label="Delete event"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <>
            <h2>My Dashboard</h2>
            {dashboardEvents.length === 0 ? (
              <p className="no-data-message">No events added yet.</p>
            ) : (
              <div className="dashboard-grid">
                {dashboardEvents.map((event) => (
                  <div key={event.id} className="dashboard-card">
                    <div className="dashboard-event-header">
                      <h4 className="event-name">{getEventName(event)}</h4>
                      <div className="event-title">Title: {getEventTitle(event)}</div>
                    </div>
                    <p>{event.description}</p>
                    <div className="event-meta">
                      <p><Calendar size={14} /> <strong>Date:</strong> {formatDate(event.date)}</p>
                      {event.time && <p><Clock size={14} /> <strong>Time:</strong> {formatTime(event.time)}</p>}
                      {event.location && <p><MapPin size={14} /> <strong>Location:</strong> {event.location}</p>}
                      {event.eventType && <p><Tag size={14} /> <strong>Type:</strong> {event.eventType}</p>}
                    </div>
                    {event.imageURL && (
                      <div className="dashboard-image-container">
                        <img
                          src={event.imageURL}
                          alt="event"
                          className="dashboard-image"
                          loading="lazy"
                        />
                        <button
                          className="view-full-image-btn"
                          onClick={() => handleViewImage(event.imageURL)}
                          aria-label="View full image"
                        >
                          <Eye size={14} /> View Full Image
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => removeFromDashboard(event.id)}
                      className="btn-remove-dashboard"
                      aria-label="Remove from dashboard"
                    >
                      <Trash size={12} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MESSAGES TAB */}
        {activeTab === "messages" && (
          <>
            <div className="tab-header">
              <h2>Contact Messages</h2>
              <span className="event-count">
                {messages.length} message(s)
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="no-events">
                <h3>No messages yet</h3>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg) => (
                  <div key={msg.id} className="message-card">
                    <div className="message-header">
                      <div>
                        <h4>{msg.name}</h4>
                        <small>{msg.email}</small>
                      </div>
                      <div className="message-time">
                        <small>{formatDate(msg.createdAt)}</small>
                        <small>{formatTime(msg.createdAt)}</small>
                      </div>
                    </div>

                    <div className="message-content">
                      {msg.message}
                    </div>

                    <div className="message-actions">
                      <button
                        onClick={() => handleToggleReply(msg.id)}
                        className="view-btn"
                        aria-label={replyingToMessageId === msg.id ? "Cancel reply" : "Reply to message"}
                      >
                        <Mail size={14} /> {replyingToMessageId === msg.id ? 'Cancel Reply' : 'Reply'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteMessage(msg.id)}
                        aria-label="Delete message"
                      >
                        <Trash size={14} /> Delete
                      </button>
                    </div>

                    {replyingToMessageId === msg.id && (
                      <div className="reply-container">
                        <label htmlFor={`reply-${msg.id}`}>
                          Your Reply:
                        </label>
                        <textarea
                          id={`reply-${msg.id}`}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type your reply here..."
                          rows="4"
                          className="reply-textarea"
                        />
                        <div className="reply-actions">
                          <button
                            onClick={() => handleSendReply(msg)}
                            className="approve-btn"
                            aria-label="Send reply"
                          >
                            <Mail size={14} /> Send Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <>
            <h2>Analytics & Reports</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>User Statistics</h3>
                <div className="analytics-content">
                  <p>Total Users: <strong>{userStats.total}</strong></p>
                  <p>Admins: <strong>{userStats.admins}</strong></p>
                  <p>Heads: <strong>{userStats.heads}</strong></p>
                  <p>Officers: <strong>{userStats.officers}</strong></p>
                  <p>Regular Users: <strong>{userStats.regular}</strong></p>
                </div>
              </div>
              <div className="analytics-card">
                <h3>Event Statistics</h3>
                <div className="analytics-content">
                  <p>Total Events: <strong>{events.length}</strong></p>
                  <p>Events with Titles: <strong>{events.filter(e => e.title && e.title.trim() !== '').length}</strong></p>
                  <p>Approved: <strong>{events.filter(e => e.status === 'approved').length}</strong></p>
                  <p>Pending: <strong>{events.filter(e => e.status === 'pending_admin').length}</strong></p>
                  <p>Rejected: <strong>{events.filter(e => e.status === 'rejected').length}</strong></p>
                </div>
              </div>
              <div className="analytics-card">
                <h3>Event Types</h3>
                <div className="analytics-content">
                  {Array.from(new Set(events.map(e => getEventType(e)))).map(type => (
                    <p key={type}>
                      {type}: <strong>{events.filter(e => getEventType(e) === type).length}</strong>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Modal */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>User Details</h3>
            <div className="detail-item">
              <User size={16} />
              <div>
                <strong>Name:</strong> {selectedUser.fullName || "N/A"}
              </div>
            </div>
            <div className="detail-item">
              <Mail size={16} />
              <div>
                <strong>Email:</strong> {selectedUser.email}
              </div>
            </div>
            <div className="detail-item">
              <Phone size={16} />
              <div>
                <strong>Phone:</strong> {selectedUser.phoneNumber || "N/A"}
              </div>
            </div>
            <div className="detail-item">
              <strong>Role:</strong>
              <span className={`role-badge role-${selectedUser.role || 'user'}`}>
                {displayRole(selectedUser.role)}
              </span>
            </div>
            <div className="detail-item">
              <Calendar size={16} />
              <div>
                <strong>Joined:</strong> {formatDate(selectedUser.createdAt)}
              </div>
            </div>
            <button className="close-btn" onClick={() => setSelectedUser(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="admin-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="admin-modal event-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-with-title">
              <div className="event-name-main">
                <h2>{getEventName(selectedEvent)}</h2>
                <h3 className="event-title-sub">Event Title: {getEventTitle(selectedEvent)}</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedEvent(null)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <div className="event-detail-section">
              <div className="section-label">
                <h3>Event Information</h3>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <User size={16} />
                  <div>
                    <strong>Proposed By:</strong>
                    <span>{selectedEvent.proposedBy || "N/A"}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <Calendar size={16} />
                  <div>
                    <strong>Date:</strong>
                    <span>{formatDate(selectedEvent.date)}</span>
                  </div>
                </div>

                {selectedEvent.time && (
                  <div className="detail-item">
                    <Clock size={16} />
                    <div>
                      <strong>Time:</strong>
                      <span>{formatTime(selectedEvent.time)}</span>
                    </div>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="detail-item">
                    <MapPin size={16} />
                    <div>
                      <strong>Location:</strong>
                      <span>{selectedEvent.location}</span>
                    </div>
                  </div>
                )}

                <div className="detail-item">
                  <Tag size={16} />
                  <div>
                    <strong>Event Type:</strong>
                    <span>{getEventType(selectedEvent)}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <div>
                    <strong>Status:</strong>
                    <span className={`status-badge status-${selectedEvent.status || 'pending'}`}>
                      {selectedEvent.status || "pending"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="detail-item full-width">
                  <div>
                    <strong>Description:</strong>
                    <p className="description-text">{selectedEvent.description}</p>
                  </div>
                </div>
              )}

              {selectedEvent.imageURL && (
                <div className="detail-item full-width">
                  <strong>Event Image:</strong>
                  <div className="modal-image-container">
                    <img
                      src={selectedEvent.imageURL}
                      alt="event"
                      className="modal-image"
                      loading="lazy"
                    />
                    <button
                      className="view-full-image-btn"
                      onClick={() => handleViewImage(selectedEvent.imageURL)}
                      aria-label="View full image"
                    >
                      <Eye size={14} /> View Full Image
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {selectedEvent.status === 'pending_admin' && (
                <>
                  <button
                    className="approve-btn"
                    onClick={() => {
                      handleApproveEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    aria-label="Approve event"
                  >
                    <Check size={16} /> Approve Event
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => {
                      handleRejectEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    aria-label="Reject event"
                  >
                    <X size={16} /> Reject Event
                  </button>
                </>
              )}
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Viewer Modal */}
      {viewImage && (
        <div className="image-viewer-overlay" onClick={handleCloseImageViewer}>
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="image-viewer-header">
              <h3>Event Image</h3>
              <button className="close-image-btn" onClick={handleCloseImageViewer} aria-label="Close image viewer">
                <XCircle size={24} />
              </button>
            </div>

            <div className="image-viewer-controls">
              <button onClick={handleZoomIn} title="Zoom In" aria-label="Zoom in">
                <ZoomIn size={20} /> <span>Zoom In</span>
              </button>
              <button onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom out">
                <ZoomOut size={20} /> <span>Zoom Out</span>
              </button>
              <button onClick={handleResetZoom} title="Reset Zoom" aria-label="Reset zoom">
                {imageZoom}x
              </button>
              <button onClick={handleRotate} title="Rotate" aria-label="Rotate image">
                <RotateCw size={20} /> <span>Rotate</span>
              </button>
              <button onClick={handleDownloadImage} title="Download Image" aria-label="Download image">
                <Download size={20} /> <span>Download</span>
              </button>
            </div>

            <div className="image-viewer-content">
              <img
                src={viewImage}
                alt="Full event"
                className="full-size-image"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
              />
            </div>

            <div className="image-viewer-footer">
              <p>Use controls to zoom, rotate, or download the image</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;