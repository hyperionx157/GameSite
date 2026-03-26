const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteOldMessages = functions.pubsub
    .schedule("every 1 hours") // Runs every hour
    .onRun(async (context) => {
        const now = admin.firestore.Timestamp.now();
        const messagesRef = admin.firestore().collection("chatMessages");

        // Get messages where expiresAt <= now
        const oldMessages = await messagesRef
            .where("expiresAt", "<=", now)
            .get();

        if (oldMessages.empty) {
            console.log("No old messages to delete.");
            return null;
        }

        const batch = admin.firestore().batch();
        oldMessages.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        console.log(`Deleted ${oldMessages.size} old messages.`);
        return null;
    });