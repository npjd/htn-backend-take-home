### Setup

Run the following to get the server running

```
npm install 
```

```
npm start
```

This will automatically create a DB locally. Apollo playground will also be running; you can interact with it at http://localhost:4000/

## Features

### Types

#### User

A user represents an individual in the system.

| Field          | Type     | Description              |
|----------------|----------|--------------------------|
| id             | ID!      | Unique identifier        |
| name           | String!  | Name of the user         |
| company        | String   | Company the user belongs to (optional) |
| email          | String!  | Email address of the user|
| phone          | String!  | Phone number of the user|
| skills         | [Skill!]!| List of skills possessed by the user|
| events         | [Event!]!| List of events associated with the user|
| owned_hardware | [HardwareOwners!]!| List of hardware owned by the user|

#### HardwareOwners

Represents the ownership relationship between users and hardware.

| Field          | Type     | Description                      |
|----------------|----------|----------------------------------|
| user_id        | ID!      | ID of the user who owns the hardware|
| owned_quantity | Int!     | Quantity of hardware owned by the user|

#### Hardware

Represents hardware available in the system.

| Field             | Type     | Description                      |
|-------------------|----------|----------------------------------|
| id                | ID!      | Unique identifier                |
| name              | String!  | Name of the hardware             |
| total_quantity    | Int!     | Total quantity of the hardware   |
| available_quantity| Int!     | Available quantity of the hardware|
| owners            | [HardwareOwners!]!| List of users who own this hardware|

#### Event

Represents an event associated with a user.

| Field             | Type     | Description                      |
|-------------------|----------|----------------------------------|
| id                | ID!      | Unique identifier                |
| event             | String!  | Description of the event         |
| scanned_at        | String!  | Timestamp when the event was scanned|

#### Skill

Represents a skill possessed by a user.

| Field          | Type     | Description                      |
|----------------|----------|----------------------------------|
| id             | ID!      | Unique identifier                |
| skill          | String!  | Name of the skill                |
| rating         | Int!     | Rating of the skill (e.g., proficiency level)|

#### SkillFrequency

Represents the frequency of a skill across users.

| Field          | Type     | Description                      |
|----------------|----------|----------------------------------|
| skill          | String!  | Name of the skill                |
| frequency      | Int!     | Frequency of the skill across users|

### Queries

- `users`: Retrieve a list of all users.
- `user(userId: ID!)`: Retrieve a user by their ID.
- `skills(min_frequency: Int, max_frequency: Int)`: Retrieve skills within a frequency range.
- `hardware`: Retrieve a list of all hardware.
- `hardwareById(hardwareId: ID!)`: Retrieve hardware by its ID.

### Mutations

- `updateUser(userId: ID!, data: UpdateUserInput!)`: Update user information.
- `scanUser(userId: ID!, event: String!)`: Record an event for a user.
- `checkOutHardware(hardwareId: ID!, userId: ID!, quantity: Int!)`: Check out hardware to a user.
- `checkInHardware(hardwareId: ID!, userId: ID!, quantity: Int!)`: Check in hardware from a user.

### Example Requests

#### Retrieve all users

```graphql
query {
  users {
    id
    name
    email
    phone
  }
}
```

#### Retrieve a user by ID

```graphql
query {
  user(userId: X) {
    id
    name
    email
    company
    skills {
      id
      skill
      rating
    }
  }
}
```

#### Update user information

```graphql
mutation {
  updateUser(userId: X, data: { name: "New Name", company: "New Company" }) {
    id
    name
    company
  }
}
```

#### Record an event for a user

```graphql
mutation {
  scanUser(userId: X, event: "Scanned at Entrance") 
}
```

#### Check out hardware to a user

```graphql
mutation {
  checkOutHardware(hardwareId: "exampleHardwareId", userId: "exampleUserId", quantity: 1)
}
```

#### Retrieve skills within a frequency range

```graphql
query {
  skills(min_frequency: 2, max_frequency: 5) {
    skill
    frequency
  }
}
```

### Tech Stack

- **TypeScript**: A statically typed superset of JavaScript that compiles to plain JavaScript. It's used for writing the server-side code.
- **Node.js**: A JavaScript runtime built on Chrome's V8 JavaScript engine. It's used for running the server-side code.
- **Express.js**: A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
- **Apollo Server**: A community-driven, open-source GraphQL server that works with any GraphQL schema. It's used for creating GraphQL server.
- **GraphQL**: A query language for APIs and a runtime for executing those queries with your existing data.
- **SQLite3**: A C library that provides a lightweight disk-based database. It allows accessing the database using a nonstandard variant of the SQL query language.
- **npm**: A package manager for the JavaScript programming language. It's used for managing project dependencies.
- **ts-node**: A TypeScript execution and REPL for Node.js, with source map support. It's used for running TypeScript code directly, without compiling it first.

### Future Features
- Find a way to inherit types in the schema to reduce redundancy 
- Organize DB such that we have a log of hardware transactions for better monitoring
- Find a way to export types from schema to resolver code for better consistency across codebase
- Have the DB hosted on a server
- The code in `resolver.ts` does not scale well imo if we were to add more features — it would be best to have each resolver have its functionality split across modules, and to have some common functions all these modules could interact with — for a small project like this I decided to just dump all the logic in one file
- Make the tests db seperate from the server DB
- More robust test suite


Hopefully this is sufficient though! I really enjoyed working on this and hopefully I can keep doing this work with Hack the North!