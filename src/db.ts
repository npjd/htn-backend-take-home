import { Database } from "sqlite3";
import data from "./data.json";
import hardwareJson from "./hardware_data.json";
import fs from "fs";

export interface Skill {
  id: number;
  user_id: number;
  skill: string;
  rating: number;
}

export interface Event {
  id: number;
  user_id: number;
  event: string;
  scanned_at: string;
}

export interface Hardware {
  id: number;
  name: string;
  total_quantity: number;
  available_quantity: number;
  owners: HardwareOwners[];
}

export interface HardwareOwners {
  user_id: number;
  owned_quantity: number;
}


export interface User {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  skills: Skill[];
  events: Event[];
  owned_hardware: UserHardwareOwnership[];
}

export interface UserHardwareOwnership {
    hardware_id: number;
    owned_quantity: number;
}

export const getDB = (): Database => {
  if (!fs.existsSync("main.db")) {
    createAndInsertDB();
  }
  return new Database("main.db");
};

const createAndInsertDB = () => {
  const db = new Database("main.db");

  db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          company TEXT,
          email TEXT,
          phone TEXT
        )
      `);

    db.run(`
        CREATE TABLE IF NOT EXISTS skills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          skill TEXT,
          rating INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

    db.run(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            event TEXT,
            scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS hardware (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            total_quantity INTEGER,
            available_quantity INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS hardware_owners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            hardware_id INTEGER,
            owned_quantity INTEGER,
            UNIQUE(user_id, hardware_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (hardware_id) REFERENCES hardware(id)
        )
    `);

    const people = data as User[];
    const hardwareData = hardwareJson as Hardware[];

    db.run("BEGIN TRANSACTION");

    const insertUsersPromise = people.map(
      (person) =>
        new Promise<void>((resolve, reject) => {
          db.run(
            `
            INSERT INTO users (name, company, email, phone)
            VALUES (?, ?, ?, ?)
          `,
            [person.name, person.company, person.email, person.phone],
            function (err) {
              if (err) {
                reject(err);
              } else {
                const userId = this.lastID;

                const insertSkillsStmt = db.prepare(`
                  INSERT INTO skills (user_id, skill, rating)
                  VALUES (?, ?, ?)
                `);
                for (const skill of person.skills) {
                  insertSkillsStmt.run(userId, skill.skill, skill.rating);
                }
                insertSkillsStmt.finalize();

                resolve();
              }
            }
          );
        })
    );

    const insertHardwarePromise = hardwareData.map(
      (hardware) =>
        new Promise<void>((resolve, reject) => {
          db.run(
            `
            INSERT INTO hardware (name, total_quantity, available_quantity)
            VALUES (?, ?, ?)
          `,
            [hardware.name, hardware.total_quantity, hardware.total_quantity],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        })
    );

    Promise.all([...insertUsersPromise, ...insertHardwarePromise])
      .then(() => {
        db.run("COMMIT", () => {
          db.close();
        });
      })
      .catch((err) => {
        console.error("Error inserting data:", err);
        db.run("ROLLBACK", () => {
          db.close();
        });
      });
  });
};
