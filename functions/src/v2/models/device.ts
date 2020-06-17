import { firestore } from "firebase-admin";

type Device = {
    expoV:string|undefined;
    osV:string|undefined;
    os:string|undefined;
    d:string|undefined;
    dId:string|undefined;
    appV:string|undefined;
    t:string|undefined;
    date:firestore.FieldValue|undefined;
    uid:string|undefined;
    l:string|undefined;
}

export default Device;