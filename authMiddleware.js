import jwt from "jsonwebtoken";
import User from "./models/userModel.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, "nifemi");

      req.loggeduser = await User.findById(decoded.id).select("-password");

      next();
    } catch (err) {
      console.log(err);
    }
  }

  if (!token) {
    res.status(401).json("Not authorized");
  }
};

export default protect;
