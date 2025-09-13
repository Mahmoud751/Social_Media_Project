import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
    try {
        const uri: string = process.env.DB_URI || "mongodb://localhost:27017/Social_Media_App";
        await mongoose.connect(uri);
        console.log("Database Connected Successfully✅✅");
    } catch (error) {
        console.log("Failed To Connect To DB❌❌");
    }
};

export default connectDB;