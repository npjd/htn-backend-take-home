import { User, Skill, Event, Hardware,  HardwareOwners, getDB  } from "./db";

const db = getDB();

export const resolvers = {
  Query: {
    users: async (): Promise<User[]> => {
      try {
        const users: User[] = await getUsers();
        return users;
      } catch (error) {
        console.error("Error retrieving users:", error);
        return [];
      }
    },
    user: async (_: any, { id }: { id: number }): Promise<User | null> => {
      try {
        const user: User | undefined = await getUser(id);
        return user || null;
      } catch (error) {
        console.error("Error retrieving user:", error);
        return null;
      }
    },
    skills: async (
      _: any,
      {
        min_frequency,
        max_frequency,
      }: {
        min_frequency: number | undefined;
        max_frequency: number | undefined;
      }
    ): Promise<{ skill: string; frequency: number }[] | null> => {
      try {
        const skills = await getSkillsWithFrequency(
          min_frequency,
          max_frequency
        );
        return skills;
      } catch (error) {
        console.error("Error retrieving skills with frequency:", error);
        return [];
      }
    },
    hardware: async (): Promise<Hardware[]> => {
      try {
        const hardwares: Hardware[] = await getHardwares();
        return hardwares;
      } catch (error) {
        console.error("Error retrieving hardware:", error);
        return [];
      }
    },
    hardwareById: async (
      _: any,
      { hardwareId }: { hardwareId: number }
    ): Promise<Hardware | null> => {
      try {
        const hardware: Hardware | null = await getHardwareById(hardwareId);
        return hardware;
      } catch (error) {
        console.error("Error retrieving hardware:", error);
        return null;
      }
    },
  },
  Mutation: {
    // TODO: REFACTOR THIS SHIT
    updateUser: async (
      _: any,
      { id, data }: { id: number; data: User }
    ): Promise<User | null> => {
      try {
        // Check if the user exists
        const existingUser = await getUser(id);
        if (!existingUser) {
          throw new Error(`User with ID ${id} does not exist.`);
        }

        
        // Update user properties
        switch (true) {
          case !!data.name:
            existingUser.name = data.name;
            break;
          case !!data.company:
            existingUser.company = data.company;
            break;
          case !!data.email:
            existingUser.email = data.email;
            break;
          case !!data.phone:
            existingUser.phone = data.phone;
            break;
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
                // Set the ID to -1 for now, it will be updated after insertion
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
    scanUser: async (
      _: any,
      { userId, event }: { userId: number; event: string }
    ): Promise<boolean> => {
      try {
        // Check if the user exists
        const existingUser = await getUser(userId);
        if (!existingUser) {
          throw new Error(`User with ID ${userId} does not exist.`);
        }
        // Insert the scan event into the database
        return await insertScanData(userId, event);
      } catch (error) {
        console.error("Error scanning user:", error);
        throw new Error("Failed to scan user.");
      }
    },
    // TODO: RETURN FALSE HERE
    checkOutHardware: async (
      _: any,
      {
        hardwareId,
        userId,
        quantity,
      }: { hardwareId: number; userId: number; quantity: number }
    ): Promise<boolean> => {
      try {
        // Check if the hardware exists
        const existingHardware = await getHardwareById(hardwareId);
        if (!existingHardware) {
          throw new Error(`Hardware with ID ${hardwareId} does not exist.`);
        }

        // Check if the user exists
        const existingUser = await getUser(userId);
        if (!existingUser) {
          throw new Error(`User with ID ${userId} does not exist.`);
        }

        // Check if the quantity is available
        if (existingHardware.available_quantity < quantity) {
          throw new Error(
            `Not enough quantity available for hardware with ID ${hardwareId}.`
          );
        }

        // Update the available quantity
        existingHardware.available_quantity -= quantity;

        // Update the hardware in the database
        await updateHardwareData(existingHardware);

        // Insert the ownership data into the database
        await upsertOwnershipData(hardwareId, userId, quantity);

        return true;
      } catch (error) {
        console.error("Error checking out hardware:", error);
        throw new Error("Failed to check out hardware.");
      }
    },
    // TODO: RETURN FALSE HERE
    checkInHardware: async (
      _: any,
      {
        hardwareId,
        userId,
        quantity,
      }: { hardwareId: number; userId: number; quantity: number }
    ): Promise<boolean> => {
      try {
        // Check if the hardware exists
        const existingHardware = await getHardwareById(hardwareId);
        if (!existingHardware) {
          throw new Error(`Hardware with ID ${hardwareId} does not exist.`);
        }

        // Check if the user exists
        const existingUser = await getUser(userId);
        if (!existingUser) {
          throw new Error(`User with ID ${userId} does not exist.`);
        }

        // Check if the user has the hardware
        const existingOwnership = await getOwnersForHardware(hardwareId);
        const userOwnership = existingOwnership.find(
          (ownership) => ownership.user_id == userId
        );
        if (!userOwnership) {
          throw new Error(
            `User with ID ${userId} does not own hardware with ID ${hardwareId}.`
          );
        }

        // Check if the user has enough quantity
        if (userOwnership.owned_quantity < quantity) {
          throw new Error(
            `User with ID ${userId} does not own enough quantity of hardware with ID ${hardwareId}.`
          );
        }

        // Update the available quantity
        existingHardware.available_quantity += quantity;

        // Update the hardware in the database
        await updateHardwareData(existingHardware);

        // Update the ownership data in the database
        await upsertOwnershipData(hardwareId, userId, -quantity);

        return true;
      } catch (error) {
        console.error("Error checking in hardware:", error);
        throw new Error("Failed to check in hardware.");
      }
    },
  },
};

const updateUserData = async (user: User): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET name = ?, company = ?, email = ?, phone = ? WHERE id = ?",
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
};

const updateSkillData = async (skill: Skill): Promise<void> => {
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
};

const insertSkillData = async (skill: Skill): Promise<void> => {
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
};

const getUsers = async (): Promise<User[]> => {
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
        const events = await getEventsForUser(user.id);
        const ownedHardware = await getHardwareOwnedByUser(user.id);
        user.skills = skills;
        user.events = events;
        user.owned_hardware = ownedHardware;
        users.push(user);
      }
      resolve(users);
    });
  });
};

const getUser = async (id: number): Promise<User | undefined> => {
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
      const events = await getEventsForUser(user.id);
      const ownedHardware = await getHardwareOwnedByUser(user.id);
      user.skills = skills;
      user.events = events;
      user.owned_hardware = ownedHardware;

      resolve(user);
    });
  });
};

const getSkillsForUser = (userId: number): Promise<Skill[]> => {
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
};

const getEventsForUser = (userId: number): Promise<Event[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM events WHERE user_id = ?",
      [userId],
      (err, eventRows) => {
        if (err) {
          reject(err);
          return;
        }
        const events = eventRows as Event[];
        resolve(events);
      }
    );
  });
};

const getSkillsWithFrequency = async (
  minFreq: number | undefined,
  maxFreq: number | undefined
): Promise<{ skill: string; frequency: number }[]> => {
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
};

const insertScanData = async (
  userId: number,
  event: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM events WHERE user_id = ? AND event = ?",
      [userId, event],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row) {
          resolve(false);
          return;
        }
      }
    );

    db.run(
      "INSERT INTO events (user_id, event) VALUES (?, ?)",
      [userId, event],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      }
    );
  });
};

const getHardwares = async (): Promise<Hardware[]> => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM hardware", async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const hardwares: Hardware[] = [];
      for (const row of rows) {
        const hardware = row as Hardware;
        const owners = await getOwnersForHardware(hardware.id);
        hardware.owners = owners;
        hardwares.push(hardware);
      }
      resolve(hardwares);
    });
  });
};

const getHardwareById = async (
  hardwareId: number
): Promise<Hardware | null> => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM hardware WHERE id = ?",
      [hardwareId],
      async (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          resolve(null);
          return;
        }
        const hardware = row as Hardware;
        const owners = await getOwnersForHardware(hardware.id);
        hardware.owners = owners;
        resolve(hardware);
      }
    );
  });
};

const getOwnersForHardware = (
  hardwareId: number
): Promise<HardwareOwners[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM hardware_owners WHERE hardware_id = ?",
      [hardwareId],
      (err, ownerRows) => {
        if (err) {
          reject(err);
          return;
        }
        const owners = ownerRows as HardwareOwners[];
        resolve(owners);
      }
    );
  });
};

const updateHardwareData = async (hardware: Hardware): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE hardware SET name = ?, total_quantity = ?, available_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        hardware.name,
        hardware.total_quantity,
        hardware.available_quantity,
        hardware.id,
      ],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
};

const upsertOwnershipData = async (
  hardwareId: number,
  userId: number,
  quantity: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO hardware_owners (user_id, hardware_id, owned_quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, hardware_id) DO UPDATE SET owned_quantity = owned_quantity + ?",
      [userId, hardwareId, quantity, quantity],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
};

const getHardwareOwnedByUser = (userId: number): Promise<HardwareOwners[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM hardware_owners WHERE user_id = ?",
      [userId],
      (err, ownerRows) => {
        if (err) {
          reject(err);
          return;
        }
        const owners = ownerRows as HardwareOwners[];
        resolve(owners);
      }
    );
  });
};
