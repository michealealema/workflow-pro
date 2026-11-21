-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,

    project_id INTEGER NOT NULL,

    title VARCHAR(200) NOT NULL,

    description TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'To Do'
        CHECK (
            status IN (
                'To Do',
                'In Progress',
                'In Review',
                'Completed'
            )
        ),

    priority VARCHAR(20) NOT NULL DEFAULT 'Medium'
        CHECK (
            priority IN (
                'Low',
                'Medium',
                'High'
            )
        ),

    start_date DATE,

    due_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tasks_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT tasks_dates_check
        CHECK (
            start_date IS NULL
            OR due_date IS NULL
            OR start_date <= due_date
        )
);

-- Improve project task lookup performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id
ON tasks(project_id);

-- Improve task filtering by status
CREATE INDEX IF NOT EXISTS idx_tasks_status
ON tasks(status);

-- Improve deadline filtering
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
ON tasks(due_date);