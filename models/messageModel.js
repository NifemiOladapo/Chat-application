import mongoose, { Mongoose } from "mongoose";

const messageSchema = mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  content: { type: String, trim: true },
  timeStamps: { type: Date, default: Date.now() },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "chat" },
});

const Message = mongoose.model("message", messageSchema);

export default Message;
