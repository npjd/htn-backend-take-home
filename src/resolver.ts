// @ts-nocheck

import { getDB } from "./db";

const db = getDB();

export const resolvers = {
  Query: {
    users: () => {
      const users = db.all("SELECT * FROM users");
      return users;
    },
    user: (_, { id }) => {
      const user = db.get("SELECT * FROM users WHERE id = ?", id);
      return user;
    },
    skills: (_, { min_frequency, max_frequency }) => {
      // Retrieve skills based on the provided frequency range
      let query =
        "SELECT skill AS name, COUNT(*) AS frequency FROM skills GROUP BY skill";
      const params = [];

      if (min_frequency !== undefined) {
        query += " HAVING frequency >= ?";
        params.push(min_frequency);
      }

      if (max_frequency !== undefined) {
        query += " AND frequency <= ?";
        params.push(max_frequency);
      }

      const skills = db.all(query, params);
      return skills;
    },
  },
  User: {
    skills: (user) => {
      // Retrieve the skills associated with a specific user
      const skills = db.all("SELECT * FROM skills WHERE user_id = ?", user.id);
      return skills;
    },
  },
  Mutation: {
    updateUser: (_, { id, data }) => {
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
