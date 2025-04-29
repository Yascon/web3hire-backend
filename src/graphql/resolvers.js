// 使用真实数据库模型
const { User, Job, Task } = require('../models');
const { AuthenticationError, UserInputError } = require('apollo-server-express');
const { 
  blockchainService, 
  ipfsService, 
  aiMatchingService, 
  authService 
} = require('../services');

// Helper function to verify JWT token
const verifyToken = (context) => {
  try {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError('Authentication token must be provided');
    }

    const token = authHeader.split(' ')[1];
    return authService.verifyToken(token);
  } catch (error) {
    throw new AuthenticationError(`Invalid/Expired token: ${error.message}`);
  }
};

const resolvers = {
  Query: {
    // User queries
    me: (_, __, context) => {
      const user = verifyToken(context);
      return User.findById(user.id);
    },
    user: (_, { walletAddress }) => {
      return User.findOne({ walletAddress });
    },
    users: async () => {
      return await User.find({}).clone();
    },

    // Job queries
    jobs: async (_, { status }) => {
      const query = status ? { status } : {};
      return await Job.find(query).clone().populate('employerId');
    },
    job: (_, { id }) => {
      return Job.findById(id).populate('employerId').populate('applicants');
    },
    jobsByEmployer: (_, { employerId }) => {
      return Job.find({ employerId }).populate('employerId');
    },
    searchJobs: (_, { query }) => {
      return Job.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .populate('employerId');
    },

    // Task queries
    tasks: (_, { status }) => {
      const query = status ? { status } : {};
      return Task.find(query).populate('employerId').populate('bidders.userId').populate('winner');
    },
    task: (_, { id }) => {
      return Task.findById(id)
        .populate('employerId')
        .populate('bidders.userId')
        .populate('winner');
    },
    tasksByEmployer: (_, { employerId }) => {
      return Task.find({ employerId }).populate('employerId');
    },

    // AI matching
    matchCandidates: async (_, { jobId }) => {
      try {
        return await aiMatchingService.matchCandidatesForJob(jobId);
      } catch (error) {
        throw new Error(`Error matching candidates: ${error.message}`);
      }
    },
    
    // Match jobs for a candidate
    matchJobsForCandidate: async (_, { candidateId }, context) => {
      const user = verifyToken(context);
      try {
        // Check if user is requesting their own matches or is an admin
        if (user.id !== candidateId && user.role !== 'ADMIN') {
          throw new AuthenticationError('Not authorized to view these matches');
        }
        
        return await aiMatchingService.matchJobsForCandidate(candidateId);
      } catch (error) {
        throw new Error(`Error matching jobs for candidate: ${error.message}`);
      }
    }
  },

  Mutation: {
    // Auth mutations
    getNonce: async (_, { walletAddress }) => {
      try {
        return await authService.getNonceForWallet(walletAddress);
      } catch (error) {
        throw new Error(`Error generating nonce: ${error.message}`);
      }
    },
    verifySignature: async (_, { walletAddress, signature }) => {
      try {
        const result = await authService.verifySignature(walletAddress, signature);
        return result;
      } catch (error) {
        throw new AuthenticationError(`Authentication failed: ${error.message}`);
      }
    },
    login: async (_, { walletAddress, signature }) => {
      try {
        // 使用 authService 验证签名并获取用户信息
        const authResult = await authService.verifySignature(walletAddress, signature);
        return authResult;
      } catch (error) {
        throw new AuthenticationError(`Authentication failed: ${error.message}`);
      }
    },

    // User mutations
    updateUser: async (_, { input }, context) => {
      const user = verifyToken(context);
      try {
        const updatedUser = await User.findByIdAndUpdate(
          user.id,
          { ...input },
          { new: true }
        );
        return updatedUser;
      } catch (error) {
        throw new Error(`Error updating user: ${error.message}`);
      }
    },
    uploadResume: async (_, { file }, context) => {
      const user = verifyToken(context);
      try {
        // Upload file to IPFS
        const ipfsHash = await ipfsService.uploadFile(file.buffer, file.filename);
        
        // Register resume on blockchain
        if (user.privateKey) {
          await blockchainService.registerResume(ipfsHash, user.privateKey);
        }
        
        // Update user's resume IPFS hash
        const updatedUser = await User.findByIdAndUpdate(
          user.id,
          { resumeIpfsHash: ipfsHash, updatedAt: new Date() },
          { new: true }
        );
        
        return updatedUser;
      } catch (error) {
        throw new Error(`Error uploading resume: ${error.message}`);
      }
    },

    // Job mutations
    createJob: async (_, { input }, context) => {
      const user = verifyToken(context);
      try {
        // Check if user is an employer
        if (user.role !== 'Employer' && user.role !== 'Admin') {
          throw new AuthenticationError('Only employers can create jobs');
        }
        
        // Create job on blockchain if user has private key
        let contractJobId = null;
        let txHash = null;
        
        if (user.privateKey) {
          const blockchainResult = await blockchainService.createJob(input, user.privateKey);
          contractJobId = blockchainResult.jobId;
          txHash = blockchainResult.txHash;
        }
        
        const newJob = new Job({
          ...input,
          employerId: user.id,
          status: 'Open',
          contractJobId,
          txHash,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newJob.save();
        return newJob.populate('employerId');
      } catch (error) {
        throw new Error(`Error creating job: ${error.message}`);
      }
    },
    updateJob: async (_, { id, input }, context) => {
      const user = verifyToken(context);
      try {
        const job = await Job.findById(id);
        if (!job) {
          throw new UserInputError('Job not found');
        }

        if (job.employerId.toString() !== user.id && user.role !== 'Admin') {
          throw new AuthenticationError('Not authorized to update this job');
        }

        const updatedJob = await Job.findByIdAndUpdate(
          id,
          { ...input },
          { new: true }
        ).populate('employerId');

        return updatedJob;
      } catch (error) {
        throw new Error(`Error updating job: ${error.message}`);
      }
    },
    closeJob: async (_, { id }, context) => {
      const user = verifyToken(context);
      try {
        const job = await Job.findById(id);
        if (!job) {
          throw new UserInputError('Job not found');
        }

        if (job.employerId.toString() !== user.id && user.role !== 'Admin') {
          throw new AuthenticationError('Not authorized to close this job');
        }

        const updatedJob = await Job.findByIdAndUpdate(
          id,
          { status: 'Closed' },
          { new: true }
        ).populate('employerId');

        return updatedJob;
      } catch (error) {
        throw new Error(`Error closing job: ${error.message}`);
      }
    },
    applyToJob: async (_, { jobId }, context) => {
      const user = verifyToken(context);
      if (user.role !== 'Candidate') {
        throw new AuthenticationError('Only candidates can apply to jobs');
      }

      try {
        const job = await Job.findById(jobId);
        if (!job) {
          throw new UserInputError('Job not found');
        }

        if (job.status !== 'Open') {
          throw new UserInputError('This job is not accepting applications');
        }

        // Check if already applied
        if (job.applicants.includes(user.id)) {
          throw new UserInputError('You have already applied to this job');
        }

        // Add user to applicants
        const updatedJob = await Job.findByIdAndUpdate(
          jobId,
          { $push: { applicants: user.id } },
          { new: true }
        ).populate('employerId').populate('applicants');

        return updatedJob;
      } catch (error) {
        throw new Error(`Error applying to job: ${error.message}`);
      }
    },

    // Task mutations
    createTask: async (_, { input }, context) => {
      const user = verifyToken(context);
      try {
        // Check if user is an employer
        if (user.role !== 'Employer' && user.role !== 'Admin') {
          throw new AuthenticationError('Only employers can create tasks');
        }
        
        // Create task on blockchain if user has private key
        let contractTaskId = null;
        let txHash = null;
        
        if (user.privateKey) {
          const blockchainResult = await blockchainService.createTask(input, user.privateKey);
          contractTaskId = blockchainResult.taskId;
          txHash = blockchainResult.txHash;
        }
        
        const newTask = new Task({
          ...input,
          employerId: user.id,
          status: 'Open',
          contractTaskId,
          txHash,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newTask.save();
        return newTask.populate('employerId');
      } catch (error) {
        throw new Error(`Error creating task: ${error.message}`);
      }
    },
    updateTask: async (_, { id, input }, context) => {
      const user = verifyToken(context);
      try {
        const task = await Task.findById(id);
        if (!task) {
          throw new UserInputError('Task not found');
        }

        if (task.employerId.toString() !== user.id && user.role !== 'Admin') {
          throw new AuthenticationError('Not authorized to update this task');
        }

        const updatedTask = await Task.findByIdAndUpdate(
          id,
          { ...input },
          { new: true }
        ).populate('employerId');

        return updatedTask;
      } catch (error) {
        throw new Error(`Error updating task: ${error.message}`);
      }
    },
    cancelTask: async (_, { id }, context) => {
      const user = verifyToken(context);
      try {
        const task = await Task.findById(id);
        if (!task) {
          throw new UserInputError('Task not found');
        }

        if (task.employerId.toString() !== user.id && user.role !== 'Admin') {
          throw new AuthenticationError('Not authorized to cancel this task');
        }

        const updatedTask = await Task.findByIdAndUpdate(
          id,
          { status: 'Cancelled' },
          { new: true }
        ).populate('employerId');

        return updatedTask;
      } catch (error) {
        throw new Error(`Error cancelling task: ${error.message}`);
      }
    },
    bidOnTask: async (_, { taskId, input }, context) => {
      const user = verifyToken(context);
      try {
        const task = await Task.findById(taskId);
        if (!task) {
          throw new UserInputError('Task not found');
        }

        // Check if task is open
        if (task.status !== 'Open') {
          throw new UserInputError('This task is not open for bidding');
        }

        // Check if already bid
        const alreadyBid = task.bidders.some(bidder => 
          bidder.userId.toString() === user.id
        );

        if (alreadyBid) {
          throw new UserInputError('You have already bid on this task');
        }
        
        // Submit bid to blockchain if user has private key and task has contractTaskId
        let txHash = null;
        if (user.privateKey && task.contractTaskId) {
          const blockchainResult = await blockchainService.bidOnTask(
            task.contractTaskId, 
            input, 
            user.privateKey
          );
          txHash = blockchainResult.txHash;
        }

        // Add bid
        const updatedTask = await Task.findByIdAndUpdate(
          taskId,
          { 
            $push: { 
              bidders: {
                userId: user.id,
                proposal: input.proposal,
                bidAmount: input.bidAmount,
                bidDate: new Date(),
                txHash
              } 
            } 
          },
          { new: true }
        )
        .populate('employerId')
        .populate('bidders.userId');

        return updatedTask;
      } catch (error) {
        throw new Error(`Error bidding on task: ${error.message}`);
      }
    },
    awardTask: async (_, { taskId, bidderId }, context) => {
      const user = verifyToken(context);
      try {
        const task = await Task.findById(taskId);
        if (!task) {
          throw new UserInputError('Task not found');
        }

        if (task.employerId.toString() !== user.id && user.role !== 'Admin') {
          throw new AuthenticationError('Not authorized to award this task');
        }

        if (task.status !== 'Open') {
          throw new UserInputError('This task cannot be awarded');
        }

        // Check if bidder exists
        const bidderExists = task.bidders.some(bidder => 
          bidder.userId.toString() === bidderId
        );

        if (!bidderExists) {
          throw new UserInputError('Selected bidder has not bid on this task');
        }
        
        // Get winner's wallet address
        const winner = await User.findById(bidderId);
        if (!winner) {
          throw new UserInputError('Winner not found');
        }
        
        // Award task on blockchain if user has private key and task has contractTaskId
        let txHash = null;
        if (user.privateKey && task.contractTaskId) {
          const blockchainResult = await blockchainService.awardTask(
            task.contractTaskId, 
            winner.walletAddress,
            user.privateKey
          );
          txHash = blockchainResult.txHash;
        }

        const updatedTask = await Task.findByIdAndUpdate(
          taskId,
          { 
            status: 'InProgress',
            winner: bidderId,
            awardTxHash: txHash
          },
          { new: true }
        )
        .populate('employerId')
        .populate('bidders.userId')
        .populate('winner');

        return updatedTask;
      } catch (error) {
        throw new Error(`Error awarding task: ${error.message}`);
      }
    },
    submitDeliverable: async (_, { taskId, input, file }, context) => {
      const user = verifyToken(context);
      try {
        const task = await Task.findById(taskId);
        if (!task) {
          throw new UserInputError('Task not found');
        }

        if (task.winner.toString() !== user.id) {
          throw new AuthenticationError('Only the winner can submit deliverables');
        }

        if (task.status !== 'InProgress') {
          throw new UserInputError('This task is not in progress');
        }
        
        // Upload file to IPFS if provided
        let fileUrl = input.fileUrl;
        if (file) {
          const ipfsHash = await ipfsService.uploadFile(file.buffer, file.filename);
          fileUrl = ipfsService.getIpfsUrl(ipfsHash);
        }
        
        // Submit deliverable to blockchain if user has private key and task has contractTaskId
        let txHash = null;
        if (user.privateKey && task.contractTaskId) {
          const deliverableData = {
            ...input,
            fileUrl
          };
          
          const blockchainResult = await blockchainService.submitDeliverable(
            task.contractTaskId, 
            deliverableData,
            user.privateKey
          );
          txHash = blockchainResult.txHash;
        }

        // Add deliverable
        const updatedTask = await Task.findByIdAndUpdate(
          taskId,
          { 
            $push: { 
              deliverables: {
                ...input,
                fileUrl,
                txHash,
                submittedAt: new Date()
              } 
            } 
          },
          { new: true }
        )
        .populate('employerId')
        .populate('bidders.userId')
        .populate('winner');

        return updatedTask;
      } catch (error) {
        throw new Error(`Error submitting deliverable: ${error.message}`);
      }
    }
  },

  // Field resolvers
  Job: {
    employer: (parent) => {
      if (parent.employerId && typeof parent.employerId === 'object') {
        return parent.employerId;
      }
      return User.findById(parent.employerId);
    }
  },
  Task: {
    employer: (parent) => {
      if (parent.employerId && typeof parent.employerId === 'object') {
        return parent.employerId;
      }
      return User.findById(parent.employerId);
    },
    bidders: (parent) => {
      return parent.bidders.map(async (bidder) => {
        const user = bidder.userId && typeof bidder.userId === 'object' 
          ? bidder.userId 
          : await User.findById(bidder.userId);
        
        return {
          user,
          proposal: bidder.proposal,
          bidAmount: bidder.bidAmount,
          bidDate: bidder.bidDate
        };
      });
    }
  }
};

module.exports = resolvers;
