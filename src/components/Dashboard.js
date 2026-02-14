// src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [dashboardEvents, setDashboardEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard events
  const fetchDashboardEvents = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = collection(db, "users", currentUser.uid, "dashboard");
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Sort by savedAt descending to show most recent first
      list.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      setDashboardEvents(list);
    } catch (err) {
      console.error("Error fetching dashboard events:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDashboardEvents();
  }, [fetchDashboardEvents]);

  // Remove event
  const removeFromDashboard = async (eventId) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "dashboard", eventId));
      setDashboardEvents((prev) => prev.filter((e) => e.id !== eventId));
      alert("Event removed from your dashboard.");
    } catch (err) {
      console.error(err);
      alert("Failed to remove event: " + (err.message || err));
    }
  };

  if (loading) return <p>Loading your dashboard...</p>;
  if (!dashboardEvents.length) return <p>Your dashboard is empty.</p>;

  return (
    <div className="dashboard-container">
      <h2>My Dashboard</h2>
      <div className="events-grid">
        {dashboardEvents.map((event) => (
          <div key={event.id} className="event-card">
            {event.imageURL && (
              <img src={event.imageURL} alt={event.title || event.eventName} />
            )}
            <h3>{event.title || event.eventName}</h3>
            <p>{event.location}</p>
            <p>{event.description}</p>
            <p>Status: {event.status}</p>
            <p>Proposed by: {event.proposedBy}</p>
            <button onClick={() => removeFromDashboard(event.id)}>❌ Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
