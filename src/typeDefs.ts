

export const typeDefs = `
type User {
    id: ID!
    name: String!
    company: String
    email: String!
    phone: String!
    created_at: String!
    updated_at: String!
    skills: [Skill!]!
}

type Skill {
    id: ID!
    user_id: ID!
    name: String!
    rating: Int!
}

type Query {
    users: [User!]!
    user(id: ID!): User
    skills(min_frequency: Int, max_frequency: Int): [Skill!]!
}

type Mutation {
    updateUser(id: ID!, data: UpdateUserInput!): User
}

input UpdateUserInput {
    name: String
    company: String
    email: String
    phone: String
}
`
