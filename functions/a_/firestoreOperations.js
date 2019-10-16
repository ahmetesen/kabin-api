const admin = require('firebase-admin');
const firestore = admin.firestore();

const checkAndGetUser = function(data){
    return new Promise((resolve,reject)=>{
    });
}

const saveDevice = function(appVersion,contentVersion,device,deviceId,os,osVersion,pushToken,uid){
    return new Promise((resolve,reject)=>{
        let pushTokenQuery = firestore.collection("devices").where('pushToken', '==', pushToken);
        pushTokenQuery.get().then((qSnapshot)=>{
            if(qSnapshot.empty){
                return firestore.collection("devices").doc().set({
                    pushToken,
                    uid,
                    appVersion,
                    contentVersion,
                    device,
                    os,
                    osVersion
                }).then((result)=>{
                    return resolve();
                });
            }
            else{
                let obj = {};
                const remoteObj = qSnapshot.docs[0];
                if(appVersion === remoteObj.appVersion) obj.appVersion = appVersion;
                if(contentVersion === remoteObj.contentVersion) obj.contentVersion = contentVersion;
                if(device === remoteObj.device) obj.device = device;
                if(os === remoteObj.os) obj.os = os;
                if(osVersion === remoteObj.osVersion) obj.osVersion = osVersion;
                if(uid === remoteObj.uid) obj.uid = uid;
                obj.updated = admin.firestore.FieldValue.serverTimestamp();
                return qSnapshot.docs[0].ref.update(obj).then((result)=>{
                    return resolve();
                });
            }
        }).catch((err)=>{
            return reject(err);
        });
    });
}

const saveError = function(errorClass,errorMethod,errorString, deviceId, pushToken, uid){
    return new Promise((resolve,reject)=>{
        return resolve();
    })
}

const updateDevice = async function(device){
    
}

const getDevice = async function(deviceId,pushToken,uid){
    let device = await getDeviceByDeviceId(deviceId);
    if(device){

    }
    else{
        device = await getDeviceByPushToken(pushToken);
        if(device){

        }
        else{

        }
    }
}

const getDeviceByDeviceId = function(deviceId){
    return new Promise((resolve,reject)=>{
        const snapshot = await firestore.collection("devices").where('deviceId', '==', deviceId).get();
        if(snapshot.empty)
            return reject();
        else
            return resolve(snapshot.docs[0]);
    });
}

const getDeviceByPushToken = function(pushToken){
    return new Promise((resolve,reject)=>{
        const snapshot = await firestore.collection("devices").where('pushToken', '==', pushToken).get();
        if(snapshot.empty)
            return reject();
        else
            return resolve(snapshot.docs[0]);
    });
}

module.exports = {
    checkAndGetUser,
    saveDevice,
    saveError
};