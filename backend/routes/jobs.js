const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const Job = require('../models/Job');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = Job.find().sort({ postedAt: -1 });
    if (req.user.role === 'admin') {
      query = query.populate('applicants', 'name email');
    }
    const jobs = await query;
    const jobsWithStatus = jobs.map(job => {
      const jobObj = job.toObject();
      jobObj.applied = (jobObj.applicants || []).some(id => id.toString() === req.user.userId);
      if (req.user.role === 'admin') {
        jobObj.applicants = jobObj.applicants || [];
      } else {
        delete jobObj.applicants;
      }
      return jobObj;
    });
    res.json(jobsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching jobs' });
  }
});

router.post(
  '/',
  authMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const creatorId = req.user.userId || req.user.id || req.user._id;
      const job = new Job({ ...req.body, createdBy: creatorId });
      await job.save();
      res.status(201).json(job);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while adding job' });
    }
  }
);

router.post('/:id/apply', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can apply for jobs' });
  }

  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!job.applicants.some(id => id.toString() === req.user.userId)) {
      job.applicants.push(req.user.userId);
      await job.save();
    }

    res.json({ message: 'Applied for job successfully', applied: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while applying for job' });
  }
});

router.put(
  '/:id',
  authMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      job.title = req.body.title;
      job.description = req.body.description;
      job.company = req.body.company;
      job.location = req.body.location;
      await job.save();

      res.json(job);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while updating job' });
    }
  }
);

router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting job' });
  }
});

module.exports = router;
