CREATE DATABASE IF NOT EXISTS project_management;
USE project_management;

-- User Management Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE, -- Rule: Prevents duplicate usernames
    password VARCHAR(255) NOT NULL,       -- Will store hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent Entity Table
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Child Entity Table
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    task_name VARCHAR(150) NOT NULL,
    assigned_to VARCHAR(100),
    status ENUM('To Do', 'In Progress', 'Done') DEFAULT 'To Do',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Activity Logs Table (Strictly READ/WRITE only, no update or delete allowed)
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    action_type ENUM('CREATE', 'READ', 'UPDATE', 'DELETE') NOT NULL, 
    entity_affected VARCHAR(50) NOT NULL, 
    details TEXT NOT NULL,                 
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);