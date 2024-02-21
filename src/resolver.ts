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
    ): Promise<{ skill: string; frequency: number }[] | null> => {
      try {
        const skills = await getSkillsWithFrequency(minFreq, maxFreq);
        return skills;
      } catch (error) {
        console.error("Error retrieving skills with frequency:", error);
        return [];
      }
    },
  },
  Mutation: {
    updateUser: async (
      _: any,
      { id, data }: { id: number; data: User }
    ): Promise<User | null> => {
      try {
        // Check if the user exists
        const existingUser = await getUserWithSkills(id);
        if (!existingUser) {
          throw new Error(`User with ID ${id} does not exist.`);
        }

        // Update user properties
        if (data.name) {
          existingUser.name = data.name;
        }
        if (data.company) {
          existingUser.company = data.company;
        }
        if (data.email) {
          existingUser.email = data.email;
        }
        if (data.phone) {
          existingUser.phone = data.phone;
        }

        // Update user skills
        if (data.skills && data.skills.length > 0) {
          // Get existing skills for the user
          const existingSkills = await getSkillsForUser(id);

          // Map existing skills by skill name for easy lookup
          const existingSkillsMap = existingSkills.reduce(
            (map: any, skill: Skill) => {
              map[skill.skill] = skill;
              return map;
            },
            {}
          );

          // Process each skill in the input data
          for (const skillInput of data.skills) {
            const { skill, rating } = skillInput;

            // Check if the skill already exists for the user
            if (existingSkillsMap.hasOwnProperty(skill)) {
              // Update the existing skill's rating
              const existingSkill = existingSkillsMap[skill];
              existingSkill.rating = rating;

              // Update the skill in the database
              await updateSkillData(existingSkill);
            } else {
              // Create a new skill for the user
              const newSkill: Skill = {
                id: -1,
                user_id: id,
                skill,
                rating,
              };

              // Insert the new skill into the database
              await insertSkillData(newSkill);

              // Add the new skill to the existing skills map for future lookups
              existingSkillsMap[skill] = newSkill;
            }
          }

          // Update the user's skills array with the updated skills
          existingUser.skills = Object.values(existingSkillsMap);
        }

        // Update the user in the database
        await updateUserData(existingUser);

        return existingUser;
      } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user.");
      }
    },
  },
};

async function updateUserData(user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET name = ?, company = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [user.name, user.company, user.email, user.phone, user.id],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

async function updateSkillData(skill: Skill): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE skills SET rating = ? WHERE id = ?",
      [skill.rating, skill.id],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

async function insertSkillData(skill: Skill): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO skills (user_id, skill, rating) VALUES (?, ?, ?)",
      [skill.user_id, skill.skill, skill.rating],
      function (err) {
        if (err) {
          reject(err);
          return;
        }
        skill.id = this.lastID;
        resolve();
      }
    );
  });
}

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
