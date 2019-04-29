process.env.FIREBASE_CONFIG = JSON.stringify({
    apiKey: "AIzaSyBQn5eEA_v6_g2t_jviSE5kuWVIScgUOwg",
    databaseURL: "https://kabin-64963.firebaseio.com",
    storageBucket: "kabin-64963.appspot.com",
    authDomain: "kabin-64963.firebaseapp.com",
    messagingSenderId: "625321362515",
    projectId: "kabin-64963"
});

const { Expo } = require('expo-server-sdk');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const config = functions.config().firebase;
admin.initializeApp(config);
var db = admin.database();
let expo = new Expo();
const adminMail = "ahmetesen88@gmail.com"

exports.helloWorld = functions.https.onRequest((request, response) => {
    return {data: "hello there"};
});

exports.setPushToken = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var token = data.token;
    return updateDbRow("users/"+uid,{token}).then(()=>{
        return {statusCode:200};
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });
})

exports.saveNewUser = functions.https.onCall((data,context)=>{
    var email = context.auth.token.email;
    var displayName = data.displayName;
    var uid = context.auth.uid;
    var token = data.token?data.token:"";
    if(!email || !displayName)
        return {status:400, errorCode:0, error: "displayName ya da email gönderilmedi :("};
    return checkUserExist(uid).then((user)=>{
        if(user)
        { //TODO check user's push token. If not equal with db, change it.
            if(user.token && user.token === token)
                return {status:200,user};
            else
                return updateDbRow("users/"+uid,{token}).then(()=>{
                    return {statusCode:200,user};
                }).catch((error)=>{
                    return {statusCode:500,error};
                });
        }
        else
            return addNewUser(displayName,email,uid,token).then((user)=>{
                return {status:200,user};
            }).catch((error)=>{
                return {status:500,error};
            });
    }).catch((error)=>{
        return {status:500, error: error.message};
    })
});

const checkUserExist = function(uid){
    return new Promise((resolve,reject)=>{
        db.ref(`users`).once('value', snapshot => {
            if (snapshot && snapshot.hasChild(uid)){
                return resolve(snapshot.child(uid).val());
            }
            else
                return resolve();
        },(error)=>{
            return reject(error);
        });
    });
}

const addNewUser = function(displayName,email,uid,token){
    return new Promise((resolve,reject)=>{
        var currentTimeStamp = Date.now();

        var adTitle = "";
        db.ref('ads/0/title').once('value',(snapShot)=>{
            if(!snapShot){
                return reject(new Error("db Error"));
            }
            adTitle = snapShot.val().toString();
            db.ref(`users/` + uid).set({
                displayName:displayName,
                email:email,
                alertAdmin:true,
                position:"",
                about:"",
                token:token,
                rooms:{
                    Z:{
                        adId:0,
                        lastMessage:adTitle,
                        timeStamp:currentTimeStamp,
                        isAlive:true,
                        mustShown:false,
                        readYet:false,
                        image:"",
                    },
                    0:{
                        lastMessage:"Kabin'e hoş geldin. İhtiyacın halinde bana buradan ulaşabilirsin. Ben de en kısa sürede sana buradan cevap vereceğim. Aklına takılan, önermek istediğin ya da şikayetin olursa mutlaka yazmanı bekliyorum. Şimdiden iyi uçuşlar dilerim.",
                        timeStamp:currentTimeStamp,
                        isAlive:true,
                        mustShown:true,
                        readYet:false,
                    }
                }
            },
            (error)=>{
                if(error)
                    reject(error);
                else{
                    db.ref(`rooms/` + `bot-` + uid).set({
                        isAlive:true,
                        flightCode:'',
                        flightDate:0,
                        status:'',
                        users:{
                            0:0,
                            1:uid
                        },
                        messages:{
                            0:{
                                messageType:0,
                                sender:0,
                                messageDate:currentTimeStamp,
                                message:"Kabin'e hoş geldin. İhtiyacın halinde bana buradan ulaşabilirsin. Ben de en kısa sürede sana buradan cevap vereceğim. Aklına takılan, önermek istediğin ya da şikayetin olursa mutlaka yazmanı bekliyorum. Şimdiden iyi uçuşlar dilerim."
                            }
                        }
                    },
                    (error)=>{
                        if(error)
                            reject(error);
                        else{
                            checkUserExist(uid).then((data)=>{
                                return resolve(data);
                            }).catch((error)=>{
                                return reject(error);
                            })
                        }
                    });
                }
            });
        },(error)=>{
            if(error)
                reject(error);
        });        
    });
}

const checkUserLogged = function(uid,idToken){
    return new Promise((resolve,reject)=>{
        admin.auth().verifyIdToken(idToken)
        .then((decodedToken)=>{
            if(uid === decodedToken.uid)
                return resolve();
            else
                return reject(new Error("kullanıcı eşleşmedi"));
        }).catch((error)=>{
            reject(error);
        });
    });
}

exports.getNameOfUser = functions.https.onCall((data,context)=>{
    return getNameFromUid(data.uid).then((name)=>{
        if(name){
            return {statusCode:200,name:name};
        }
        else{
            return {statusCode:400,name:""};
        }
    }).catch((error)=>{
        return {statusCode: 500};
    });
});

exports.addOrJoinRoom = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var name = data.displayName;
    var timeStamp = data.timeStamp;
    var flightCode = data.flightCode;
    var roomName = timeStamp + '+' + flightCode;
    
    return checkAndGetSnapShotOfPath('users/'+uid+'/'+'/rooms/'+roomName).then((usersRoomData)=>{
        if(usersRoomData){
            return{statusCode:200};
        }
        else{
            return checkAndGetSnapShotOfPath('rooms/'+roomName).then((roomData)=>{
                if(roomData){
                    var lastMessage = roomData.messages[roomData.messages.length-1].message;
                    var lastMessageTime = roomData.messages[roomData.messages.length-1].messageDate;
                    var isAlive = roomData.isAlive;
                    if(roomData.users.indexOf(uid)<0){
                        return attachNewRoomToUser(uid,flightCode,timeStamp,lastMessage,isAlive).then(()=>{
                            return attachNewUserToRoom(uid,roomName,roomData.users.length).then(()=>{
                                roomData.users[roomData.users.length] = uid;
                                var message = name+" kabine katıldı.";
                                return sendMessageToRoomAndUpdateAllUsersLastMessage(roomName,timeStamp,0,0,message,roomData).then(()=>{

                                    var tokenPromises = [];
    
                                    for(user of roomData.users){
                                        if(user === uid || user === 0){
                                            continue;
                                        }
                                        tokenPromises.push(getSnapShotOfPath("users/"+user));
                                    }

                                    return Promise.all(tokenPromises).then((users)=>{
                                        var userTokens = [];
                                        users.forEach((user)=>{
                                            if(user.rooms[roomName].archived || user.rooms[roomName].deleted)
                                                var k = 5;
                                            else
                                                userTokens.push(user.token);
                                        });
                                        
                                        message = flightCode + " - "+name+" Kabine Katıldı!";
                                        return sendPushNotificationToRoom(userTokens,message).then(()=>{
                                            return {statusCode:200};
                                        })
                                    });
                                });
                            });
                        });
                    }
                    else{
                        return attachNewRoomToUser(uid,flightCode,timeStamp,lastMessage,isAlive).then(()=>{
                            return {statusCode:200};
                        });
                    }
                }
                else{
                    return createNewRoomAndBootstrapWithUser(uid,flightCode,timeStamp).then(()=>{
                        return {statusCode:200};
                    });
                }
            });
        }
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });

});

const sendMessageToRoomAndUpdateAllUsersLastMessage = function(roomName, timeStamp, senderId, messageType, message, roomData){
    return new Promise((resolve,reject)=>{
        if(roomData){
            var newMessageId = roomData.messages.length;
            db.ref('rooms/'+roomName+'/messages/'+newMessageId).set({
                message:message,
                messageDate:Date.now(),
                messageType:messageType,
                sender:senderId,
                hiddenFrom:{

                }
            },(error)=>{
                if(error)
                    return reject(error);
                else{
                    var promises = [];
                    var users = roomData.users;
                    if(roomName.startsWith("bot")){
                        roomName = "0";
                    }
                    for(var i = 1;i<users.length;i++){
                        promises.push(updateUsersMessage(users[i],roomName,message));

                    }
                    promises.push(userSeesAllMessages(senderId,roomName));
                    Promise.all(promises).then(()=>{
                        return resolve();
                    }).catch((error)=>{
                        return reject(error);
                    })
                }
            })
        }
        else
            return reject(new Error("no roomData supplied"));
    })
}

const updateUsersMessage = function(uid,roomName,message){
    return new Promise((resolve,reject)=>{
        db.ref('users/'+uid+'/rooms/'+roomName).update({
            lastMessage:message,
            timeStamp:Date.now(),
            readYet:false
        },
        (error)=>{
            if(error)
                reject(error);
            else
                resolve();
        });
    });
}

const attachNewUserToRoom = function(uid,roomName,order){
    return new Promise((resolve,reject)=>{
        db.ref('rooms/'+roomName+'/users/'+order).set(uid,(error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        })
    })
}

const createNewRoomAndBootstrapWithUser = function(uid,flightCode,timeStamp){
    return new Promise((resolve,reject)=>{
        return getNameFromUid(uid).then((name)=>{
            var message = name+" kabine katıldı.";
            var isAlive = true;
            return db.ref('rooms/' + timeStamp +'+'+ flightCode).set({
                flightCode:flightCode,
                flightDate:timeStamp,
                isAlive:isAlive,
                users:{
                    0:0,
                    1:uid
                },
                messages:{
                    0:{
                        message:'Uçuş kabini oluşturuldu.',
                        messageDate:timeStamp,
                        messageType:0,
                        sender:0,
                        hiddenFrom:{
                        }
                    },
                    1:{
                        message:message,
                        messageDate:timeStamp,
                        messageType:0,
                        sender:0,
                        hiddenFrom:{

                        }
                    }
                }
            },
            (error)=>{
                if(error){
                    return reject(error);
                }
                else{
                    return attachNewRoomToUser(uid,flightCode,timeStamp,message,isAlive).then(()=>{
                        return resolve();
                    }).catch((error)=>{
                        return reject(error);
                    });
                }
            });
        }).catch((error)=>{
            return reject(error);
        })
    })
};

const attachNewRoomToUser = function(uid,flightCode,flightDate,lastMessage,isAlive){
    return new Promise((resolve,reject)=>{
        db.ref('users/' + uid + '/rooms/' + flightDate +'+'+ flightCode).set({
            isAlive:isAlive,
            lastMessage:lastMessage,
            mustShown:true,
            readYet:false,
            timeStamp:Date.now()
        },(error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        });
    });
}

exports.sendNewMessage = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var roomName = data.roomName;
    var message = data.message;
    var timeStamp = Date.now();
    
    return sendNewMessage(uid,roomName,message,timeStamp).then(()=>{
        return {statusCode:200};
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });
});

const sendNewMessage = function(uid,roomName,message,timeStamp){
    return new Promise((resolve,reject)=>{
        return getSnapShotOfPath('rooms/'+roomName).then((roomData)=>{
            return sendMessageToRoomAndUpdateAllUsersLastMessage(roomName,timeStamp,uid,1,message,roomData).then(()=>{
    
                var flightCode = roomData.flightCode;
                var flightDate = roomData.flightDate;
                var users = roomData.users;
                var tokenPromises = [];
    
                for(user of roomData.users){
                    if(user === uid || user === 0){
                        continue;
                    }
                    tokenPromises.push(getSnapShotOfPath("users/"+user));
                }
    
                var botMessagePromise = function(id){
                    return new Promise((resolve,reject)=>{
                        if(roomName.startsWith('bot')){
                            return updateDbRow("users/"+id,{alertAdmin:true}).then(()=>{
                                return resolve();
                            }).catch((error)=>{
                                return reject(error);
                            })
                        }
                        else
                            return resolve();
                    });
                };
    
                return botMessagePromise(uid).then(()=>{
                    return Promise.all(tokenPromises).then((users)=>{
                        var userTokens = [];
                        users.forEach((user)=>{
                            if(user.rooms[roomName].archived || user.rooms[roomName].deleted)
                                var k = 5;
                            else
                                userTokens.push(user.token);
                        });
                        
                        message = flightCode + " uçuşunda yeni bir mesaj var!";
                        return sendPushNotificationToRoom(userTokens,message).then(()=>{
                            return resolve();
                        })
                    });
                });
            });
        }).catch((error)=>{
            return reject(error);
        });
    });
}

const sendPushNotificationToRoom = async function(tokens,message){
    let messages = [];
    for (let pushToken of tokens){
        if (!Expo.isExpoPushToken(pushToken)){
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }
        messages.push({
            to: pushToken,
            sound: 'default',
            body: message
        })
    }
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (()=>{
        for (let chunk of chunks){
            try{
                expo.sendPushNotificationsAsync(chunk).then((ticketChunk)=>{
                    console.log(ticketChunk);
                    tickets.push(...ticketChunk);
                    return 0;
                }).catch((error)=>{
                    console.error(error);
                })
            } 
            catch(error){
                console.error(error);
            }
        }
    })();
}

exports.userSeesMessages = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var roomName = data.roomName;
    if(roomName.startsWith("bot")){
        roomName = "0";
    }
    return userSeesAllMessages(uid,roomName).then(()=>{
        return {statusCode:200};
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });
});

const userSeesAllMessages = function(uid,roomName){
    return new Promise((resolve,reject)=>{
        db.ref('users/'+uid+'/rooms/'+roomName+'/readYet').set(true,(error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        });
    });
}

exports.getAdDetails = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var adId = data.adId;
    if(adId!==null && adId !== undefined && adId!==""){
        return getAdDetailsInDb(adId).then((data)=>{
            return {statusCode:200,ad:data};
        }).catch((error)=>{
            return {statusCode:500,error:error};
        });
    }
    
});

const getAdDetailsInDb = function(id){
    return new Promise((resolve,reject)=>{
        return getSnapShotOfPath('ads/'+id).then((data)=>{
            return resolve(data);
        }).catch((error)=>{
            return reject(error);
        });
    });
}

exports.adClick = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var adId = data.adId;
    var timeStamp = Date.now();
    return setAdClick(uid,adId,timeStamp).then(()=>{
        return {statusCode:200};
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });
});

exports.deleteMessage = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var messageId = data.messageId;
    var roomName = data.roomName;
    return deleteMessageFromUser(uid,roomName,messageId).then(()=>{
        return {statusCode:200};
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });
});

exports.reportUserOrMessage = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var roomName = data.roomName;
    var messageId = data.messageId;
    var timeStamp = Date.now();
    if(!uid || !messageId || !roomName)
        return {statusCode: 400, error: "Şikayet parametrelerini eksik gönderdin"};
    return saveReportedUserOrMessage(uid,roomName,messageId).then(()=>{
        var botRoom = "bot-"+uid;
        return getSnapShotOfPath('rooms/'+botRoom).then((roomData)=>{
            var message  = "Şikayetin bize ulaştı. İnceleyip sana buradan bilgi vereceğiz. Bu arada, bilmeni isteriz ki sen de buradan bize ulaşabilirsin."
            return sendMessageToRoomAndUpdateAllUsersLastMessage(botRoom,timeStamp,0,0,message,roomData).then(()=>{
                return {statusCode:200};
            });
        });
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });
});

const saveReportedUserOrMessage = function(uid,roomName,messageId){
    return new Promise((resolve,reject)=>{
        db.ref('reportActions').push({
            reporterId:uid,
            roomName:roomName,
            messageId:messageId
        },(error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        });
    });
}

const deleteMessageFromUser = function(uid, roomName, messageId){
    return new Promise((resolve,reject)=>{
        var hiddenFromPath = 'rooms/'+roomName+'/messages/'+messageId+'/hiddenFrom';
        db.ref(hiddenFromPath).push(uid,(error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        });
    });
}

exports.blockUser = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var target = data.targetId;
    var timeStamp = Date.now();
    return blockSelectedUser(uid,target).then(()=>{
        var botRoom = "bot-"+uid;
        return getSnapShotOfPath('rooms/'+botRoom).then((roomData)=>{
            var message  = "Bir kullanıcıyı engelledin. Engellediğin kullanıcıları ayarlar ekranında görebilirsin.";
            return sendMessageToRoomAndUpdateAllUsersLastMessage(botRoom,timeStamp,0,0,message,roomData).then(()=>{
                return {statusCode:200};
            });
        });
    }).catch((error)=>{
        return {statusCode:500,error};
    });
});

const blockSelectedUser = function(uid,target){
    return new Promise((resolve, reject)=>{
        var timeStamp = Date.now();
        db.ref('users/'+uid+'/blocked/'+target).set(true,(error)=>{
            if(error)
                return reject(error);
            else{
                return resolve();
            }
        });
    });
}

exports.unblockUser = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var target = data.targetId;
    var timeStamp = Date.now();
    return unblockSelectedUser(uid,target).then(()=>{
        var botRoom = "bot-"+uid;
        return getSnapShotOfPath('rooms/'+botRoom).then((roomData)=>{
            var message  = "Kullanıcının engeli kaldırıldı.";
            return sendMessageToRoomAndUpdateAllUsersLastMessage(botRoom,timeStamp,0,0,message,roomData).then(()=>{
                return {statusCode:200};
            });
        });
    }).catch((error)=>{
        return {statusCode:500,error};
    })
});

const unblockSelectedUser = function(uid,target,timeStamp){
    return new Promise((resolve,reject)=>{
        return getSnapShotOfPath('users/'+uid+'/blocked/'+target).then((data)=>{
            if(data){
                return db.ref('users/'+uid+'/blocked/'+target).set(false,(error)=>{
                    if(error)
                        return reject(error);
                    else{
                        return resolve();
                    }
                });
            }
            else
                return resolve();
        }).catch((error)=>{
            return reject(error);
        });
    });
}

exports.saveAbout = functions.https.onCall((data,context)=>{
    var uid = context.auth.uid;
    var about = data.about;
    return saveAboutText(uid,about).then(()=>{
        return {statusCode:200}
    }).catch((error)=>{
        return {statusCode:500,error:error}
    })
})

const saveAboutText = function(uid,text){
    return new Promise((resolve,reject)=>{
        db.ref('users/'+uid+'/about').set(text,(error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        })
    });
}

const setAdClick = function(uid,adId,timeStamp){
    return new Promise((resolve,reject)=>{
        db.ref('adClicks').push({
            adId:adId,
            uid:uid,
            timeStamp:timeStamp
        },(error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        });
    });
}

exports.isMailValid = functions.https.onCall((data,context)=>{
    if(!data || data.emailDomain === ""){
        return {statusCode:500,error:"e-posta alanı boş olamaz."}
    }
    var invalidDomains = ["gmail","hotmail","outlook","yahoo","icloud","me"];
    //var invalidDomains = ["gasmail","hotasmail","ousadstlook","yahasoo"];
    var mail = data.emailDomain;
    var valid = true;
    invalidDomains.forEach((item)=>{
        if(mail === item)
            valid = false;
    });
    if(valid)
        return {statusCode:200};
    else
        return {statusCode:400, error:"Üye olmak için şirket eposta adresini kullanmanı isteyeceğim."}
});

exports.archiveRoom = functions.https.onCall((data,context)=>{
    if(!data || data.roomName==="")
        return {statusCode:500,error:"oda ismi boş olamaz."}
    var room = data.roomName;
    var uid = context.auth.uid;
    return updateDbRow("users/"+uid+"/rooms/"+room,{archived:true}).then(()=>{
        return {statusCode:200};
    }).catch((error)=>{
        return {statusCode:500,error};
    });
});

exports.dearchiveRoom = functions.https.onCall((data,context)=>{
    if(!data || data.roomName==="")
        return {statusCode:500,error:"oda ismi boş olamaz."}
    var room = data.roomName;
    var uid = context.auth.uid;
    return updateDbRow("users/"+uid+"/rooms/"+room,{archived:false}).then(()=>{
        return {statusCode:200};
    }).catch((error)=>{
        return {statusCode:500,error};
    });
});

exports.deleteRoom = functions.https.onCall((data,context)=>{
    if(!data || data.roomName==="")
        return {statusCode:500,error:"oda ismi boş olamaz."}
        var room = data.roomName;
        var uid = context.auth.uid;
        return updateDbRow("users/"+uid+"/rooms/"+room,{deleted:true}).then(()=>{
            return {statusCode:200};
        }).catch((error)=>{
            return {statusCode:500,error};
        });
});

/**
 * returns promise with a displayName string given uid
 * @param uid user id that want to get name
 */
const getNameFromUid = function(uid){
    return new Promise((resolve,reject)=>{
        return getSnapShotOfPath('users/'+uid+'/displayName').then((data)=>{
            return resolve(data);
        }).catch((error)=>{
            return (reject(error));
        });
    });
}

/**
 * if there is no snapshot, method returns reject with string
 * @param path snapshot's path 
 */
const getSnapShotOfPath = function(path){
    return new Promise((resolve,reject)=>{
        db.ref(path).once('value',(snapShot)=>{
            if(snapShot)
                return resolve(snapShot.val());
            else
                return reject(new Error("there is no snapshot of "+path));
        },(error)=>{
            return reject(error);
        });
    });
};

/**
 * if there is no snapshot, method returns resolve with null
 * @param path snapshot's path 
 */
const checkAndGetSnapShotOfPath = function(path){
    return new Promise((resolve,reject)=>{
        db.ref(path).once('value',(snapShot)=>{
            if(snapShot)
                return resolve(snapShot.val());
            else
                return resolve(null);
        },(error)=>{
            return reject(error);
        });
    });
};

/**
 * if there is no snapshot, method returns resolve with null
 * @param path db path where to write 
 * @param value value to write
 */
const updateDbRow = function(path,value){
    return new Promise((resolve,reject)=>{
        db.ref(path).update(value,
        (error)=>{
            if(error)
                return reject(error);
            else
                return resolve();
        });
    });
}



/**
 * Admin Site functions...
 */

exports.getBotRoomList = functions.https.onCall((data,context)=>{
    var mail = context.auth.token.email;
    if(mail !== adminMail)
        return {statusCode:401,error:"User has not admin rights"}
    return getAllUsers().then((users)=>{
        return {statusCode:200,users:users};
    }).catch((error)=>{
        return {statusCode:500,error:error}
    })
});

const getAllUsers = function(){
    return new Promise((resolve,reject)=>{
        return getSnapShotOfPath("users").then((data)=>{
            var users = [];
            for(key in data){
                users.push({id:key, displayName:data[key].displayName, email: data[key].email, alertAdmin:data[key].alertAdmin })
            }
            return resolve(users);
        }).catch((error)=>{
            return reject(error);
        });
    });
}

exports.sendMessageFromAdminToUser = functions.https.onCall((data,context)=>{
    var mail = context.auth.token.email;
    if(mail !== adminMail)
        return {statusCode:401,error:"User has not admin rights"}

    var uid = 0;
    var roomName = data.roomName;
    var message = data.message;
    var timeStamp = Date.now();
    return getSnapShotOfPath('rooms/'+roomName).then((roomData)=>{
        return sendMessageToRoomAndUpdateAllUsersLastMessage(roomName,timeStamp,uid,1,message,roomData).then(()=>{
            var tokenPromises = [];
            for(user of roomData.users){
                if(user === uid || user === 0){
                    continue;
                }
                tokenPromises.push(getSnapShotOfPath("users/"+user+"/token"));
            }
            return Promise.all(tokenPromises).then((tokens)=>{
                message = "Kabin İletişim'den yeni bir mesaj var!";
                return sendPushNotificationToRoom(tokens,message).then(()=>{
                    return {statusCode:200};
                });
            });
        });
    }).catch((error)=>{
        return {statusCode:500,error:error};
    });
});

exports.markUserAsAlertRead = functions.https.onCall((data,context)=>{
    var uid = data.uid;
    return updateDbRow("users/"+uid,{alertAdmin:false}).then(()=>{
        return {statusCode:200}
    }).catch((error)=>{
        return {statusCode:500}
    });
});

 /**
  * Admin Site functions end.
  */
