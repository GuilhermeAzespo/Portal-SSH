import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../db_data/database.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create necessary tables
    db.serialize(() => {
      // Sectors table
      db.run(`CREATE TABLE IF NOT EXISTS sectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )`);

      // User-Sector junction table (Many-to-Many)
      db.run(`CREATE TABLE IF NOT EXISTS user_sectors (
        userId INTEGER,
        sectorId INTEGER,
        PRIMARY KEY (userId, sectorId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sectorId) REFERENCES sectors(id) ON DELETE CASCADE
      )`);

      // Default sectors seeding
      db.get("SELECT COUNT(*) AS count FROM sectors", (err, row: any) => {
        if (row && row.count === 0) {
          const defaultSectors = [
            { name: 'TI', description: 'Departamento de Tecnologia' },
            { name: 'Vendas', description: 'Departamento Comercial' }
          ];
          const stmt = db.prepare(`INSERT INTO sectors (name, description) VALUES (?, ?)`);
          defaultSectors.forEach(s => stmt.run(s.name, s.description));
          stmt.finalize();
          console.log('Default sectors created.');
        }
      });

      // Roles table
      db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT NOT NULL -- Store as JSON array
      )`);

      // Default roles seeding
      db.get("SELECT COUNT(*) AS count FROM roles", (err, row: any) => {
        if (row && row.count === 0) {
          const defaultRoles = [
            {
              name: 'Administrador',
              description: 'Acesso total ao sistema',
              permissions: JSON.stringify(['dashboard.view', 'users.view', 'users.manage', 'hosts.view', 'hosts.manage', 'terminal.access', 'permissions.manage', 'settings.view'])
            },
            {
              name: 'Operador',
              description: 'Pode gerenciar hosts e acessar o terminal',
              permissions: JSON.stringify(['dashboard.view', 'hosts.view', 'hosts.manage', 'terminal.access', 'settings.view'])
            },
            {
              name: 'Visualizador',
              description: 'Acesso apenas para visualização',
              permissions: JSON.stringify(['dashboard.view', 'hosts.view', 'settings.view'])
            }
          ];

          const stmt = db.prepare(`INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`);
          defaultRoles.forEach(r => stmt.run(r.name, r.description, r.permissions));
          stmt.finalize();
          console.log('Default roles created.');
        }
      });

      // Users table (modified version)
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        roleId INTEGER,
        FOREIGN KEY (roleId) REFERENCES roles(id)
      )`);

      // Hosts table (enhanced with sectorId)
      db.run(`CREATE TABLE IF NOT EXISTS hosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER DEFAULT 22,
        username TEXT NOT NULL,
        password TEXT,
        privateKey TEXT,
        sectorId INTEGER,
        FOREIGN KEY (sectorId) REFERENCES sectors(id)
      )`);
      
      // SQLite migrations (safe failure if already exists)
      db.run(`ALTER TABLE users ADD COLUMN email TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN firstName TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN lastName TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN roleId INTEGER`, () => {});
      db.run(`ALTER TABLE hosts ADD COLUMN sectorId INTEGER`, () => {});

      // Migration: Map old 'role' string to 'roleId' if roleId is null
      db.get("SELECT id FROM roles WHERE name = 'Administrador'", (err, role: any) => {
        if (role) {
          db.run(`UPDATE users SET roleId = ? WHERE role = 'admin' AND roleId IS NULL`, [role.id]);
        }
      });
      db.get("SELECT id FROM roles WHERE name = 'Visualizador'", (err, role: any) => {
        if (role) {
          db.run(`UPDATE users SET roleId = ? WHERE role = 'user' AND roleId IS NULL`, [role.id]);
        }
      });
      
      // Default admin user if does not exist
      db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'", (err, row: any) => {
        if (row && row.count === 0) {
          // bcrypt hashed 'admin' for default password
          const defaultPassword = '$2b$10$mb6cDaqTdIJUtdc3R92PbeauKkak8kQbJIVAIKa2M1UplWn8nr9ca'; 
          db.run(`INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [defaultPassword], (err) => {
            if (err) console.error("Error creating default admin:", err.message);
            else console.log('Default admin created. (admin/admin)');
          });
        }
      });
    });
  }
});
