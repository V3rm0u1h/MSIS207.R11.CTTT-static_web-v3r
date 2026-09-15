const express = require('express');
const router = express.Router();
const helloController = require('../controllers/hello.controller');

router.get('/hello', helloController.getHello);
router.get('/health', helloController.getHealth);

module.exports = router;