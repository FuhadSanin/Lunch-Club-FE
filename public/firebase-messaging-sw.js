// Shows lunch notifications while the app is closed or in the background. Firebase draws the
// notification itself from the message and opens its link when it is clicked; this file only
// has to start Firebase Messaging. The config is public (it ships in the page too).
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDa3iuFZEXACtEhB5QUxLAxdPe_9mm1y-w',
  authDomain: 'lunchclub-fa2d4.firebaseapp.com',
  projectId: 'lunchclub-fa2d4',
  storageBucket: 'lunchclub-fa2d4.firebasestorage.app',
  messagingSenderId: '982646408056',
  appId: '1:982646408056:web:1790fa13c4c494489bbe8d',
});

firebase.messaging();
