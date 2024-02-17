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
  },
});

const SkillType = new GraphQLObjectType({
  name: "Skill",
  fields: {
    id: { type: GraphQLInt },
    user_id: { type: GraphQLInt },
    skill: { type: GraphQLString },
    rating: { type: GraphQLInt },
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
            db.all("SELECT * FROM users", (err, rows) => {
              if (err) {
                reject(err);
              }
              resolve(rows);
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
              (err, row) => {
                if (err) {
                  reject(err);
                }
                resolve(row);
              }
            );
          });
        },
      },
      
     
    },
  }),
});

export default schema;
