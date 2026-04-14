const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/db_data/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- USERS ---');
db.all("SELECT id, username, role, roleId FROM users", (err, rows) => {
    console.log(JSON.stringify(rows, null, 2));
    
    console.log('--- SECTORS ---');
    db.all("SELECT * FROM sectors", (err, rows) => {
        console.log(JSON.stringify(rows, null, 2));
        
        console.log('--- USER_SECTORS ---');
        db.all("SELECT * FROM user_sectors", (err, rows) => {
            console.log(JSON.stringify(rows, null, 2));
            
            console.log('--- HOSTS ---');
            db.all("SELECT id, name, sectorId FROM hosts", (err, rows) => {
                console.log(JSON.stringify(rows, null, 2));
                
                console.log('--- ROLES ---');
                db.all("SELECT id, name FROM roles", (err, rows) => {
                    console.log(JSON.stringify(rows, null, 2));
                    db.close();
                });
            });
        });
    });
});
