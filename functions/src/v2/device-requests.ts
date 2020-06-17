import { CallableContext } from "firebase-functions/lib/providers/https";
import * as responses from './helpers/responses';
import Device from "./models/device";
import { Guid } from "guid-typescript";
import * as admin from 'firebase-admin';

export const createDeviceAndSaveToDb = async function(device:Device, context:CallableContext, language:string, fs:FirebaseFirestore.Firestore):Promise<responses.ServerResponse>{
    if(device===undefined)
        return responses.genericClientFailResponse();
    device.dId = Guid.create().toString();
    const collectionRef = fs.collection('devices');
    let result = true;
    try{
        if(device.t){
            const snapshot = await collectionRef.where('t','==',device.t).get();
            if(snapshot.empty)
                result = await addNewEntryToDevicesCollection(device);
            else{
                snapshot.forEach(async (doc)=>{
                    await doc.ref.update(device);
                })
            }
        }
        else{
            result = await addNewEntryToDevicesCollection(device);
        }
    }
    catch(err){
        return responses.genericServerFailResponse();
    }
    if(result === true)
        return {statusCode:200, param:device.dId};
    else
        return responses.genericServerFailResponse();
}

const addNewEntryToDevicesCollection = async function(device:Device):Promise<boolean>{
    if(device.dId===undefined)
        return false;
    const FieldValue = admin.firestore.FieldValue;
    device.date = FieldValue.serverTimestamp();
    try{
        const collectionRef = admin.firestore().collection('devices');
        await collectionRef.doc(device.dId).set(device);
    }
    catch(err){
        return false;
    }
    return true;
}

export const updateDeviceTokenOnDb = async function(device:Device, context:CallableContext, language:string):Promise<responses.ServerResponse>{
    if(device && device.t && device.dId){
        try{
            const deviceRef = admin.firestore().collection('devices').doc(device.dId);
            const data = await deviceRef.get();
            if(data.exists)
                await deviceRef.update({t:device.t});
            else
                await addNewEntryToDevicesCollection(device);
        }
        catch(err){
            return responses.genericServerFailResponse();
        }
        return responses.genericSuccessResponse();
    }
    else if(device && device.dId){
        const FieldValue = admin.firestore.FieldValue;
        try{
            const docRef = admin.firestore().collection('devices').doc(device.dId);
            await docRef.update({t:FieldValue.delete()});
        }
        catch(err){
            return responses.genericServerFailResponse();
        }
        return responses.genericSuccessResponse();
    }
    else
        return responses.genericClientFailResponse();
}

export const attachUserToDevice = async function(device:Device, context:CallableContext, language:string):Promise<responses.ServerResponse>{
    if(device && device.uid && device.dId){
        try{
            const deviceRef = admin.firestore().collection('devices').doc(device.dId);
            const data = await deviceRef.get();
            if(data.exists)
                await deviceRef.update({uid:device.uid});
            else
                await addNewEntryToDevicesCollection(device);
        }
        catch(err){
            return responses.genericServerFailResponse();
        }
        return responses.genericSuccessResponse();
    }
    else if(device && device.dId){
        const FieldValue = admin.firestore.FieldValue;
        try{
            const docRef = admin.firestore().collection('devices').doc(device.dId);
            await docRef.update({uid:FieldValue.delete()});
        }
        catch(err){
            return responses.genericServerFailResponse();
        }
        return responses.genericSuccessResponse();
    }
    else
        return responses.genericClientFailResponse();
}