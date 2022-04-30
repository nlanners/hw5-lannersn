const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const constants = require('../lib/constants');

const datastore = ds.datastore;

router.use(bodyParser.json());

const c = constants.constants;
const m = constants.messages;


/* ------------------------------------------------- BEGIN MODEL FUNCTIONS ---------------------------------------- */


// POST a boat
async function post_boat(name, type, length, url) {
    let key = datastore.key(c.BOAT);

    if (!check_name(name)) {
        return [c.BAD_REQUEST, m.BAD_REQUEST_NAME];
    }

    try {
        if (await is_name_unique(name)) {
            const new_boat = {"name":name, "type":type, "length":length, "self": ""};
            await datastore.save({"key":key, "data":new_boat});
            const [boat] = await datastore.get(key);
            boat.self = url + boat[ds.Datastore.KEY].id;
            await datastore.update({key:key, data:boat});
            return [c.CREATED, ds.fromDatastore(boat)];
        } else {
           return [c.FORBIDDEN, null];
        }
    } catch (err) {
        console.log('post_boat');
        console.log(err);
        return [c.ERROR, null];
    }

    
}

// GET a boat
async function get_boat(id) {
    try {
        const key = datastore.key([c.BOAT, parseInt(id, 10)]);
        const [boat] = await datastore.get(key);
        return [c.OK, ds.fromDatastore(boat)];
    } catch (err) {
        return [c.NOT_FOUND, null];
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
        return c.ERROR;
    }
}

// Delete a boat from database by id
async function delete_boat(id) {
    try {
        const key = datastore.key([c.BOAT, parseInt(id, 10)]);
    
        const results = await datastore.delete(key);

        if (results[0]. indexUpdates === 0){
            return c.NOT_FOUND;

        } else {
            return c.NO_CONTENT;
        }
        
    } catch (err) {
        console.log('delete_boat');
        console.log(err);
        return c.ERROR;
    }   
}

// Modify all attributes of a boat
async function put_boat(id, name, type, length, url) {
    if (!check_name(name)) {
        return c.BAD_REQUEST;
    }

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
    boat = boat[1];

    if (body.name && check_name(body.name)) {
        if (await is_name_unique(body.name)){
            boat.name = body.name;
        } else {
            return [c.FORBIDDEN, null];
        }
    } else {
        return [c.BAD_REQUEST, m.BAD_REQUEST_NAME];
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
        return [c.ERROR, null];
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
        console.log('is_name_unique');
        console.log(err);
        return false;
    }
}

// create an HTML representation of a boat
function createHTML(boat) {
    let html = '<ul>';
    const keys = Object.keys(boat);

    for (let key of keys) {
        html += `<li>${key}=${boat[key]}</li>`;
    }
    html += '</ul>';

    return html;
}

// validate boat name
function check_name(name) {
    if (name.length <= c.name_length) {
        return name.match(c.is_alpha);
    } else {
        return false;
    }
}

// send appropriate response
function handle_response(res, result, extra=null) {
    switch (result) {
        case c.BAD_METHOD:
            res.set('Accept', 'GET, POST');
            res.status(c.BAD_METHOD).send(m.BAD_METHOD);
            break;

        case c.BAD_REQUEST:
            res.status(c.BAD_REQUEST).send(extra);
            break;

        case c.FORBIDDEN:
            res.status(c.FORBIDDEN).send(m.FORBIDDEN);
            break;

        case c.CREATED:
            res.status(c.CREATED).location(extra.self).json( extra );
            break;

        case c.ERROR:
            res.status(c.ERROR).send(extra);
            break;

        case c.NO_CONTENT:
            res.status(c.NO_CONTENT).end();
            break;

        case c.NOT_ACCEPTABLE:
            res.status(c.NOT_ACCEPTABLE).send(m.NOT_ACCEPTABLE + extra);
            break;

        case c.NOT_FOUND:
            res.status(c.NOT_FOUND).send(m.NOT_FOUND);
            break;
        
        case c.OK:
            // send HTML
            if (extra[1] === 'text/html'){
                res.status(c.OK).send(createHTML(extra[0]));

            // send JSON
            } else if (extra[1] === 'application/json') {
                res.status(c.OK).json(extra[0]);

            // error
            } else {
                res.status(c.ERROR).send(message);
            }
            break;
            
        case c.SEE_OTHER:
            res.status(c.SEE_OTHER).location(extra).end();
            break;

        case c.UNSUPPORTED:
            res.status(c.UNSUPPORTED).send(m.UNSUPPORTED);
            break;

    }
}

/* --------------------------------------------- END MODEL FUNCTIONS ------------------------------------------------- */

/* ---------------------------------------- BEGIN CONTROLLER FUNCTIONS ----------------------------------------------- */

// CREATE boat
router.post('/', async (req, res) => {
    const accepts = req.accepts(['application/json']);

    // check request content type is correct
    if (req.get('content-type') !== 'application/json') {
        handle_response(res, c.UNSUPPORTED);

    // check client response acceptable
    } else if (!accepts) {
        handle_response(res, c.NOT_ACCEPTABLE, 'application/json');

    // validate attributes
    } else if (req.body.name && req.body.type && req.body.length) {

        try {
            // create boat in database
            const url = ds.createURL(req);
            const boat = await post_boat(req.body.name, req.body.type, req.body.length, url);

            // handle response
            handle_response(res, boat[0], boat[1]);
            
        } catch (err) {
            console.log('router.post');
            console.log(err);
            handle_response(res, c.ERROR);
        }

    // attributes failed
    } else {
        handle_response(res, c.BAD_REQUEST, m.BAD_REQUEST_ATTR);
    }
})


// DELETE boat
router.delete('/:boat_id', async (req, res) => {
    try {
        // remove boat from database
        const result = await delete_boat(req.params.boat_id)
        handle_response(res, result);

    } catch (err) {
        console.log('router.delete');
        console.log(err);
        handle_response(res, c.ERROR);
    }
});

// EDIT a boat

// PATCH allows updating any subset of attributes while the others remain unchanged
router.patch('/:boat_id', async (req, res) => {
    const accepts = req.accepts(['application/json']);

    // check request content type
    if (req.get('content-type') !== 'application/json') {
        handle_response(res, c.UNSUPPORTED);

    // check response acceptable
    } else if (!accepts) {
        handle_response(res, c.NOT_ACCEPTABLE);

    } else {
        try {
            // patch boat in database
            const result = await patch_boat(req.params.boat_id, req.body);

            handle_response(res, result[0], result[1]);
            
        } catch (err) {
            console.log('router.patch');
            console.log(err);
            handle_response(res, c.ERROR);
        }
    }
});

// PUT all attributes modified (except id)
router.put('/:boat_id', async (req, res) => {
    const accepts = req.accepts(['application/json']);

    // check request content type
    if (req.get('content-type') !== 'application/json') {
        handle_response(res, c.UNSUPPORTED);

    // check client response acceptable
    } else if (!accepts) {
        handle_response(res, c.NOT_ACCEPTABLE);

    // check if client trying to change id.
    } else if (req.body.id) {
        handle_response(res, c.BAD_REQUEST, m.BAD_REQUEST_ID);

    // check attributes
    } else if (req.body.name && req.body.type && req.body.length) {
        try {
            // put boat in database
            const url = ds.createURL(req) + req.url.slice(1);
            const result = await put_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length, url)

            // handle response
            handle_response(res, result, url);
            
        } catch (err) {
            console.log('router.put');
            console.log(err);
            handle_response(res, c.ERROR);
        }
    } else {
        handle_response(res, c.BAD_REQUEST, m.BAD_REQUEST_ATTR);
    }
})

// VIEW a boat
// JSON or HTML as determined by client's Accept header
router.get('/:boat_id', async (req, res) => {

    // check client response acceptable
    const accepts = req.accepts(['application/json', 'text/html']);
    if (!accepts) {
        handle_response(res, c.NOT_ACCEPTABLE, ['application/json', 'text/html']);

    } else {
        try {
            // get boat
            const result = await get_boat(req.params.boat_id)

            handle_response(res, result[0], [result[1], accepts]);
            
        } catch (err) {
            console.log('router.get("/boat_id")');
            console.log(err);
            handle_response(res, c.ERROR);
        }
    }
});

// GET all boats
router.get('/', async (req, res) => {
    // check accepts
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        handle_response(res, c.NOT_ACCEPTABLE, 'application/json');

    } else {
        try {
            // get boats from database
            let boats = await get_all_boats();
            boats = boats.map(ds.fromDatastore);
            handle_response(res, c.OK, [{"boats": boats}, accepts]);

        } catch (err) {
            console.log('router.get("/")');
            console.log(err);
            handle_response(res, c.ERROR);
        }
    }
})

// BAD ROUTES
router.delete('/', (req, res) => {
    handle_response(res, c.BAD_METHOD);
});

router.put('/', (req, res) => {
    handle_response(res, c.BAD_METHOD);
});

router.patch('/', (req, res) => {
    handle_response(res, c.BAD_METHOD);
})

/* --------------------------------------------------- END CONTROLLER FUNCTIONS ----------------------------------------- */

module.exports = router;