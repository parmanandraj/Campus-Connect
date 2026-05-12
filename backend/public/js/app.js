const API_BASE = 'http://localhost:5000/api';
let messageTimeout = null;

function showMessage(message, isError = true) {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  messageDiv.textContent = message;
  messageDiv.style.color = isError ? '#dc2626' : '#16a34a';
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    messageDiv.textContent = '';
  }, 5000);
}

function setUserInStorage(token, user) {
  localStorage.setItem('campusconnect_token', token);
  localStorage.setItem('campusconnect_user', JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem('campusconnect_token');
}

function getUser() {
  const user = localStorage.getItem('campusconnect_user');
  return user ? JSON.parse(user) : null;
}

function logout() {
  localStorage.removeItem('campusconnect_token');
  localStorage.removeItem('campusconnect_user');
  window.location.href = `${API_BASE}/login.html`;
}

async function apiRequest(endpoint, method = 'GET', body) {
  const token = getToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  try {
    const data = await apiRequest('/auth/register', 'POST', { name, email, password, role });
    setUserInStorage(data.token, data.user);
    window.location.href = data.user.role === 'admin' ? '/admin-dashboard.html' : '/student-dashboard.html';
  } catch (error) {
    showMessage(error.message);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    setUserInStorage(data.token, data.user);
    window.location.href = data.user.role === 'admin' ? '/admin-dashboard.html' : '/student-dashboard.html';
  } catch (error) {
    showMessage(error.message);
  }
}

function requireAuth(allowedRoles = []) {
  const user = getUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href = user.role === 'admin' ? '/admin-dashboard.html' : '/student-dashboard.html';
    return null;
  }
  return user;
}

async function loadStudentDashboard() {
  const user = requireAuth(['student']);
  if (!user) return;

  const studentNameEl = document.getElementById('studentName');
  if (studentNameEl) {
    studentNameEl.textContent = user.name;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  try {
    const assignments = await apiRequest('/assignments');
    const jobs = await apiRequest('/jobs');

    document.getElementById('assignmentCount').textContent = assignments.length;
    document.getElementById('jobCount').textContent = jobs.length;

    const assignmentList = document.getElementById('assignmentList');
    assignmentList.innerHTML = assignments.length
      ? assignments
          .map(
            a => `
              <li>
                <strong>${a.title}</strong>
                <p>${a.description}</p>
                <span class="item-meta">Due: ${a.dueDate}</span>
                <div class="action-buttons">
                  ${a.completed ? '<span class="button secondary disabled">Completed</span>' : `<button class="button" data-complete-id="${a._id}">Mark Completed</button>`}
                </div>
              </li>
            `
          )
          .join('')
      : '<li>No assignments available yet.</li>';

    assignmentList.querySelectorAll('[data-complete-id]').forEach(button => {
      button.addEventListener('click', async event => {
        const assignmentId = event.target.dataset.completeId;
        try {
          await apiRequest(`/assignments/${assignmentId}/complete`, 'POST');
          showMessage('Assignment marked completed', false);
          await loadStudentDashboard();
        } catch (error) {
          showMessage(error.message);
        }
      });
    });

    const jobList = document.getElementById('jobList');
    jobList.innerHTML = jobs.length
      ? jobs
          .map(
            j => `
              <li>
                <strong>${j.title}</strong>
                <p>${j.description}</p>
                <span class="item-meta">${j.company} — ${j.location}</span>
                <div class="action-buttons">
                  ${j.applied ? '<span class="button secondary disabled">Applied</span>' : `<button class="button" data-apply-id="${j._id}">Apply</button>`}
                </div>
              </li>
            `
          )
          .join('')
      : '<li>No job opportunities posted yet.</li>';

    jobList.querySelectorAll('[data-apply-id]').forEach(button => {
      button.addEventListener('click', async event => {
        const jobId = event.target.dataset.applyId;
        try {
          await apiRequest(`/jobs/${jobId}/apply`, 'POST');
          showMessage('Applied for job successfully', false);
          await loadStudentDashboard();
        } catch (error) {
          showMessage(error.message);
        }
      });
    });
  } catch (error) {
    showMessage(error.message);
  }
}

function hideAssignmentEditForm() {
  const card = document.getElementById('assignmentEditCard');
  if (card) card.classList.add('hidden');
}

function showAssignmentEditForm(assignment) {
  const card = document.getElementById('assignmentEditCard');
  if (!card) return;

  document.getElementById('editAssignmentId').value = assignment._id;
  document.getElementById('editAssignmentTitle').value = assignment.title;
  document.getElementById('editAssignmentDescription').value = assignment.description;
  document.getElementById('editAssignmentDueDate').value = assignment.dueDate;
  card.classList.remove('hidden');
}

function hideJobEditForm() {
  const card = document.getElementById('jobEditCard');
  if (card) card.classList.add('hidden');
}

function showJobEditForm(job) {
  const card = document.getElementById('jobEditCard');
  if (!card) return;

  document.getElementById('editJobId').value = job._id;
  document.getElementById('editJobTitle').value = job.title;
  document.getElementById('editJobCompany').value = job.company;
  document.getElementById('editJobLocation').value = job.location;
  document.getElementById('editJobDescription').value = job.description;
  card.classList.remove('hidden');
}

function renderUserList(users) {
  const userList = document.getElementById('userList');
  if (!userList) return;

  userList.innerHTML = users.length
    ? users
        .map(
          user => `
            <li>
              <strong>${user.name}</strong> (${user.email})
              <p class="item-meta">Role: ${user.role}</p>
              <div class="action-buttons">
                <button class="button secondary" data-delete-user="${user._id}">Delete User</button>
              </div>
            </li>
          `
        )
        .join('')
    : '<li>No registered users available.</li>';

  userList.querySelectorAll('[data-delete-user]').forEach(button => {
    button.addEventListener('click', async event => {
      const userId = event.target.dataset.deleteUser;
      if (!confirm('Delete this user permanently?')) return;
      try {
        await apiRequest(`/users/${userId}`, 'DELETE');
        showMessage('User deleted successfully', false);
        await loadAdminUsers();
      } catch (error) {
        showMessage(error.message);
      }
    });
  });
}

function renderAssignmentAdminList(assignments) {
  const assignmentAdminList = document.getElementById('assignmentAdminList');
  if (!assignmentAdminList) return;

  assignmentAdminList.innerHTML = assignments.length
    ? assignments
        .map(
          assignment => `
            <li>
              <strong>${assignment.title}</strong>
              <p>${assignment.description}</p>
              <span class="item-meta">Due: ${assignment.dueDate}</span>
              <div class="action-buttons">
                <button class="button" data-edit-id="${assignment._id}">Edit</button>
                <button class="button secondary" data-delete-id="${assignment._id}">Delete</button>
                <button class="button" data-toggle-completed="${assignment._id}">View Completed</button>
              </div>
              <div class="item-details hidden" id="completed-${assignment._id}">
                <h4>Completed By</h4>
                <ul>
                  ${assignment.completedBy && assignment.completedBy.length
                    ? assignment.completedBy
                        .map(user => `<li>${user.name} (${user.email})</li>`)
                        .join('')
                    : '<li>No students have completed this assignment yet.</li>'}
                </ul>
              </div>
            </li>
          `
        )
        .join('')
    : '<li>No assignments available yet.</li>';

  assignmentAdminList.querySelectorAll('[data-edit-id]').forEach(button => {
    button.addEventListener('click', async event => {
      const assignmentId = event.target.dataset.editId;
      const assignments = await apiRequest('/assignments');
      const assignment = assignments.find(item => item._id === assignmentId);
      if (assignment) {
        showAssignmentEditForm(assignment);
      }
    });
  });

  assignmentAdminList.querySelectorAll('[data-delete-id]').forEach(button => {
    button.addEventListener('click', async event => {
      const assignmentId = event.target.dataset.deleteId;
      if (!confirm('Delete this assignment permanently?')) return;
      try {
        await apiRequest(`/assignments/${assignmentId}`, 'DELETE');
        showMessage('Assignment deleted successfully', false);
        await loadAdminAssignments();
      } catch (error) {
        showMessage(error.message);
      }
    });
  });

  assignmentAdminList.querySelectorAll('[data-toggle-completed]').forEach(button => {
    button.addEventListener('click', event => {
      const assignmentId = event.target.dataset.toggleCompleted;
      const detail = document.getElementById(`completed-${assignmentId}`);
      if (!detail) return;
      const isHidden = detail.classList.toggle('hidden');
      event.target.textContent = isHidden ? 'View Completed' : 'Hide Completed';
    });
  });
}

function renderJobAdminList(jobs) {
  const jobAdminList = document.getElementById('jobAdminList');
  if (!jobAdminList) return;

  jobAdminList.innerHTML = jobs.length
    ? jobs
        .map(
          job => `
            <li>
              <strong>${job.title}</strong>
              <p>${job.description}</p>
              <span class="item-meta">${job.company} — ${job.location}</span>
              <div class="action-buttons">
                <button class="button" data-edit-job="${job._id}">Edit</button>
                <button class="button secondary" data-delete-job="${job._id}">Delete</button>
                <button class="button" data-toggle-applicants="${job._id}">View Applicants</button>
              </div>
              <div class="item-details hidden" id="applicants-${job._id}">
                <h4>Applicants</h4>
                <ul>
                  ${job.applicants && job.applicants.length
                    ? job.applicants
                        .map(user => `<li>${user.name} (${user.email})</li>`)
                        .join('')
                    : '<li>No students have applied yet.</li>'}
                </ul>
              </div>
            </li>
          `
        )
        .join('')
    : '<li>No jobs posted yet.</li>';

  jobAdminList.querySelectorAll('[data-edit-job]').forEach(button => {
    button.addEventListener('click', async event => {
      const jobId = event.target.dataset.editJob;
      const jobs = await apiRequest('/jobs');
      const job = jobs.find(item => item._id === jobId);
      if (job) {
        showJobEditForm(job);
      }
    });
  });

  jobAdminList.querySelectorAll('[data-delete-job]').forEach(button => {
    button.addEventListener('click', async event => {
      const jobId = event.target.dataset.deleteJob;
      if (!confirm('Delete this job permanently?')) return;
      try {
        await apiRequest(`/jobs/${jobId}`, 'DELETE');
        showMessage('Job deleted successfully', false);
        await loadAdminJobs();
      } catch (error) {
        showMessage(error.message);
      }
    });
  });

  jobAdminList.querySelectorAll('[data-toggle-applicants]').forEach(button => {
    button.addEventListener('click', event => {
      const jobId = event.target.dataset.toggleApplicants;
      const detail = document.getElementById(`applicants-${jobId}`);
      if (!detail) return;
      const isHidden = detail.classList.toggle('hidden');
      event.target.textContent = isHidden ? 'View Applicants' : 'Hide Applicants';
    });
  });
}

async function loadAdminUsers() {
  try {
    const users = await apiRequest('/users');
    renderUserList(users);
  } catch (error) {
    showMessage(error.message);
  }
}

async function loadAdminAssignments() {
  try {
    const assignments = await apiRequest('/assignments');
    renderAssignmentAdminList(assignments);
  } catch (error) {
    showMessage(error.message);
  }
}

async function loadAdminJobs() {
  try {
    const jobs = await apiRequest('/jobs');
    renderJobAdminList(jobs);
  } catch (error) {
    showMessage(error.message);
  }
}

async function loadAdminDashboard() {
  const user = requireAuth(['admin']);
  if (!user) return;

  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl) {
    adminNameEl.textContent = user.name;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  const assignmentForm = document.getElementById('assignmentForm');
  if (assignmentForm) {
    assignmentForm.addEventListener('submit', async event => {
      event.preventDefault();
      const title = document.getElementById('assignmentTitle').value.trim();
      const description = document.getElementById('assignmentDescription').value.trim();
      const dueDate = document.getElementById('assignmentDueDate').value;

      try {
        await apiRequest('/assignments', 'POST', { title, description, dueDate });
        showMessage('Assignment added successfully', false);
        event.target.reset();
        await loadAdminAssignments();
      } catch (error) {
        showMessage(error.message);
      }
    });
  }

  const jobForm = document.getElementById('jobForm');
  if (jobForm) {
    jobForm.addEventListener('submit', async event => {
      event.preventDefault();
      const title = document.getElementById('jobTitle').value.trim();
      const company = document.getElementById('jobCompany').value.trim();
      const location = document.getElementById('jobLocation').value.trim();
      const description = document.getElementById('jobDescription').value.trim();

      try {
        await apiRequest('/jobs', 'POST', { title, company, location, description });
        showMessage('Job posted successfully', false);
        event.target.reset();
        await loadAdminJobs();
      } catch (error) {
        showMessage(error.message);
      }
    });
  }

  const assignmentUpdateForm = document.getElementById('assignmentUpdateForm');
  if (assignmentUpdateForm) {
    assignmentUpdateForm.addEventListener('submit', async event => {
      event.preventDefault();
      const id = document.getElementById('editAssignmentId').value;
      const title = document.getElementById('editAssignmentTitle').value.trim();
      const description = document.getElementById('editAssignmentDescription').value.trim();
      const dueDate = document.getElementById('editAssignmentDueDate').value;

      try {
        await apiRequest(`/assignments/${id}`, 'PUT', { title, description, dueDate });
        showMessage('Assignment updated successfully', false);
        hideAssignmentEditForm();
        await loadAdminAssignments();
      } catch (error) {
        showMessage(error.message);
      }
    });
  }

  const jobUpdateForm = document.getElementById('jobUpdateForm');
  if (jobUpdateForm) {
    jobUpdateForm.addEventListener('submit', async event => {
      event.preventDefault();
      const id = document.getElementById('editJobId').value;
      const title = document.getElementById('editJobTitle').value.trim();
      const company = document.getElementById('editJobCompany').value.trim();
      const location = document.getElementById('editJobLocation').value.trim();
      const description = document.getElementById('editJobDescription').value.trim();

      try {
        await apiRequest(`/jobs/${id}`, 'PUT', { title, company, location, description });
        showMessage('Job updated successfully', false);
        hideJobEditForm();
        await loadAdminJobs();
      } catch (error) {
        showMessage(error.message);
      }
    });
  }

  const cancelAssignmentEditBtn = document.getElementById('cancelAssignmentEditBtn');
  if (cancelAssignmentEditBtn) {
    cancelAssignmentEditBtn.addEventListener('click', event => {
      event.preventDefault();
      hideAssignmentEditForm();
    });
  }

  const cancelJobEditBtn = document.getElementById('cancelJobEditBtn');
  if (cancelJobEditBtn) {
    cancelJobEditBtn.addEventListener('click', event => {
      event.preventDefault();
      hideJobEditForm();
    });
  }

  await loadAdminUsers();
  await loadAdminAssignments();
  await loadAdminJobs();
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  const name = document.getElementById('profileNameInput').value.trim();
  const password = document.getElementById('profilePassword').value;
  const passwordConfirm = document.getElementById('profilePasswordConfirm').value;

  if (password && password !== passwordConfirm) {
    showMessage('Passwords do not match.');
    return;
  }

  const updateBody = {};
  if (name) updateBody.name = name;
  if (password) updateBody.password = password;

  if (!updateBody.name && !updateBody.password) {
    showMessage('Enter a new name or password to update.');
    return;
  }

  try {
    const data = await apiRequest('/users/me', 'PUT', updateBody);
    const token = getToken();
    setUserInStorage(token, data.user);

    document.getElementById('profileName').textContent = data.user.name;
    document.getElementById('profileNameInput').value = data.user.name;
    document.getElementById('profilePassword').value = '';
    document.getElementById('profilePasswordConfirm').value = '';
    showMessage('Profile updated successfully.', false);
  } catch (error) {
    showMessage(error.message);
  }
}

function loadProfilePage() {
  const user = requireAuth(['student', 'admin']);
  if (!user) return;

  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileRole').textContent = user.role;
  document.getElementById('profileCreated').textContent = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : new Date().toLocaleDateString();
  document.getElementById('logoutBtn').addEventListener('click', logout);

  const profileNameInput = document.getElementById('profileNameInput');
  if (profileNameInput) {
    profileNameInput.value = user.name;
  }

  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }

  const studentLink = document.getElementById('studentDashboardLink');
  const adminLink = document.getElementById('adminDashboardLink');
  if (studentLink) {
    studentLink.style.display = user.role === 'student' ? 'inline-block' : 'none';
  }
  if (adminLink) {
    adminLink.style.display = user.role === 'admin' ? 'inline-block' : 'none';
  }

  // Load and display assignments
  const loadAssignments = async () => {
    try {
      const assignments = await apiRequest('/assignments');
      const assignmentList = document.getElementById('profileAssignmentList');
      assignmentList.innerHTML = assignments.length
        ? assignments
            .map(
              a => `
                <li>
                  <strong>${a.title}</strong>
                  <p>${a.description}</p>
                  <span class="item-meta">Due: ${a.dueDate}</span>
                </li>
              `
            )
            .join('')
        : '<li>No assignments available.</li>';
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  // Load and display jobs
  const loadJobs = async () => {
    try {
      const jobs = await apiRequest('/jobs');
      const jobList = document.getElementById('profileJobList');
      jobList.innerHTML = jobs.length
        ? jobs
            .map(
              j => `
                <li>
                  <strong>${j.title}</strong>
                  <p>${j.description}</p>
                  <span class="item-meta">${j.company} — ${j.location}</span>
                </li>
              `
            )
            .join('')
        : '<li>No job opportunities available.</li>';
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  loadAssignments();
  loadJobs();
}

function highlightActiveNav() {
  const links = document.querySelectorAll('.nav-links a');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(link => {
    const linkPage = link.getAttribute('href').split('/').pop();
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function initPage() {
  highlightActiveNav();
  const path = window.location.pathname.split('/').pop();
  if (path === 'register.html') {
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
  } else if (path === 'login.html') {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
  } else if (path === 'student-dashboard.html') {
    loadStudentDashboard();
  } else if (path === 'admin-dashboard.html') {
    loadAdminDashboard();
  } else if (path === 'profile.html') {
    loadProfilePage();
  }
}

window.addEventListener('DOMContentLoaded', initPage);
