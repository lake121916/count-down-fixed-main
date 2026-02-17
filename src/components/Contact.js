import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import "./Contact.css";

const Contact = () => {
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [status, setStatus] = useState("");

  // Auto-fill name & email if logged in
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.displayName || "",
        email: currentUser.email || ""
      }));
    }
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const sendEmail = async (e) => {
    e.preventDefault();

    // 🔒 Extra Security Layer
    if (!currentUser) {
      setStatus("❌ You must login first.");
      return;
    }

    setStatus("Sending...");

    try {
      await addDoc(collection(db, "contact_messages"), {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        message: formData.message.trim(),
        createdAt: serverTimestamp(),
        read: false,
        senderUid: currentUser.uid,
        senderRole: currentUser.role || "user"
      });

      setStatus("✅ Message sent successfully!");
      setFormData(prev => ({
        ...prev,
        message: ""
      }));

    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("❌ Failed to send message. Please try again.");
    }
  };

  // 🔐 Block page if not logged in
  if (!currentUser) {
    return (
      <div className="page">
        <header className="header">
          <h1>Contact Us</h1>
        </header>

        <main className="content" style={{ textAlign: "center", padding: "60px" }}>
          <h2>🔒 Login Required</h2>
          <p>You must be logged in to send a message to Admin.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Contact Us</h1>
      </header>

      <main className="content">

        {/* CONTACT INFO */}
        <section className="contact-info">
          <h2>Get in Touch</h2>

          <div className="contact-details">

            <div className="contact-item">
              <strong>Tel:</strong>
              <span>+251118132191</span>
            </div>

            <div className="contact-item">
              <strong>Email:</strong>
              <span>contact@mint.gov.et</span>
            </div>

            <div className="contact-item">
              <strong>Website:</strong>
              <span>www.mint.gov.et</span>
            </div>

            <div className="contact-item">
              <strong>Address:</strong>
              <span>Addis Ababa, Ethiopia</span>
            </div>

          </div>
        </section>

        {/* CONTACT FORM */}
        <section className="contact-form-section">
          <h2>Send us a Message</h2>

          <form onSubmit={sendEmail} className="contact-form">

            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Your Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ backgroundColor: "#f3f4f6" }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Your Message</label>
              <textarea
                id="message"
                name="message"
                placeholder="Type your message here..."
                rows="5"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Send Message
            </button>

          </form>

          {status && (
            <div
              className={`status-message ${
                status.includes("✅") ? "success" : "error"
              }`}
            >
              {status}
            </div>
          )}

        </section>
      </main>
    </div>
  );
};

export default Contact;