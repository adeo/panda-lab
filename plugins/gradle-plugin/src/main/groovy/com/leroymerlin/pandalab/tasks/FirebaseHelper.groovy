package com.leroymerlin.pandalab.tasks

import com.google.cloud.firestore.*

import javax.annotation.Nullable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class FirebaseHelper {


    interface DocumentHandler {
        /**
         *
         * @param new snapshot received
         * @return true will stop listening, false otherwise
         */
        boolean handleDocument(DocumentSnapshot snapshot)
    }

    static DocumentSnapshot syncListener(DocumentReference reference, long timeoutInSecond, DocumentHandler handler) {
        def listener = new FirebaseSyncListener(handler)
        ListenerRegistration subscription = reference.addSnapshotListener(listener)
        def result = null
        try {
            result = listener.waitResult(timeoutInSecond)
        } finally {
            subscription?.remove()
        }
        return result

    }

    static class FirebaseSyncListener implements EventListener<DocumentSnapshot> {
        DocumentSnapshot result
        CountDownLatch called
        DocumentHandler handler

        FirebaseSyncListener(DocumentHandler handler) {
            this.handler = handler
            called = new CountDownLatch(1)

        }

        DocumentSnapshot waitResult(long timeoutInSecond) {
            called.await(timeoutInSecond, TimeUnit.SECONDS)
            return result
        }

        void setResult(DocumentSnapshot r) {
            this.result = r
            called.countDown()
        }

        @Override
        void onEvent(@Nullable DocumentSnapshot value, @Nullable FirestoreException error) {
            if (handler.handleDocument(value)) {
                setResult(value)
            }
        }
    }


}
