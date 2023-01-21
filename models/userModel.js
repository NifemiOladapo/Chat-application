import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: "" },
});

const User = mongoose.model("user", userSchema);

export default User;
