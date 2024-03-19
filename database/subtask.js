const mongoose = require("mongoose");

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

const Subtask = mongoose.model("Subtask", SubtaskSchema);

module.exports = Subtask;
