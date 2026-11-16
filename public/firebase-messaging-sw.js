// Shows lunch notifications while the app is closed or in the background. Firebase draws the
// notification itself from the message and opens its link when it is clicked; this file only
// has to start Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

// Which Firebase project: the page passes its config in this file's address when it registers it
// (src/lib/push.ts), because a file in public/ can't read the build's environment.
firebase.initializeApp(Object.fromEntries(new URL(self.location.href).searchParams));

firebase.messaging();
