import {AgentModel, CollectionName, Role, User} from "pandalab-commons";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/lib/providers/https";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import DecodedIdToken = admin.auth.DecodedIdToken;


interface DeveloperClaims {
    role: string;
}

class SecurityService {

    initialize() {
        //Generate api key at start
        const uuidv4 = require('uuid/v4');
        admin.firestore().collection(CollectionName.CONFIG).doc("secrets").get()
            .then(document => {
                if (!document.exists || document.get("apiKey") === undefined) {
                    console.warn("Generate new api key");
                    return admin.firestore().collection(CollectionName.CONFIG).doc("secrets")
                        .set({'apiKey': uuidv4()}, {merge: true})
                        .then(() => "api key added")
                }
                return Promise.resolve("api key exist")
            })
            .catch(e => console.error("Error checking apiKey", e));
    }


    refreshCustomToken(uid: string, oldToken: string): Promise<{ token: string }> {
        return admin.firestore().collection(CollectionName.TOKENS_SECURITY).doc(uid).get()
            .then(value => {
                const data = value.data();
                if (value.exists && data && data.token === oldToken) {
                    return this.createCustomToken(uid, data.role, data.parentUid)
                } else {
                    return Promise.reject("Can't found token")
                }
            })
    }

    createMobileAgent(uid: string, auth: { uid: string; token: DecodedIdToken; }): Promise<{ token: string }> {
        if (!auth || !auth.token) {
            throw new HttpsError("unauthenticated", `user not authenticated`);
        } else if (auth.token.role === Role.agent) {
            return this.createCustomToken(uid, Role.mobile_agent, auth.uid);
        } else {
            console.error(`The role [${auth.token.role}] is not authorized to create custom tokens for mobile`);
            throw new HttpsError("permission-denied", `The role [${auth.token.role}] is not authorized to create custom tokens for mobile`);
        }
    }

    async createAgent(uid: string, auth: { uid: string; token: DecodedIdToken; }): Promise<{ token: string }> {
        if (auth.token.role === Role.admin) {
            await admin.firestore().collection(CollectionName.AGENTS).doc(uid).set(<AgentModel>{
                name: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                online: false
            });
            return this.createCustomToken(uid, Role.agent, auth.uid);
        } else {
            console.error(`The role [${auth.token.role}] is not authorized to create custom tokens for desktop`);
            throw new HttpsError("permission-denied", `The role [${auth.token.role}] is not authorized to create custom tokens for desktop`);
        }
    }


    updateUserClaim(uid: string, doc: DocumentSnapshot) {
        if (doc.exists) {
            console.log('User security added or modified: ', doc.data());
            const user = doc.data() as User;
            return admin.auth().setCustomUserClaims(uid, {role: user.role})
                .then(() => {
                    console.log(`Claims for user ${uid} updated with success`)
                }).catch(reason => {
                    console.error("can't add claim", reason)
                });
        } else {
            return admin.auth().deleteUser(uid)
                .catch(reason => {
                    console.error("Can't delete auth user", reason);
                });
        }
    }

    /**
     * On Sign up and claims
     */
    onUserCreated(uid: string) {
        console.log('new user created : ' + uid);
        return admin.firestore().collection(CollectionName.USERS_SECURITY)
            .where('role', '==', Role.admin).get()
            .then(snapshot => {
                if (snapshot.docs.length === 0) {
                    console.log("no admin found. " + uid + " became admin");
                    return this.saveUserSecurity(uid, Role.admin);
                } else {
                    console.log(uid + " became guest");
                    return this.saveUserSecurity(uid, Role.guest);
                }
            })
            .catch(err => {
                console.error('Error during the access to ' + CollectionName.USERS_SECURITY);
                throw new HttpsError("permission-denied", `Error during the access to userèsecurity`);
            })
    }

    async checkApiRequest(req: any) {
        if (req.headers["x-api-key"]) {
            const apiKey = req.headers["x-api-key"];
            const secrets = await admin.firestore().collection("config").doc("secrets").get();
            if (apiKey !== secrets.get("apiKey")) {
                throw new Error("Wrong api key")
            }
        } else if (req.headers["authorization"]) {
            const idToken = req.headers['authorization'].split('Bearer ')[1];
            await admin.auth().verifySessionCookie(idToken);
        } else {
            throw new Error("Missing authorization header")
        }
    }

    private async saveUserSecurity(uid: string, role: string) {
        let email = "unknown";
        try {
            const user = await admin.auth().getUser(uid);
            if (user.email) {
                email = user.email;
            }
        } catch (e) {
            console.error("can't add email in " + CollectionName.USERS_SECURITY, e)
        }

        return admin.firestore().collection(CollectionName.USERS_SECURITY).doc(uid).set(<User>{
            uid: uid,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            email: email
        });
    }

    private createCustomToken(uid: string, role: string, parentUid: string): Promise<{ token: string }> {
        return admin
            .auth()
            .createCustomToken(uid, <DeveloperClaims>{
                role: role,
                parent: parentUid
            })
            .then(function (customToken) {
                console.log(`Custom token generated = [${customToken}], uid = [${uid}}, role = [${role}]`);
                const data = {token: customToken};
                return admin.firestore().collection(CollectionName.TOKENS_SECURITY).doc(uid).set({
                    ...data,
                    role: role,
                    parentUid: parentUid
                }).then(() => data)
            })
            .catch(function (error) {
                console.error("createCustomToken() error", error);
                throw new HttpsError("unknown", error);
            });
    }


}


export const securityService = new SecurityService();
