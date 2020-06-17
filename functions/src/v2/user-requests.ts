import { CallableContext } from "firebase-functions/lib/providers/https";
import * as responses from './helpers/responses';
import * as admin from 'firebase-admin';
import AppUser from "./models/app-user";

export const setNewUser = async function(n:string, context:CallableContext, language:string):Promise<responses.ServerResponse>{
    if(n && context.auth && context.auth.uid && context.auth.token.email !== undefined){

        const domain = context.auth.token.email.split('@')[1];
        let snapshot:FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | undefined;
        try{
            snapshot = await admin.firestore().collection('firms').doc(domain).get();
        }
        catch(err){
            //TODO: Log data
        }

        if(snapshot === undefined || snapshot.exists === false){
            try{
                await admin.firestore().collection('firms').doc(domain).set({
                    mail:domain
                });
            }
            catch(err){
                //TODO: Log data
            }
        }

        const user:AppUser = {
            dName:n,
            mail:context.auth.token.email,
            uid:context.auth.uid,
            verified:false,
            firm:admin.firestore().collection('firms').doc(domain)
        };
        try{
            await admin.firestore().collection('users').doc(context.auth.uid).set(user);
        }
        catch(err){
            return responses.genericServerFailResponse();
        }
        return responses.genericSuccessResponse();
    }
    else
        return responses.authError();
}

export const getUserData = async function(context:CallableContext,language:string):Promise<responses.ServerResponse>{
    
    return responses.genericNotImplementedFailResponse();
}