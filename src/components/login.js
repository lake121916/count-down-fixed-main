import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification 
} from 'firebase/auth';
import { 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('User data not found.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      console.log("User data:", userData);

      // Check if this is a first-time login with default password
      if (userData.passwordChanged === false) {
        console.log("User needs to change password first");
        
        // Store user info in temp storage
        localStorage.setItem(
          'tempUser',
          JSON.stringify({
            uid: user.uid,
            email: userData.email,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            isAdmin: userData.isAdmin || false,
            role: userData.role || 'user'
          })
        );
        
        // Redirect to change password page WITHOUT checking email verification
        navigate('/change-password');
        setLoading(false);
        return;
      }

      // If password is already changed, NOW check email verification
      if (!user.emailVerified) {
        setShowVerificationMessage(true);
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Store user data in localStorage for normal login
      localStorage.setItem(
        'user',
        JSON.stringify({
          uid: user.uid,
          email: userData.email,
          fullName: userData.fullName,
          phoneNumber: userData.phoneNumber,
          isAdmin: userData.isAdmin || false,
          role: userData.role || 'user',
          passwordChanged: true
        })
      );

      // Redirect based on role
      if (userData.isAdmin) {
        navigate('/admin');
      } else if (userData.role === 'officer') {
        navigate('/officer');
      } else if (userData.role === 'head') {
        navigate('/head');
      } else {
        navigate('/user-dashboard');
      }
    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific Firebase auth errors
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
      
    } catch (err) {
      console.error('Password reset error:', err);
      
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        default:
          setError('Unable to send password reset email. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setMessage('Verification email sent! Please check your inbox.');
      }
    } catch (err) {
      setError('Error sending verification email. Please try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome Back</h2>
        <p className="login-subtitle">Sign in to your account</p>
        
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {error}
            {showVerificationMessage && (
              <button 
                onClick={handleResendVerification}
                className="resend-verification-btn"
              >
                Resend Verification Email
              </button>
            )}
          </div>
        )}
        
        {message && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>
              <i className="fas fa-envelope"></i>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>
              <i className="fas fa-lock"></i>
              PASSWORD
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Login
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button
            onClick={handleForgotPassword}
            className="forgot-btn"
            type="button"
            disabled={loading}
          >
            <i className="fas fa-key"></i>
            {loading ? 'Sending...' : 'Forgot Password?'}
          </button>

        
        </div>

        <div className="login-note">
          <p>
            <i className="fas fa-info-circle"></i>
            <strong>First time login?</strong> Use the default password provided by your administrator. 
            You'll be asked to change your password first, then verify your email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;