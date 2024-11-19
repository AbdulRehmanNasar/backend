import { asyncDbHandler } from "../utils/asyncDbHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncDbHandler( async (req, res) => {
    const {username, email, fullname, password} = req.body
    
    if ( [username, email, fullname, password].some((field) => //some function return true if any of the element fulfills the condition
            field?.trim() === ""
        ) )
    {
        throw new apiErrors(400, "All fields are required")
    }

    const exitingUser = User.findOne({
        $or: [{ username }, { email }] // $or another way to write logical operator
    })

    if ( exitingUser ) {
        throw new apiErrors(409, "User with the email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if( !avatarLocalPath ) {
        throw new apiErrors(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if ( !avatar ) {
        throw new apiErrors(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select( //select => method to select all the elements except defined in the block
        "-password -refreshToken"
    )

    if( !createdUser ) {
        throw new apiErrors(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully!")
    )
})

export { registerUser }