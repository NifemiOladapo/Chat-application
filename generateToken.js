import jwt from "jsonwebtoken";

const generateToken = (id) => {
  return jwt.sign({ id }, "nifemi");
};

export default generateToken;
