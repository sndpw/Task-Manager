# Task-Manager

This repository contains the source code for a Task Management System implemented using Node.js, Express.js, MongoDB, JWT authentication, cron jobs, and Twilio integration.

## Installation

1. Clone the repository

2. Install dependencies

3. Set up environment variables:
- Create a `.env` file in the root directory.
- Define the following environment variables:
  ```
  MONGODB_URL=your_mongodb_connection_string
  SEC_KEY=your_secret_key_for_jwt
  ACCOUNT_SID=your_twilio_account_sid
  AUTH_TOKEN=your_twilio_auth_token
  FROM_PHONE=your_twilio_phone_number
  ```

## Usage

1. Start the server

2. The server will start running on `http://localhost:3000` by default.

## API Endpoints

- **POST /api/signup**
- Registers a new user.
- **POST /api/login**
- Logs in an existing user.
- **POST /api/tasks**
- Creates a new task.
- **GET /api/tasks**
- Retrieves user tasks with optional filters.
- **GET /api/subtasks**
- Retrieves subtasks for a given task.
- **PUT /api/tasks/:taskId**
- Updates a task.
- **DELETE /api/tasks/:id**
- Soft deletes a task.
- **POST /api/subtasks/:taskId**
- Creates a new subtask.
- **PUT /api/subtasks/:id**
- Updates a subtask.
- **DELETE /api/subtasks/:id**
- Soft deletes a subtask.

## Cron Jobs

- **Changing User Priority**
- Runs every minute to adjust user priorities based on task due dates.
- **Twilio Voice Calling**
- Runs every minute to initiate voice calls to users based on task priorities.
- **Changing Task Priority**
- Runs every minute to adjust task priorities based on the completion status of subtasks.

