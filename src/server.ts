import express from "express";
import { graphqlHTTP } from "express-graphql";
import { getDB } from "./db";


const app = express();
const db = getDB();