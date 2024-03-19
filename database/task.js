const mongoose = require("mongoose");

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

const Task = mongoose.model("Task", TaskSchema);

module.exports = Task;
