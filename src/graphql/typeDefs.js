const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    walletAddress: String!
    email: String
    role: String!
    name: String
    skills: [String]
    resumeIpfsHash: String
    bio: String
    profileImage: String
    socialLinks: SocialLinks
    createdAt: String
    updatedAt: String
  }

  type SocialLinks {
    github: String
    twitter: String
    linkedin: String
    website: String
  }

  input SocialLinksInput {
    github: String
    twitter: String
    linkedin: String
    website: String
  }

  type Job {
    id: ID!
    title: String!
    description: String!
    skillsRequired: [String]!
    salary: String!
    remote: Boolean!
    location: String
    employer: User!
    companyName: String
    companyLogo: String
    employmentType: String
    status: String!
    applicants: [User]
    createdAt: String
    updatedAt: String
  }

  type Task {
    id: ID!
    title: String!
    description: String!
    reward: Float!
    rewardToken: String
    employer: User!
    deadline: String
    status: String!
    bidders: [Bidder]
    winner: User
    contractTaskId: Int
    deliverables: [Deliverable]
    createdAt: String
    updatedAt: String
  }

  type Bidder {
    user: User!
    proposal: String
    bidAmount: Float
    bidDate: String
  }

  type Deliverable {
    title: String!
    description: String
    fileUrl: String
    submittedAt: String
  }

  input UserInput {
    email: String
    name: String
    skills: [String]
    bio: String
    profileImage: String
    socialLinks: SocialLinksInput
  }

  input JobInput {
    title: String!
    description: String!
    skillsRequired: [String]!
    salary: String!
    remote: Boolean!
    location: String
    companyName: String
    companyLogo: String
    employmentType: String
  }

  input TaskInput {
    title: String!
    description: String!
    reward: Float!
    rewardToken: String
    deadline: String
  }

  input BidInput {
    proposal: String!
    bidAmount: Float
  }

  input DeliverableInput {
    title: String!
    description: String
    fileUrl: String
  }

  type AuthResponse {
    token: String!
    user: User!
  }

  type Query {
    # User queries
    me: User
    user(walletAddress: String!): User
    users: [User]!

    # Job queries
    jobs(status: String): [Job]!
    job(id: ID!): Job
    jobsByEmployer(employerId: ID!): [Job]!
    searchJobs(query: String!): [Job]!

    # Task queries
    tasks(status: String): [Task]!
    task(id: ID!): Task
    tasksByEmployer(employerId: ID!): [Task]!

    # AI matching
    matchCandidates(jobId: ID!): [User]!
    matchJobsForCandidate(candidateId: ID!): [Job]!
  }

  type Mutation {
    # Auth mutations
    getNonce(walletAddress: String!): String!
    verifySignature(walletAddress: String!, signature: String!): AuthResponse!
    login(walletAddress: String!, signature: String!): AuthResponse!

    # User mutations
    updateUser(input: UserInput!): User!
    uploadResume(ipfsHash: String!): User!

    # Job mutations
    createJob(input: JobInput!): Job!
    updateJob(id: ID!, input: JobInput!): Job!
    closeJob(id: ID!): Job!
    applyToJob(jobId: ID!): Job!

    # Task mutations
    createTask(input: TaskInput!): Task!
    updateTask(id: ID!, input: TaskInput!): Task!
    cancelTask(id: ID!): Task!
    bidOnTask(taskId: ID!, input: BidInput!): Task!
    awardTask(taskId: ID!, bidderId: ID!): Task!
    submitDeliverable(taskId: ID!, input: DeliverableInput!): Task!
  }
`;

module.exports = typeDefs;
