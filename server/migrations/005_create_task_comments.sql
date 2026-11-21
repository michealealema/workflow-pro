-- Create a table for task discussions and comments.
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,

    -- The task associated with this comment.
    task_id INTEGER NOT NULL
        REFERENCES tasks(id)
        ON DELETE CASCADE,

    -- The user who wrote this comment.
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- The actual comment content.
    content TEXT NOT NULL,

    -- Automatically track comment creation and updates.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent empty comments.
    CONSTRAINT task_comments_content_check
        CHECK (LENGTH(TRIM(content)) > 0)
);

-- Improve performance when retrieving comments by task.
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id_created_at
ON task_comments(task_id, created_at);