// Añadir la importación de las funciones de PouchDB
import { initializeDatabases, db } from './database.js'; 

// CONFIGURACIÓN DE LA APLICACIÓN
const appConfig = {
    // Eliminamos login_users. appData.users es ahora la fuente de verdad.
    app_config: { default_route: "dashboard" },
    routes: {
        // Añadimos el permiso de rol a cada ruta
        dashboard: { title: "Dashboard - ByteCraft", template_id: "template-dashboard", icon: "fas fa-home", label: "Dashboard", roles: ["admin"] },
        clientes: { title: "Clientes - ByteCraft", template_id: "template-clientes", icon: "fas fa-users", label: "Clientes", roles: ["admin"] },
        tareas: { title: "Tareas - ByteCraft", template_id: "template-tareas", icon: "fas fa-tasks", label: "Tareas", roles: ["admin"] },
        usuarios: { title: "Usuarios - ByteCraft", template_id: "template-usuarios", icon: "fas fa-user-shield", label: "Usuarios", roles: ["admin"] },
        'usuario-vista': { title: "Mis Tareas - ByteCraft", template_id: "template-usuario-vista", icon: "fas fa-clipboard-list", label: "Mis Tareas", roles: ["admin", "normal"] }
    }
};

// *** MODELO DE DATOS SIMULADO (ELIMINADO / COMENTADO) ***
// const appData = { ... datos simulados ... }; 

// --- ESTADO GLOBAL DE ROL ---
let currentUserRole = ''; 
let currentData = { // Almacenar los datos cargados temporalmente en memoria
    tasks: [],
    users: [],
    clients: []
};

// --- FUNCIONES DE PERSISTENCIA SIMULADA (localStorage) ELIMINADAS ---
// function saveAppData() { ... } 
// function loadAppData() { ... } 

// --- FUNCIONES DE DATOS ACTUALIZADAS PARA USAR POUCHDB ---

async function loadAllData() {
    try {
        // Carga los datos de las bases de datos en la memoria
        currentData.tasks = await db.getTasks();
        currentData.users = await db.getUsers();
        currentData.clients = await db.getClients();
        console.log("Datos cargados desde PouchDB:", currentData);
    } catch (error) {
        console.error("Error al cargar datos desde PouchDB:", error);
    }
}


// ELEMENTOS DOM
const body = document.body;
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('loginForm');
const loginErrorMsg = document.getElementById('login-error');
const contentArea = document.getElementById('content-area');
// const navContainer = document.getElementById('nav-container'); // ELIMINAR O COMENTAR

// NUEVOS ELEMENTOS PARA MENÚ MÓVIL/ESCRITORIO
const navContainerDesktop = document.getElementById('nav-container-desktop'); 
const navContainerMobile = document.getElementById('nav-container-mobile'); 
const mobileMenuButton = document.getElementById('mobileMenuButton'); 
const mobileMenuDrawer = document.getElementById('mobile-menu'); 

const installButton = document.getElementById('installButton');
const logoutButton = document.getElementById('logoutButton');

let deferredPrompt; 

// --- FUNCIONES DE ESTADO Y NAVEGACIÓN ---

function showDashboard(role) {
    body.classList.remove('login-body');
    body.classList.add('dashboard-body');
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    
    currentUserRole = role; 
    
    localStorage.setItem('currentUserRole', role);
    
    renderNavLinks(role);
    
    const defaultRoute = role === 'admin' ? 'dashboard' : 'usuario-vista';
    
    const hash = window.location.hash.substring(1);
    
    const page = appConfig.routes[hash] && appConfig.routes[hash].roles.includes(role) ? hash : defaultRoute;
    
    navigate(page);
}

function showLogin() {
    body.classList.remove('dashboard-body');
    body.classList.add('login-body');
    dashboardScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    localStorage.removeItem('currentUserRole');
    window.location.hash = '';
}

// --- MANEJO DE MENÚ MÓVIL ---
function toggleMobileMenu() {
    mobileMenuDrawer.classList.toggle('hidden');
    const menuIcon = document.getElementById('menu-icon');
    
    // Cambiar icono de Hamburguesa <-> Cerrar (mejor UX)
    const isMenuOpen = !mobileMenuDrawer.classList.contains('hidden');
    
    if (isMenuOpen) {
        menuIcon.classList.remove('fa-bars');
        menuIcon.classList.add('fa-times'); // Icono de Cerrar (X)
        mobileMenuButton.setAttribute('aria-expanded', 'true');
    } else {
        menuIcon.classList.remove('fa-times');
        menuIcon.classList.add('fa-bars'); // Icono de Hamburguesa
        mobileMenuButton.setAttribute('aria-expanded', 'false');
    }
}

function renderNavLinks(role) {
    navContainerDesktop.innerHTML = ''; // Limpiar desktop
    navContainerMobile.innerHTML = ''; // Limpiar mobile
    
    Object.entries(appConfig.routes).forEach(([key, route]) => {
        if (route.roles && route.roles.includes(role)) { 
            
            // 1. Crear el enlace de ESCRITORIO
            const linkDesktop = document.createElement('a');
            linkDesktop.href = '#';
            linkDesktop.id = `nav-${key}`;
            linkDesktop.dataset.page = key;
            // Clases de Tailwind para escritorio
            linkDesktop.className = 'nav-link text-gray-600 hover:bg-purple-100 hover:text-purple-800 px-3 py-2 rounded-md text-sm font-medium transition duration-150';
            linkDesktop.innerHTML = `<i class="${route.icon} mr-1"></i> ${route.label}`;
            navContainerDesktop.appendChild(linkDesktop);


            // 2. Crear el enlace MÓVIL (Versión de botón de menú desplegable)
            const linkMobile = document.createElement('a');
            linkMobile.href = '#';
            linkMobile.id = `nav-mobile-${key}`;
            linkMobile.dataset.page = key;
            // Clases de Tailwind para móvil (Full-width, mayor padding, se ve como un botón de lista)
            linkMobile.className = 'nav-link-mobile block text-base font-medium text-gray-600 hover:bg-purple-100 hover:text-purple-800 rounded-md p-3 transition duration-150';
            linkMobile.innerHTML = `<i class="${route.icon} mr-2"></i> ${route.label}`;
            navContainerMobile.appendChild(linkMobile);
        }
    });

    // Al regenerar los links, asegúrate de que el menú móvil esté cerrado inicialmente.
    if (mobileMenuDrawer && !mobileMenuDrawer.classList.contains('hidden')) {
        toggleMobileMenu();
    }
}

async function navigate(pageKey, event) { // ¡AHORA ES ASÍNCRONO!
    if (event) event.preventDefault();

    const route = appConfig.routes[pageKey];
    if (!route || !route.roles.includes(currentUserRole)) {
        console.error(`Acceso denegado a la página: ${pageKey} para el rol: ${currentUserRole}`);
        return; 
    }

    document.title = route.title;

    const template = document.getElementById(route.template_id);
    if (template) {
        const clone = document.importNode(template.content, true);
        contentArea.innerHTML = '';
        contentArea.appendChild(clone);
    }
    
    // ** LÓGICA ESPECÍFICA POR PÁGINA (¡DEBE RECARGAR DATOS!) **
    await loadAllData(); // <--- RECARGAR DATOS DESDE LA BD

    if (pageKey === 'tareas') {
        renderTasksList();
        document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
        document.getElementById('task-list').addEventListener('click', handleTaskActions);
        document.getElementById('newTaskButton').addEventListener('click', () => {
             document.getElementById('taskId').value = '';
             document.getElementById('taskTitle').value = '';
             document.getElementById('taskStatus').value = 'Pendiente';
             document.getElementById('taskPriority').value = 'Media';
             document.getElementById('taskFormTitle').textContent = 'Crear Nueva Tarea';
        });
    } else if (pageKey === 'clientes') {
        renderClientsList();
        document.getElementById('clientForm').addEventListener('submit', handleClientFormSubmit);
        document.getElementById('client-list').addEventListener('click', handleClientActions);
        document.getElementById('newClientButton').addEventListener('click', () => {
             document.getElementById('clientId').value = '';
             document.getElementById('clientName').value = '';
             document.getElementById('clientContact').value = '';
             document.getElementById('clientPhone').value = '';
             document.getElementById('clientStatus').value = 'Activo';
             document.getElementById('clientFormTitle').textContent = 'Registrar Nuevo Cliente';
        });
    } else if (pageKey === 'usuarios') {
        renderUsersList();
        document.getElementById('userForm').addEventListener('submit', handleUserFormSubmit);
        document.getElementById('user-list').addEventListener('click', handleUserActions);
        document.getElementById('newUserButton').addEventListener('click', () => {
             document.getElementById('userId').value = '';
             document.getElementById('userUsername').value = '';
             document.getElementById('userRole').value = 'Desarrollador';
             document.getElementById('userPassword').value = ''; 
             document.getElementById('userPassword').placeholder = 'Obligatoria al crear';
             document.getElementById('userFormTitle').textContent = 'Registrar Nuevo Usuario';
        });
    } else if (pageKey === 'usuario-vista') {
        renderUserViewTasks();
        const userTaskList = document.getElementById('user-task-list');
        if (userTaskList) {
            userTaskList.addEventListener('click', handleUserViewActions);
        }
    } else if (pageKey === 'dashboard') {
        renderDashboardStats();
    }


    // --- LÓGICA DE CLASES ACTIVAS ---
    // Limpiar clases activas en todos los enlaces
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'bg-purple-600', 'text-white');
        link.classList.add('text-gray-600', 'hover:bg-purple-100', 'hover:text-purple-800');
    });
    
    document.querySelectorAll('.nav-link-mobile').forEach(link => {
        link.classList.remove('active', 'bg-purple-600', 'text-white');
        link.classList.add('text-gray-600', 'hover:bg-purple-100', 'hover:text-purple-800');
    });
    
    // Activar enlace de escritorio
    const activeLinkDesktop = document.getElementById(`nav-${pageKey}`);
    if (activeLinkDesktop) {
        activeLinkDesktop.classList.remove('text-gray-600', 'hover:bg-purple-100', 'hover:text-purple-800');
        activeLinkDesktop.classList.add('active', 'bg-purple-600', 'text-white');
    }
    
    // Activar enlace de móvil
    const activeLinkMobile = document.getElementById(`nav-mobile-${pageKey}`);
    if (activeLinkMobile) {
        activeLinkMobile.classList.remove('text-gray-600', 'hover:bg-purple-100', 'hover:text-purple-800');
        activeLinkMobile.classList.add('active', 'bg-purple-600', 'text-white');
    }

    history.pushState(null, '', '#' + pageKey);

    if (event && event.target.blur) event.target.blur();
    
    // CERRAR MENÚ MÓVIL SI ESTÁ ABIERTO DESPUÉS DE LA NAVEGACIÓN
    if (mobileMenuDrawer && !mobileMenuDrawer.classList.contains('hidden')) {
        toggleMobileMenu();
    }
}

// --- FUNCIONES DE TAREAS (CRUD) ---
function renderTasksList() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    taskList.innerHTML = ''; 

    currentData.tasks.forEach(task => { // <--- Usa currentData
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';

        const statusClass = {
            'Pendiente': 'bg-red-100 text-red-800',
            'En Progreso': 'bg-yellow-100 text-yellow-800',
            'Completada': 'bg-green-100 text-green-800'
        }[task.status] || 'bg-gray-100 text-gray-800';

        row.innerHTML = `
            <td class="px-6 py-4">${task.title}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${task.status}</span></td>
            <td class="px-6 py-4">${task.priority}</td>
            <td class="px-6 py-4 text-right">
                <button data-id="${task._id}" data-rev="${task._rev}" data-action="edit" class="text-blue-600 hover:text-blue-900 mr-3"><i class="fas fa-edit"></i> Editar</button>
                <button data-id="${task._id}" data-rev="${task._rev}" data-action="delete" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i> Eliminar</button>
            </td>
        `;
        taskList.appendChild(row);
    });
}

async function handleTaskFormSubmit(e) { // ¡AHORA ES ASÍNCRONO!
    e.preventDefault();
    
    const id = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    const status = document.getElementById('taskStatus').value;
    const priority = document.getElementById('taskPriority').value;
    
    if (!title) return;

    let taskToSave = { title, status, priority };

    if (id) {
        // En PouchDB, necesitamos el documento original para obtener su _rev
        const existingTask = currentData.tasks.find(t => t._id === id); 
        if (existingTask) {
            // Clonamos y actualizamos los campos (el _rev se añade en database.js/saveDoc)
            taskToSave = { ...existingTask, title, status, priority };
        } else {
             console.error("Tarea no encontrada para editar:", id);
             return;
        }
    }
    
    await db.saveTask(taskToSave); // <--- Guardar en PouchDB
    await loadAllData(); // <--- Recargar datos
    
    // Limpiar formulario y renderizar
    document.getElementById('taskId').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskStatus').value = 'Pendiente';
    document.getElementById('taskPriority').value = 'Media';
    document.getElementById('taskFormTitle').textContent = 'Crear Nueva Tarea';
    
    renderTasksList();
    renderDashboardStats();
}

async function handleTaskActions(e) { // ¡AHORA ES ASÍNCRONO!
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.dataset.id; // ID es String en PouchDB
    const rev = button.dataset.rev; // Necesitamos el _rev
    const action = button.dataset.action;
    
    if (action === 'delete') {
        if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            const taskToDelete = { _id: id, _rev: rev };
            await db.removeTask(taskToDelete); // <--- Eliminar en PouchDB
            await loadAllData(); // <--- Recargar datos
            renderTasksList();
            renderDashboardStats();
        }
    } else if (action === 'edit') {
        const task = currentData.tasks.find(t => t._id === id); // <--- Usar currentData
        if (task) {
            document.getElementById('taskId').value = task._id; // Usar _id
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskFormTitle').textContent = 'Editar Tarea';
            document.getElementById('taskFormTitle').scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// --- FUNCIONES DE CLIENTES (CRUD) --- 
function renderClientsList() {
    const clientList = document.getElementById('client-list');
    if (!clientList) return;

    clientList.innerHTML = ''; 

    currentData.clients.forEach(client => { // <--- Usa currentData
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';

        const statusClass = client.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900">${client.name}</td>
            <td class="px-6 py-4">${client.contact}</td>
            <td class="px-6 py-4">${client.phone}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${client.status}</span></td>
            <td class="px-6 py-4 text-right">
                <button data-id="${client._id}" data-rev="${client._rev}" data-action="edit" class="text-blue-600 hover:text-blue-900 mr-3"><i class="fas fa-edit"></i> Editar</button>
                <button data-id="${client._id}" data-rev="${client._rev}" data-action="delete" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i> Eliminar</button>
            </td>
        `;
        clientList.appendChild(row);
    });
}

async function handleClientFormSubmit(e) { // ¡AHORA ES ASÍNCRONO!
    e.preventDefault();
    
    const id = document.getElementById('clientId').value;
    const name = document.getElementById('clientName').value.trim();
    const contact = document.getElementById('clientContact').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const status = document.getElementById('clientStatus').value;
    
    if (!name || !contact) return;

    let clientToSave = { name, contact, phone, status };

    if (id) {
        const existingClient = currentData.clients.find(c => c._id === id);
        if (existingClient) {
            clientToSave = { ...existingClient, name, contact, phone, status };
        } else {
             console.error("Cliente no encontrado para editar:", id);
             return;
        }
    }
    
    await db.saveClient(clientToSave); // <--- Guardar en PouchDB
    await loadAllData(); // <--- Recargar datos
    
    // Limpiar formulario y renderizar
    document.getElementById('clientId').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('clientContact').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientStatus').value = 'Activo';
    document.getElementById('clientFormTitle').textContent = 'Registrar Nuevo Cliente';
    
    renderClientsList();
    renderDashboardStats();
}

async function handleClientActions(e) { // ¡AHORA ES ASÍNCRONO!
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.dataset.id; // ID es String
    const rev = button.dataset.rev; // Necesitamos _rev
    const action = button.dataset.action;
    
    if (action === 'delete') {
        if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
            const clientToDelete = { _id: id, _rev: rev };
            await db.removeClient(clientToDelete); // <--- Eliminar en PouchDB
            await loadAllData(); // <--- Recargar datos
            renderClientsList();
            renderDashboardStats();
        }
    } else if (action === 'edit') {
        const client = currentData.clients.find(c => c._id === id); // <--- Usar currentData
        if (client) {
            document.getElementById('clientId').value = client._id; // Usar _id
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientContact').value = client.contact;
            document.getElementById('clientPhone').value = client.phone;
            document.getElementById('clientStatus').value = client.status;
            document.getElementById('clientFormTitle').textContent = 'Editar Cliente';
            document.getElementById('clientFormTitle').scrollIntoView({ behavior: 'smooth' });
        }
    }
}


// --- FUNCIONES DE USUARIOS (CRUD) --- 

function renderUsersList() {
    const userList = document.getElementById('user-list');
    if (!userList) return;

    userList.innerHTML = ''; 

    currentData.users.forEach(user => { // <--- Usa currentData
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';

        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900">${user.username}</td>
            <td class="px-6 py-4">${user.role}</td>
            <td class="px-6 py-4 text-right">
                <button data-id="${user._id}" data-rev="${user._rev}" data-action="edit-user" class="text-blue-600 hover:text-blue-900 mr-3"><i class="fas fa-user-edit"></i> Editar</button>
                <button data-id="${user._id}" data-rev="${user._rev}" data-action="delete-user" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i> Eliminar</button>
            </td>
        `;
        userList.appendChild(row);
    });
}

async function handleUserFormSubmit(e) { // ¡AHORA ES ASÍNCRONO!
    e.preventDefault();
    
    const id = document.getElementById('userId').value;
    const username = document.getElementById('userUsername').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value.trim();
    
    if (!username) {
        alert("El nombre de usuario es obligatorio.");
        return;
    }
    
    // Validación de usuario duplicado
    const exists = currentData.users.some(u => u.username === username && u._id !== id);
    if (exists) {
        alert("Ese nombre de usuario ya existe. Por favor, elige otro.");
        return;
    }

    let userToSave = { username, role };

    if (id) {
        const existingUser = currentData.users.find(u => u._id === id);
        if (existingUser) {
            userToSave = { ...existingUser, username, role };
            // Si se proporciona una nueva contraseña, úsala. Si no, mantén la existente.
            if (password) {
                 userToSave.password = password;
            } else {
                 userToSave.password = existingUser.password;
            }
        } else {
             console.error("Usuario no encontrado para editar:", id);
             return;
        }
    } else {
        if (!password) {
            alert("La contraseña es obligatoria para un nuevo usuario.");
            return;
        }
        userToSave.password = password;
    }
    
    await db.saveUser(userToSave); // <--- Guardar en PouchDB
    await loadAllData(); // <--- Recargar datos
    
    // Limpiar formulario y renderizar
    document.getElementById('userId').value = '';
    document.getElementById('userUsername').value = '';
    document.getElementById('userRole').value = 'Desarrollador';
    document.getElementById('userPassword').value = ''; 
    document.getElementById('userPassword').placeholder = 'Obligatoria al crear';
    document.getElementById('userFormTitle').textContent = 'Registrar Nuevo Usuario';
    
    renderUsersList();
}

async function handleUserActions(e) { // ¡AHORA ES ASÍNCRONO!
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.dataset.id; // ID es String
    const rev = button.dataset.rev; // Necesitamos _rev
    const action = button.dataset.action;
    
    if (action === 'delete-user') {
        const user = currentData.users.find(u => u._id === id);
        if (user && user.username === 'admin') {
            alert('No puedes eliminar el usuario principal (admin) del sistema.');
            return;
        }

        if (confirm('¿Estás seguro de que quieres eliminar este usuario? Esto también eliminará su capacidad de iniciar sesión.')) {
            const userToDelete = { _id: id, _rev: rev };
            await db.removeUser(userToDelete); // <--- Eliminar en PouchDB
            await loadAllData(); // <--- Recargar datos
            renderUsersList();
        }
    } else if (action === 'edit-user') {
        const user = currentData.users.find(u => u._id === id);
        if (user) {
            document.getElementById('userId').value = user._id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userRole').value = user.role;
            document.getElementById('userPassword').value = ''; // Siempre limpiar la caja de contraseña por seguridad
            document.getElementById('userPassword').placeholder = 'Dejar en blanco para no cambiar'; // Pista
            document.getElementById('userFormTitle').textContent = 'Editar Usuario';
            document.getElementById('userFormTitle').scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// --- FUNCIONES DE VISTA DE USUARIO SIMPLE (Mis Tareas) ---
function renderUserViewTasks() {
    const taskList = document.getElementById('user-task-list');
    if (!taskList) return;

    taskList.innerHTML = ''; 

    currentData.tasks.forEach(task => { // <--- Usa currentData
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';

        const statusClass = {
            'Pendiente': 'bg-red-100 text-red-800',
            'En Progreso': 'bg-yellow-100 text-yellow-800',
            'Completada': 'bg-green-100 text-green-800'
        }[task.status] || 'bg-gray-100 text-gray-800';
        
        const showDeliverButton = task.status !== 'Completada';
        
        const actionButton = showDeliverButton
            ? `<button data-id="${task._id}" data-rev="${task._rev}" data-action="deliver" class="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-150"><i class="fas fa-check-double mr-1"></i> Entregar Tarea</button>`
            : `<span class="text-sm text-gray-500"><i class="fas fa-check-circle"></i> Entregada</span>`;

        row.innerHTML = `
            <td class="px-6 py-4">${task.title}</td>
            <td class="px-6 py-4">${task.priority}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${task.status}</span></td>
            <td class="px-6 py-4 text-right">
                ${actionButton}
            </td>
        `;
        taskList.appendChild(row);
    });
}

async function handleUserViewActions(e) { // ¡AHORA ES ASÍNCRONO!
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.dataset.id;
    const rev = button.dataset.rev;
    const action = button.dataset.action;
    
    if (action === 'deliver') {
        const taskToUpdate = currentData.tasks.find(t => t._id === id);

        if (taskToUpdate) {
            taskToUpdate.status = 'Completada'; 
            
            await db.saveTask(taskToUpdate); // <--- Guardar en PouchDB
            await loadAllData(); // <--- Recargar datos
            
            renderUserViewTasks(); 
            renderDashboardStats();
        }
    }
}


// --- FUNCIONES DE DASHBOARD --- 

function renderDashboardStats() {
    // <--- Usa currentData
    const activeProjects = currentData.tasks.filter(t => t.status !== 'Completada').length;
    const pendingTasks = currentData.tasks.filter(t => t.status === 'Pendiente').length;
    const totalClients = currentData.clients.length; 
    
    const statsProyectos = document.getElementById('stats-proyectos');
    const statsClientes = document.getElementById('stats-clientes');
    const statsTareas = document.getElementById('stats-tareas');

    if (statsProyectos) statsProyectos.textContent = activeProjects;
    if (statsClientes) statsClientes.textContent = totalClients; 
    if (statsTareas) statsTareas.textContent = pendingTasks;
}

// --- MANEJADORES DE EVENTOS Y PWA --- 
function handleNavigationClick(e) {
    // Escucha clics en enlaces con data-page.
    const pageKey = e.target.closest('[data-page]')?.dataset.page;
    if (pageKey) navigate(pageKey, e);
}

// *** LÓGICA DE LOGIN ACTUALIZADA PARA USAR POUCHDB ***
loginForm.addEventListener("submit", async function (event) { // ¡AHORA ES ASÍNCRONO!
    event.preventDefault();

    const username = document.getElementById("username").value.trim(); 
    const password = document.getElementById("password").value;

    loginErrorMsg.classList.add("hidden");

    // Llama a la función de la base de datos para buscar el usuario
    const loggedInUser = await db.getUserByCredentials(username, password);

    if (loggedInUser) {
        // Mapear el rol del usuario a un rol de navegación simple (admin o normal)
        let navigationRole = 'normal';
        if (loggedInUser.role === 'Administrador') {
            navigationRole = 'admin';
        }
        
        localStorage.setItem('isAuthenticated', 'true');
        showDashboard(navigationRole); 
    } else {
        loginErrorMsg.textContent = "Usuario o contraseña incorrectos.";
        loginErrorMsg.classList.remove("hidden");
    }
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUserRole'); 
    showLogin();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registrado.', reg))
            .catch(err => console.error('Error al registrar Service Worker:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.classList.remove('hidden');
});

installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Resultado de la instalación: ${outcome}`);
        if (outcome === 'accepted') {
            installButton.classList.add('hidden');
        }
        deferredPrompt = null;
    }
});

// --- GESTIÓN DE CONEXIÓN A INTERNET (OFFLINE/ONLINE) ---

function initConnectionHandler() {
    const offlineScreen = document.getElementById('offline-screen');
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');

    function handleConnectionChange() {
        const isOnline = navigator.onLine;

        if (!isOnline) {
            // 1. MODO OFFLINE:
            if (offlineScreen) offlineScreen.classList.remove('hidden');
            console.log("Conexión perdida. Modo Offline activado.");

        } else {
            // 2. MODO ONLINE (Reconexión):
            console.log("Conexión restaurada.");

            if (offlineScreen) offlineScreen.classList.add('hidden');

            // --- LÓGICA DE RESTAURACIÓN DE ESTADO ---
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'; 
            const storedRole = localStorage.getItem('currentUserRole');

            if (isAuthenticated && storedRole) {
                // Restaurar el dashboard en la ruta donde estaba
                showDashboard(storedRole);
            } else {
                // Si no hay sesión válida, mandar al login
                showLogin();
            }
        }
    }

    // Escuchamos los eventos del navegador
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    // Verificación inicial al cargar la app
    if (!navigator.onLine) {
        handleConnectionChange();
    }
}


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => { // ¡AHORA ES ASÍNCRONO!
    
    await initializeDatabases(); // <--- Inicializar/Sembrar la BD (si está vacía)
    await loadAllData(); // <--- Cargar los datos iniciales
    
    // ** ACTUALIZAR EVENT LISTENERS DE NAVEGACIÓN **
    navContainerDesktop.addEventListener('click', handleNavigationClick); // Listener para Escritorio
    navContainerMobile.addEventListener('click', handleNavigationClick); // Listener para Móvil
    mobileMenuButton.addEventListener('click', toggleMobileMenu); // Listener para el Botón Desplegable
    
    initConnectionHandler(); // <--- Inicializar el handler de conexión

    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const storedRole = localStorage.getItem('currentUserRole');

    if (isAuthenticated && storedRole) {
        showDashboard(storedRole); 
    } else {
        showLogin();
    }

    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1);
        if (appConfig.routes[hash] && dashboardScreen.classList.contains('hidden') === false) {
            navigate(hash);
        }
    });
});