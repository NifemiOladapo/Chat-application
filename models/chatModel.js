import mongoose from "mongoose";
import Message from "./messageModel.js";
// const messageSchema = mongoose.Schema({
//   sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
//   content: { type: String, trim: true },
//   timeStamps: { type: Date, default: Date.now() },
// });

const chatModel = mongoose.Schema({
  chatName: { type: String, trim: true },
  isGroupChat: { type: Boolean, default: false },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "message",
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  timestamps: { type: Date, default: Date.now() },
});

const Chat = mongoose.model("chat", chatModel);
export default Chat;
