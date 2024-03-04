import mongoose from "mongoose";

async function connectDB() {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`); 
        console.log(`Mongo DB Connected to ${process.env.DB_NAME}`);
    } catch (error) {
        console.log(error.message);
    }
}

connectDB();