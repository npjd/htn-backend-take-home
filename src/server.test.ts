import { ApolloServer, GraphQLResponse } from "@apollo/server";
import { typeDefs } from "./typeDefs";
import { getResolvers } from "./resolver";
import assert from "assert";

describe("API Tests", () => {
  let testServer: ApolloServer;

  beforeAll(async () => {
    testServer = new ApolloServer({
      typeDefs,
      resolvers: await getResolvers("test"),
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

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(response.body.singleResult.data?.users).toBeDefined();
  });

  it("returns a user by userId", async () => {
    const userId = "1";
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

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeUndefined();
    expect((response.body.singleResult.data?.user as { id: number }).id).toBe(
      userId
    );
  });

  it("returns hardware", async () => {
    const response = await testServer.executeOperation({
      query: `
            query {
                hardware {
                    id
                    name
                    total_quantity
                    available_quantity
                    owners {
                        user_id
                        owned_quantity
                    }
                }
            }
        `,
    });

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(response.body.singleResult.data?.hardware).toBeDefined();
  });

  it("returns hardware by hardwareId", async () => {
    const hardwareId = "1";
    const response = await testServer.executeOperation({
      query: `
            query GetHardware($hardwareId: ID!) {
                hardwareById(hardwareId: $hardwareId) {
                    id
                    name
                    total_quantity
                    available_quantity
                    owners {
                        user_id
                        owned_quantity
                    }
                }
            }
        `,
      variables: { hardwareId },
    });

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(
      (response.body.singleResult.data?.hardwareById as { id: number }).id
    ).toBe(hardwareId);
  });

  it("returns skills within a frequency range", async () => {
    const minFrequency = 2;
    const maxFrequency = 10;
    const response = await testServer.executeOperation({
      query: `
            query GetSkills($minFrequency: Int!, $maxFrequency: Int!) {
                skills(min_frequency: $minFrequency, max_frequency: $maxFrequency) {
                    skill
                    frequency
                }
            }
        `,
      variables: { minFrequency, maxFrequency },
    });

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(response.body.singleResult.data?.skills).toBeDefined();
    for (const skill of response.body.singleResult.data?.skills as Array<any>) {
      expect(skill.frequency).toBeGreaterThanOrEqual(minFrequency);
      expect(skill.frequency).toBeLessThanOrEqual(maxFrequency);
    }
  });

  it("updates user data including skills", async () => {
    const userId = "1";
    const newName = "John Doe";
    const newCompany = "New Company";
    const newEmail = "john.doe@example.com";
    const newPhone = "1234567890";
    const newSkills = [{ skill: "New Skill", rating: 5 }];

    const response = await testServer.executeOperation({
      query: `
            mutation UpdateUserData($userId: ID!, $data: UpdateUserInput!) {
                updateUser(userId: $userId, data: $data) {
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
                }
            }
        `,
      variables: {
        userId,
        data: {
          name: newName,
          company: newCompany,
          email: newEmail,
          phone: newPhone,
          skills: newSkills,
        },
      },
    });

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeUndefined();
    const updatedUser = response.body.singleResult.data?.updateUser as {
      name: string;
      company: string;
      email: string;
      phone: string;
      skills: Array<any>;
    };
    expect(updatedUser).toBeDefined();

    expect(updatedUser?.name).toBe(newName);
    expect(updatedUser?.company).toBe(newCompany);
    expect(updatedUser?.email).toBe(newEmail);
    expect(updatedUser?.phone).toBe(newPhone);

    const skill = updatedUser?.skills.find(
      (s: any) =>
        s.skill === newSkills[0].skill && s.rating === newSkills[0].rating
    );
    expect(skill).toBeDefined();
    expect(
      updatedUser?.skills.filter(
        (s: any) =>
          s.skill === newSkills[0].skill && s.rating === newSkills[0].rating
      ).length
    ).toBe(1);
  });

  it("user checks out hardware and it's visible in user profile", async () => {
    const userId = "1";
    const hardwareId = "1";
    const quantity = 1;

    const response = await testServer.executeOperation({
      query: `
            mutation CheckOutHardware($userId: ID!, $hardwareId: ID!, $quantity: Int!) {
                checkOutHardware(userId: $userId, hardwareId: $hardwareId, quantity: $quantity)
            }
        `,
      variables: { userId, hardwareId, quantity },
    });

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(response.body.singleResult.data?.checkOutHardware).toBe(true);

    const userProfileResponse = await testServer.executeOperation({
      query: `
            query GetUser($userId: ID!) {
                user(userId: $userId) {
                    id
                    name
                    owned_hardware {
                        user_id
                        owned_quantity
                    }
                }
            }
        `,
      variables: { userId },
    });

    assert(userProfileResponse.body.kind === "single");

    const user = userProfileResponse.body.singleResult.data?.user as {
      owned_hardware: Array<any>;
    };
    expect(user).toBeDefined();
    expect(
      user?.owned_hardware.find(
        (hw: any) => hw.user_id === userId && hw.owned_quantity === quantity
      )
    ).toBeDefined();
  });

  it("tries to check in hardware that the user doesn't have", async () => {
    const userId = "2";
    const hardwareId = "1";
    const quantity = 1;

    const response = await testServer.executeOperation({
      query: `
                    mutation CheckInHardware($userId: ID!, $hardwareId: ID!, $quantity: Int!) {
                            checkInHardware(userId: $userId, hardwareId: $hardwareId, quantity: $quantity)
                    }
            `,
      variables: { userId, hardwareId, quantity },
    });

    assert(response.body.kind === "single");
    expect(response.body.singleResult.errors).toBeDefined();
  });
});
