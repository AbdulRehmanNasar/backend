import { asyncDbHandler } from "../utils/asyncDbHandler.js";

const registerUser = asyncDbHandler( async (req, res) => {
    res.status(200).json({
        message: "ok"
    })
})

export { registerUser }