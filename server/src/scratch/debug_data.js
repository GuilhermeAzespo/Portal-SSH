const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../db_data/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("--- Users ---");
db.all("SELECT id, username, role, roleId FROM users", (err, rows) => {
  console.log(JSON.stringify(rows, null, 2));
  
  console.log("\n--- Sectors ---");
  db.all("SELECT * FROM sectors", (err, rows) => {
    console.log(JSON.stringify(rows, null, 2));
    
    console.log("\n--- User Sectors ---");
    db.all("SELECT * FROM user_sectors", (err, rows) => {
      console.log(JSON.stringify(rows, null, 2));
      
      console.log("\n--- Hosts ---");
      db.all("SELECT id, name, host, sectorId FROM hosts", (err, rows) => {
        console.log(JSON.stringify(rows, null, 2));
        db.close();
      });
    });
  });
});
