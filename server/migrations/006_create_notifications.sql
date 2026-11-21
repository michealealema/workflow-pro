-- Create notifications for WorkFlow Pro users.
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    -- User receiving the notification.
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- User who triggered the notification.
    actor_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

    -- Notification category.
    type VARCHAR(50) NOT NULL,

    -- Human-readable notification message.
    message TEXT NOT NULL,

    -- Related task, if applicable.
    task_id INTEGER
        REFERENCES tasks(id)
        ON DELETE SET NULL,

    -- Related project, if applicable.
    project_id INTEGER
        REFERENCES projects(id)
        ON DELETE SET NULL,

    -- Read/unread tracking.
    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    -- Notification creation time.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent empty notification messages.
    CONSTRAINT notifications_message_check
        CHECK (LENGTH(TRIM(message)) > 0)
);

-- Quickly retrieve a user's notifications.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Quickly retrieve unread notifications.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read);

-- Find notifications associated with a task.
CREATE INDEX IF NOT EXISTS idx_notifications_task_id
ON notifications(task_id);