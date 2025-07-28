// Note object structure
// This is just for documentation/comment purposes in JS
// JS doesn't support interfaces or types natively

// /**
//  * @typedef {Object} Note
//  * @property {string} id
//  * @property {string} title
//  * @property {string} body
//  * @property {string} updatedAt
//  * @property {boolean} [deleted]
//  * @property {boolean} [isDirty]
//  */

// /**
//  * @typedef {Object} NotesState
//  * @property {Note[]} notes
//  * @property {string} searchQuery
//  * @property {Note[]} filteredNotes
//  * @property {boolean} isLoading
//  * @property {string|null} error
//  */

// Action Types as constants
const SET_LOADING = "SET_LOADING";
const SET_ERROR = "SET_ERROR";
const LOAD_NOTES = "LOAD_NOTES";
const ADD_NOTE = "ADD_NOTE";
const UPDATE_NOTE = "UPDATE_NOTE";
const DELETE_NOTE = "DELETE_NOTE";
const SET_SEARCH_QUERY = "SET_SEARCH_QUERY";

// Example usage of action format:
// const action = { type: LOAD_NOTES, payload: [...] };
