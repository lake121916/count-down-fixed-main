import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updatePassword, sendEmailVerification } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const user = auth.currentUser;
      console.log("ChangePassword - Current user:", user);
      
      if (!user) {
        // Check if there's a temp user in localStorage
        const tempUser = localStorage.getItem('tempUser');
        
        if (tempUser) {
          const userData = JSON.parse(tempUser);
          setUserEmail(userData.email);
        } else {
          console.log("No user found, redirecting to login");
          navigate('/login');
        }
      } else {
        setUserEmail(user.email);
      }
    };

    checkUser();
  }, [navigate]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[@$!%*?&]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  };

  const handleChange = (e) => {
    const { value } = e.target;
    setNewPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    console.log("Starting password change process");

    // Validate password
    if (!isStrongPassword(newPassword)) {
      setError(
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      console.log("Current auth user:", user);
      
      if (!user) {
        console.log("No user in auth, checking localStorage");
        const tempUser = localStorage.getItem('tempUser');
        
        if (!tempUser) {
          setError('You must be logged in to change your password.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      // Update password in Firebase Auth
      console.log("Updating password for user:", user.uid);
      await updatePassword(user, newPassword);
      console.log("Password updated successfully in Auth");
      
      // Update Firestore document
      console.log("Updating Firestore document");
      const userRef = doc(db, 'users', user.uid);
      
      // First check if document exists
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        console.log("User document not found in Firestore");
        setError('User data not found. Please contact support.');
        return;
      }
      
      await updateDoc(userRef, {
        passwordChanged: true,
        lastPasswordChange: new Date().toISOString()
      });
      console.log("Firestore updated successfully");

      // Send email verification AFTER password change
      console.log("Sending email verification");
      await sendEmailVerification(user);
      console.log("Verification email sent");

      // Clear temp user and set regular user
      const tempUser = localStorage.getItem('tempUser');
      if (tempUser) {
        const userData = JSON.parse(tempUser);
        userData.passwordChanged = true;
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.removeItem('tempUser');
        console.log("Moved tempUser to user in localStorage");
      }

      setSuccess(
        'Password changed successfully! A verification email has been sent to your email address. ' +
        'Please verify your email before logging in again.'
      );
      
      // Sign out user so they can verify email
      await auth.signOut();
      localStorage.removeItem('user');
      
      // Redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);

    } catch (err) {
      console.error('Password change error:', err);
      
      if (err.code === 'auth/requires-recent-login') {
        setError('Please log in again to change your password.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(err.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return '#e53e3e';
    if (passwordStrength < 70) return '#d69e2e';
    return '#38a169';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="change-password-container">
      <div className="change-password-box">
        <h2>Change Your Password</h2>
        <p className="subtitle">
          {userEmail ? (
            <>Welcome, <strong>{userEmail}</strong></>
          ) : (
            'You\'re using a default password.'
          )} 
          <br />
          <span className="subtitle-highlight">
            Please set a new password. After changing, you'll need to verify your email.
          </span>
        </p>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="input-group">
            <label htmlFor="newPassword">
              <i className="fas fa-lock"></i>
              NEW PASSWORD
            </label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                required
                disabled={loading || success}
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
            
            {newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${passwordStrength}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  ></div>
                </div>
                <div className="strength-text">
                  Password strength:{' '}
                  <span style={{ color: getPasswordStrengthColor(), fontWeight: 'bold' }}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">
              <i className="fas fa-check-circle"></i>
              CONFIRM PASSWORD
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading || success}
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="password-requirements">
            <h4>Password must contain:</h4>
            <ul>
              <li className={newPassword.length >= 8 ? 'met' : ''}>
                <i className={`fas ${newPassword.length >= 8 ? 'fa-check-circle' : 'fa-circle'}`}></i>
                At least 8 characters
              </li>
              <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>
                <i className={`fas ${/[a-z]/.test(newPassword) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                One lowercase letter
              </li>
              <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>
                <i className={`fas ${/[A-Z]/.test(newPassword) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                One uppercase letter
              </li>
              <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>
                <i className={`fas ${/[0-9]/.test(newPassword) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                One number
              </li>
              <li className={/[@$!%*?&]/.test(newPassword) ? 'met' : ''}>
                <i className={`fas ${/[@$!%*?&]/.test(newPassword) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                One special character (@$!%*?&)
              </li>
            </ul>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <div className="password-mismatch">
              <i className="fas fa-exclamation-triangle"></i>
              Passwords do not match
            </div>
          )}

          <button 
            type="submit" 
            className="change-password-button"
            disabled={loading || success}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Changing Password...
              </>
            ) : (
              <>
                <i className="fas fa-key"></i>
                Change Password & Verify Email
              </>
            )}
          </button>
        </form>

        <div className="change-password-footer">
          <p>
            <i className="fas fa-shield-alt"></i>
            After changing your password, you'll need to verify your email to continue
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;