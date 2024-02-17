import { buildSchema } from "graphql";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
} from "graphql";
import { getDB } from "./db";

const db = getDB();

const SkillType = new GraphQLObjectType({
  name: "Skill",
  fields: {
    id: { type: GraphQLInt },
    user_id: { type: GraphQLInt },
    skill: { type: GraphQLString },
    rating: { type: GraphQLInt },
  },
});

const UserType = new GraphQLObjectType({
  name: "User",
  fields: {
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    company: { type: GraphQLString },
    email: { type: GraphQLString },
    phone: { type: GraphQLString },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
    skills: {
      type: new GraphQLList(SkillType),
    },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      users: {
        type: new GraphQLList(UserType),
        resolve: async () => {
          return new Promise((resolve, reject) => {
            db.all("SELECT * FROM users", async (err, userRows: any[]) => {
              if (err) {
                reject(err);
                return;
              }

              const usersWithSkills = await Promise.all(
                userRows.map(async (userRow) => {
                  const skills = await new Promise(
                    (resolveSkills, rejectSkills) => {
                      db.all(
                        "SELECT * FROM skills WHERE user_id = ?",
                        [userRow.id],
                        (err, skillRows) => {
                          if (err) {
                            rejectSkills(err);
                            return;
                          }
                          resolveSkills(skillRows);
                        }
                      );
                    }
                  );
                  return { ...userRow, skills };
                })
              );

              resolve(usersWithSkills);
            });
          });
        },
      },
      user: {
        type: UserType,
        args: {
          id: { type: GraphQLInt },
        },
        resolve: async (parent, args) => {
          return new Promise((resolve, reject) => {
            db.get(
              "SELECT * FROM users WHERE id = ?",
              [args.id],
              async (err, userRow: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }

                const skills = await new Promise(
                  (resolveSkills, rejectSkills) => {
                    db.all(
                      "SELECT * FROM skills WHERE user_id = ?",
                      [args.id],
                      (err, skillRows) => {
                        if (err) {
                          rejectSkills(err);
                          return;
                        }
                        resolveSkills(skillRows);
                      }
                    );
                  }
                );

                const userWithSkills = { ...userRow, skills };
                resolve(userWithSkills);
              }
            );
          });
        },
      },
    },
  }),
});

export default schema;
