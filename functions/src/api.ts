import cors = require("cors");
import express = require("express");

const functions = require('firebase-functions');
const app = express();

// Automatically allow cross-origin requests
app.use(cors({origin: true}));

export const API_FUNCTION = functions.https.onRequest(app);
