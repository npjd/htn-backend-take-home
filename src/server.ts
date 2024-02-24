import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./typeDefs";
import { getResolvers } from "./resolver";

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers: await getResolvers("production"),
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`🚀  Server ready at: ${url}`);
}

startServer().catch((error) => {
  console.error("Error starting the server:", error);
});
