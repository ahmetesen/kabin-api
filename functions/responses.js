const successResponse = function(data){
    return {statusCode:200,data};
}

const serverFailResponse = function(data){
    return {statusCode:500,data};
}

const clientFailResponse = function(data){
    return {statusCode:400,data};
}

module.exports={
    clientFailResponse,
    serverFailResponse,
    successResponse
}