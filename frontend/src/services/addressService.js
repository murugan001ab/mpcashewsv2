// src/services/addressService.js
// All endpoints go through the Gateway → /api/addresses/*
import { getData, postData, deleteData, putData } from "./api";

// GET /api/addresses/
export const getAddresses = (token) => getData("addresses/", token);

// POST /api/addresses/
export const addAddress = (token, data) => postData("addresses/", data, token);

// PUT /api/addresses/{id}  (FastAPI orders service uses PUT, not PATCH)
export const updateAddress = (token, id, data) => putData(`addresses/${id}`, data, token);

// DELETE /api/addresses/{id}
export const deleteAddressById = (token, id) => deleteData(`addresses/${id}`, token);
