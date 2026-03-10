import { Router } from 'express';
import { handleChat } from '../controllers/chatController.js';
import { handleToolExecution, availableTools } from '../controllers/toolController.js';
var router = Router();
router.post('/chat', handleChat);
router.post('/tools/execute', handleToolExecution);
router.get('/tools', function (req, res) {
    res.json(availableTools);
});
export default router;
