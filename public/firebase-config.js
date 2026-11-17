// ==========================================================================
// 🔌 EASY BILL GENERATOR — CENTRAL FIREBASE CONFIGURATION
// Kisi bhi client ya hosting (Netlify/Vercel/PC) par sirf is file mein
// Firebase key update karne se pura project chal jaye ga!
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDDwKWcixoUThCJQqiVoBcUVsJZI60h43Q",
    authDomain: "multipos-ed91a.firebaseapp.com",
    projectId: "multipos-ed91a",
    storageBucket: "multipos-ed91a.firebasestorage.app",
    messagingSenderId: "862649586987",
    appId: "1:862649586987:web:599772124e4e29404ca16e",
    measurementId: "G-QPCP7S5Q5L"
};

// Initialize if firebase is present on window
if (typeof firebase !== 'undefined') {
    try {
        if (firebase.firestore && typeof firebase.firestore.setLogLevel === 'function') {
            firebase.firestore.setLogLevel('silent');
        }
    } catch (_) {}
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        try {
            const dbInst = firebase.firestore();
            if (dbInst && typeof dbInst.settings === 'function') {
                dbInst.settings({
                    experimentalAutoDetectLongPolling: true,
                    merge: true
                });
            }
            dbInst.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.info('Firestore persistence: Multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.info('Firestore persistence not supported by browser');
                }
            });
        } catch (e) {
            console.info('Offline persistence info:', e);
        }
    }
}

window.ebFirebaseConfig = firebaseConfig;
