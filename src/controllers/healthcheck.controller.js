import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler as asyncHandler} from "../utils/asyncDbHandler.js"
import { apiErrors } from "../utils/apiErrors.js";


const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message

    try {
        return res
        .status(200)
        .json(new apiResponse(200, true, "Server is healthy!"));
    } catch (error) {
        throw new apiErrors(500, false, "Server is not handling request!", error)
    }
})

export {
    healthcheck
    }
    