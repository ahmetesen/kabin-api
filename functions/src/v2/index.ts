import { CallableContext } from "firebase-functions/lib/providers/https";
import * as responses from './helpers/responses';
import * as deviceRequests from './device-requests';
import * as authRequests from './auth-requests';
import * as userRequests from './user-requests';
import lang from './constants/lang';

const ping = async function (body:any,context:CallableContext, language:string):Promise<responses.ServerResponse>{
    const responseObj = responses.genericSuccessResponse();
    return responseObj;
} 
const methodList:any = {
    "ping":ping,
    "createDeviceAndSaveToDb":deviceRequests.createDeviceAndSaveToDb,
    "attachUserToDevice":deviceRequests.attachUserToDevice,
    "updateDeviceTokenOnDb":deviceRequests.updateDeviceTokenOnDb,
    "checkIfEmailValid": authRequests.checkIfEmailValid,
    "setNewUser": userRequests.setNewUser
}

export const mainRouter = async function(data:any,context:CallableContext,fs:FirebaseFirestore.Firestore):Promise<responses.ServerResponse>{
    const method:string = data.m;
    const body:any = data.b;
    const language:string = data.l;
    if(method && methodList[method]){
        return await methodList[method](body,context,language,fs);
    }
    else{
        if(language && (lang[language] !== null))
            return {statusCode:400,param:lang[language].badRequest}
        else
            return {statusCode:400,param:lang.en.badRequest}
    }
}