require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const twilio = require("twilio");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// MongoDB schemas
const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  dueDate: Date,
  priority: { type: Number, default: 3 },
  status: {
    type: String,
    enum: ["TODO", "IN_PROGRESS", "DONE"],
    default: "TODO",
  },
  createdAt: {
    type: Date,
    default: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  },
  updatedAt: {
    type: Date,
    default: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  },
  deletedAt: Date,
  subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subtask" }],
});

const SubtaskSchema = new mongoose.Schema({
  status: { type: Number, enum: [0, 1], default: 0 },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  },
  updatedAt: {
    type: Date,
    default: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  },
  deletedAt: Date,
});

const UserSchema = new mongoose.Schema({
  phone_number: String,
  password: String,
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  priority: { type: Number, enum: [0, 1, 2, 3], default: 3 },
});

// MongoDB models
const Task = mongoose.model("Task", TaskSchema);
const Subtask = mongoose.model("Subtask", SubtaskSchema);
const User = mongoose.model("User", UserSchema);

// JWT secret key
const secretKey = process.env.SEC_KEY;

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }
      req.userId = decoded.id;
      next();
    });
  } else {
    res.status(401).json({ message: "Token is required" });
  }
};

// Routes

//For the user to register and login
app.post("/api/signup", async (req, res) => {
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

app.post("/api/login", async (req, res) => {
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
    res.status(500).json({ message: "Internal server error" });
  }
});


//For the user to create a new task
app.post("/api/tasks", authenticateJWT, async (req, res) => {
  const { title, description, dueDate } = req.body;
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      res.status(409).send("Invalid User");
    } else {
      const task = await Task({ title, description, dueDate });
      user.tasks.push(task);
      await user.save();
      await task.save();
      res.json(task);
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


//For the user get tasks with filters
app.get("/api/tasks", authenticateJWT, async (req, res) => {
  const { priority, dueDate, page, limit } = req.query;
  const userExists = await User.findOne({ _id: req.userId });
  try {
    if (!userExists) {
      return res.status(409).send("Invalid User");
    } else {
      const tasksArray = await User.findOne({ _id: req.userId }).populate({
        path: "tasks",
        match: { deletedAt: null },
      });
      let tasks = tasksArray.tasks;
      if (priority) {
        tasks = tasks.filter((task) => task.priority === parseInt(priority));
      }
      if (dueDate) {
        tasks = tasks.filter((task) => task.dueDate <= new Date(dueDate));
      }
      if (page && limit) {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        tasks = tasks.slice(startIndex, endIndex);
      }
      res.json(tasks);
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


//For the user to get subtasks with the taskId
app.get("/api/subtasks", authenticateJWT, async (req, res) => {
  const { taskId } = req.query;
  try {
    const task = await Task.findOne({ _id: taskId }).populate({
      path: "subtasks",
      match: { deletedAt: null },
    });
    res.json({ subtasks: task.subtasks || [] });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


//For the user to update the task
app.put("/api/tasks/:taskId", authenticateJWT, async (req, res) => {
  const { taskId } = req.params;
  const { dueDate, status } = req.body;
  try {
    const task = await Task.findByIdAndUpdate(
      taskId,
      { dueDate, status },
      { new: true },
      {
        updatedAt: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        }),
      }
    );
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


//soft deletion of a task
app.delete("/api/tasks/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: req.userId });
  try {
    const task = await Task.findByIdAndUpdate(id, {
      deletedAt: currentDateIST - 30800,
    });
    await Subtask.updateMany(
      { task: id },
      { deletedAt: currentDateIST - 30800 }
    );
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


//For the user to create a new subtask
app.post("/api/subtasks/:taskId", authenticateJWT, async (req, res) => {
  const { description } = req.body;
  try {
    const task = await Task.findOne({ _id: req.params.taskId });
    if (!task) return res.status(404).json({ message: "Task not found!" });
    else {
      const subtask = await Subtask({ description, task: task._id });
      await subtask.save();
      await updateTaskStatus(task);
      task.subtasks.push(subtask);
      await task.save();
      res.json(subtask);
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

//For the user to update subtask
app.put("/api/subtasks/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const subtask = await Subtask.findByIdAndUpdate(
      id,
      { status },
      { new: true },
      {
        updatedAt: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        }),
      }
    );
    const task = await Task.findOne({ _id: subtask.task });
    if (task) {
      await updateTaskStatus(task);
    }
    res.json(subtask);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


//soft deletion of a subtask
app.delete("/api/subtasks/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const subtask = await Subtask.findByIdAndUpdate(id, {
      deletedAt: currentDateIST - 30800,
    });
    const task = await Task.findOne({ _id: subtask.task });
    if (task) {
      await updateTaskStatus(task);
    }
    res.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


//function to update the status of the tasks
async function updateTaskStatus(task) {
  const subtasks = await Subtask.find({ task: task._id });
  const completedSubtasks = subtasks.filter((subtask) => subtask.status === 1);
  if (completedSubtasks.length === subtasks.length) {
    task.status = "DONE";
  } else if (completedSubtasks.length > 0) {
    task.status = "IN_PROGRESS";
  } else {
    task.status = "TODO";
  }
  await task.save();
}

const IST_offset = 5.5 * 60 * 60 * 1000;
const currentDateIST = new Date(Date.now() + IST_offset);


// Cron job for changing user priority
cron.schedule("* * * * *", async () => {
  const calculatePriorityScore = (tasks) => {
    let score = 0;
    tasks.forEach((task) => {
      if (task.status !== "DONE") {
        const dueDateDiff = Math.ceil(
          (task.dueDate - currentDateIST) / (1000 * 60 * 60 * 24)
        );
        if (dueDateDiff <= 0) {
          score += 3;
        } else if (dueDateDiff <= 2) {
          score += 2;
        } else if (dueDateDiff <= 4) {
          score += 1;
        } else {
          score += 0;
        }
      }
    });
    return score;
  };

  try {
    const users = await User.find({});
    for (const user of users) {
      const tasks = await Task.find({ _id: { $in: user.tasks } });
      const priorityScore = calculatePriorityScore(tasks);
      if (priorityScore >= 6) {
        user.priority = 0;
      } else if (priorityScore >= 4) {
        user.priority = 1;
      } else if (priorityScore >= 2) {
        user.priority = 2;
      } else {
        user.priority = 3;
      }
      await user.save();
    }

    console.log("Priority assigned to users successfully.");
  } catch (error) {
    console.error("Error assigning priority to users:", error);
  }
});


//cron job for the twilio voice calling
cron.schedule("* * * * *", async () => {
  const twilioClient = new twilio(
    process.env.ACCOUNT_SID,
    process.env.AUTH_TOKEN
  );
  try {
    const usersByPriority = await User.find({}).sort({ priority: 1 });
    for (let priority = 0; priority <= 2; priority++) {
      const users = usersByPriority.filter(
        (user) => user.priority === priority
      );
      for (const user of users) {
        if (user.phone_number) {
          const call = await twilioClient.calls.create({
            twiml: `<Response><Say>Your task is overdue. Please check your task manager.</Say></Response>`, // URL to TwiML document or TwiML Bin
            to: `+91${user.phone_number}`,
            from: process.env.FROM_PHONE,
          });

          console.log(
            `Call initiated to ${user.phone_number}. SID: ${call.sid}`
          );
          user.priority = 3;
          await user.save();
        }
      }
    }
  } catch (error) {
    console.error("Error initiating call:", error);
  }
});


// Cron job for changing task priority
cron.schedule("* * * * *", async () => {
  const calculateTaskPriority = (task, tasks) => {
    let priority = 3;
    if (task.status !== "DONE") {
      const subtasksStatus0 = task.subtasks.filter(
        (subtask) => subtask.status === 0
      ).length;
      if (subtasksStatus0 >= 3) {
        priority = 0;
      } else if (subtasksStatus0 >= 2) {
        priority = 1;
      } else if (subtasksStatus0 >= 1) {
        priority = 2;
      }
    }
    return priority;
  };
  try {
    const users = await User.find({});
    for (const user of users) {
      const tasks = await Task.find({ _id: { $in: user.tasks } }).populate(
        "subtasks"
      );
      for (const task of tasks) {
        const priority = calculateTaskPriority(task);
        task.priority = priority;
        await task.save();
      }
      console.log("Priority assigned to tasks for user:", user._id);
    }
    console.log("Priority assigned to tasks successfully.");
  } catch (error) {
    console.error("Error assigning priority to tasks:", error);
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
