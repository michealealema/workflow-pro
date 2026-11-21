-- Add a column to store the user assigned to a task.
ALTER TABLE tasks
ADD COLUMN assigned_to INTEGER;

-- Connect the assigned user to the users table.
ALTER TABLE tasks
ADD CONSTRAINT tasks_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES users(id)
ON DELETE SET NULL;

-- Improve performance when searching tasks by assignee.
CREATE INDEX idx_tasks_assigned_to
ON tasks(assigned_to);