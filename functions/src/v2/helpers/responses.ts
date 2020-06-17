export type ServerResponse = {
    statusCode:Number,
    errorType?:"popup" | "validation",
    param?:any
}

export const genericSuccessResponse = function():ServerResponse{
    return {statusCode:200};
}
export const successResponseWithData = function(data:any):ServerResponse{
    return {statusCode:200,param:data};
}

export const authError = function():ServerResponse{
    return {statusCode:401};
}

export const genericServerFailResponse = function(): ServerResponse{
    return {statusCode:500};
}

export const genericClientFailResponse = function():ServerResponse{
    return {statusCode:400};
}

export const genericNotImplementedFailResponse = function():ServerResponse{
    return {statusCode:501};
}