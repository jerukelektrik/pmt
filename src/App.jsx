import React, { useState, useEffect } from 'react';

// Constants for Categories and Priorities
const CATEGORIES = {
  technical_seo: { label: 'Technical SEO', color: '#10b981' },
  content_opt: { label: 'Content Optimization', color: '#3b82f6' },
  link_building: { label: 'Link Building', color: '#f59e0b' },
  web_dev: { label: 'Landing Page & Web Dev', color: '#8b5cf6' },
  reporting: { label: 'Reporting & Analytics', color: '#ec4899' },
  others: { label: 'Others', color: '#64748b' }
};

const PRIORITIES = {
  urgent: { label: 'Urgent', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#06b6d4' },
  low: { label: 'Low', color: '#10b981' }
};

const getDeadlineStatus = (dueDate, status) => {
  if (!dueDate || status === 'done') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due_soon';
  return null;
};

export default function App() {
  // Authentication state
  const [token, setToken] = useState(localStorage.getItem('seo_pm_token') || '');
  const [user, setUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App navigation
  const [activeTab, setActiveTab] = useState('overview'); // overview, kanban, documents, boss
  const [viewMode, setViewMode] = useState('list'); // list, board, calendar

  // Status Grouped List & Calendar States
  const [collapsedGroups, setCollapsedGroups] = useState({ todo: false, in_progress: false, in_review: false, done: false });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [collapsedBrands, setCollapsedBrands] = useState({});
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Data states
  const [brands, setBrands] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [bossReport, setBossReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Brand creation modal/form
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [newBrandId, setNewBrandId] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandColor, setNewBrandColor] = useState('#0f9488');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [brandError, setBrandError] = useState('');

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskBrandId, setTaskBrandId] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskCategory, setTaskCategory] = useState('others');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskFormError, setTaskFormError] = useState('');

  // New Link form state (inside details modal)
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] = useState('spreadsheet');

  // Search & actions bar states
  const [sortBy, setSortBy] = useState('none');
  const [showDetailedFilters, setShowDetailedFilters] = useState(false);
  const [showSortPopover, setShowSortPopover] = useState(false);
  const [showShowPopover, setShowShowPopover] = useState(false);

  // Verify auth on mount or when token changes
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setUser(null);
    }
  }, [token]);

  // Load basic data when authenticated
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Refresh boss report when activeTab becomes 'boss'
  useEffect(() => {
    if (user && activeTab === 'boss') {
      fetchBossReport();
    }
  }, [user, activeTab]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBrands(),
        fetchUsers(),
        fetchTasks(),
        fetchLinks()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    const res = await fetch('/api/brands', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setBrands(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  const fetchTasks = async () => {
    let url = '/api/tasks';
    const params = [];
    if (filterBrand !== 'all') params.push(`brand_id=${filterBrand}`);
    if (filterAssignee !== 'all') params.push(`assignee_id=${filterAssignee}`);
    if (filterCategory !== 'all') params.push(`category=${filterCategory}`);
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTasks(await res.json());
  };

  // Re-run task fetching when filter dropdowns change
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [filterBrand, filterAssignee, filterCategory]);

  const fetchLinks = async () => {
    const res = await fetch('/api/links', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setLinks(await res.json());
  };

  const fetchBossReport = async () => {
    const res = await fetch('/api/reports/progress', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setBossReport(await res.json());
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername || !loginPassword) {
      setLoginError('Username dan password harus diisi');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('seo_pm_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError(data.error || 'Login gagal');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan jaringan server');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('seo_pm_token');
    setToken('');
    setUser(null);
  };

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    setBrandError('');
    if (!newBrandId || !newBrandName) {
      setBrandError('ID Brand dan Nama Brand wajib diisi');
      return;
    }
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: newBrandId,
          name: newBrandName,
          color: newBrandColor,
          description: newBrandDesc
        })
      });
      if (res.ok) {
        setShowCreateBrandModal(false);
        setNewBrandId('');
        setNewBrandName('');
        setNewBrandColor('#0f9488');
        setNewBrandDesc('');
        fetchBrands();
      } else {
        const data = await res.json();
        setBrandError(data.error || 'Gagal membuat brand baru');
      }
    } catch (err) {
      setBrandError('Kesalahan jaringan server');
    }
  };

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm("Are you sure you want to delete this brand? All tasks associated with this brand will be unassigned from it.")) return;
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchBrands();
        fetchTasks();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete brand');
      }
    } catch (err) {
      alert('Network error deleting brand');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskFormError('');
    if (!taskTitle || !taskBrandId) {
      setTaskFormError('Judul Tugas dan Brand wajib diisi');
      return;
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          brand_id: taskBrandId,
          priority: taskPriority,
          category: taskCategory,
          assignee_id: taskAssigneeId ? parseInt(taskAssigneeId, 10) : null,
          due_date: taskDueDate || null
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskBrandId('');
        setTaskPriority('medium');
        setTaskCategory('others');
        setTaskAssigneeId('');
        setTaskDueDate('');
        fetchTasks();
      } else {
        const data = await res.json();
        setTaskFormError(data.error || 'Gagal membuat tugas');
      }
    } catch (err) {
      setTaskFormError('Kesalahan jaringan server');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTasks();
        // If updating active modal task
        if (selectedTask && selectedTask.id === taskId) {
          const updatedTask = { ...selectedTask, status: newStatus };
          if (newStatus === 'done') {
            updatedTask.completed_at = new Date().toISOString();
          } else {
            updatedTask.completed_at = null;
          }
          setSelectedTask(updatedTask);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTaskDetail = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: selectedTask.title,
          description: selectedTask.description,
          brand_id: selectedTask.brand_id,
          priority: selectedTask.priority,
          category: selectedTask.category,
          assignee_id: selectedTask.assignee_id ? parseInt(selectedTask.assignee_id, 10) : null,
          due_date: selectedTask.due_date || null
        })
      });
      if (res.ok) {
        fetchTasks();
        setShowTaskDetailModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTasks();
        setShowTaskDetailModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newLinkTitle || !newLinkUrl) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newLinkTitle,
          url: newLinkUrl,
          type: newLinkType
        })
      });
      if (res.ok) {
        const link = await res.json();
        // Update task detail modal links
        const updatedLinks = [...(selectedTask.links || []), link];
        setSelectedTask({ ...selectedTask, links: updatedLinks });
        setNewLinkTitle('');
        setNewLinkUrl('');
        setNewLinkType('spreadsheet');
        
        // Refresh global datasets
        fetchTasks();
        fetchLinks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm('Hapus link dokumen ini?')) return;
    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedLinks = (selectedTask.links || []).filter(l => l.id !== linkId);
        setSelectedTask({ ...selectedTask, links: updatedLinks });
        
        fetchTasks();
        fetchLinks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSEOChecklist = (type) => {
    let template = '\n\n';
    if (type === 'technical') {
      template += `### Technical SEO Checklist\n- [ ] Setup/Verify XML Sitemap\n- [ ] Verify Robots.txt rules\n- [ ] Audit Core Web Vitals (LCP, INP, CLS)\n- [ ] Verify canonical tags setup`;
    } else if (type === 'content') {
      template += `### Content SEO Checklist\n- [ ] Map primary & secondary keywords\n- [ ] Optimize Title Tag & Meta Description\n- [ ] Structure content with H1-H3 headings\n- [ ] Add Alt tags to all images\n- [ ] Setup internal links`;
    } else if (type === 'launch') {
      template += `### Web Page Launch Checklist\n- [ ] Setup URL redirects (301)\n- [ ] Install Google Analytics & GTM tags\n- [ ] Verify mobile responsiveness\n- [ ] Check form submit & lead capture integration`;
    }
    
    setSelectedTask({
      ...selectedTask,
      description: (selectedTask.description || '') + template
    });
  };

  // Helper to parse description checklist items
  const parseChecklistItems = (description = '') => {
    const lines = description.split('\n');
    const checklist = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^- \[(x| )\] (.*)$/i);
      if (match) {
        checklist.push({
          lineIndex: index,
          checked: match[1].toLowerCase() === 'x',
          text: match[2].trim(),
          rawLine: line
        });
      }
    });
    
    return checklist;
  };

  const getChecklistProgress = (description) => {
    const items = parseChecklistItems(description);
    if (items.length === 0) return null;
    const checkedCount = items.filter(i => i.checked).length;
    const percentage = Math.round((checkedCount / items.length) * 100);
    return { checkedCount, totalCount: items.length, percentage };
  };

  const toggleChecklistItem = async (item) => {
    const lines = (selectedTask.description || '').split('\n');
    const newStatus = item.checked ? ' ' : 'x';
    lines[item.lineIndex] = `- [${newStatus}] ${item.text}`;
    
    const newDescription = lines.join('\n');
    const updatedTask = { ...selectedTask, description: newDescription };
    setSelectedTask(updatedTask);

    // Auto-save changes back to server
    try {
      await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ description: newDescription })
      });
      fetchTasks();
    } catch (err) {
      console.error('Error auto-saving checklist:', err);
    }
  };

  const handleCardClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    // First weekday index of the month
    const firstDay = new Date(year, month, 1).getDay();
    // Total days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Add trailing days of previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        monthOffset: -1,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    
    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        monthOffset: 0,
        date: new Date(year, month, i)
      });
    }
    
    // Add leading days of next month to complete the grid (usually 35 or 42 cells)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        monthOffset: 1,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const getTasksForDate = (date, tasksList) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    return tasksList.filter(t => t.due_date === dateStr);
  };

  const changeMonth = (offset) => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const toggleBrand = (brandId) => {
    setCollapsedBrands(prev => ({
      ...prev,
      [brandId]: !prev[brandId]
    }));
  };

  const getDocTypeIcon = (type) => {
    switch (type) {
      case 'spreadsheet': return '[Sheet]';
      case 'drive': return '[Drive]';
      case 'slide': return '[Slide]';
      case 'figma': return '[Figma]';
      case 'document': return '[Doc]';
      default: return '[Link]';
    }
  };

  // Filter tasks based on searchQuery and other filters
  const getFilteredTasks = () => {
    const filtered = tasks.filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });

    if (sortBy === 'due_date') {
      return [...filtered].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    }

    if (sortBy === 'priority') {
      const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
      return [...filtered].sort((a, b) => {
        const wA = weights[a.priority] || 0;
        const wB = weights[b.priority] || 0;
        return wB - wA; // Highest priority first
      });
    }

    if (sortBy === 'title') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  };

  // RENDER APP
  if (!token || !user) {
    return (
      <div className="login-page-container">
        <div className="login-card">
          <div className="login-logo">
            <div className="logo-symbol">R</div>
            <div className="title">ROGU SEO PM</div>
            <div className="subtitle">Project Management Tools</div>
          </div>
          
          <form onSubmit={handleLogin}>
            {loginError && <div className="login-alert">{loginError}</div>}
            
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="text-input"
                style={{ width: '100%' }}
                placeholder="Enter username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="text-input"
                style={{ width: '100%' }}
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Login to Dashboard
            </button>
          </form>

          <div className="credential-tip">
            <strong>Demo Credentials:</strong>
            <table>
              <tbody>
                <tr>
                  <td>Lead: <code>admin</code> / <code>admin</code></td>
                  <td>Boss: <code>boss</code> / <code>boss</code></td>
                </tr>
                <tr>
                  <td>Writer: <code>writer</code> / <code>writer</code></td>
                  <td>Developer: <code>dev</code> / <code>dev</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const filteredTasksList = getFilteredTasks();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside>
        <div className="logo-section">
          <div className="logo-symbol">R</div>
          <div className="logo-text">
            <span className="logo-title">ROGU SEO PM</span>
            <span className="logo-subtitle">Web & SEO Leads</span>
          </div>
        </div>

        <nav>
          <div 
            id="nav-overview"
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Dashboard Overview
          </div>
          <div 
            id="nav-kanban"
            className={`nav-item ${activeTab === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveTab('kanban')}
          >
            Kanban Task Board
          </div>
          <div 
            id="nav-documents"
            className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Document Repository
          </div>
          <div 
            id="nav-boss"
            className={`nav-item ${activeTab === 'boss' ? 'active' : ''}`}
            onClick={() => setActiveTab('boss')}
          >
            Boss Progress Report
          </div>
        </nav>

        {/* User Information */}
        <div className="user-profile">
          <div className="user-avatar">
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role === 'lead' ? 'Web & SEO Lead' : user.role}</span>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div className="page-header">
              <div className="page-title">
                <h1>Dashboard Overview</h1>
                <p>Task completion status & multi-brand optimization performance</p>
              </div>
              <div className="header-actions">
                {user.role === 'lead' && (
                  <>
                    <button className="btn btn-secondary" onClick={() => setShowCreateBrandModal(true)}>
                      Add Brand
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                      Create New Task
                    </button>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading data...</div>
            ) : (
              <>
                {/* Metric overview cards */}
                <div className="grid-overview" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div className="overview-card brands-count">
                    <div className="card-info">
                      <span className="card-label">Total Brands</span>
                      <span className="card-value">{brands.length}</span>
                    </div>
                  </div>
                  
                  <div className="overview-card" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="card-info">
                      <span className="card-label">To Do</span>
                      <span className="card-value">
                        {tasks.filter(t => t.status === 'todo').length}
                      </span>
                    </div>
                  </div>

                  <div className="overview-card" style={{ borderColor: 'var(--color-warning)' }}>
                    <div className="card-info">
                      <span className="card-label" style={{ color: 'var(--color-warning)' }}>In Progress</span>
                      <span className="card-value" style={{ color: 'var(--color-warning)' }}>
                        {tasks.filter(t => t.status === 'in_progress').length}
                      </span>
                    </div>
                  </div>

                  <div className="overview-card" style={{ borderColor: 'var(--color-info)' }}>
                    <div className="card-info">
                      <span className="card-label" style={{ color: 'var(--color-info)' }}>In Review</span>
                      <span className="card-value" style={{ color: 'var(--color-info)' }}>
                        {tasks.filter(t => t.status === 'in_review').length}
                      </span>
                    </div>
                  </div>

                  <div className="overview-card completed">
                    <div className="card-info">
                      <span className="card-label">Done</span>
                      <span className="card-value">
                        {tasks.filter(t => t.status === 'done').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deadline Alerts & Reminders */}
                {(() => {
                  const overdueTasks = tasks.filter(t => getDeadlineStatus(t.due_date, t.status) === 'overdue');
                  const dueSoonTasks = tasks.filter(t => getDeadlineStatus(t.due_date, t.status) === 'due_soon');
                  
                  if (overdueTasks.length === 0 && dueSoonTasks.length === 0) return null;
                  
                  return (
                    <div style={{ 
                      backgroundColor: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      marginBottom: '30px',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        Task Deadline Reminders
                      </h2>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {/* Overdue column */}
                        {overdueTasks.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Overdue Tasks ({overdueTasks.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                              {overdueTasks.map(t => (
                                <div key={t.id} onClick={() => handleCardClick(t)} style={{ 
                                  backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                                  border: '1px solid rgba(239, 68, 68, 0.15)', 
                                  padding: '10px 14px', 
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'var(--transition-fast)'
                                }} className="alert-item-hover">
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                      Brand: {t.brand_name} | PIC: {t.assignee_name || 'Unassigned'}
                                    </div>
                                  </div>
                                  <span style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.75rem', marginLeft: '10px', whiteSpace: 'nowrap' }}>
                                    Overdue ({t.due_date})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Due soon column */}
                        {dueSoonTasks.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Due Soon Tasks ({dueSoonTasks.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                              {dueSoonTasks.map(t => {
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const due = new Date(t.due_date);
                                due.setHours(0,0,0,0);
                                const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `Due in ${diffDays}d`;
                                
                                return (
                                  <div key={t.id} onClick={() => handleCardClick(t)} style={{ 
                                    backgroundColor: 'rgba(245, 158, 11, 0.05)', 
                                    border: '1px solid rgba(245, 158, 11, 0.15)', 
                                    padding: '10px 14px', 
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'var(--transition-fast)'
                                  }} className="alert-item-hover">
                                    <div>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Brand: {t.brand_name} | PIC: {t.assignee_name || 'Unassigned'}
                                      </div>
                                    </div>
                                    <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: '0.75rem', marginLeft: '10px', whiteSpace: 'nowrap' }}>
                                      {label} ({t.due_date})
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Brands List with progress bars */}
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px' }}>Progress per Brand</h2>
                <div className="brands-progress-grid">
                  {brands.map(brand => {
                    const brandTasks = tasks.filter(t => t.brand_id === brand.id);
                    const completed = brandTasks.filter(t => t.status === 'done').length;
                    const total = brandTasks.length;
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    
                    return (
                      <div key={brand.id} className="brand-progress-card">
                        <div className="brand-card-header">
                          <span 
                            className="brand-badge" 
                            style={{ backgroundColor: `${brand.color}22`, color: brand.color }}
                          >
                            {brand.name.toUpperCase()}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {brand.description || 'No description available.'}
                        </p>
                        <div style={{ marginTop: '10px' }}>
                          <div className="progress-info">
                            <span>Task Progress</span>
                            <span>{completed}/{total} Completed ({percent}%)</span>
                          </div>
                          <div className="progress-bar-container" style={{ marginTop: '6px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ width: `${percent}%`, backgroundColor: brand.color }}
                            />
                          </div>
                        </div>

                        {/* Task Status Breakdown */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(4, 1fr)', 
                          gap: '8px', 
                          marginTop: '12px',
                          backgroundColor: 'var(--bg-surface-hover)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          textAlign: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>To Do</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
                              {brandTasks.filter(t => t.status === 'todo').length}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-warning)', fontWeight: 600 }}>In Progress</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-warning)' }}>
                              {brandTasks.filter(t => t.status === 'in_progress').length}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-info)', fontWeight: 600 }}>In Review</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-info)' }}>
                              {brandTasks.filter(t => t.status === 'in_review').length}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 600 }}>Done</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-success)' }}>
                              {brandTasks.filter(t => t.status === 'done').length}
                            </div>
                          </div>
                        </div>

                        {/* View specific brand tasks button with delete option for Lead */}
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ flexGrow: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                            onClick={() => {
                              setFilterBrand(brand.id);
                              setActiveTab('kanban');
                            }}
                          >
                            {user.role === 'lead' ? 'View Tasks' : 'View Brand Tasks'}
                          </button>
                          {user.role === 'lead' && (
                            <button 
                              type="button"
                              className="btn btn-secondary delete-brand-btn" 
                              style={{ 
                                padding: '8px 12px', 
                                fontSize: '0.85rem', 
                                color: 'var(--color-danger)', 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all var(--transition-fast)'
                              }}
                              onClick={() => handleDeleteBrand(brand.id)}
                              title="Delete Brand"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* TAB 2: KANBAN BOARD */}
        {activeTab === 'kanban' && (
          <div className="kanban-board-container">
            <div className="page-header">
              <div className="page-title">
                <h1>Kanban Task Board</h1>
                <p>Visualize SEO optimization and web development workflows</p>
              </div>
              <div className="header-actions">
                {user.role === 'lead' && (
                  <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    Create New Task
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const totalTasksCount = filteredTasksList.length;
              const completedTasksCount = filteredTasksList.filter(t => t.status === 'done').length;
              const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
              
              return (
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Overall Completion Progress
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {progressPercentage}% Completed ({completedTasksCount}/{totalTasksCount} tasks)
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    backgroundColor: 'var(--bg-surface-hover)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progressPercentage}%`,
                      background: 'linear-gradient(90deg, var(--color-primary) 0%, #14b8a6 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                </div>
              );
            })()}

            {/* View Mode Switcher and Unified Search Bar Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '25px',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              {/* Left Side: View Switcher pills */}
              <div className="view-mode-pill-container" style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '3px',
                gap: '2px',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '9px',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'board' ? 'var(--bg-sidebar)' : 'transparent',
                    color: viewMode === 'board' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: viewMode === 'board' ? 'var(--shadow-sm)' : 'none',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9"></rect>
                    <rect x="14" y="3" width="7" height="5"></rect>
                    <rect x="14" y="12" width="7" height="9"></rect>
                    <rect x="3" y="16" width="7" height="5"></rect>
                  </svg>
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '9px',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'list' ? 'var(--bg-sidebar)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '9px',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'calendar' ? 'var(--bg-sidebar)' : 'transparent',
                    color: viewMode === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: viewMode === 'calendar' ? 'var(--shadow-sm)' : 'none',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Calendar</span>
                </button>
              </div>

              {/* Right Side: Search and actions */}
              <div className="unified-search-bar" style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: '6px 16px',
                boxShadow: 'var(--shadow-sm)',
                position: 'relative',
                flexGrow: 1,
                maxWidth: '550px',
                margin: 0
              }}>
                {/* Left Side: Search */}
                <div className="search-bar-input-wrapper" style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexGrow: 1
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', marginRight: '10px', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search tasks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      padding: '8px 0'
                    }}
                  />
                </div>

                {/* Vertical Divider */}
                <div style={{
                  borderLeft: '1px solid var(--border-color)',
                  height: '20px',
                  margin: '0 16px',
                  opacity: 0.8
                }}></div>

                {/* Right Side Actions */}
                <div className="search-bar-actions" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0
                }}>
                  {/* 1. Sort By Button */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      type="button"
                      className={`search-bar-btn ${sortBy !== 'none' ? 'active' : ''}`}
                      onClick={() => {
                        setShowSortPopover(!showSortPopover);
                        setShowShowPopover(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: showSortPopover ? 'var(--bg-surface-hover)' : 'none',
                        border: 'none',
                        outline: 'none',
                        borderRadius: '16px',
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: sortBy !== 'none' ? 'var(--color-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <line x1="4" y1="6" x2="20" y2="6"></line>
                        <line x1="4" y1="12" x2="16" y2="12"></line>
                        <line x1="4" y1="18" x2="12" y2="18"></line>
                      </svg>
                      <span>{sortBy === 'none' ? 'Sort by' : `Sorted: ${sortBy === 'due_date' ? 'Due Date' : sortBy === 'priority' ? 'Priority' : 'Title'}`}</span>
                    </button>

                    {/* Sort Popover Dropdown */}
                    {showSortPopover && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '6px',
                        zIndex: 100,
                        minWidth: '150px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div 
                          onClick={() => { setSortBy('none'); setShowSortPopover(false); }}
                          className="popover-item"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            backgroundColor: sortBy === 'none' ? 'var(--bg-sidebar)' : 'transparent',
                            color: 'var(--text-primary)',
                            fontWeight: sortBy === 'none' ? 600 : 400
                          }}
                        >
                          Default Order
                        </div>
                        <div 
                          onClick={() => { setSortBy('due_date'); setShowSortPopover(false); }}
                          className="popover-item"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            backgroundColor: sortBy === 'due_date' ? 'var(--bg-sidebar)' : 'transparent',
                            color: 'var(--text-primary)',
                            fontWeight: sortBy === 'due_date' ? 600 : 400
                          }}
                        >
                          Due Date
                        </div>
                        <div 
                          onClick={() => { setSortBy('priority'); setShowSortPopover(false); }}
                          className="popover-item"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            backgroundColor: sortBy === 'priority' ? 'var(--bg-sidebar)' : 'transparent',
                            color: 'var(--text-primary)',
                            fontWeight: sortBy === 'priority' ? 600 : 400
                          }}
                        >
                          Priority
                        </div>
                        <div 
                          onClick={() => { setSortBy('title'); setShowSortPopover(false); }}
                          className="popover-item"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            backgroundColor: sortBy === 'title' ? 'var(--bg-sidebar)' : 'transparent',
                            color: 'var(--text-primary)',
                            fontWeight: sortBy === 'title' ? 600 : 400
                          }}
                        >
                          Title Alphabetical
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Filters Toggle Button */}
                  <button 
                    type="button"
                    className={`search-bar-btn ${showDetailedFilters ? 'active' : ''}`}
                    onClick={() => {
                      setShowDetailedFilters(!showDetailedFilters);
                      setShowSortPopover(false);
                      setShowShowPopover(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: showDetailedFilters ? 'var(--bg-surface-hover)' : 'none',
                      border: 'none',
                      outline: 'none',
                      borderRadius: '16px',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: showDetailedFilters ? 'var(--color-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span>Filter</span>
                    {(filterBrand !== 'all' || filterCategory !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all') && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        marginLeft: '6px'
                      }}>
                        {[filterBrand, filterCategory, filterPriority, filterAssignee].filter(v => v !== 'all').length}
                      </span>
                    )}
                  </button>

                  {/* 3. Me Toggle Button */}
                  <button 
                    type="button"
                    className={`search-bar-btn ${filterAssignee === user.id.toString() ? 'active' : ''}`}
                    onClick={() => {
                      setFilterAssignee(filterAssignee === user.id.toString() ? 'all' : user.id.toString());
                      setShowSortPopover(false);
                      setShowShowPopover(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: filterAssignee === user.id.toString() ? 'var(--bg-surface-hover)' : 'none',
                      border: 'none',
                      outline: 'none',
                      borderRadius: '16px',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: filterAssignee === user.id.toString() ? 'var(--color-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Me</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Detailed Filters Row */}
            {showDetailedFilters && (
              <div className="kanban-filters" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '20px',
                animation: 'slideDown 0.2s ease-out'
              }}>
                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Filter Brand</label>
                  <select 
                    className="select-input" 
                    value={filterBrand} 
                    onChange={(e) => setFilterBrand(e.target.value)}
                  >
                    <option value="all">All Brands</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Filter Category</label>
                  <select 
                    className="select-input" 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(CATEGORIES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Filter Priority</label>
                  <select 
                    className="select-input" 
                    value={filterPriority} 
                    onChange={(e) => setFilterPriority(e.target.value)}
                  >
                    <option value="all">All Priorities</option>
                    {Object.entries(PRIORITIES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Assignee</label>
                  <select 
                    className="select-input" 
                    value={filterAssignee} 
                    onChange={(e) => setFilterAssignee(e.target.value)}
                  >
                    <option value="all">All Members</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                
                {/* Reset Filters button */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-end', padding: '8px 12px', fontSize: '0.8rem', marginLeft: 'auto' }}
                  onClick={() => {
                    setFilterBrand('all');
                    setFilterCategory('all');
                    setFilterPriority('all');
                    setFilterAssignee('all');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Render views depending on viewMode */}
            {viewMode === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {['todo', 'in_progress', 'in_review', 'done'].map(statusKey => {
                  const statusTasks = filteredTasksList.filter(t => t.status === statusKey);
                  const isCollapsed = collapsedGroups[statusKey];
                  
                  // Label & color mapping for status bar matching screenshot style
                  const statusLabel = statusKey === 'todo' ? 'TO DO' :
                                      statusKey === 'in_progress' ? 'ON PROGRESS' :
                                      statusKey === 'in_review' ? 'IN REVIEW' : 'DONE';
                                      
                  const statusBg = statusKey === 'todo' ? '#e2e8f0' :
                                   statusKey === 'in_progress' ? '#fef08a' :
                                   statusKey === 'in_review' ? '#e9d5ff' : '#bbf7d0';
                                   
                  const statusText = statusKey === 'todo' ? '#475569' :
                                     statusKey === 'in_progress' ? '#854d0e' :
                                     statusKey === 'in_review' ? '#6b21a8' : '#166534';
                  
                  return (
                    <div key={statusKey} style={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      overflow: 'hidden'
                    }}>
                      {/* Status header bar */}
                      <div 
                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [statusKey]: !prev[statusKey] }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 20px',
                          backgroundColor: 'var(--bg-surface-hover)',
                          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            backgroundColor: statusBg,
                            color: statusText,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            letterSpacing: '0.5px'
                          }}>
                            {statusLabel} ({statusTasks.length})
                          </span>
                          <span style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {isCollapsed ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            )}
                          </span>
                        </div>
                        
                        {/* Plus button to add task in this status */}
                        {user.role === 'lead' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // don't collapse
                              setTaskBrandId('');
                              setTaskPriority('medium');
                              setTaskCategory('others');
                              setTaskAssigneeId('');
                              setTaskDueDate('');
                              setTaskTitle('');
                              setTaskDesc('');
                              setShowCreateModal(true);
                            }}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                            className="hover-bg-icon"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                        )}
                      </div>

                      {/* Group Table Content */}
                      {!isCollapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {/* Table Header Row */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(0,0,0,0.01)',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            <div style={{ width: '40px', flexShrink: 0 }}></div>
                            <div style={{ flex: '2 1 200px', paddingRight: '12px' }}>Project Name</div>
                            <div style={{ flex: '1 1 120px', flexShrink: 0 }}>Client</div>
                            <div style={{ flex: '2 1 240px', paddingRight: '12px' }}>Description</div>
                            <div style={{ flex: '1 1 120px', flexShrink: 0 }}>Deadline</div>
                            <div style={{ flex: '1 1 100px', flexShrink: 0 }}>People</div>
                            <div style={{ flex: '1 1 100px', flexShrink: 0 }}>Priority</div>
                            <div style={{ width: '40px', flexShrink: 0 }}></div>
                          </div>

                          {/* Table Body Rows */}
                          {statusTasks.length === 0 ? (
                            <div style={{
                              padding: '24px',
                              textAlign: 'center',
                              fontSize: '0.85rem',
                              color: 'var(--text-muted)',
                              backgroundColor: 'var(--bg-surface)'
                            }}>
                              No tasks in this stage.
                            </div>
                          ) : (
                            statusTasks.map(task => {
                              const isTaskDone = task.status === 'done';
                              
                              // Priority badge style
                              const pBadgeBg = task.priority === 'urgent' ? 'rgba(239, 68, 68, 0.12)' :
                                               task.priority === 'high' ? 'rgba(139, 92, 246, 0.12)' :
                                               task.priority === 'medium' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)';
                                               
                              const pBadgeText = task.priority === 'urgent' ? 'var(--color-danger)' :
                                                 task.priority === 'high' ? 'var(--color-purple)' :
                                                 task.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-success)';
                                                 
                              const pBadgeLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
                              
                              return (
                                <div 
                                  key={task.id} 
                                  className="project-table-row"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 20px',
                                    borderBottom: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-surface)',
                                    fontSize: '0.85rem',
                                    transition: 'background-color var(--transition-fast)'
                                  }}
                                >
                                  {/* Checkbox Column */}
                                  <div style={{ width: '40px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newStatus = isTaskDone ? 'todo' : 'done';
                                        handleUpdateTaskStatus(task.id, newStatus);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: isTaskDone ? 'var(--color-success)' : 'var(--text-muted)'
                                      }}
                                    >
                                      {isTaskDone ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                      ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        </svg>
                                      )}
                                    </button>
                                  </div>

                                  {/* Project Name (Task Title) */}
                                  <div 
                                    style={{
                                      flex: '2 1 200px',
                                      paddingRight: '12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px'
                                    }}
                                  >
                                    <div
                                      onClick={() => handleCardClick(task)}
                                      style={{
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        textDecoration: isTaskDone ? 'line-through' : 'none',
                                        opacity: isTaskDone ? 0.6 : 1,
                                        width: 'fit-content'
                                      }}
                                      className="hover-underline"
                                    >
                                      {task.title}
                                    </div>
                                    {(() => {
                                      const progress = getChecklistProgress(task.description);
                                      if (!progress) return null;
                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '160px' }}>
                                          <div style={{
                                            height: '4px',
                                            flexGrow: 1,
                                            backgroundColor: 'var(--bg-surface-hover)',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                          }}>
                                            <div style={{
                                              height: '100%',
                                              width: `${progress.percentage}%`,
                                              backgroundColor: 'var(--color-primary)',
                                              borderRadius: '2px',
                                              transition: 'width 0.2s ease'
                                            }} />
                                          </div>
                                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>
                                            {progress.checkedCount}/{progress.totalCount}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Client (Brand) */}
                                  <div style={{ flex: '1 1 120px', flexShrink: 0 }}>
                                    <span 
                                      className="brand-badge" 
                                      style={{ 
                                        backgroundColor: `${task.brand_color || '#334155'}22`, 
                                        color: task.brand_color || '#94a3b8',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                      }}
                                    >
                                      {task.brand_name || 'No Brand'}
                                    </span>
                                  </div>

                                  {/* Description */}
                                  <div style={{ 
                                    flex: '2 1 240px', 
                                    paddingRight: '12px', 
                                    color: 'var(--text-secondary)',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {task.description || 'No description.'}
                                  </div>

                                  {/* Deadline (Due Date) */}
                                  <div style={{ flex: '1 1 120px', flexShrink: 0 }}>
                                    <span className={`card-due ${getDeadlineStatus(task.due_date, task.status) || ''}`} style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                      {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                                      {getDeadlineStatus(task.due_date, task.status) === 'overdue' && ' (Overdue)'}
                                      {getDeadlineStatus(task.due_date, task.status) === 'due_soon' && ' (Soon)'}
                                    </span>
                                  </div>

                                  {/* People (Assignee Avatar) */}
                                  <div style={{ flex: '1 1 100px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                    <span 
                                      className="card-assignee-avatar" 
                                      style={{ 
                                        width: '24px', 
                                        height: '24px', 
                                        fontSize: '0.7rem', 
                                        margin: 0,
                                        fontWeight: 600,
                                        backgroundColor: 'var(--color-primary-glow)',
                                        color: 'var(--color-primary)',
                                        border: '1px solid var(--border-color)'
                                      }}
                                      title={task.assignee_name || 'Unassigned'}
                                    >
                                      {task.assignee_name ? task.assignee_name.charAt(0) : 'U'}
                                    </span>
                                    <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Unassigned'}
                                    </span>
                                  </div>

                                  {/* Priority Badge */}
                                  <div style={{ flex: '1 1 100px', flexShrink: 0 }}>
                                    <span style={{
                                      backgroundColor: pBadgeBg,
                                      color: pBadgeText,
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      display: 'inline-block'
                                    }}>
                                      {pBadgeLabel}
                                    </span>
                                  </div>

                                  {/* Actions Menu */}
                                  <div style={{ width: '40px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                    <button 
                                      type="button"
                                      onClick={() => handleCardClick(task)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Render Calendar View */}
            {viewMode === 'calendar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Month navigation control */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-card)',
                  padding: '12px 20px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
                    onClick={() => changeMonth(-1)}
                  >
                    Previous Month
                  </button>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
                    onClick={() => changeMonth(1)}
                  >
                    Next Month
                  </button>
                </div>

                {/* Weekday labels */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ padding: '8px' }}>{d}</div>
                  ))}
                </div>

                {/* Days Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px'
                }}>
                  {getCalendarDays().map((cell, idx) => {
                    const cellTasks = getTasksForDate(cell.date, filteredTasksList);
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    
                    return (
                      <div 
                        key={idx} 
                        style={{
                          backgroundColor: cell.monthOffset === 0 ? 'var(--bg-card)' : 'var(--bg-sidebar)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          minHeight: '110px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          opacity: cell.monthOffset === 0 ? 1 : 0.4,
                          outline: isToday ? '2px solid var(--color-primary)' : 'none',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'transform var(--transition-fast)'
                        }}
                      >
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: isToday ? 'var(--color-primary)' : 'var(--text-secondary)',
                          marginBottom: '6px'
                        }}>
                          {cell.day}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flexGrow: 1, maxHeight: '90px' }}>
                          {cellTasks.map(t => (
                            <div 
                              key={t.id}
                              onClick={() => handleCardClick(t)}
                              style={{
                                backgroundColor: `${t.brand_color || '#0f9488'}15`,
                                color: t.brand_color || '#0f9488',
                                borderLeft: `3px solid ${t.brand_color || '#0f9488'}`,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={t.title}
                              className="calendar-task-hover"
                            >
                              {t.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === 'board' && (
              <div className="kanban-columns">
                
                {/* To Do */}
                <div className="kanban-column">
                  <div className="column-header">
                    <span className="column-title">To Do</span>
                    <span className="column-badge">
                      {filteredTasksList.filter(t => t.status === 'todo').length}
                    </span>
                  </div>
                  <div className="column-cards">
                    {filteredTasksList.filter(t => t.status === 'todo').map(task => (
                      <div key={task.id} className="kanban-card" onClick={() => handleCardClick(task)}>
                        <div className="card-brand-row">
                          <span 
                            className="card-brand-tag" 
                            style={{ backgroundColor: `${task.brand_color || '#334155'}22`, color: task.brand_color || '#94a3b8' }}
                          >
                            {task.brand_name || 'No Brand'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span 
                              className="card-priority-tag"
                              style={{ 
                                backgroundColor: `${PRIORITIES[task.priority]?.color}15`, 
                                color: PRIORITIES[task.priority]?.color 
                              }}
                            >
                              {PRIORITIES[task.priority]?.label || task.priority}
                            </span>
                            <span className="card-cat-tag">
                              {CATEGORIES[task.category]?.label || task.category}
                            </span>
                          </div>
                        </div>
                        <div className="card-title">{task.title}</div>
                        {(() => {
                          const progress = getChecklistProgress(task.description);
                          if (!progress) return null;
                          return (
                            <div style={{ marginTop: '6px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                <span>Progress</span>
                                <span>{progress.checkedCount}/{progress.totalCount} ({progress.percentage}%)</span>
                              </div>
                              <div style={{ height: '4px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress.percentage}%`, backgroundColor: 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.2s ease' }} />
                              </div>
                            </div>
                          );
                        })()}
                        <div className="card-meta-row">
                          <span className={`card-due ${getDeadlineStatus(task.due_date, task.status) || ''}`}>
                            Due: {task.due_date ? task.due_date : 'No deadline'}
                            {getDeadlineStatus(task.due_date, task.status) === 'overdue' && ' (Overdue)'}
                            {getDeadlineStatus(task.due_date, task.status) === 'due_soon' && ' (Soon)'}
                          </span>
                          {task.links && task.links.length > 0 && (
                            <span className="card-links-count">
                              Links: {task.links.length}
                            </span>
                          )}
                          <div className="card-assignee">
                            <span className="card-assignee-avatar">
                              {task.assignee_name ? task.assignee_name.charAt(0) : 'U'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In Progress */}
                <div className="kanban-column">
                  <div className="column-header">
                    <span className="column-title">In Progress</span>
                    <span className="column-badge">
                      {filteredTasksList.filter(t => t.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="column-cards">
                    {filteredTasksList.filter(t => t.status === 'in_progress').map(task => (
                      <div key={task.id} className="kanban-card" onClick={() => handleCardClick(task)}>
                        <div className="card-brand-row">
                          <span 
                            className="card-brand-tag" 
                            style={{ backgroundColor: `${task.brand_color || '#334155'}22`, color: task.brand_color || '#94a3b8' }}
                          >
                            {task.brand_name || 'No Brand'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span 
                              className="card-priority-tag"
                              style={{ 
                                backgroundColor: `${PRIORITIES[task.priority]?.color}15`, 
                                color: PRIORITIES[task.priority]?.color 
                              }}
                            >
                              {PRIORITIES[task.priority]?.label || task.priority}
                            </span>
                            <span className="card-cat-tag">
                              {CATEGORIES[task.category]?.label || task.category}
                            </span>
                          </div>
                        </div>
                        <div className="card-title">{task.title}</div>
                        {(() => {
                          const progress = getChecklistProgress(task.description);
                          if (!progress) return null;
                          return (
                            <div style={{ marginTop: '6px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                <span>Progress</span>
                                <span>{progress.checkedCount}/{progress.totalCount} ({progress.percentage}%)</span>
                              </div>
                              <div style={{ height: '4px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress.percentage}%`, backgroundColor: 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.2s ease' }} />
                              </div>
                            </div>
                          );
                        })()}
                        <div className="card-meta-row">
                          <span className={`card-due ${getDeadlineStatus(task.due_date, task.status) || ''}`}>
                            Due: {task.due_date ? task.due_date : 'No deadline'}
                            {getDeadlineStatus(task.due_date, task.status) === 'overdue' && ' (Overdue)'}
                            {getDeadlineStatus(task.due_date, task.status) === 'due_soon' && ' (Soon)'}
                          </span>
                          {task.links && task.links.length > 0 && (
                            <span className="card-links-count">
                              Links: {task.links.length}
                            </span>
                          )}
                          <div className="card-assignee">
                            <span className="card-assignee-avatar">
                              {task.assignee_name ? task.assignee_name.charAt(0) : 'U'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In Review */}
                <div className="kanban-column">
                  <div className="column-header">
                    <span className="column-title">In Review</span>
                    <span className="column-badge">
                      {filteredTasksList.filter(t => t.status === 'in_review').length}
                    </span>
                  </div>
                  <div className="column-cards">
                    {filteredTasksList.filter(t => t.status === 'in_review').map(task => (
                      <div key={task.id} className="kanban-card" onClick={() => handleCardClick(task)}>
                        <div className="card-brand-row">
                          <span 
                            className="card-brand-tag" 
                            style={{ backgroundColor: `${task.brand_color || '#334155'}22`, color: task.brand_color || '#94a3b8' }}
                          >
                            {task.brand_name || 'No Brand'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span 
                              className="card-priority-tag"
                              style={{ 
                                backgroundColor: `${PRIORITIES[task.priority]?.color}15`, 
                                color: PRIORITIES[task.priority]?.color 
                              }}
                            >
                              {PRIORITIES[task.priority]?.label || task.priority}
                            </span>
                            <span className="card-cat-tag">
                              {CATEGORIES[task.category]?.label || task.category}
                            </span>
                          </div>
                        </div>
                        <div className="card-title">{task.title}</div>
                        {(() => {
                          const progress = getChecklistProgress(task.description);
                          if (!progress) return null;
                          return (
                            <div style={{ marginTop: '6px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                <span>Progress</span>
                                <span>{progress.checkedCount}/{progress.totalCount} ({progress.percentage}%)</span>
                              </div>
                              <div style={{ height: '4px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress.percentage}%`, backgroundColor: 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.2s ease' }} />
                              </div>
                            </div>
                          );
                        })()}
                        <div className="card-meta-row">
                          <span className={`card-due ${getDeadlineStatus(task.due_date, task.status) || ''}`}>
                            Due: {task.due_date ? task.due_date : 'No deadline'}
                            {getDeadlineStatus(task.due_date, task.status) === 'overdue' && ' (Overdue)'}
                            {getDeadlineStatus(task.due_date, task.status) === 'due_soon' && ' (Soon)'}
                          </span>
                          {task.links && task.links.length > 0 && (
                            <span className="card-links-count">
                              Links: {task.links.length}
                            </span>
                          )}
                          <div className="card-assignee">
                            <span className="card-assignee-avatar">
                              {task.assignee_name ? task.assignee_name.charAt(0) : 'U'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Done */}
                <div className="kanban-column">
                  <div className="column-header">
                    <span className="column-title">Done</span>
                    <span className="column-badge">
                      {filteredTasksList.filter(t => t.status === 'done').length}
                    </span>
                  </div>
                  <div className="column-cards">
                    {filteredTasksList.filter(t => t.status === 'done').map(task => (
                      <div key={task.id} className="kanban-card" onClick={() => handleCardClick(task)}>
                        <div className="card-brand-row">
                          <span 
                            className="card-brand-tag" 
                            style={{ backgroundColor: `${task.brand_color || '#334155'}22`, color: task.brand_color || '#94a3b8' }}
                          >
                            {task.brand_name || 'No Brand'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span 
                              className="card-priority-tag"
                              style={{ 
                                backgroundColor: `${PRIORITIES[task.priority]?.color}15`, 
                                color: PRIORITIES[task.priority]?.color 
                              }}
                            >
                              {PRIORITIES[task.priority]?.label || task.priority}
                            </span>
                            <span className="card-cat-tag">
                              {CATEGORIES[task.category]?.label || task.category}
                            </span>
                          </div>
                        </div>
                        <div className="card-title">{task.title}</div>
                        {(() => {
                          const progress = getChecklistProgress(task.description);
                          if (!progress) return null;
                          return (
                            <div style={{ marginTop: '6px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                <span>Progress</span>
                                <span>{progress.checkedCount}/{progress.totalCount} ({progress.percentage}%)</span>
                              </div>
                              <div style={{ height: '4px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress.percentage}%`, backgroundColor: 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.2s ease' }} />
                              </div>
                            </div>
                          );
                        })()}
                        <div className="card-meta-row">
                          <span className={`card-due ${getDeadlineStatus(task.due_date, task.status) || ''}`}>
                            Due: {task.due_date ? task.due_date : 'No deadline'}
                            {getDeadlineStatus(task.due_date, task.status) === 'overdue' && ' (Overdue)'}
                            {getDeadlineStatus(task.due_date, task.status) === 'due_soon' && ' (Soon)'}
                          </span>
                          {task.links && task.links.length > 0 && (
                            <span className="card-links-count">
                              Links: {task.links.length}
                            </span>
                          )}
                          <div className="card-assignee">
                            <span className="card-assignee-avatar">
                              {task.assignee_name ? task.assignee_name.charAt(0) : 'U'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENT REPOSITORY */}
        {activeTab === 'documents' && (
          <>
            <div className="page-header">
              <div className="page-title">
                <h1>Document Repository</h1>
                <p>Quick access to all essential document links (Google Sheet, Doc, Slide, Drive) by brand</p>
              </div>
            </div>

            {/* Search Bar for Documents */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              gap: '10px',
              maxWidth: '450px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text"
                placeholder="Search documents by name, type, or task..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'none',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
              {docSearchQuery && (
                <button
                  onClick={() => setDocSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '0 4px',
                    fontWeight: 600
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading documents...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {brands.map(brand => {
                  const brandLinks = links.filter(l => {
                    const matchesBrand = l.brand_name === brand.name;
                    if (!matchesBrand) return false;
                    if (!docSearchQuery) return true;
                    const query = docSearchQuery.toLowerCase();
                    return (
                      (l.title && l.title.toLowerCase().includes(query)) ||
                      (l.type && l.type.toLowerCase().includes(query)) ||
                      (l.task_title && l.task_title.toLowerCase().includes(query))
                    );
                  });
                  const isCollapsed = collapsedBrands[brand.id];
                  const brandBg = `${brand.color}15`;
                  const brandText = brand.color;

                  return (
                    <div key={brand.id} style={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      overflow: 'hidden'
                    }}>
                      {/* Brand Header Bar */}
                      <div 
                        onClick={() => toggleBrand(brand.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 20px',
                          backgroundColor: 'var(--bg-surface-hover)',
                          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            backgroundColor: brandBg,
                            color: brandText,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            letterSpacing: '0.5px'
                          }}>
                            {brand.name.toUpperCase()} ({brandLinks.length})
                          </span>
                          <span style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {isCollapsed ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            )}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {brandLinks.length} Links Saved
                        </span>
                      </div>

                      {/* Brand Links Table Content */}
                      {!isCollapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {/* Table Header Row */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(0,0,0,0.01)',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            <div style={{ flex: '1 1 120px', flexShrink: 0 }}>Type</div>
                            <div style={{ flex: '2 1 200px', paddingRight: '12px' }}>Document Name</div>
                            <div style={{ flex: '2 1 200px', paddingRight: '12px' }}>Related Task</div>
                            <div style={{ flex: '1 1 120px', flexShrink: 0 }}>Date Added</div>
                            <div style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>Link</div>
                          </div>

                          {/* Table Body Rows */}
                          {brandLinks.length === 0 ? (
                            <div style={{
                              padding: '24px',
                              textAlign: 'center',
                              fontSize: '0.85rem',
                              color: 'var(--text-muted)',
                              backgroundColor: 'var(--bg-surface)'
                            }}>
                              No document links attached to tasks for this brand yet.
                            </div>
                          ) : (
                            brandLinks.map(link => {
                              // Define document type badges
                              const typeColor = link.type === 'spreadsheet' ? 'var(--color-success)' :
                                                link.type === 'document' ? 'var(--color-info)' :
                                                link.type === 'slide' ? 'var(--color-warning)' :
                                                link.type === 'figma' ? 'var(--color-purple)' : 'var(--text-secondary)';

                              const typeBg = link.type === 'spreadsheet' ? 'rgba(16, 185, 129, 0.12)' :
                                             link.type === 'document' ? 'rgba(59, 130, 246, 0.12)' :
                                             link.type === 'slide' ? 'rgba(245, 158, 11, 0.12)' :
                                             link.type === 'figma' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(148, 163, 184, 0.12)';

                              const typeLabel = link.type.charAt(0).toUpperCase() + link.type.slice(1);

                              return (
                                <div 
                                  key={link.id} 
                                  className="project-table-row"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 20px',
                                    borderBottom: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-surface)',
                                    fontSize: '0.85rem',
                                    transition: 'background-color var(--transition-fast)'
                                  }}
                                >
                                  {/* Document Type badge */}
                                  <div style={{ flex: '1 1 120px', flexShrink: 0 }}>
                                    <span style={{
                                      backgroundColor: typeBg,
                                      color: typeColor,
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      display: 'inline-block'
                                    }}>
                                      {typeLabel}
                                    </span>
                                  </div>

                                  {/* Document Name */}
                                  <div style={{ 
                                    flex: '2 1 200px', 
                                    paddingRight: '12px', 
                                    fontWeight: 600, 
                                    color: 'var(--text-primary)' 
                                  }}>
                                    {link.title}
                                  </div>

                                  {/* Related Task */}
                                  <div style={{ 
                                    flex: '2 1 200px', 
                                    paddingRight: '12px', 
                                    color: 'var(--text-secondary)' 
                                  }}>
                                    {link.task_title || 'General'}
                                  </div>

                                  {/* Date Added */}
                                  <div style={{ flex: '1 1 120px', flexShrink: 0, color: 'var(--text-muted)' }}>
                                    {link.created_at ? new Date(link.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                  </div>

                                  {/* Open Link Button */}
                                  <div style={{ width: '120px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                    <a 
                                      href={link.url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="btn btn-secondary"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: '6px'
                                      }}
                                    >
                                      <span>Open</span>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                      </svg>
                                    </a>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 4: BOSS OVERVIEW REPORT */}
        {activeTab === 'boss' && (
          <>
            <div className="page-header">
              <div className="page-title">
                <h1>Boss Progress Report</h1>
                <p>Real-time task development status for high-level management report</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  Print / Export Report
                </button>
              </div>
            </div>

            {loading || !bossReport ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Analyzing task progress...</div>
            ) : (
              <>
                {/* 1. High-level metric summary circles */}
                <div className="boss-progress-summary">
                  <div className="progress-stat-card">
                    <span className="label">Total Tasks Inflow</span>
                    <div className="number" style={{ color: 'var(--text-primary)' }}>
                      {bossReport.overall.total}
                    </div>
                  </div>
                  
                  <div className="progress-stat-card">
                    <span className="label">Completed Tasks</span>
                    <div className="number" style={{ color: 'var(--color-success)' }}>
                      {bossReport.overall.completed}
                    </div>
                  </div>

                  <div className="progress-stat-card">
                    <span className="label">Work In Progress</span>
                    <div className="number" style={{ color: 'var(--color-warning)' }}>
                      {(bossReport.overall.in_progress || 0) + (bossReport.overall.in_review || 0)}
                    </div>
                  </div>

                  <div className="progress-stat-card">
                    <span className="label">Completion Rate</span>
                    <div className="number" style={{ color: 'var(--color-primary-hover)' }}>
                      {bossReport.overall.percentage}%
                    </div>
                  </div>
                </div>

                {/* 2. Side-by-side: Brand-wise Completion progress bars vs Bottlenecks */}
                <div className="boss-report-layout">
                  
                  {/* Brand Progress Bars panel */}
                  <div className="report-panel">
                    <h3>Task Progress by Brand</h3>
                    {bossReport.brandStats.map(brand => (
                      <div key={brand.id} className="boss-brand-bar-item">
                        <div className="boss-brand-bar-header">
                          <span className="boss-brand-name">{brand.name}</span>
                          <span className="boss-brand-count">
                            {brand.completed} of {brand.total} Tasks ({brand.percentage}%)
                          </span>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar" 
                            style={{ width: `${brand.percentage}%`, backgroundColor: brand.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Red Alert Bottlenecks panel */}
                  <div className="report-panel">
                    <h3 style={{ color: 'var(--color-danger)' }}>Primary Bottlenecks (High/Urgent)</h3>
                    {bossReport.bottlenecks.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Great! No high priority tasks are currently pending or blocked.
                      </p>
                    ) : (
                      <div className="boss-task-list">
                        {bossReport.bottlenecks.map(task => (
                          <div key={task.id} className="boss-task-item" style={{ borderLeft: `3px solid ${task.brand_color || '#ff0000'}` }}>
                            <div>
                              <div className="boss-task-title">{task.title}</div>
                              <div className="boss-task-meta">
                                Brand: <strong>{task.brand_name}</strong> | PIC: <strong>{task.assignee_name || 'Unassigned'}</strong>
                              </div>
                            </div>
                            <span 
                              className="brand-badge" 
                              style={{ 
                                backgroundColor: task.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                color: task.priority === 'urgent' ? 'var(--color-danger)' : 'var(--color-warning)'
                              }}
                            >
                              {task.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* 3. Recent Completions */}
                <div className="report-panel" style={{ marginTop: '30px' }}>
                  <h3 style={{ color: 'var(--color-success)' }}>Achievements / Recently Completed Tasks</h3>
                  {bossReport.recentCompletions.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No tasks have been completed recently.
                    </p>
                  ) : (
                    <div className="boss-task-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {bossReport.recentCompletions.map(task => (
                        <div key={task.id} className="boss-task-item" style={{ borderLeft: `3px solid var(--color-success)` }}>
                          <div>
                            <div className="boss-task-title" style={{ textDecoration: 'line-through', opacity: 0.75 }}>
                              {task.title}
                            </div>
                            <div className="boss-task-meta">
                              Brand: <strong>{task.brand_name}</strong> | PIC: <strong>{task.assignee_name}</strong>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Completed: {task.completed_at ? new Date(task.completed_at).toLocaleDateString('en-US') : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </main>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Modal: Tambah Brand */}
      {showCreateBrandModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <h2>Add New Brand</h2>
              </div>
              <button className="modal-close" onClick={() => setShowCreateBrandModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateBrand}>
              {brandError && <div className="login-alert" style={{ marginBottom: '15px' }}>{brandError}</div>}
              
              <div className="form-group">
                <label>Brand ID (Use lowercase & dashes, e.g., `skillacademy` or `ruangguru-private`)</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Unique brand ID"
                  value={newBrandId}
                  onChange={(e) => setNewBrandId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Brand Name (Formal display, e.g., `Skill Academy` or `Ruangguru Privat`)</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Brand name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Brand Accent Color (Hex Code)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="color" 
                      className="text-input" 
                      style={{ padding: '0', width: '48px', height: '38px', cursor: 'pointer' }}
                      value={newBrandColor}
                      onChange={(e) => setNewBrandColor(e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="text-input" 
                      style={{ flexGrow: 1 }}
                      placeholder="#0f9488"
                      value={newBrandColor}
                      onChange={(e) => setNewBrandColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Brand Description</label>
                <textarea 
                  className="text-input" 
                  style={{ height: '80px', resize: 'vertical' }}
                  placeholder="Write a brief description..."
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateBrandModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Tambah Tugas Baru */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <h2>Create New Task</h2>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateTask}>
              {taskFormError && <div className="login-alert" style={{ marginBottom: '15px' }}>{taskFormError}</div>}
              
              <div className="form-group">
                <label>Task Title / Job Description</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="E.g., Optimize H1-H3 Tags on Class Landing Page"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Brand</label>
                  <select 
                    className="select-input"
                    value={taskBrandId}
                    onChange={(e) => setTaskBrandId(e.target.value)}
                  >
                    <option value="">-- Select Brand --</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Job Category</label>
                  <select 
                    className="select-input"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                  >
                    {Object.entries(CATEGORIES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    className="select-input"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                  >
                    {Object.entries(PRIORITIES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Assignee</label>
                  <select 
                    className="select-input"
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    className="text-input"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Task Description</label>
                <textarea 
                  className="text-input" 
                  style={{ height: '100px', resize: 'vertical' }}
                  placeholder="Explain instruction details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Detail & Edit Tugas (Interactive Checklist & Link Attachments) */}
      {showTaskDetailModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <span 
                  className="brand-badge" 
                  style={{ 
                    backgroundColor: `${selectedTask.brand_color || '#334155'}22`, 
                    color: selectedTask.brand_color || '#94a3b8', 
                    marginBottom: '8px',
                    display: 'inline-block'
                  }}
                >
                  {selectedTask.brand_name || 'No Brand'}
                </span>
                <h2>{selectedTask.title}</h2>
              </div>
              <button className="modal-close" onClick={() => setShowTaskDetailModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveTaskDetail}>
              <div className="form-row">
                <div className="form-group">
                  <label>Task Status</label>
                  <select 
                    className="select-input"
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value)}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    className="text-input"
                    disabled={user.role === 'member'}
                    value={selectedTask.due_date || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, due_date: e.target.value })}
                  />
                </div>
              </div>

              {user.role === 'lead' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Job Category</label>
                      <select 
                        className="select-input"
                        value={selectedTask.category}
                        onChange={(e) => setSelectedTask({ ...selectedTask, category: e.target.value })}
                      >
                        {Object.entries(CATEGORIES).map(([key, value]) => (
                          <option key={key} value={key}>{value.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Priority</label>
                      <select 
                        className="select-input"
                        value={selectedTask.priority}
                        onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                      >
                        {Object.entries(PRIORITIES).map(([key, value]) => (
                          <option key={key} value={key}>{value.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Assignee</label>
                    <select 
                      className="select-input"
                      value={selectedTask.assignee_id || ''}
                      onChange={(e) => setSelectedTask({ ...selectedTask, assignee_id: e.target.value })}
                    >
                      <option value="">-- Unassigned --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Description & Checklist Parsing */}
              <div className="form-group">
                <label>Description & Task Notes</label>
                {user.role === 'lead' ? (
                  <textarea 
                    className="text-input" 
                    style={{ height: '120px', resize: 'vertical' }}
                    value={selectedTask.description || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                  />
                ) : (
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    whiteSpace: 'pre-line'
                  }}>
                    {selectedTask.description || 'No description available.'}
                  </div>
                )}
              </div>

              {/* Checklist Section */}
              {parseChecklistItems(selectedTask.description).length > 0 && (
                <div className="task-checklist-section">
                  <div className="checklist-title">Standard Operating Checklist:</div>
                  {parseChecklistItems(selectedTask.description).map((item, idx) => (
                    <label key={idx} className="checklist-item">
                      <input 
                        type="checkbox" 
                        checked={item.checked} 
                        onChange={() => toggleChecklistItem(item)}
                      />
                      <span style={{ textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Add checklist templates buttons (Lead only) */}
              {user.role === 'lead' && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', width: '100%' }}>
                    CHECKLIST TEMPLATE:
                  </span>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleAddSEOChecklist('technical')}>
                    Tech SEO Checklist
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleAddSEOChecklist('content')}>
                    Content SEO Checklist
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleAddSEOChecklist('launch')}>
                    Web Launch Checklist
                  </button>
                </div>
              )}

              {/* Link Attachments Section (Documents) */}
              <div className="modal-links-section">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Attached Documents</h3>
                
                <div className="modal-links-list">
                  {(!selectedTask.links || selectedTask.links.length === 0) ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      No documents (Spreadsheet, Drive, Slides) attached yet.
                    </p>
                  ) : (
                    selectedTask.links.map(link => (
                      <div key={link.id} className="modal-link-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{getDocTypeIcon(link.type)}</span>
                          <a href={link.url} target="_blank" rel="noreferrer" className="external-link-btn">
                            {link.title}
                          </a>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            ({link.type})
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className="delete-link-btn" 
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new link form (Any role can add links!) */}
                <div className="add-link-form">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Link / File Name</label>
                    <input 
                      type="text" 
                      className="text-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      placeholder="E.g., Keyword Research Brief"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Link URL</label>
                    <input 
                      type="url" 
                      className="text-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      placeholder="https://docs.google.com/..."
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Type</label>
                    <select 
                      className="select-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem', minWidth: '100px' }}
                      value={newLinkType}
                      onChange={(e) => setNewLinkType(e.target.value)}
                    >
                      <option value="spreadsheet">Spreadsheet</option>
                      <option value="drive">Google Drive</option>
                      <option value="slide">Slides</option>
                      <option value="document">Docs</option>
                      <option value="figma">Figma</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                    onClick={handleAddLink}
                  >
                    Attach
                  </button>
                </div>
              </div>

              {/* Footer Modal Actions */}
              <div className="modal-actions">
                {user.role === 'lead' && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ marginRight: 'auto' }}
                    onClick={() => handleDeleteTask(selectedTask.id)}
                  >
                    Delete Task
                  </button>
                )}
                
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskDetailModal(false)}>
                  Close
                </button>
                
                {user.role === 'lead' && (
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
