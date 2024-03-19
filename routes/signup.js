const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../database/user");
const Task = require("../database/task");
const Subtask = require("../database/subtask");
const jwt = require("jsonwebtoken");
const secretKey = process.env.SEC_KEY;

router.post("/signup", async (req, res) => {
  const { phone_number, password } = req.body;
  const user = await User.findOne({ phone_number });
  if (user) {
    res.status(409).send("Phone number already in use");
  } else {
    let hashedPassword;
    hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ phone_number, password: hashedPassword });
    await newUser.save();
    let token;
    token = jwt.sign({ phone_number }, secretKey);
    res.status(201).send({ message: "User Created Successfully", token });
  }
});

module.exports = router;
