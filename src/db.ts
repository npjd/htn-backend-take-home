import { Database } from "sqlite3";
import data from "./data.json";
import fs from "fs";

export interface Skill {
  skill: string;
  rating: number;
}

export interface User {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  skills: Skill[];
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
          phone TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    const people = data as User[];

    db.run("BEGIN TRANSACTION");

    const insertions = people.map(
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

    Promise.all(insertions)
      .then(() => {
        db.run("COMMIT", () => {
          db.close();
        });
      })
      .catch((err) => {
        console.error("Error inserting users:", err);
        db.run("ROLLBACK", () => {
          db.close();
        });
      });
  });
};
