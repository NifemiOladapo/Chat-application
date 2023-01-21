import mongoose from "mongoose";

const connectDB = async () => {
  // mongodb+srv://Nifemi:promotion@cluster0.a9clx8r.mongodb.net/?retryWrites=true&w=majority
  try {
    const conn = await mongoose.connect(
      "mongodb+srv://Nifemi:promotion@cluster0.a9clx8r.mongodb.net/?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log(`mongodb connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error.message);
  }
};

export default connectDB;
