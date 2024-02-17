import express from "express";
import { createHandler } from 'graphql-http/lib/use/express';
import { getDB } from "./db";
import schema from "./schema";

const app = express();
const db = getDB();

app.use(
  "/graphql",
  createHandler({ schema })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
