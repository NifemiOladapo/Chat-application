import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import connectDB from "./db.js";
import User from "./models/userModel.js";
import generateToken from "./generateToken.js";
import Message from "./models/messageModel.js";
import Chat from "./models/chatModel.js";
import protect from "./authMiddleware.js";
import path from "path";
const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());

const hostname = "0.0.0.0";

app.get("/", (req, res) => {
  res.send("this is the chat app");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find();

  res.status(200).json(users);
});

app.post("/api/register", async (req, res) => {
  const { username, email, password, profilePicture } = req.body;
  const userExists = await User.findOne({ username });
  if (userExists) {
    res.status(400).json("Please change your username. Username taken");
  }
  const user = await User.create({
    username,
    email,
    password,
    profilePicture,
  });
  if (user) {
    res.status(200).json({
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      id: user._id,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json("User not created");
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });

  if (user) {
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json("User not found");
  }
});

app.get("/api/searchusers", protect, async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword)
    .find({
      _id: { $ne: req.loggeduser._id },
    })
    .select("-password");
  res.json(users);
});

app.post("/api/accesschat", protect, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json("UserId param not sent");
  }

  const findChat = await Chat.findOne({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.loggeduser._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage")
    .then(async (result) => {
      return await User.populate(result, {
        path: "latestMessage.sender",
        select: "username profilePicture email",
      });
    });

  if (findChat) {
    console.log(findChat);
    console.log("users have an existing together chat");
    res.json("this users has an existing chat");
  } else {
    const createdChat = await Chat.create({
      chatName: "sender",
      users: [req.loggeduser._id, userId],
    }).then((data) => {
      return data.populate("users", "-password");
    });
    res.status(200).json(createdChat);
  }
});

app.get("/api/fetchchats", protect, async (req, res) => {
  console.log(req.loggeduser);
  const userChats = await Chat.find({
    users: { $elemMatch: { $eq: req.loggeduser._id } },
  })
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage")
    .sort({ updatedAt: -1 })
    .then(async (result) => {
      return await User.populate(result, {
        path: "latestMessage.sender",
        select: "username profilePicture email",
      });
    });
  res.status(200).json(userChats);
});

app.post("/api/creategroup", protect, async (req, res) => {
  if (!req.body.chatName || !req.body.users) {
    res.status(400).json("Input all the fields");
  }

  let users = JSON.parse(req.body.users);

  users.push(req.loggeduser);

  const createdGroup = await Chat.create({
    chatName: req.body.chatName,
    users: users,
    isGroupChat: true,
    groupAdmin: req.loggeduser._id,
  });

  const findCreatedGroup = await Chat.findOne({ _id: createdGroup._id })
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (findCreatedGroup) {
    res.status(200).json(findCreatedGroup);
  } else {
    res.status(400).json("could not create this group");
  }
});

app.put("/api/renamegroup", protect, async (req, res) => {
  const { chatId, newChatName } = req.body;

  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName: newChatName },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");
    res.status(200).json(updatedChat);
  } catch (error) {
    console.log(error.message);
  }
});

app.put("/api/addtogroup", async (req, res) => {
  const { chatId, userId } = req.body;
  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (added) {
    res.status(200).json(added);
  } else {
    res.status(400).json("Could not add user to this group");
  }
});

app.put("/api/removefromgroup", async (req, res) => {
  const { userId, chatId } = req.body;

  const remove = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (remove) {
    res.status(200).json(remove);
  } else {
    res.status(400).json("Could not remove this user");
  }
});

app.post("/api/sendmessage", protect, async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    res.status(400).json("Invalid data passed");
  }

  const message = await Message.create({
    sender: req.loggeduser._id,
    content: content,
    chat: chatId,
  });

  const findCreatedMessage = await Message.findById(message._id)
    .populate("sender", "-password")
    .populate("chat", "users isGroupChat chatName")
    .then(async (result) => {
      return await User.populate(result, {
        path: "chat.users",
        select: "username email profilePicture",
      });
    });

  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: message._id,
  });

  if (findCreatedMessage) {
    res.status(200).json(findCreatedMessage);
  } else {
    res.status(400).json("could not create message");
  }
});

app.get("/api/getmessages/:chatId", async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "-password")
    .populate("chat");

  if (messages) {
    res.status(200).json(messages);
  } else {
    res.status(200).json("could not find messages for this chat");
  }
});

//----------------------------Deployment-----------------------

const server = app.listen(3001, () => {
  console.log("app is running");
});

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: "https://chatfastnow.netlify.app",
  },
});

io.on("connection", (socket) => {
  console.log("connected");

  socket.on("setup", (userData) => {
    socket.join(userData.id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`user joined room : ${room}`);
  });

  socket.on("send message", (message) => {
    message.chat.users.forEach((user) => {
      console.log(user);
      console.log(message.sender);
      if (user._id === message.sender._id) return;
      socket.in(user._id).emit("receive message", message);
    });
  });

  socket.on("typing", (room) => {
    socket.in(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing");
  });

  socket.off("setup", () => {
    console.log("user disconnected");
    socket.leave(userData.id);
  });
});
