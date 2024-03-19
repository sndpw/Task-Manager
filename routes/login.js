const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken")
const User = require("../database/user");
const Task = require("../database/task");
const Subtask = require("../database/subtask");
const secretKey = process.env.SEC_KEY;

router.post("/login", async (req, res) => {
  const { phone_number, password } = req.body;
  try {
    let existingUser = await User.findOne({ phone_number });
    if (!existingUser) {
      res.status(409).send("Create account");
    } else {
      let isValidPassword = false;
      isValidPassword = await bcrypt.compare(
        req.body.password,
        existingUser.password
      );
      if (!isValidPassword) {
        res.status(403).send("Wrong credentials!");
      } else {
        let token;
        token = jwt.sign({ id: existingUser._id }, secretKey);
        res.json({ token: token });
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
