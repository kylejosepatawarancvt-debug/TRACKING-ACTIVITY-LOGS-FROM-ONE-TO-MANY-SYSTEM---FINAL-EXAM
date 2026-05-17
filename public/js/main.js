window.onload = function() {
    checkSession();
    loadProjects();
    loadTasks();
};

async function checkSession() {
    const res = await fetch('/api/user-session');
    const data = await res.json();
    if (!data.loggedIn) window.location.href = 'login.html';
    else document.getElementById('activeUser').innerText = `User: ${data.username}`;
}

// Manage Projects (Parent)
async function loadProjects() {
    const res = await fetch('/api/projects');
    const projects = await res.json();
    
    // Fill Project Table
    const tableBody = document.getElementById('projectTableBody');
    tableBody.innerHTML = projects.map(p => `
        <tr>
            <td>${p.id}</td>
            <td><strong>${p.project_name}</strong></td>
            <td>${p.description || ''}</td>
            <td>${p.deadline ? p.deadline.split('T')[0] : ''}</td>
            <td>
                <button onclick="editProject(${p.id}, '${p.project_name}', '${p.description || ''}', '${p.deadline || ''}')">Edit</button>
                <button class="btn-danger" onclick="deleteProject(${p.id})">Delete</button>
            </td>
        </tr>
    `).join('');

    // Fill Dropdown Select choices in Task Form
    const dropdown = document.getElementById('taskProjectParent');
    dropdown.innerHTML = '<option value="">-- Choose Assigned Parent Project --</option>' + 
        projects.map(p => `<option value="${p.id}">${p.project_name}</option>`).join('');
}

document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('projectId').value;
    const project_name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDesc').value;
    const deadline = document.getElementById('projectDeadline').value;

    const url = id ? `/api/projects/${id}` : '/api/projects';
    const method = id ? 'PUT' : 'POST';

    await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name, description, deadline })
    });
    clearProjectForm();
    loadProjects();
});

function editProject(id, name, desc, date) {
    document.getElementById('projectId').value = id;
    document.getElementById('projectName').value = name;
    document.getElementById('projectDesc').value = desc;
    if(date) document.getElementById('projectDeadline').value = date.split('T')[0];
}

async function deleteProject(id) {
    if(confirm("Deleting this project will cascade-delete all its child tasks. Continue?")) {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        loadProjects();
        loadTasks();
    }
}

function clearProjectForm() {
    document.getElementById('projectId').value = '';
    document.getElementById('projectName').value = '';
    document.getElementById('projectDesc').value = '';
    document.getElementById('projectDeadline').value = '';
}

// Manage Tasks (Child)
async function loadTasks() {
    const res = await fetch('/api/tasks');
    const tasks = await res.json();
    const tableBody = document.getElementById('taskTableBody');
    tableBody.innerHTML = tasks.map(t => `
        <tr>
            <td>${t.id}</td>
            <td><span style="color:#7f8c8d;">${t.project_name}</span></td>
            <td><strong>${t.task_name}</strong></td>
            <td>${t.assigned_to || 'Unassigned'}</td>
            <td><u>${t.status}</u></td>
            <td>
                <button onclick="editTask(${t.id}, '${t.task_name}', '${t.assigned_to || ''}', '${t.status}')">Edit</button>
                <button class="btn-danger" onclick="deleteTask(${t.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const project_id = document.getElementById('taskProjectParent').value;
    const task_name = document.getElementById('taskName').value;
    const assigned_to = document.getElementById('taskAssignee').value;
    const status = document.getElementById('taskStatus').value;

    const url = id ? `/api/tasks/${id}` : '/api/tasks';
    const method = id ? 'PUT' : 'POST';

    const payload = id ? { task_name, assigned_to, status } : { project_id, task_name, assigned_to, status };

    await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    clearTaskForm();
    loadTasks();
});

function editTask(id, name, assignee, status) {
    document.getElementById('taskId').value = id;
    document.getElementById('taskName').value = name;
    document.getElementById('taskAssignee').value = assignee;
    document.getElementById('taskStatus').value = status;
    document.getElementById('taskProjectParent').disabled = true; // Block switching parents mid-update
}

async function deleteTask(id) {
    if(confirm("Remove this child task?")) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        loadTasks();
    }
}

function clearTaskForm() {
    document.getElementById('taskId').value = '';
    document.getElementById('taskProjectParent').value = '';
    document.getElementById('taskProjectParent').disabled = false;
    document.getElementById('taskName').value = '';
    document.getElementById('taskAssignee').value = '';
    document.getElementById('taskStatus').value = 'To Do';
}

// Live Global Searching functionality
async function executeSearch() {
    const q = document.getElementById('searchInput').value;
    const container = document.getElementById('searchResults');
    
    if(!q) { container.innerHTML = ''; return; }

    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    let html = '<h4>Match Results:</h4>';
    
    if(data.projects.length > 0) {
        html += '<h5>Matching Projects (Parent Entity)</h5><ul>' + 
            data.projects.map(p => `<li>Project: <strong>${p.project_name}</strong> - ${p.description}</li>`).join('') + '</ul>';
    }
    if(data.tasks.length > 0) {
        html += '<h5>Matching Tasks (Child Entity)</h5><ul>' + 
            data.tasks.map(t => `<li>Task: <strong>${t.task_name}</strong> (Project: ${t.project_name}) - Assigned: ${t.assigned_to} [${t.status}]</li>`).join('') + '</ul>';
    }
    if(data.projects.length === 0 && data.tasks.length === 0) {
        html += '<p style="color:red;">No matched rows found in parent or child tables.</p>';
    }
    container.innerHTML = html;
}