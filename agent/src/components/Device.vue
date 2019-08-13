<template>
    <div id="device">
        <md-toolbar>
            <md-button class="md-icon-button" @click="onBack()">
                <md-icon>arrow_back</md-icon>
            </md-button>
            <h3 class="md-title">Détail d'un device</h3>
        </md-toolbar>
        <template v-if="device">
            <div class="content">
                <h1>Détail du device</h1>
                <div class="container">
                    <div class="md-card">
                        <md-list class="md-double-line">
                            <md-subheader>Phone</md-subheader>

                            <md-list-item>
                                <md-icon class="md-primary">phone</md-icon>
                                <div class="md-list-item-text">
                                    <span>{{ device.name }}</span>
                                    <span>{{ device.id }}</span>
                                    <span>{{ device.brand }}</span>
                                </div>
                            </md-list-item>

                            <md-divider></md-divider>

                            <md-subheader>Serial</md-subheader>

                            <md-list-item>
                                <md-icon class="md-primary">email</md-icon>

                                <div class="md-list-item-text">
                                    <span>{{ device.model }}</span>
                                    <span>{{ device.serialId }}</span>
                                </div>
                            </md-list-item>

                            <md-divider></md-divider>

                            <md-subheader>Jobs</md-subheader>

                            <md-list-item>
                                <md-icon class="md-primary">email</md-icon>
                                <div class="md-list-item-text">
                                    <span>Total</span>
                                    <span v-if="jobs">{{ jobs.length }}</span>
                                    <div v-else class="progress-container">
                                        <md-progress-spinner md-mode="indeterminate" :md-diameter="20" :md-stroke="2"></md-progress-spinner>
                                    </div>

                                </div>
                                <md-button class="md-icon-button md-list-action">
                                    <md-icon class="md-primary">view_list</md-icon>
                                </md-button>
                            </md-list-item>
                        </md-list>
                    </div>
                    <div>
                        <img :src="device.pictureIcon ? device.pictureIcon : require('../assets/images/device.png')">
                    </div>
                </div>
            </div>
        </template>
        <template v-else>
            <p>LOADING...</p>
        </template>

    </div>
</template>
<script lang="ts">
    import {Component, Vue} from "vue-property-decorator";
    import {Subscription} from "vue-rx-decorators";
    import {from} from "rxjs";
    import * as firebase from "firebase";
    import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
    import {tap} from "rxjs/operators";

    @Component
    export default class Device extends Vue {

        @Subscription()
        protected get device() {
            return from(firebase.firestore().collection('devices').doc(this.$route.params.deviceId).get())
                .map((value: QueryDocumentSnapshot) => {
                    const data = value.data();
                    return {
                        id: value.id,
                        name: data.name,
                        brand: data.phoneBrand,
                        model: data.phoneModel,
                        serialId: data.serialId,
                    };
                });
        }

        @Subscription()
        protected get jobs() {
            const deviceReference = firebase.firestore().collection('devices').doc(this.$route.params.deviceId);
            const querySnapshotPromise = firebase.firestore()
                .collection('jobs-tasks')
                .where('device', '==', deviceReference)
                .get();

            return from(querySnapshotPromise)
                .map(value => value.docs)
                .flatMap(from)
                .map((document: QueryDocumentSnapshot) => {
                    return {
                        id: document.id,
                        data: document.data(),
                    };
                })
                .toArray()
                .pipe(
                    tap((data => console.log(data)))
                );
        }

        protected onBack() {
            this.$router.back();
        }

    }

</script>
<style scoped>

    #home .content-container {
        padding: 0;
    }

    #device .content {
        padding: 20px;
    }

    h1 {
        color: white;
    }

    #device .container {
        display: flex;
        justify-content: space-around;
        flex-flow: row wrap;
    }

    #device .container > * {
        flex: 1;
    }

    #device .container .md-card {
        padding: 12px;
    }

    #device .progress-container {
        width: 20px;
        height: 20px;
        display: -webkit-box;
    }

    #device .progress-container .md-progress-spinner {
        width: 20px;
        height: 20px;
    }


</style>
