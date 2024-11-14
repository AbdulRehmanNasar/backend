const asyncDbHandler = (dbCallFunction) => {
    (req, res, next) => {
        Promise.resolve(dbCallFunction(req, res, next))
        .catch((error) => {
            console.log("Error in DB connection: ", error);
            
        })
    }
}





export { asyncDbHandler }

// const acyncDbHandler = (dbCallFunction) => async (req, res, next) => {
//     try {
//         await dbCallFunction(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }