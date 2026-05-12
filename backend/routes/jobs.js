const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const Job = require('../models/Job');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ postedAt: -1 });
    res.json(jobs);
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
      const job = new Job({ ...req.body, createdBy: req.user.userId });
      await job.save();
      res.status(201).json(job);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while adding job' });
    }
  }
);

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
