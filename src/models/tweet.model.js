import mongoose, {Schema} from "mongoose";

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    tweetVideo: {
        videoURL: {
            type: String,
        },
        publicId: {
            type: String,
            required: true
        },
        format: {
            type: String
        },
        width: {
            type: Number
        },
        height: {
            type: Number
        }
    },
    tweetImage: {
        imageURL: {
            type: String,
        },
        publicId: {
            type: String,
            required: true
        }
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})


export const Tweet = mongoose.model("Tweet", tweetSchema)