const { User, Job } = require('../models');
const logger = require('../config/logger');

/**
 * AI 匹配服务 - 为工作寻找合适的候选人
 * @param {String} jobId - 工作ID
 * @returns {Promise<Array>} - 匹配的候选人列表及分数
 */
const matchCandidatesForJob = async (jobId) => {
  try {
    // 获取工作详情
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // 获取所有候选人
    const candidates = await User.find({ role: 'Candidate' });
    
    // 计算匹配分数
    const matches = candidates.map(candidate => {
      // 基本匹配算法
      let matchScore = 0;
      let matchReasons = [];
      
      // 技能匹配 (最高 50 分)
      if (candidate.skills && candidate.skills.length > 0 && job.skills && job.skills.length > 0) {
        const matchingSkills = candidate.skills.filter(skill => 
          job.skills.some(jobSkill => 
            jobSkill.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(jobSkill.toLowerCase())
          )
        );
        
        const skillScore = Math.min(50, Math.round((matchingSkills.length / job.skills.length) * 50));
        matchScore += skillScore;
        
        if (matchingSkills.length > 0) {
          matchReasons.push(`具备 ${matchingSkills.length} 项相关技能`);
        }
      }
      
      // 简历加分 (有简历 +20 分)
      if (candidate.resumeIpfsHash) {
        matchScore += 20;
        matchReasons.push('提供了完整简历');
      }
      
      // 个人资料完整度 (最高 30 分)
      let profileCompleteness = 0;
      if (candidate.name) profileCompleteness += 10;
      if (candidate.bio && candidate.bio.length > 50) profileCompleteness += 10;
      if (candidate.socialLinks && Object.values(candidate.socialLinks).some(link => link)) profileCompleteness += 10;
      
      matchScore += profileCompleteness;
      if (profileCompleteness > 0) {
        matchReasons.push('个人资料完整');
      }
      
      // 确保分数在 0-100 范围内
      matchScore = Math.min(100, Math.max(0, matchScore));
      
      return {
        candidate: {
          id: candidate._id,
          walletAddress: candidate.walletAddress,
          name: candidate.name,
          email: candidate.email,
          skills: candidate.skills
        },
        matchScore,
        matchReason: matchReasons.join('，')
      };
    });
    
    // 按匹配分数排序
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    logger.error(`Error in matchCandidatesForJob: ${error.message}`);
    throw error;
  }
};

/**
 * AI 匹配服务 - 为候选人寻找合适的工作
 * @param {String} candidateId - 候选人ID
 * @returns {Promise<Array>} - 匹配的工作列表及分数
 */
const matchJobsForCandidate = async (candidateId) => {
  try {
    // 获取候选人详情
    const candidate = await User.findById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate with ID ${candidateId} not found`);
    }

    // 获取所有工作
    const jobs = await Job.find({}).populate('company');
    
    // 计算匹配分数
    const matches = jobs.map(job => {
      // 基本匹配算法
      let matchScore = 0;
      let matchReasons = [];
      
      // 技能匹配 (最高 60 分)
      if (candidate.skills && candidate.skills.length > 0 && job.skills && job.skills.length > 0) {
        const matchingSkills = job.skills.filter(skill => 
          candidate.skills.some(candidateSkill => 
            candidateSkill.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(candidateSkill.toLowerCase())
          )
        );
        
        const skillScore = Math.min(60, Math.round((matchingSkills.length / job.skills.length) * 60));
        matchScore += skillScore;
        
        if (matchingSkills.length > 0) {
          matchReasons.push(`技能与工作需求匹配度高`);
        }
      }
      
      // 工作类型匹配 (匹配 +20 分)
      if (job.type && candidate.preferences && candidate.preferences.jobType === job.type) {
        matchScore += 20;
        matchReasons.push(`工作类型符合偏好`);
      }
      
      // 远程工作匹配 (匹配 +20 分)
      if (candidate.preferences && candidate.preferences.remote !== undefined && 
          job.remote !== undefined && candidate.preferences.remote === job.remote) {
        matchScore += 20;
        matchReasons.push(`远程工作选项符合偏好`);
      }
      
      // 确保分数在 0-100 范围内
      matchScore = Math.min(100, Math.max(0, matchScore));
      
      return {
        job: {
          id: job._id,
          title: job.title,
          description: job.description,
          company: job.company,
          salary: job.salary,
          location: job.location,
          skills: job.skills,
          remote: job.remote
        },
        matchScore,
        matchReason: matchReasons.join('，')
      };
    });
    
    // 按匹配分数排序
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    logger.error(`Error in matchJobsForCandidate: ${error.message}`);
    throw error;
  }
};

module.exports = {
  matchCandidatesForJob,
  matchJobsForCandidate
};
