/**
 * database.js
 * Lógica de inicialización y CRUD para PouchDB (IndexedDB wrapper).
 * Usamos una base de datos por "tipo" de entidad.
 */

// Inicialización de las bases de datos
const dbUsers = new PouchDB('bytecraft_users');
const dbClients = new PouchDB('bytecraft_clients');
const dbTasks = new PouchDB('bytecraft_tasks');

// --- Carga de Datos Iniciales (Seed) ---

// Los datos iniciales son los mismos que tenías en appData, pero formateados para PouchDB.
// PouchDB utiliza `_id` como clave principal, por lo que usaremos el formato 'type_id'
// para evitar colisiones si se fusionaran las bases en el futuro.

const initialTasks = [
    { _id: 'task_1', title: 'Diseñar interfaz de Login', status: 'Pendiente', priority: 'Alta' },
    { _id: 'task_2', title: 'Implementar lógica de navegación', status: 'En Progreso', priority: 'Media' },
    { _id: 'task_3', title: 'Configurar PWA', status: 'En Progreso', priority: 'Baja' },
    { _id: 'task_4', title: 'Revisar estilos de tabla', status: 'Completada', priority: 'Media' }
];

const initialUsers = [
    // El rol en el objeto debe coincidir con el valor del <select>
    { _id: 'user_1', username: 'admin', password: 'admin', role: 'Administrador' }, 
    { _id: 'user_2', username: 'usuario', password: '1234', role: 'Invitado' }, 
    { _id: 'user_3', username: 'juan.perez', password: 'devpass', role: 'Desarrollador' }, 
    { _id: 'user_4', username: 'maria.gomez', password: 'designpass', role: 'Diseñadora' }
];

const initialClients = [ 
    { _id: 'client_1', name: 'Innovacion Digital S.A.', contact: 'Laura Gómez', phone: '555-1234', status: 'Activo' },
    { _id: 'client_2', name: 'Global Tech Corp', contact: 'Roberto Martínez', phone: '555-5678', status: 'Inactivo' }
];


/**
 * @param {PouchDB.Database} db 
 * @param {Array<Object>} initialData 
 */
async function seedDatabase(db, initialData) {
    try {
        const info = await db.info();
        if (info.doc_count === 0) {
            console.log(`Sembrando datos iniciales en la base de datos ${db.name}...`);
            await db.bulkDocs(initialData);
            console.log(`Datos iniciales insertados en ${db.name}.`);
        }
    } catch (error) {
        console.error(`Error al sembrar datos en ${db.name}:`, error);
    }
}

// Llama a la siembra al inicio
export async function initializeDatabases() {
    await seedDatabase(dbTasks, initialTasks);
    await seedDatabase(dbUsers, initialUsers);
    await seedDatabase(dbClients, initialClients);
}


// --- FUNCIONES CRUD GENÉRICAS ---

/**
 * Obtiene todos los documentos de una base de datos.
 * @param {PouchDB.Database} db
 * @returns {Promise<Array<Object>>} Lista de documentos.
 */
async function getAllDocs(db) {
    try {
        // Obtenemos todos los documentos
        const result = await db.allDocs({ include_docs: true });
        // Mapeamos para obtener solo el objeto del documento
        return result.rows.map(row => row.doc);
    } catch (error) {
        console.error("Error al obtener documentos:", error);
        return [];
    }
}

/**
 * Guarda (inserta o actualiza) un documento.
 * @param {PouchDB.Database} db
 * @param {Object} doc - El documento a guardar. Si tiene _id y _rev, es una actualización.
 * @returns {Promise<Object>} Resultado de la operación.
 */
export async function saveDoc(db, doc) {
    if (doc._id) {
        // Es una actualización. Necesitamos obtener la revisión (_rev) actual.
        try {
            const existingDoc = await db.get(doc._id);
            doc._rev = existingDoc._rev; // Añadimos la revisión para la actualización
        } catch (error) {
            // Si el documento no existe (error 404), procedemos con una inserción
            delete doc._id; // PouchDB asignará un nuevo _id al insertar
            delete doc._rev;
        }
    } else {
        // Es una nueva inserción, PouchDB asignará el _id
        // Para tener un _id más legible, lo creamos nosotros.
        const allDocs = await getAllDocs(db);
        const prefix = db.name.split('_')[1].slice(0, -1); // 'user', 'client', 'task'
        
        // El id secuencial lo calculamos en base a los ids existentes.
        const maxId = allDocs.reduce((max, d) => {
            const currentId = parseInt(d._id.split('_')[1]);
            return currentId > max ? currentId : max;
        }, 0);
        
        doc._id = `${prefix}_${maxId + 1}`;
    }
    
    return db.put(doc);
}

/**
 * Elimina un documento.
 * @param {PouchDB.Database} db
 * @param {Object} doc - El documento a eliminar (debe tener _id y _rev).
 * @returns {Promise<Object>} Resultado de la operación.
 */
export async function removeDoc(db, doc) {
    // Para eliminar, PouchDB necesita al menos el _id y el _rev
    if (!doc._id || !doc._rev) {
        console.error("Documento incompleto para eliminar (falta _id o _rev):", doc);
        return Promise.reject("Documento incompleto.");
    }
    return db.remove(doc);
}


// --- FUNCIONES CRUD ESPECÍFICAS DE ENTIDADES (Usando PouchDB) ---

export const db = {
    // Tareas
    getTasks: () => getAllDocs(dbTasks),
    saveTask: (task) => saveDoc(dbTasks, task),
    removeTask: (task) => removeDoc(dbTasks, task),

    // Clientes
    getClients: () => getAllDocs(dbClients),
    saveClient: (client) => saveDoc(dbClients, client),
    removeClient: (client) => removeDoc(dbClients, client),
    
    // Usuarios
    getUsers: () => getAllDocs(dbUsers),
    saveUser: (user) => saveDoc(dbUsers, user),
    removeUser: (user) => removeDoc(dbUsers, user),
    
    // Login
    getUserByCredentials: async (username, password) => {
        const users = await getAllDocs(dbUsers);
        return users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && u.password === password
        );
    }
};

// Exportar la función de inicialización para ser llamada en script.js
// Exportamos `db` para que `script.js` pueda interactuar con la base de datos.