export const typeDefs = `
type User {
    id: ID!
    name: String!
    company: String
    email: String!
    phone: String!
    skills: [Skill!]!
    events: [Event!]!
}

type Hardware {
    id: ID!
    name: String!
    total_quantity: Int!
    available_quantity: Int!
    user_owns: Int!
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
}

type Mutation {
    updateUser(userId: ID!, data: UpdateUserInput!): User
    scanUser(userId: ID!, event: String!): Boolean
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
