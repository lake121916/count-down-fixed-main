import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  CalendarDays,
  ArrowLeftCircle,
  Eye,
  Check,
  X,
  Trash,
  Clock,
  Calendar,
  User,
  Mail,
  Phone,
  Edit3,
  Crown,
  Briefcase,
  UserPlus,
  Key,
  Copy,
  CheckCircle,
  MessageSquare,
  PieChart,
  Home
} from "lucide-react";
import { db, auth } from "../firebase";
import { 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  addDoc, 
  serverTimestamp,
  setDoc,
  Timestamp
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRoleSelection, setNewRoleSelection] = useState("");
  const [replyingToMessageId, setReplyingToMessageId] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  
  // User creation modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "user",
  });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [passwordTimestamp, setPasswordTimestamp] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    userGrowth: [],
    eventCategories: [],
    monthlyEvents: []
  });

  // Filter users based on search term - DEFINED HERE
  const filteredUsers = users.filter(user =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const fetchAnalytics = useCallback(async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const eventsSnapshot = await getDocs(collection(db, "events"));
      
      const userGrowth = processUserGrowth(usersSnapshot.docs);
      const eventCategories = processEventCategories(eventsSnapshot.docs);
      const monthlyEvents = processMonthlyEvents(eventsSnapshot.docs);
      
      setAnalyticsData({
        userGrowth,
        eventCategories,
        monthlyEvents
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchUsers();
      fetchEvents();
      fetchMessages();
      fetchDashboard();
      fetchAnalytics();
    }
  }, [currentUser, fetchUsers, fetchEvents, fetchMessages, fetchDashboard, fetchAnalytics]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (updateError || updateSuccess) {
      const timer = setTimeout(() => {
        setUpdateError(null);
        setUpdateSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [updateError, updateSuccess]);

  // Reset copy success after 2 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // ------------------- PROCESS ANALYTICS DATA -------------------
  const processUserGrowth = (userDocs) => {
    const growth = {};
    userDocs.forEach(doc => {
      const data = doc.data();
      if (data.createdAt?.seconds) {
        const date = new Date(data.createdAt.seconds * 1000);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        growth[monthYear] = (growth[monthYear] || 0) + 1;
      }
    });
    return Object.entries(growth).map(([month, count]) => ({ month, count }));
  };

  const processEventCategories = (eventDocs) => {
    const categories = {};
    eventDocs.forEach(doc => {
      const data = doc.data();
      const category = data.eventType || data.type || data.category || 'General';
      categories[category] = (categories[category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  const processMonthlyEvents = (eventDocs) => {
    const monthly = {};
    eventDocs.forEach(doc => {
      const data = doc.data();
      if (data.date?.seconds) {
        const date = new Date(data.date.seconds * 1000);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthly[monthYear] = (monthly[monthYear] || 0) + 1;
      }
    });
    return Object.entries(monthly).map(([month, count]) => ({ month, count }));
  };

  // ------------------- GENERATE DEFAULT PASSWORD -------------------
  const generateDefaultPassword = () => {
    const length = 12;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    
    let password = "";
    
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // ------------------- COPY PASSWORD -------------------
  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopySuccess(true);
    }
  };

  // ------------------- FORMAT TIMESTAMP -------------------
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    
    if (timestamp?.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (timestamp instanceof Date) {
      return timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return timestamp;
  };

  // ------------------- FORMAT DATE -------------------
  const formatDate = (date) => {
    if (!date) return "N/A";
    if (date?.seconds) {
      const d = new Date(date.seconds * 1000);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date;
  };

  // ------------------- FORMAT TIME -------------------
  const formatTime = (time) => {
    if (!time) return "N/A";
    if (typeof time === 'string') return time;
    if (time?.seconds) {
      const d = new Date(time.seconds * 1000);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return time;
  };

  // ------------------- DISPLAY ROLE -------------------
  const displayRole = (role) => {
    if (role === 'worker') return 'Officer';
    if (role === 'officer') return 'Officer';
    return role || 'user';
  };

  // ------------------- GET EVENT TYPE -------------------
  const getEventType = (event) => {
    if (event.eventType) return event.eventType;
    if (event.type) return event.type;
    if (event.category) return event.category;
    if (event.eventCategory) return event.eventCategory;
    return "General";
  };

  // ------------------- GET EVENT NAME -------------------
  const getEventName = (event) => {
    return event.name || event.eventName || event.title || "Untitled Event";
  };

  // ------------------- GET EVENT TITLE -------------------
  const getEventTitle = (event) => {
    return event.title || event.eventTitle || "No Title";
  };

  // ------------------- CREATE USER -------------------
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUpdateError(null);
    setUpdateSuccess(null);
    
    if (!newUserData.fullName.trim()) {
      setUpdateError("Full name is required");
      return;
    }

    if (!newUserData.email.trim()) {
      setUpdateError("Email is required");
      return;
    }

    if (!newUserData.email.includes("@") || !newUserData.email.includes(".")) {
      setUpdateError("Invalid email format");
      return;
    }

    if (!newUserData.phoneNumber.trim()) {
      setUpdateError("Phone number is required");
      return;
    }

    setLoading(true);

    try {
      const defaultPassword = generateDefaultPassword();
      setGeneratedPassword(defaultPassword);
      
      const now = new Date();
      setPasswordTimestamp(now);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserData.email,
        defaultPassword
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: newUserData.fullName,
        email: newUserData.email,
        phoneNumber: newUserData.phoneNumber,
        role: newUserData.role,
        isAdmin: newUserData.role === "admin",
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email,
        passwordChanged: false,
        defaultPasswordGeneratedAt: Timestamp.fromDate(now),
        defaultPasswordGeneratedBy: currentUser.email,
        passwordResetRequired: true
      });

      await fetchUsers();

      setUpdateSuccess(
        `User created!\n\nDefault Password: ${defaultPassword}\n\nGenerated: ${formatTimestamp(now)}`
      );

      setNewUserData({
        fullName: "",
        email: "",
        phoneNumber: "",
        role: "user",
      });

    } catch (err) {
      console.error("Error creating user:", err);
      let errorMessage = "Failed to create user. ";
      if (err.code === 'auth/email-already-in-use') {
        errorMessage += "Email already registered.";
      } else {
        errorMessage += err.message;
      }
      setUpdateError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ------------------- RESET PASSWORD -------------------
  const handleResetUserPassword = async (userId) => {
    if (!window.confirm("Reset this user's password?")) return;

    try {
      const newDefaultPassword = generateDefaultPassword();
      const now = new Date();
      
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        passwordChanged: false,
        passwordResetRequired: true,
        lastPasswordReset: serverTimestamp(),
        resetBy: currentUser.email,
        lastDefaultPasswordGeneratedAt: Timestamp.fromDate(now)
      });

      setGeneratedPassword(newDefaultPassword);
      setPasswordTimestamp(now);
      setShowCreateUserModal(true);
      
      setUpdateSuccess(`Password reset!\n\nNew Password: ${newDefaultPassword}`);

    } catch (err) {
      console.error("Error resetting password:", err);
      setUpdateError("Error resetting password");
    }
  };

  // ------------------- MODAL HANDLERS -------------------
  const handleCloseModal = () => {
    setShowCreateUserModal(false);
    setGeneratedPassword("");
    setPasswordTimestamp(null);
    setCopySuccess(false);
  };

  const handleCreateAnother = () => {
    setNewUserData({
      fullName: "",
      email: "",
      phoneNumber: "",
      role: "user",
    });
  };

  // ------------------- ROLE MANAGEMENT -------------------
  const startEditing = (user) => {
    setEditingUserId(user.id);
    setNewRoleSelection(user.role || 'user');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setNewRoleSelection("");
  };

  const handleSaveRole = async (userId) => {
    try {
      if (!newRoleSelection) {
        setUpdateError("Please select a role");
        return;
      }

      setLoading(true);
      const userRef = doc(db, "users", userId);
      
      await updateDoc(userRef, { 
        role: newRoleSelection,
        updatedAt: serverTimestamp()
      });

      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRoleSelection } : user
        )
      );

      setEditingUserId(null);
      setNewRoleSelection("");
      setUpdateSuccess("Role updated!");
      
    } catch (err) {
      console.error("Error updating role:", err);
      setUpdateError("Failed to update role");
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
    if (!window.confirm("Delete this user?")) return;
    
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.email === currentUser?.email) {
      setUpdateError("Cannot delete your own account");
      return;
    }

    try {
      await deleteDoc(doc(db, "users", userId));
      fetchUsers();
      setUpdateSuccess("User deleted!");
    } catch (err) {
      console.error("Error deleting user:", err);
      setUpdateError("Error deleting user");
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, "contact_messages", id));
      setMessages(messages.filter(m => m.id !== id));
      setUpdateSuccess("Message deleted!");
    } catch (err) {
      console.error("Error deleting message:", err);
      setUpdateError("Error deleting message");
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
      setUpdateError("Please enter a reply");
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

      setUpdateSuccess("Reply sent!");
      setReplyingToMessageId(null);
      setReplyMessage("");
    } catch (err) {
      console.error("Error sending reply:", err);
      setUpdateError("Error sending reply");
    }
  };

  const handleApproveEvent = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { status: "approved" });
      fetchEvents();
      setUpdateSuccess("Event approved!");
    } catch (err) {
      console.error("Error approving event:", err);
      setUpdateError("Error approving event");
    }
  };

  const handleRejectEvent = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { status: "rejected" });
      fetchEvents();
      setUpdateSuccess("Event rejected!");
    } catch (err) {
      console.error("Error rejecting event:", err);
      setUpdateError("Error rejecting event");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
      fetchEvents();
      setUpdateSuccess("Event deleted!");
    } catch (err) {
      console.error("Error deleting event:", err);
      setUpdateError("Error deleting event");
    }
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesPending = showPendingOnly ? event.status === "pending_admin" : true;
    const matchesSearch = eventSearchTerm === "" || 
      getEventName(event).toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
      getEventTitle(event).toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
      (event.proposedBy && event.proposedBy.toLowerCase().includes(eventSearchTerm.toLowerCase()));
    return matchesPending && matchesSearch;
  });

  // Filter messages
  const filteredMessages = messages.filter(msg => 
    messageSearchTerm === "" ||
    msg.name?.toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
    msg.email?.toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
    msg.message?.toLowerCase().includes(messageSearchTerm.toLowerCase())
  );

  // Statistics
  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    heads: users.filter(u => u.role === 'head').length,
    officers: users.filter(u => u.role === 'Officer' || u.role === 'worker' || u.role === 'officer').length,
    regular: users.filter(u => !u.role || u.role === 'user').length,
    pendingPasswordChange: users.filter(u => u.passwordChanged === false).length
  };

  const eventStats = {
    total: events.length,
    approved: events.filter(e => e.status === 'approved').length,
    pending: events.filter(e => e.status === 'pending_admin').length,
    rejected: events.filter(e => e.status === 'rejected').length,
    withTitles: events.filter(e => e.title && e.title.trim() !== '').length
  };

  if (!currentUser) return <p>Loading...</p>;
  if (!currentUser.isAdmin) return <p>Access denied. You are not an admin.</p>;

  return (
    <div className="admin-panel-container">
      {/* Notifications */}
      {updateError && (
        <div className="notification error">
          <X size={16} />
          <span style={{ whiteSpace: 'pre-line' }}>{updateError}</span>
        </div>
      )}
      {updateSuccess && (
        <div className="notification success">
          <Check size={16} />
          <span style={{ whiteSpace: 'pre-line' }}>{updateSuccess}</span>
        </div>
      )}

      {/* Sidebar */}
      <div className={`admin-tabs-vertical ${isCollapsed ? "collapsed" : ""}`}>
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          <ArrowLeftCircle className={`collapse-icon ${isCollapsed ? "rotated" : ""}`} />
        </button>

        <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
          <Users />
          {!isCollapsed && <span>Users</span>}
        </button>

        <button className={activeTab === "events" ? "active" : ""} onClick={() => setActiveTab("events")}>
          <CalendarDays />
          {!isCollapsed && <span>Events</span>}
        </button>

        <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
          <Home />
          {!isCollapsed && <span>Dashboard</span>}
        </button>

        <button className={activeTab === "messages" ? "active" : ""} onClick={() => setActiveTab("messages")}>
          <MessageSquare />
          {!isCollapsed && <span>Messages</span>}
        </button>

        <button className={activeTab === "analytics" ? "active" : ""} onClick={() => setActiveTab("analytics")}>
          <PieChart />
          {!isCollapsed && <span>Analytics</span>}
        </button>

        <button className="create-user-sidebar-btn" onClick={() => setShowCreateUserModal(true)}>
          <UserPlus />
          {!isCollapsed && <span>Create User</span>}
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="stats-cards">
              <div className="stat-card">
                <Users size={24} />
                <div><h3>Total</h3><p>{userStats.total}</p></div>
              </div>
              <div className="stat-card">
                <Crown size={24} />
                <div><h3>Admins</h3><p>{userStats.admins}</p></div>
              </div>
              <div className="stat-card">
                <User size={24} />
                <div><h3>Heads</h3><p>{userStats.heads}</p></div>
              </div>
              <div className="stat-card">
                <Briefcase size={24} />
                <div><h3>Officers</h3><p>{userStats.officers}</p></div>
              </div>
              <div className="stat-card warning">
                <Key size={24} />
                <div><h3>Pending</h3><p>{userStats.pendingPasswordChange}</p></div>
              </div>
            </div>

            {loading ? (
              <p className="loading-message">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="no-data-message">No users found</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Password</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id} className={user.passwordChanged === false ? "password-pending-row" : ""}>
                        <td><strong>{user.fullName || "N/A"}</strong></td>
                        <td>{user.email}</td>
                        <td>{user.phoneNumber || "N/A"}</td>
                        <td>
                          {editingUserId === user.id ? (
                            <div className="role-edit-container">
                              <select value={newRoleSelection} onChange={(e) => setNewRoleSelection(e.target.value)}>
                                <option value="user">User</option>
                                <option value="officer">Officer</option>
                                <option value="head">Head</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button onClick={() => handleSaveRole(user.id)} className="save-btn"><Check size={18} /></button>
                              <button onClick={cancelEditing} className="cancel-btn"><X size={18} /></button>
                            </div>
                          ) : (
                            <span className={`role-badge role-${user.role || 'user'}`}>
                              {displayRole(user.role)}
                            </span>
                          )}
                        </td>
                        <td>
                          {user.passwordChanged === false ? (
                            <span className="status-badge status-warning"><Key size={12} /> Required</span>
                          ) : (
                            <span className="status-badge status-approved"><Check size={12} /> Active</span>
                          )}
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn" onClick={() => startEditing(user)}><Edit3 size={16} /></button>
                            <button className="reset-password-btn" onClick={() => handleResetUserPassword(user.id)}><Key size={16} /></button>
                            <button className="delete-btn" onClick={() => handleDeleteUser(user.id)}><Trash size={16} /></button>
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
              <div className="header-actions">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={eventSearchTerm}
                    onChange={(e) => setEventSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button
                  className={`admin-btn ${showPendingOnly ? 'active' : ''}`}
                  onClick={() => setShowPendingOnly(!showPendingOnly)}
                >
                  {showPendingOnly ? "All Events" : "Pending Only"}
                </button>
              </div>
            </div>

            <div className="stats-cards">
              <div className="stat-card">
                <CalendarDays size={24} />
                <div><h3>Total</h3><p>{eventStats.total}</p></div>
              </div>
              <div className="stat-card">
                <Check size={24} />
                <div><h3>Approved</h3><p>{eventStats.approved}</p></div>
              </div>
              <div className="stat-card">
                <Clock size={24} />
                <div><h3>Pending</h3><p>{eventStats.pending}</p></div>
              </div>
              <div className="stat-card">
                <X size={24} />
                <div><h3>Rejected</h3><p>{eventStats.rejected}</p></div>
              </div>
            </div>

            {loading ? (
              <p className="loading-message">Loading events...</p>
            ) : filteredEvents.length === 0 ? (
              <p className="no-data-message">No events found</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Proposed By</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td><strong>{getEventName(ev)}</strong></td>
                        <td><span className="event-title-badge">{getEventTitle(ev)}</span></td>
                        <td><span className="event-type">{getEventType(ev)}</span></td>
                        <td>{ev.proposedBy || "N/A"}</td>
                        <td>{formatDate(ev.date)}</td>
                        <td>
                          <span className={`status-badge status-${ev.status || 'pending'}`}>
                            {ev.status || "pending"}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {ev.status === 'pending_admin' && (
                              <>
                                <button className="approve-btn" onClick={() => handleApproveEvent(ev.id)}><Check size={16} /></button>
                                <button className="reject-btn" onClick={() => handleRejectEvent(ev.id)}><X size={16} /></button>
                              </>
                            )}
                            <button className="delete-btn" onClick={() => handleDeleteEvent(ev.id)}><Trash size={16} /></button>
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
              <p className="no-data-message">No events in dashboard</p>
            ) : (
              <div className="dashboard-grid">
                {dashboardEvents.map((event) => (
                  <div key={event.id} className="dashboard-card">
                    <h4>{getEventName(event)}</h4>
                    <p>{event.description}</p>
                    <p><Calendar size={14} /> {formatDate(event.date)}</p>
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
              <h2>Messages</h2>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchTerm}
                  onChange={(e) => setMessageSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <p className="no-data-message">No messages</p>
            ) : (
              <div className="messages-list">
                {filteredMessages.map((msg) => (
                  <div key={msg.id} className="message-card">
                    <h4>{msg.name}</h4>
                    <p><Mail size={14} /> {msg.email}</p>
                    <p>{msg.message}</p>
                    <div className="message-actions">
                      <button onClick={() => handleToggleReply(msg.id)} className="view-btn">
                        {replyingToMessageId === msg.id ? 'Cancel' : 'Reply'}
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteMessage(msg.id)}><Trash size={14} /> Delete</button>
                    </div>
                    {replyingToMessageId === msg.id && (
                      <div className="reply-container">
                        <textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type reply..."
                          rows="3"
                        />
                        <button onClick={() => handleSendReply(msg)} className="approve-btn">Send</button>
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
            <h2>Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Users</h3>
                <p>Total: {userStats.total}</p>
                <p>Admins: {userStats.admins}</p>
                <p>Pending: {userStats.pendingPasswordChange}</p>
              </div>
              <div className="analytics-card">
                <h3>Events</h3>
                <p>Total: {eventStats.total}</p>
                <p>Approved: {eventStats.approved}</p>
                <p>Pending: {eventStats.pending}</p>
              </div>
              <div className="analytics-card">
                <h3>Event Types</h3>
                {analyticsData.eventCategories.map((cat, idx) => (
                  <p key={idx}>{cat.name}: {cat.value}</p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="admin-modal-overlay" onClick={handleCloseModal}>
          <div className="admin-modal create-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="close-modal-btn" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={newUserData.fullName} onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={newUserData.email} onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input type="tel" value={newUserData.phoneNumber} onChange={(e) => setNewUserData({...newUserData, phoneNumber: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select value={newUserData.role} onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}>
                  <option value="user">User</option>
                  <option value="officer">Officer</option>
                  <option value="head">Head</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {generatedPassword && (
                <div className="password-display">
                  <div className="password-box">
                    <code>{generatedPassword}</code>
                    <button type="button" onClick={handleCopyPassword} className={`copy-btn ${copySuccess ? 'copied' : ''}`}>
                      {copySuccess ? <><CheckCircle size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
                    </button>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>Cancel</button>
                {generatedPassword ? (
                  <button type="button" className="create-another-btn" onClick={handleCreateAnother}>
                    <UserPlus size={16} /> Create Another
                  </button>
                ) : (
                  <button type="submit" className="create-btn" disabled={loading}>
                    {loading ? "Creating..." : "Create User"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;