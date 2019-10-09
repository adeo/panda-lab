import {FirebaseRepository} from "./repositories/firebase.repository";
import {AgentModel, CollectionName, Device} from 'pandalab-commons';
import {from, Observable, zip} from "rxjs";
import {filter, flatMap, switchMapTo, toArray} from "rxjs/operators";

export class AgentsService {


    constructor(private firebaseRepo: FirebaseRepository) {

    }
    
    listenAgents(): Observable<AgentModel[]> {
        const query = this.firebaseRepo.getCollection(CollectionName.AGENTS);
        return this.firebaseRepo.listenQuery(query)
    }

    getAgent(id: string): Observable<AgentModel> {
        const documentReference = this.firebaseRepo.getCollection(CollectionName.AGENTS).doc(id);
        return this.firebaseRepo.getDocument(documentReference)
    }

    listenAgentDevices(agentUID: string): Observable<Device[]> {
        const agentRef = this.firebaseRepo.getCollection(CollectionName.AGENTS).doc(agentUID);
        const query = this.firebaseRepo.getCollection(CollectionName.DEVICES)
            .where("agent", '==', agentRef);
        return this.firebaseRepo.listenQuery(query)
    }

}
