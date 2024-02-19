import { getDB } from "./db";
import { User, Skill } from "./db";

const db = getDB();

// TODO: FIX ANY TYPES

export const resolvers = {
  Query: {
    users: async (): Promise<User[]> => {
      try {
        const users: User[] = await getUsersWithSkills();
        return users;
      } catch (error) {
        console.error("Error retrieving users:", error);
        return [];
      }
    },
    user: async (_: any, { id }: { id: number }): Promise<User | null> => {
      try {
        const user: User | undefined = await getUserWithSkills(id);
        return user || null;
      } catch (error) {
        console.error("Error retrieving user:", error);
        return null;
      }
    },
    skills: async (
      _: any,
      { minFreq, maxFreq }: { minFreq: number; maxFreq: number }
    ) => {
      try {
        const skills = await getSkillsWithFrequency(
          minFreq,
          maxFreq
        );
        return skills;
      } catch (error) {
        console.error("Error retrieving skills with frequency:", error);
        return [];
      }
    },
  },
  Mutation: {
    updateUser: (_: any, { id, data }: any) => {
      // Update a specific user with the provided data
      const { name, company, email, phone } = data;
      const updateQuery =
        "UPDATE users SET name = ?, company = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
      db.run(updateQuery, [name, company, email, phone, id]);

      // Retrieve the updated user
      const updatedUser = db.get("SELECT * FROM users WHERE id = ?", id);
      return updatedUser;
    },
  },
};

async function getUsersWithSkills(): Promise<User[]> {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM users", async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const users: User[] = [];
      for (const row of rows) {
        const user = row as User;
        const skills = await getSkillsForUser(user.id);
        user.skills = skills;
        users.push(user);
      }
      resolve(users);
    });
  });
}

async function getUserWithSkills(id: number): Promise<User | undefined> {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (!row) {
        resolve(undefined);
        return;
      }
      const user = row as User;
      const skills = await getSkillsForUser(user.id);
      user.skills = skills;
      resolve(user);
    });
  });
}

function getSkillsForUser(userId: number): Promise<Skill[]> {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM skills WHERE user_id = ?",
      [userId],
      (err, skillRows) => {
        if (err) {
          reject(err);
          return;
        }
        const skills = skillRows as Skill[];
        resolve(skills);
      }
    );
  });
}

async function getSkillsWithFrequency(
  minFreq: number | undefined,
  maxFreq: number | undefined
): Promise<{ skill: string; frequency: number }[]> {
  return new Promise((resolve, reject) => {
    let query =
      "SELECT skill, COUNT(*) as frequency FROM skills GROUP BY skill";
    let params = [];

    if (minFreq !== undefined || maxFreq !== undefined) {
      query =
        "SELECT skill, COUNT(*) as frequency FROM skills GROUP BY skill HAVING";
    }

    if (minFreq !== undefined) {
      query += " frequency >= ?";
      params.push(minFreq);
    }

    if (minFreq !== undefined && maxFreq !== undefined) {
      query += " AND";
    }

    if (maxFreq !== undefined) {
      query += " frequency <= ?";
      params.push(maxFreq);
    }

    db.all(
      query,
      params,
      (err, rows: { skill: string; frequency: number }[]) => {
        if (err) {
          reject(err);
          return;
        }

        const skillsWithFrequency = rows.map((row) => ({
          skill: row.skill,
          frequency: row.frequency,
        }));
        resolve(skillsWithFrequency);
      }
    );
  });
}
