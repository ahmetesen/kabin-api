import { CallableContext } from "firebase-functions/lib/providers/https";
import * as responses from './helpers/responses';
import * as admin from 'firebase-admin';
import lang from './constants/lang';

export const checkIfEmailValid = async (email:string, context:CallableContext, language:string): Promise<responses.ServerResponse> => {
    if(email === ""){
        return responses.genericClientFailResponse();
    }

    const reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const valid = reg.test(String(email).toLowerCase());
    if(valid === false){
        return {statusCode:400, errorType:'validation', param:'mail_clientvalidation_error_message'};
    }

    const result = await checkDomains(email);
    if(result !== true){
        return {statusCode:400, errorType:'validation', param:lang.en.invalidEmail};
    }

    try{
        await admin.auth().getUserByEmail(email);
        return {statusCode:400, errorType:"popup", param:lang.en.alreadyLogged };
    }
    catch(err){
        return responses.genericSuccessResponse();
    }        
}

const checkDomains = async (email:string):Promise<boolean> => {
    const invalidDomains = ["gsmail","hotmail","outlook","yahoo","icloud","me","windowslive","mail","kardes","msn"];
    const domainPart = email.split('@')[1];
    const baseDomain = domainPart.split('.')[0];
    let valid = true;
    invalidDomains.forEach((item)=>{
        if(baseDomain === item)
            valid = false;
    });
    return valid;
}