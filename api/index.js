const router = require('express').Router();

router.use('/boats', require('./boats'));

module.exports = router;