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

  // Filter users based on search term
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

  // ------------------- DISPLAY ROLE -------------------
  const displayRole = (role) => {
    if (role === 'worker') return 'Officer';
    if (role === 'officer') return 'Officer';
    return role || 'user';
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
    rejected: events.filter(e => e.status === 'rejected').length
  };

  if (!currentUser) return <p>Loading...</p>;
  if (!currentUser.isAdmin) return <p>Access denied. You are not an admin.</p>;

  return (
    <div className="admin-panel-container">
      {/* Notifications */}
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

        {/* EVENTS TAB - Simplified */}
        {activeTab === "events" && (
          <div className="tab-content">
            <h2>Event Management</h2>
            <p>Events functionality here</p>
          </div>
        )}

        {/* DASHBOARD TAB - Simplified */}
        {activeTab === "dashboard" && (
          <div className="tab-content">
            <h2>My Dashboard</h2>
            {dashboardEvents.length === 0 ? (
              <p>No events in dashboard</p>
            ) : (
              <div className="dashboard-grid">
                {dashboardEvents.map(event => (
                  <div key={event.id} className="dashboard-card">
                    <h4>{event.name || event.title}</h4>
                    <p>{event.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MESSAGES TAB - Simplified */}
        {activeTab === "messages" && (
          <div className="tab-content">
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
            {filteredMessages.length === 0 ? (
              <p>No messages</p>
            ) : (
              filteredMessages.map(msg => (
                <div key={msg.id} className="message-card">
                  <h4>{msg.name}</h4>
                  <p>{msg.email}</p>
                  <p>{msg.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ANALYTICS TAB - Simplified */}
        {activeTab === "analytics" && (
          <div className="tab-content">
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
            </div>
          </div>
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
                <input
                  type="text"
                  value={newUserData.fullName}
                  onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={newUserData.phoneNumber}
                  onChange={(e) => setNewUserData({...newUserData, phoneNumber: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                >
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