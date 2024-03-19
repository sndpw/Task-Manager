const express = require("express");
const router = express.Router();
const User = require("../database/user");
const Task = require("../database/task");
const Subtask = require("../database/subtask");
const authenticateJWT = require("../middlewares/auth");
const updateTaskStatus = require("../middlewares/taskStatusUpdate");

const IST_offset = 5.5 * 60 * 60 * 1000;
const currentDateIST = new Date(Date.now() + IST_offset);

router.get("/subtasks", authenticateJWT, async (req, res) => {
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

router.post("/subtasks/:taskId", authenticateJWT, async (req, res) => {
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

router.put("/subtasks/:id", authenticateJWT, async (req, res) => {
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

router.delete("/subtasks/:id", authenticateJWT, async (req, res) => {
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

module.exports = router;
