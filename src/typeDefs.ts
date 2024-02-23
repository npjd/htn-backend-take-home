// TODO: find a way to inherit the types from hardware to user_owned_hardware

export const typeDefs = `
type User {
    id: ID!
    name: String!
    company: String
    email: String!
    phone: String!
    skills: [Skill!]!
    events: [Event!]!
    owned_hardware: [HardwareOwners!]!
}

type HardwareOwners {
    user_id: ID!
    owned_quantity: Int!
}

type Hardware {
    id: ID!
    name: String!
    total_quantity: Int!
    available_quantity: Int!
    owners: [HardwareOwners!]!
}

type Event {
    id: ID!
    event: String!
    scanned_at: String!
}

type Skill {
    id: ID!
    skill: String!
    rating: Int!
}

type SkillFrequency {
    skill: String!
    frequency: Int!
}

type Query {
    users: [User!]!
    user(userId: ID!): User
    skills(min_frequency: Int, max_frequency: Int): [SkillFrequency!]!
    hardware: [Hardware!]!
    hardwareById(hardwareId: ID!): Hardware
}

type Mutation {
    updateUser(userId: ID!, data: UpdateUserInput!): User
    scanUser(userId: ID!, event: String!): Boolean
    checkOutHardware(hardwareId: ID!, userId: ID!, quantity: Int!): Boolean
    checkInHardware(hardwareId: ID!, userId: ID!, quantity: Int!): Boolean
}

input UpdateUserInput {
    name: String
    company: String
    email: String
    phone: String
    skills: [SkillInput!]
}

input SkillInput {
    skill: String!
    rating: Int!
}
`;
