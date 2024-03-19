require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const loginRouter = require("./routes/login");
const signupRouter = require("./routes/signup");
const tasksRouter = require("./routes/tasks");
const subtasksRouter = require("./routes/subtasks");

const authenticateJWT = require("./middlewares/auth");
const twiliocron = require("./crons/twilio-cron");
const usercron = require("./crons/user-cron");
const taskcron = require("./crons/task-cron");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.use("/api", loginRouter);
app.use("/api", signupRouter);
app.use("/api", tasksRouter);
app.use("/api", subtasksRouter);

twiliocron();
usercron();
taskcron();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});