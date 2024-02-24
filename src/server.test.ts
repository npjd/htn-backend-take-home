import { ApolloServer, GraphQLResponse } from "@apollo/server";
import { typeDefs } from "./typeDefs";
import { resolvers } from "./resolver";
import assert from "assert";
import e from "express";

describe("API Tests", () => {
  let testServer: ApolloServer;

  beforeAll(() => {
    testServer = new ApolloServer({
      typeDefs,
      resolvers,
    });
  });

  it("returns users", async () => {

    const response = await testServer.executeOperation({
        query: `
                query {
                    users {
                        id
                        name
                        company
                        email
                        phone
                        skills {
                            id
                            skill
                            rating
                        }
                        events {
                            id
                            event
                            scanned_at
                        }
                        owned_hardware {
                            user_id
                            owned_quantity
                        }
                    }
                }
            `,
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(response.body.singleResult.data?.users).toBeDefined();

  });

  it("returns a user by userId", async () => {
    const userId = "1"; // Replace with an actual user ID from your test data
    const response = await testServer.executeOperation({
      query: `
          query GetUser($userId: ID!) {
            user(userId: $userId) {
              id
              name
              company
              email
              phone
              skills {
                id
                skill
                rating
              }
              events {
                id
                event
                scanned_at
              }
              owned_hardware {
                user_id
                owned_quantity
              }
            }
          }
        `,
      variables: { userId },
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.errors).toBeUndefined();
    expect((response.body.singleResult.data?.user as { id: number }).id).toBe(userId);
  });

});
