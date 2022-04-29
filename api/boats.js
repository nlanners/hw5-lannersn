const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const { PassThrough } = require('stream');

const datastore = ds.datastore;

router.use(bodyParser.json());

// CONSTANTS
const BOAT = 'Boats';
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const ERROR = 500;

/* ---------------------- BEGIN MODEL FUNCTIONS ------------------- */



/* ---------------------- END MODEL FUNCTIONS --------------------- */

/* --------------------- BEGIN CONTROLLER FUNCTIONS --------------- */

// CREATE boat
// request must be JSON
// response must be JSON
router.post('/', (req, res) => {
    try {

        res.send();
    } catch (err) {
        console.log(err);
    }
})


// DELETE boat
router.delete('/:boat_id', (req, res) => {
    try {
        res.send();
    } catch (err) {
        console.log(err);
    }
})

// EDIT a boat
// request and response must be JSON
// updating the value of id is not allowed
// must support PUT and PATCH

// PATCH allows updating any subset of attributes while the others remain unchanged
router.patch('/:boat_id', (req, res) => {
    try {
        res.send();
    } catch (err) {
        console.log(err);
    }
})

// PUT all attributes modified (except id)
// return status 303
router.put('/:boat_id', (req, res) => {
    try {
        res.send();
    } catch (err) {
        console.log(err);
    }
})

// VIEW a boat
// JSON or HTML as determined by client's Accept header
router.get('/:boat_id', (req, res) => {
    try {
        res.send();
    } catch (err) {
        console.log(err);
    }
})

/* --------------------- END CONTROLLER FUNCTIONS ----------------- */