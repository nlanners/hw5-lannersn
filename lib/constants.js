module.exports.constants = {
    'BOAT': 'Boats',
    'OK': 200,
    'CREATED': 201,
    'NO_CONTENT': 204,
    'SEE_OTHER': 303,
    'BAD_REQUEST': 400,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'BAD_METHOD': 405,
    'NOT_ACCEPTABLE': 406,
    'UNSUPPORTED': 415,
    'ERROR': 500,
    'name_length': 25,
    'is_alpha': /^[a-z A-Z\s]+$/
}

let extra;

module.exports.messages = {
    'BAD_METHOD': 'Not an acceptable method.',
    'BAD_REQUEST_ATTR': "The request object is missing at least one of the required attributes",
    'BAD_REQUEST_ID': "Attribute 'id' can not be modified.",
    'BAD_REQUEST_NAME': `Boat name is invalid. Names must be ${this.constants.name_length} characters or less and contain no numbers or special characters.`,
    'FORBIDDEN': "Boat name has already been used. Please use a unique name.",
    'ERROR': "Something went wrong creating the boat. Please try again",
    'ERROR_CONTENT': "Content type got messed up. Please try again.",
    'NOT_ACCEPTABLE': 'Response must be sent as ',
    'NOT_FOUND': "No boat with this boat_id exists",
    'UNSUPPORTED': "Data must be sent as Content-Type: application/json",
}