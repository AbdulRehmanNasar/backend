import { User } from "../models/user.model";
import { apiErrors } from "../utils/apiErrors";
import { asyncDbHandler } from "../utils/asyncDbHandler";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncDbHandler ( async ( req, res, next ) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if ( !token ) {
            throw new apiErrors(401, "Unauthorized Request!")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) // will give the payload
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if ( !user ) {
            throw new apiErrors(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new apiErrors(401, error?.message || "Invalid Access Token")
    }
})