const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.createUserByAdmin = functions.https.onCall(async (data, context) => {
  // Check if the caller is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create users.'
    );
  }

  // Verify admin status
  const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  const callerData = callerDoc.data();
  
  if (!callerData || callerData.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can create users.'
    );
  }

  const { email, password, fullName, phoneNumber, role } = data;

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
      phoneNumber: phoneNumber,
      disabled: false
    });

    // Set custom claims for role
    await admin.auth().setCustomUserClaims(userRecord.uid, { 
      role: role || 'user',
      mustChangePassword: true // Flag to force password change
    });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      fullName: fullName,
      email: email,
      phoneNumber: phoneNumber,
      role: role || 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
      mustChangePassword: true,
      lastLogin: null,
      passwordLastChanged: null
    });

    return {
      success: true,
      userId: userRecord.uid,
      message: 'User created successfully'
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});