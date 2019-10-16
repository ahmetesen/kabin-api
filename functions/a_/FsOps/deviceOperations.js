const admin = require('firebase-admin');
const firestore = admin.firestore();




const getDevice = async function(deviceId,pushToken){
    let device = await getDeviceByDeviceId(deviceId);
    if(device){
        if(device.pushToken == pushToken){
            return resolve(device);
        }
        else{
            device.ref.update({pushToken});
            device.pushToken = pushToken;
            return resolve(device);
        }
    }
    else{
        device = await getDeviceByPushToken(pushToken);
        if(device){
            device.ref.update({deviceId});
            device.deviceId = deviceId;
            return resolve(device);
        }
        else{
            return resolve();
        }
    }
}

const getDeviceByDeviceId = function(deviceId){
    return new Promise((resolve)=>{
        const snapshot = await firestore.collection("devices").where('deviceId', '==', deviceId).get();
        if(snapshot.empty)
            return resolve();
        else
            return resolve(snapshot.docs[0]);
    });
}

const getDeviceByPushToken = function(pushToken){
    return new Promise((resolve,reject)=>{
        const snapshot = await firestore.collection("devices").where('pushToken', '==', pushToken).get();
        if(snapshot.empty)
            return resolve();
        else
            return resolve(snapshot.docs[0]);
    });
}

module.exports={
    getDevice
};