const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    walletAddress: String!
    role: String!
    name: String
    email: String
    skills: [String]
    bio: String
    avatar: String
    createdAt: String
    updatedAt: String
  }

  type Job {
    id: ID!
    title: String!
    description: String!
    skillsRequired: [String!]!
    salary: String!
    remote: Boolean!
    location: String
    employer: User!
    status: String!
    applicants: [User]
    contractJobId: String
    txHash: String
    createdAt: String
    updatedAt: String
  }

  type Task {
    id: ID!
    title: String!
    description: String!
    skillsRequired: [String!]!
    reward: String!
    rewardToken: String!
    deadline: String!
    creator: User!
    status: String!
    bidders: [User]
    winner: User
    contractTaskId: String
    txHash: String
    createdAt: String
    updatedAt: String
  }

  type Resume {
    id: ID!
    owner: User!
    ipfsHash: String!
    createdAt: String
    updatedAt: String
  }

  type Auth {
    token: String!
    user: User!
  }

  type DashboardStats {
    userCount: Int!
    employerCount: Int!
    candidateCount: Int!
    jobCount: Int!
    openJobCount: Int!
    filledJobCount: Int!
    taskCount: Int!
    completedTaskCount: Int!
    recentJobs: [Job]
    recentTasks: [Task]
    monthlyJobStats: [MonthStat]
    monthlyTaskStats: [MonthStat]
  }

  type MonthStat {
    month: String!
    count: Int!
  }

  input UserInput {
    name: String
    email: String
    skills: [String]
    bio: String
    avatar: String
  }

  input JobInput {
    title: String!
    description: String!
    skillsRequired: [String!]!
    salary: String!
    remote: Boolean!
    location: String
    contractJobId: String
    txHash: String
  }

  input JobUpdateInput {
    title: String
    description: String
    skillsRequired: [String]
    salary: String
    remote: Boolean
    location: String
    status: String
    contractJobId: String
    txHash: String
  }

  input TaskInput {
    title: String!
    description: String!
    skillsRequired: [String!]!
    reward: String!
    rewardToken: String!
    deadline: String!
    contractTaskId: String
    txHash: String
  }

  input TaskUpdateInput {
    title: String
    description: String
    skillsRequired: [String]
    reward: String
    rewardToken: String
    deadline: String
    status: String
    contractTaskId: String
    txHash: String
  }

  type Query {
    me: User
    user(id: ID!): User
    users: [User]
    job(id: ID!): Job
    jobs: [Job]
    jobsByEmployer(employerId: ID!): [Job]
    jobsByStatus(status: String!): [Job]
    task(id: ID!): Task
    tasks: [Task]
    tasksByCreator(creatorId: ID!): [Task]
    tasksByStatus(status: String!): [Task]
    resume(ownerId: ID!): Resume
    dashboardStats: DashboardStats
  }

  type Mutation {
    getNonce(walletAddress: String!): String!
    verifySignature(walletAddress: String!, signature: String!): Auth
    updateUser(id: ID!, input: UserInput!): User
    createJob(input: JobInput!): Job
    updateJob(id: ID!, input: JobUpdateInput!): Job
    applyToJob(jobId: ID!): Job
    createTask(input: TaskInput!): Task
    updateTask(id: ID!, input: TaskUpdateInput!): Task
    placeBid(taskId: ID!): Task
    awardTask(taskId: ID!, winnerId: ID!): Task
    submitDeliverable(taskId: ID!, title: String!, description: String!, fileUrl: String!): Task
    registerResume(ipfsHash: String!): Resume
  }
`;

module.exports = { typeDefs };
