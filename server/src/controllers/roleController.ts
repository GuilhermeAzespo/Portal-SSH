import { Request, Response } from 'express';
import { db } from '../db/database';

export const getRoles = (req: Request, res: Response) => {
  db.all("SELECT * FROM roles", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Parse permissions JSON
    const roles = rows.map((row: any) => ({
      ...row,
      permissions: JSON.parse(row.permissions)
    }));
    
    res.json({ roles });
  });
};

export const createRole = (req: Request, res: Response) => {
  const { name, description, permissions } = req.body;
  
  if (!name || !permissions) {
    return res.status(400).json({ error: 'Name and permissions are required' });
  }

  const permissionsJson = JSON.stringify(permissions);
  
  db.run(
    "INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)",
    [name, description, permissionsJson],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, description, permissions });
    }
  );
};

export const updateRole = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;
  
  if (!name || !permissions) {
    return res.status(400).json({ error: 'Name and permissions are required' });
  }

  const permissionsJson = JSON.stringify(permissions);
  
  db.run(
    "UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?",
    [name, description, permissionsJson, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Role not found' });
      res.json({ message: 'Role updated successfully' });
    }
  );
};

export const deleteRole = (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if role is assigned to any user
  db.get("SELECT COUNT(*) as count FROM users WHERE roleId = ?", [id], (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row.count > 0) {
      return res.status(400).json({ error: 'Cannot delete role assigned to users' });
    }
    
    db.run("DELETE FROM roles WHERE id = ?", [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Role not found' });
      res.json({ message: 'Role deleted successfully' });
    });
  });
};

export const getAvailablePermissions = (req: Request, res: Response) => {
  const permissions = [
    { id: 'dashboard.view', label: 'Ver Dashboard', group: 'Geral' },
    { id: 'users.view', label: 'Ver Usuários', group: 'Usuários' },
    { id: 'users.manage', label: 'Gerenciar Usuários (Criar/Editar/Excluir)', group: 'Usuários' },
    { id: 'hosts.view', label: 'Ver Hosts', group: 'Hosts' },
    { id: 'hosts.manage', label: 'Gerenciar Hosts', group: 'Hosts' },
    { id: 'terminal.access', label: 'Acessar Terminal SSH', group: 'Hosts' },
    { id: 'permissions.manage', label: 'Gerenciar Permissões/Cargos', group: 'Configurações' },
    { id: 'settings.view', label: 'Ver Configurações', group: 'Configurações' }
  ];
  res.json({ permissions });
};
