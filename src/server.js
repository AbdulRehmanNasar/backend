import connectDB from "./db/index.js"
import dotenv from "dotenv"
import { app } from "./app.js"

dotenv.config({
    path: "./env"
})

connectDB()
.then(() => {
    app.on("error", (error) => {   // app.on is for checking runtime activity of server (e.g: for runtime errors)
        console.log("Error in app: ", error);
        throw error
    })
    app.listen(process.env.PORT || 3000, () => {
        console.log("Server is listening on ", process.env.PORT);
        
    })
})
.catch((error) => {
    console.log("MongoDB connection failed: ", error);
})




/*

const app = express()

( async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("Errror: ", errror);
            throw(error)
        })
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
    } catch(error) {
        console.log("Error: ", error);
        throw error   
    }
})()

*/
