const express = require("express");
const router = express.Router();
const User = require("../database/user");
const Task = require("../database/task");
const Subtask = require("../database/subtask");
const authenticateJWT = require('../middlewares/auth');
const IST_offset = 5.5 * 60 * 60 * 1000;
const currentDateIST = new Date(Date.now() + IST_offset);

router.post("/tasks", authenticateJWT, async (req, res) => {
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

router.get("/tasks", authenticateJWT, async (req, res) => {
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

router.put("/tasks/:taskId", authenticateJWT, async (req, res) => {
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

router.delete("/tasks/:id", authenticateJWT, async (req, res) => {
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

module.exports = router;
