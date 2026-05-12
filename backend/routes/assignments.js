const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const Assignment = require('../models/Assignment');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = Assignment.find().sort({ createdAt: -1 });
    if (req.user.role === 'admin') {
      query = query.populate('completedBy', 'name email');
    }
    const assignments = await query;
    const assignmentsWithStatus = assignments.map(assignment => {
      const assignmentObj = assignment.toObject();
      assignmentObj.completed = (assignmentObj.completedBy || []).some(id => id.toString() === req.user.userId);
      if (req.user.role === 'admin') {
        assignmentObj.completedBy = assignmentObj.completedBy || [];
      } else {
        delete assignmentObj.completedBy;
      }
      return assignmentObj;
    });
    res.json(assignmentsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching assignments' });
  }
});

router.post(
  '/',
  authMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('dueDate').notEmpty().withMessage('Due date is required'),
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
      const assignment = new Assignment({ ...req.body, createdBy: creatorId });
      await assignment.save();
      res.status(201).json(assignment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while adding assignment' });
    }
  }
);

router.post('/:id/complete', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can mark assignments completed' });
  }

  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (!assignment.completedBy.some(id => id.toString() === req.user.userId)) {
      assignment.completedBy.push(req.user.userId);
      await assignment.save();
    }

    res.json({ message: 'Assignment marked completed', completed: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while marking assignment completed' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { title, description, dueDate } = req.body;

  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    assignment.title = title || assignment.title;
    assignment.description = description || assignment.description;
    assignment.dueDate = dueDate || assignment.dueDate;
    await assignment.save();

    res.json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating assignment' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await assignment.deleteOne();
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting assignment' });
  }
});

module.exports = router;
