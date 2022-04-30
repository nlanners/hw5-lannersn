const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const constants = require('../lib/constants');

const datastore = ds.datastore;

router.use(bodyParser.json());

const c = constants.constants;



/* ------------------------------------------------- BEGIN MODEL FUNCTIONS ---------------------------------------- */

// POST a boat
async function post_boat(name, type, length, url) {
    let key = datastore.key(c.BOAT);

    if (is_name_unique(name)) {
        const new_boat = {"name":name, "type":type, "length":length, "loads": [], "self": ""};
        await datastore.save({"key":key, "data":new_boat});
        const [boat] = await datastore.get(key);
        boat.self = url + boat[ds.Datastore.KEY].id;
        await datastore.update({key:key, data:boat});
        return ds.fromDatastore(boat);
    } else {
        return c.FORBIDDEN;
    }

    
}

// GET a boat
async function get_boat(id) {
    try {
        const key = datastore.key([c.BOAT, parseInt(id, 10)]);
        const [boat] = await datastore.get(key);
        return ds.fromDatastore(boat);
    } catch (err) {
        return false;
    }
}

// GET all the boats in the database
async function get_all_boats(req) {
    try {
        let q = datastore.createQuery(BOAT).limit(3);
        const results = {};
        if (Object.keys(req.query).includes('cursor')) {
            q = q.start(req.query.cursor);
        }
        const entities = await datastore.runQuery(q)
        
        return entities[0];

    } catch (err) {
        console.log(err);
    }
}

// Delete a boat from database by id
async function delete_boat(id) {
    try {
        let boat = await get_boat(id);

        if (!boat) {
            return c.NOT_FOUND;
        }
    
        for (let l in boat.loads) {
            let load = await Loads.get_load(boat.loads[l].id);
            load.carrier = null;
            await datastore.update(ds.createEntity(load));
        }
    
        return datastore.delete(boat[ds.Datastore.KEY]);
    } catch (err) {
        console.log(err);
    }   
}

async function is_name_unique(name) {
    const boats = await get_all_boats();

    for (let boat of boats) {
        if (boat.name === name) {
            return false;
        }
    }

    return true;
}

/* --------------------------------------------- END MODEL FUNCTIONS ------------------------------------------------- */

/* ---------------------------------------- BEGIN CONTROLLER FUNCTIONS ----------------------------------------------- */

// CREATE boat
// request must be JSON
// response must be JSON
router.post('/', async (req, res) => {
    if (req.headers['content-type'] !== 'application/json') {
        res.status(c.UNSUPPORTED).json({"Error": "POST data must be sent as Content-Type: application/json"})
    } else if (req.headers['accept'] !== 'application/json') {
        res.status(c.NOT_ACCEPTABLE).json({"Error": "Response must be sent as application/json. Please change Accept request header."})
    } else if (req.body.name && req.body.type && req.body.length) {
        try {
            const url = ds.createURL(req);
            const boat = await post_boat(req.body.name, req.body.type, req.body.length, url);

            if (boat === c.FORBIDDEN) {
                res.status(c.FORBIDDEN).json({"Error": "Boat name has already been used. Please use a unique name."})
            }

            res.status(c.CREATED).json( boat );
        } catch (err) {
            console.log(err);
            res.status(c.ERROR).json({"Error": "Something went wrong creating the boat. Please try again"});
        }
    } else {
        res.status(c.BAD_REQUEST).json({"Error": "The request object is missing at least one of the required attributes"});
    }
})


// DELETE boat
router.delete('/:boat_id', async (req, res) => {
    try {
        const stuff = await delete_boat(req.params.boat_id)
        if (stuff === c.NOT_FOUND) {
            res.status(c.NOT_FOUND).json({"Error":"No boat with this boat_id exists"});
        } else {
            res.status(c.NO_CONTENT).end();
        }
    } catch (err) {
        console.log(err);
    }
});

// EDIT a boat
// request and response must be JSON
// updating the value of id is not allowed
// must support PUT and PATCH

// PATCH allows updating any subset of attributes while the others remain unchanged
router.patch('/:boat_id', (req, res) => {
    if (req.headers['content-type'] !== 'application/json') {
        res.status(c.UNSUPPORTED).json({"Error": "POST data must be sent as Content-Type: application/json"})
    } else if (req.headers['accept'] !== 'application/json') {
        res.status(c.NOT_ACCEPTABLE).json({"Error": "Response must be sent as application/json. Please change Accept request header."})
    } else {
        try {
            res.send();
        } catch (err) {
            console.log(err);
        }
    }
    
})

// PUT all attributes modified (except id)
// return status 303
router.put('/:boat_id', (req, res) => {
    if (req.headers['content-type'] !== 'application/json') {
        res.status(c.UNSUPPORTED).json({"Error": "POST data must be sent as Content-Type: application/json"})
    } else if (req.headers['accept'] !== 'application/json') {
        res.status(c.NOT_ACCEPTABLE).json({"Error": "Response must be sent as application/json. Please change Accept request header."})
    } else {
        try {
            res.status(c.SEE_OTHER);
        } catch (err) {
            console.log(err);
        }
    }
})

// VIEW a boat
// JSON or HTML as determined by client's Accept header
router.get('/:boat_id', async (req, res) => {
    if (req.headers['content-type'] !== 'application/json' || req.headers['content-type'] !== 'text/html') {
        res.status(c.NOT_ACCEPTABLE).json({"Error": "Response must be sent as application/json or text/html. Please change Accept request header."})
    } else {
        const boat = await get_boat(req.params.boat_id)
        if (boat) {
            res.status(c.OK).json(boat);
        } else {
            res.status(c.NOT_FOUND).json({"Error": "No boat with this boat_id exists"});
        }
    }

    
});

/* --------------------------------------------------- END CONTROLLER FUNCTIONS ----------------------------------------- */

module.exports = router;