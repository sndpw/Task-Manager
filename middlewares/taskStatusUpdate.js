const User = require("../database/user");
const Task = require("../database/task");
const Subtask = require("../database/subtask");

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

module.exports = updateTaskStatus;
