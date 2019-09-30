import {FirebaseRepository} from "./repositories/firebase.repository";
import {AgentModel, CollectionName, Device} from 'pandalab-commons';
import {Observable} from "rxjs";

export class AgentsService {


    constructor(private firebaseRepo: FirebaseRepository) {

    }

    listenAgents(): Observable<AgentModel[]> {
        let query = this.firebaseRepo.getCollection(CollectionName.AGENTS);
        return this.firebaseRepo.listenQuery(query)
    }

    listenAgentDevices(agentUID: string): Observable<Device[]> {
        let agentRef = this.firebaseRepo.getCollection(CollectionName.AGENTS).doc(agentUID);
        let query = this.firebaseRepo.getCollection(CollectionName.DEVICES)
            .where("agent", '==', agentRef);
        return this.firebaseRepo.listenQuery(query)
    }
}
