const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const constants = require('../lib/constants');

const datastore = ds.datastore;

router.use(bodyParser.json());

const c = constants.constants;



/* ------------------------------------------------- BEGIN MODEL FUNCTIONS ---------------------------------------- */

// hash name
// source: https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
// function hash_name (str, seed = 0) {
//     let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
//     for (let i = 0, ch; i < str.length; i++) {
//         ch = str.charCodeAt(i);
//         h1 = Math.imul(h1 ^ ch, 2654435761);
//         h2 = Math.imul(h2 ^ ch, 1597334677);
//     }
//     h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
//     h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
//     return 4294967296 * (2097151 & h2) + (h1>>>0);
// };


// POST a boat
async function post_boat(name, type, length, url) {
    let key = datastore.key(c.BOAT);

    try {
        if (await is_name_unique(name)) {
            const new_boat = {"name":name, "type":type, "length":length, "self": ""};
            await datastore.save({"key":key, "data":new_boat});
            const [boat] = await datastore.get(key);
            boat.self = url + boat[ds.Datastore.KEY].id;
            await datastore.update({key:key, data:boat});
            return ds.fromDatastore(boat);
        } else {
           return c.FORBIDDEN;
        }
    } catch (err) {
        console.log('post_boat');
        console.log(err);
        return c.ERROR;
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
async function get_all_boats() {
    try {
        let q = datastore.createQuery(c.BOAT);
        const entities = await datastore.runQuery(q)
        return entities[0];

    } catch (err) {
        console.log('get_all_boats');
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

// Modify all attributes of a boat
async function put_boat(id, name, type, length, url) {
    try {
        const key = datastore.key([c.BOAT, parseInt(id, 10)]);
        const boat = {"name":name, "type":type, "length":length, "self":url};
        if (await is_name_unique(name)) {
            if (await datastore.save({"key":key, "data":boat}) ) {
                return c.SEE_OTHER;
            } else {
                return c.ERROR;
            }
        } else {
            return c.FORBIDDEN;
        }
    } catch (err) {
        console.log('put_boat');
        console.log(err);
        return c.ERROR;
    }
}

// Patch any subset of boat attributes
async function patch_boat(id, body) {
    let boat = await get_boat(id);

    if (body.name) {
        if (await is_name_unique(body.name)){
            boat.name = body.name;
        } else {
            return [c.FORBIDDEN];
        }
    }
    boat.type = body.type || boat.type;
    boat.length = body.length || boat.length
    delete boat.id;
    const entity = ds.createEntity(boat);

    try {
        if (await datastore.update(entity)) {
            return [c.SEE_OTHER, boat.self];
        }
    } catch (err) {
        console.log('patch_boat');
        console.log(err);
    }
}

// check that given boat name is unique in the database
async function is_name_unique(name) {
    try {
        const boats = await get_all_boats();
    
        if (boats) {
            for (let boat of boats) {
                if (boat.name === name) {
                    return false;
                }
            }
        }
        return true;

    } catch (err) {
        console.log(err);
    }
}

// create an HTML representation of a boat
function createHTML(boat) {
    let html = `<ul>`;
    const keys = Object.keys(boat);

    for (let key of keys) {
        html += `<li>${key}=${boat[key]}</li>`;
    }
    html += '</ul>';

    return html;
}

/* --------------------------------------------- END MODEL FUNCTIONS ------------------------------------------------- */

/* ---------------------------------------- BEGIN CONTROLLER FUNCTIONS ----------------------------------------------- */

// CREATE boat
router.post('/', async (req, res) => {
    const accepts = req.accepts(['application/json']);

    if (req.get('content-type') !== 'application/json') {
        res.status(c.UNSUPPORTED).send("POST data must be sent as Content-Type: application/json");

    } else if (!accepts) {
        res.status(c.NOT_ACCEPTABLE).send("Response must be sent as application/json. Please change Accept request header.");

    } else if (req.body.name && req.body.type && req.body.length) {

        try {
            const url = ds.createURL(req);
            const boat = await post_boat(req.body.name, req.body.type, req.body.length, url);

            switch (boat) {
                case c.FORBIDDEN:
                    res.status(c.FORBIDDEN).send("Boat name has already been used. Please use a unique name.");
                    break;
                case c.ERROR:
                    res.status(c.ERROR).send("Something went wrong creating the boat. Please try again");
                    break;
                default:
                    res.status(c.CREATED).location(boat.self).json( boat );
            }
        } catch (err) {
            console.log(err);
            res.status(c.ERROR).send("Something went wrong creating the boat. Please try again");
        }

    } else {
        res.status(c.BAD_REQUEST).send("The request object is missing at least one of the required attributes");
    }
})


// DELETE boat
router.delete('/:boat_id', async (req, res) => {
    try {
        const stuff = await delete_boat(req.params.boat_id)
        if (stuff === c.NOT_FOUND) {
            res.status(c.NOT_FOUND).send("No boat with this boat_id exists");
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
router.patch('/:boat_id', async (req, res) => {
    const accepts = req.accepts(['application/json']);
    if (req.get('content-type') !== 'application/json') {
        res.status(c.UNSUPPORTED).send("POST data must be sent as Content-Type: application/json")
    } else if (!accepts) {
        res.status(c.NOT_ACCEPTABLE).send("Response must be sent as application/json. Please change Accept request header.")
    } else {
        try {
            const result = await patch_boat(req.params.boat_id, req.body);

            switch (result[0]) {
                case c.SEE_OTHER:
                    res.status(c.SEE_OTHER).location(result[1]).end();
                    break;
                case c.FORBIDDEN:
                    res.status(c.FORBIDDEN).send("Boat name must be unique");
                    break;
                default:
                    res.status(c.ERROR).send("Something broke. Please try again.");
            }
        } catch (err) {
            console.log('router.patch');
            console.log(err);
        }
    }
    
})

// PUT all attributes modified (except id)
// return status 303
router.put('/:boat_id', async (req, res) => {
    if (req.get('content-type') !== 'application/json') {
        res.status(c.UNSUPPORTED).send("POST data must be sent as Content-Type: application/json")
    } else if (req.headers.accept !== 'application/json' && req.headers.accept !== '*/*') {
        res.status(c.NOT_ACCEPTABLE).send("Response must be sent as application/json. Please change Accept request header.")
    } else if (req.body.id) {
        res.status(c.BAD_REQUEST).send("Attribute 'id' can not be modified.");
    } else if (req.body.name && req.body.type && req.body.length) {
        try {
            const url = ds.createURL(req) + req.url.slice(1);
            const result = await put_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length, url)
            switch (result) {
                case c.SEE_OTHER:
                    res.location(url);
                    res.status(c.SEE_OTHER).end();
                    break;

                case c.FORBIDDEN:
                    res.status(c.FORBIDDEN).send('Boat name must be unique');
                    break;

                default:
                    res.status(c.ERROR).send("Something didn't work correctly. Please try again.");
                    break;
            }
            
        } catch (err) {
            console.log('router.put');
            console.log(err);
        }
    }
})

// VIEW a boat
// JSON or HTML as determined by client's Accept header
router.get('/:boat_id', async (req, res) => {
    const accepts = req.accepts(['application/json', 'text/html']);
    if (!accepts) {
        res.status(c.NOT_ACCEPTABLE).send("Response must be sent as application/json or text/html. Please change Accept request header.")
    } else {
        const boat = await get_boat(req.params.boat_id)
        if (boat) {
            if (accepts === 'text/html'){
                res.status(c.OK).send(createHTML(boat));
            } else if (accepts === 'application/json') {
                res.status(c.OK).json(boat);
            } else {
                res.status(c.ERROR).send('Content type got messed up');
            }
            
        } else {
            res.status(c.NOT_FOUND).send("No boat with this boat_id exists");
        }
    }
});

// GET all boats
router.get('/', async (req, res) => {
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        res.status(c.NOT_ACCEPTABLE).send("Response must be sent as application/json. Please change Accept request header.");
    } else {
        try {
            let boats = await get_all_boats();
            boats = boats.map(ds.fromDatastore);
            res.status(c.OK).json({"boats": boats});
        } catch (err) {
            console.log('router.get("/")');
            console.log(err);
        }
    }
})

// BAD ROUTES
router.delete('/', (req, res) => {
    res.set('Accept', 'GET, POST');
    res.status(c.BAD_METHOD).send('Not an acceptable method.');
});

router.put('/', (req, res) => {
    res.set('Accept', 'GET, POST');
    res.status(c.BAD_METHOD).send('Not an acceptable method.');
});

// router.get('/', (req, res) => {
//     res.set('Accept', 'PUT');
//     res.status(c.BAD_METHOD).send('Not an acceptable method.');
// });

router.patch('/', (req, res) => {
    res.set('Accept', 'GET, POST');
    res.status(c.BAD_METHOD).send('Not an acceptable method.');
})

/* --------------------------------------------------- END CONTROLLER FUNCTIONS ----------------------------------------- */

module.exports = router;