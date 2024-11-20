import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})



const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(
            localFilePath,
            {
                resource_type: 'auto'
            }
        )
        console.log("File has been uploaded successfully on cloudinary: ", response.url
        );
        fs.unlinkSync(localFilePath)
        // console.log(response);
        
        return response;
        
    } catch (error) {
        console.log("Error in uploading file: ", error);
        fs.unlinkSync(localFilePath)
        return null
    }
}


// const uploadOnCloudinary = async(localFilePath) => {
//     await cloudinary.uploader.upload(
//         localFilePath,
//         {
//             resource_type: 'auto'
//         }
//     ).catch((error) => {
//         console.log("Error in uploading file: ", error);
        
//     })
// }



export {uploadOnCloudinary}